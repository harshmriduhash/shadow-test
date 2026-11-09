import asyncio
import json
import os

from redis.asyncio import Redis

from main import SimulationRequest, run_simulation_loop

QUEUE_KEY = "shadowtest:simulations:pending"
PROCESSING_KEY = "shadowtest:simulations:processing"


async def requeue_abandoned_jobs(client: Redis) -> int:
    recovered = 0
    while await client.rpoplpush(PROCESSING_KEY, QUEUE_KEY):
        recovered += 1
    return recovered


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
    try:
        await client.ping()
        recovered = await requeue_abandoned_jobs(client)
        print(f"ShadowTest simulation worker is listening; recovered {recovered} queued job(s).")

        while True:
            payload = await client.brpoplpush(QUEUE_KEY, PROCESSING_KEY, timeout=0)
            if payload is None:
                continue
            try:
                request = SimulationRequest.model_validate_json(payload)
                await run_simulation_loop(request)
            except Exception as error:
                print(f"Worker rejected a queued simulation: {error}")
            finally:
                await client.lrem(PROCESSING_KEY, 1, payload)
    finally:
        await client.aclose()


if __name__ == "__main__":
    asyncio.run(run_worker())
