import asyncio
import os
import signal
import uuid

from bullmq import Job, Worker
from redis.asyncio import Redis

import main
from main import (
    process_document_job,
    update_simulation_status,
)

WORKER_HEARTBEAT_KEY_PREFIX = "shadowtest:worker:heartbeat:"
WORKER_HEARTBEAT_KEY = f"{WORKER_HEARTBEAT_KEY_PREFIX}{uuid.uuid4().hex}"
HEARTBEAT_INTERVAL_SECONDS = 10
HEARTBEAT_TTL_SECONDS = 30
WORKER_CONCURRENCY = int(os.environ.get("SIMULATION_WORKER_CONCURRENCY", "2"))
WORKER_LOCK_DURATION_MS = 120_000
WORKER_STALLED_INTERVAL_MS = 30_000
WORKER_MAX_STALLED_COUNT = 2
failure_status_tasks: set[asyncio.Task[None]] = set()


async def maintain_worker_heartbeat(client: Redis) -> None:
    while True:
        try:
            await client.set(WORKER_HEARTBEAT_KEY, "ready", ex=HEARTBEAT_TTL_SECONDS)
        except Exception as error:
            print(f"Unable to refresh worker heartbeat: {error}")
        await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)


async def process_queue_job(job: Job, _token: str | None = None) -> dict[str, str]:
    if job.name == "document_index":
        await process_document_job(job.data["document"])
        return {"status": "completed", "document_id": job.data["document"]["document_id"]}
    if job.name != "simulation":
        raise ValueError(f"Unsupported BullMQ job type: {job.name}")

    request = main.SimulationRequest.model_validate(job.data["request"])
    await main.run_simulation_loop(request, mark_failure=False)
    return {"status": "completed", "simulation_id": request.simulation_id}


def handle_failed_job(job: Job | None, error: Exception) -> None:
    if job is None:
        print(f"BullMQ worker failed before loading a job: {error}")
        return
    print(f"BullMQ job {job.id} attempt {job.attemptsMade} failed: {error}")
    if job.name != "simulation" or job.attemptsMade < job.attempts:
        return

    simulation_id = job.data.get("simulationId") or job.data.get("request", {}).get("simulation_id")
    if not isinstance(simulation_id, str):
        print(f"Simulation job {job.id} has no valid simulation ID")
        return
    task = asyncio.create_task(mark_simulation_failed(simulation_id))
    failure_status_tasks.add(task)
    task.add_done_callback(report_failure_status_result)


async def mark_simulation_failed(simulation_id: str) -> None:
    for attempt in range(3):
        try:
            await update_simulation_status(simulation_id, "FAILED")
            return
        except Exception:
            if attempt == 2:
                raise
            await asyncio.sleep(2**attempt)


def report_failure_status_result(task: asyncio.Task[None]) -> None:
    failure_status_tasks.discard(task)
    try:
        task.result()
    except asyncio.CancelledError:
        return
    except Exception as error:
        print(f"Could not record exhausted simulation failure: {error}")


async def run_worker() -> None:
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL is required for the simulation worker")
    if WORKER_CONCURRENCY < 1:
        raise RuntimeError("SIMULATION_WORKER_CONCURRENCY must be a positive integer")

    client = Redis.from_url(
        redis_url,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=None,
    )
    heartbeat_task: asyncio.Task[None] | None = None
    worker: Worker | None = None
    worker_task: asyncio.Task[None] | None = None
    shutdown_task: asyncio.Task[bool] | None = None
    loop = asyncio.get_running_loop()
    registered_signals = []
    shutdown_event = asyncio.Event()
    try:
        await client.ping()
        main.redis_client = client
        worker = Worker(
            main.QUEUE_NAME,
            process_queue_job,
            {
                "connection": redis_url,
                "concurrency": WORKER_CONCURRENCY,
                "lockDuration": WORKER_LOCK_DURATION_MS,
                "stalledInterval": WORKER_STALLED_INTERVAL_MS,
                "maxStalledCount": WORKER_MAX_STALLED_COUNT,
                "removeOnComplete": 1000,
                "removeOnFail": 5000,
                "autorun": False,
            },
        )
        worker.on("failed", handle_failed_job)
        await worker.backend.conn.ping()
        worker_task = asyncio.create_task(worker.run())
        for _ in range(50):
            if worker.running:
                break
            if worker_task.done():
                await worker_task
                raise RuntimeError("BullMQ worker exited during startup")
            await asyncio.sleep(0.1)
        if not worker.running:
            raise RuntimeError("BullMQ worker did not become ready")

        for signal_number in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(signal_number, shutdown_event.set)
            registered_signals.append(signal_number)
        heartbeat_task = asyncio.create_task(maintain_worker_heartbeat(client))
        print(f"ShadowTest BullMQ worker is ready; concurrency={WORKER_CONCURRENCY}.")
        shutdown_task = asyncio.create_task(shutdown_event.wait())
        done, _ = await asyncio.wait(
            {worker_task, shutdown_task},
            return_when=asyncio.FIRST_COMPLETED,
        )
        if worker_task in done:
            await worker_task
            raise RuntimeError("BullMQ worker exited unexpectedly")
    finally:
        for signal_number in registered_signals:
            loop.remove_signal_handler(signal_number)
        if shutdown_task:
            shutdown_task.cancel()
            await asyncio.gather(shutdown_task, return_exceptions=True)
        if heartbeat_task:
            heartbeat_task.cancel()
            await asyncio.gather(heartbeat_task, return_exceptions=True)
        try:
            if worker:
                await worker.close()
            if worker_task:
                await worker_task
            if failure_status_tasks:
                await asyncio.gather(*tuple(failure_status_tasks), return_exceptions=True)
        finally:
            await client.delete(WORKER_HEARTBEAT_KEY)
            await client.aclose()


if __name__ == "__main__":
    asyncio.run(run_worker())
