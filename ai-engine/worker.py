import asyncio
import json
import os

from redis.asyncio import Redis

from main import SimulationRequest, process_document_job, run_simulation_loop

QUEUE_KEY = "shadowtest:simulations:pending"
PROCESSING_KEY = "shadowtest:simulations:processing"
WORKER_HEARTBEAT_KEY = "shadowtest:worker:heartbeat"
HEARTBEAT_INTERVAL_SECONDS = 10
HEARTBEAT_TTL_SECONDS = 30


async def requeue_abandoned_jobs(client: Redis) -> int:
    recovered = 0
    while await client.rpoplpush(PROCESSING_KEY, QUEUE_KEY):
        recovered += 1
    return recovered


async def maintain_worker_heartbeat(client: Redis) -> None:
    while True:
        try:
            await client.set(WORKER_HEARTBEAT_KEY, "ready", ex=HEARTBEAT_TTL_SECONDS)
        except Exception as error:
            print(f"Unable to refresh worker heartbeat: {error}")
        await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)


async def run_worker() -> None:
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL is required for the simulation worker")

    client = Redis.from_url(
        redis_url,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=None,
    )
    heartbeat_task: asyncio.Task[None] | None = None
    try:
        await client.ping()
        recovered = await requeue_abandoned_jobs(client)
        heartbeat_task = asyncio.create_task(maintain_worker_heartbeat(client))
        print(f"ShadowTest simulation worker is listening; recovered {recovered} queued job(s).")

        while True:
            payload = await client.brpoplpush(QUEUE_KEY, PROCESSING_KEY, timeout=HEARTBEAT_INTERVAL_SECONDS)
            if payload is None:
                continue
            try:
                job = json.loads(payload)
                if job.get("job_type") == "document_index":
                    await process_document_job(job["document"])
                else:
                    request = SimulationRequest.model_validate(job)
                    await run_simulation_loop(request)
            except Exception as error:
                print(f"Worker rejected a queued simulation: {error}")
            finally:
                await client.lrem(PROCESSING_KEY, 1, payload)
    finally:
        try:
            if heartbeat_task:
                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass
        finally:
            await client.aclose()


if __name__ == "__main__":
    asyncio.run(run_worker())
