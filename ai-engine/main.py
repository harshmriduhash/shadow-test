import asyncio
import base64
import ipaddress
import json
import os
import secrets
import socket
from typing import Any, Optional
from urllib.parse import urljoin, urlsplit, urlunsplit

import aiohttp
import anthropic
import httpx
from redis.asyncio import Redis
from bs4 import BeautifulSoup
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ShadowTest AI Engine")
API_URL = os.environ.get("API_URL", "http://localhost:4000/api").rstrip("/")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY")
REDIS_URL = os.environ.get("REDIS_URL")
APP_ENV = os.environ.get("APP_ENV", "development")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5-5")
MAX_PAGE_BYTES = 1_000_000
MAX_SIMULATION_STEPS = 5
QUEUE_KEY = "shadowtest:simulations:pending"
redis_client: Optional[Redis] = None


class SimulationRequest(BaseModel):
    project_id: str = Field(min_length=1, max_length=128)
    project_description: str = Field(default="", max_length=5000)
    persona_id: str = Field(min_length=1, max_length=128)
    task: str = Field(min_length=1, max_length=2000)
    simulation_id: str = Field(min_length=1, max_length=128)
    product_url: Optional[str] = None
    repo_url: Optional[str] = None
    persona_traits: Optional[str] = Field(default=None, max_length=4000)


class ProductURLValidationRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class PageContext(BaseModel):
    url: str
    text: str
    links: list[dict[str, str]]


def parse_public_https_url(url: str):
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Only public HTTPS URLs are allowed")
    if parsed.port not in (None, 443):
        raise ValueError("Non-standard HTTPS ports are not allowed")

    host = parsed.hostname.rstrip(".").lower()
    if host in {"localhost", "localhost.localdomain"} or host.endswith((".local", ".internal")):
        raise ValueError("Private and local hostnames are not allowed")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise ValueError("Private and reserved IP addresses are not allowed")
    return parsed


async def validate_public_host(host: str) -> list[str]:
    try:
        records = await asyncio.to_thread(
            socket.getaddrinfo,
            host,
            443,
            type=socket.SOCK_STREAM,
        )
    except OSError as error:
        raise ValueError("The host could not be resolved") from error
    if not records:
        raise ValueError("The host could not be resolved")
    addresses = list(dict.fromkeys(record[4][0] for record in records))
    if any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError("Private and reserved IP addresses are not allowed")
    return addresses


class PinnedPublicResolver(aiohttp.abc.AbstractResolver):
    def __init__(self, hostname: str, addresses: list[str]):
        self.hostname = hostname.rstrip(".").lower()
        self.addresses = addresses

    async def resolve(self, host: str, port: int = 0, family: int = socket.AF_INET):
        if host.rstrip(".").lower() != self.hostname or port != 443:
            raise OSError("The request attempted to leave the validated HTTPS host")
        return [
            {
                "hostname": self.hostname,
                "host": address,
                "port": port,
                "family": socket.AF_INET6 if ipaddress.ip_address(address).version == 6 else socket.AF_INET,
                "proto": 0,
                "flags": 0,
            }
            for address in self.addresses
        ]

    async def close(self) -> None:
        return None


def validate_request_internal_key(provided: Optional[str]) -> None:
    if not INTERNAL_API_KEY:
        raise HTTPException(status_code=503, detail="Internal service authentication is not configured")
    if not provided or not secrets.compare_digest(provided, INTERNAL_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid internal service credentials")


class Scraper:
    @staticmethod
    async def get_page_context(url: str) -> PageContext:
        try:
            parsed = parse_public_https_url(url)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

        try:
            addresses = await validate_public_host(parsed.hostname or "")
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        safe_url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.query, ""))
        resolver = PinnedPublicResolver(parsed.hostname or "", addresses)
        connector = aiohttp.TCPConnector(resolver=resolver, use_dns_cache=False)
        timeout = aiohttp.ClientTimeout(total=12.0, connect=5.0, sock_read=5.0)
        try:
            async with aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={"User-Agent": "ShadowTest/1.0 (+https://shadowtest.ai)"},
            ) as client:
                async with client.get(safe_url, allow_redirects=False) as response:
                    if response.status != 200:
                        raise HTTPException(status_code=422, detail=f"Product URL returned HTTP {response.status}")
                    if "text/html" not in response.headers.get("content-type", "").lower():
                        raise HTTPException(status_code=422, detail="Product URL did not return an HTML page")
                    if response.content_length and response.content_length > MAX_PAGE_BYTES:
                        raise HTTPException(status_code=413, detail="Product page exceeds the allowed size")

                    chunks: list[bytes] = []
                    byte_count = 0
                    async for chunk in response.content.iter_chunked(65536):
                        byte_count += len(chunk)
                        if byte_count > MAX_PAGE_BYTES:
                            raise HTTPException(status_code=413, detail="Product page exceeds the allowed size")
                        chunks.append(chunk)
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as error:
            raise HTTPException(status_code=422, detail="Unable to fetch the public product page") from error

        soup = BeautifulSoup(b"".join(chunks), "html.parser")
        for element in soup(["script", "style", "noscript", "svg"]):
            element.decompose()
        text = " ".join(soup.get_text(" ", strip=True).split())[:6000]
        links: list[dict[str, str]] = []
        seen: set[str] = set()
        for anchor in soup.find_all("a", href=True):
            label = " ".join(anchor.get_text(" ", strip=True).split())[:160]
            target = urljoin(safe_url, str(anchor["href"]))
            try:
                link = parse_public_https_url(target)
            except ValueError:
                continue
            if link.hostname != parsed.hostname or link.port not in (None, 443):
                continue
            target_url = urlunsplit((link.scheme, link.netloc, link.path or "/", link.query, ""))
            if target_url in seen:
                continue
            seen.add(target_url)
            links.append({"label": label or link.path or "Page", "url": target_url})
            if len(links) == 30:
                break

        return PageContext(url=safe_url, text=text, links=links)

    @staticmethod
    async def get_readme(repo_url: str) -> str:
        try:
            repo = parse_public_https_url(repo_url)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=f"Invalid repository URL: {error}") from error
        if repo.hostname != "github.com":
            raise HTTPException(status_code=400, detail="Repository must be hosted on github.com")
        parts = [part for part in repo.path.split("/") if part]
        if len(parts) < 2:
            raise HTTPException(status_code=400, detail="Repository URL must include an owner and repository")

        owner, repository = parts[:2]
        if repository.endswith(".git"):
            repository = repository[:-4]
        headers = {
            "Accept": "application/vnd.github.raw+json",
            "User-Agent": "ShadowTest/1.0",
        }
        if token := os.environ.get("GITHUB_TOKEN"):
            headers["Authorization"] = f"Bearer {token}"
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=False) as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repository}/readme",
                headers=headers,
            )
        if response.status_code != 200:
            raise HTTPException(status_code=422, detail="Unable to access the GitHub repository README")

        content = response.text
        if "application/json" in response.headers.get("content-type", ""):
            payload = response.json()
            encoded = payload.get("content")
            if not isinstance(encoded, str):
                raise HTTPException(status_code=422, detail="GitHub returned an invalid README response")
            content = base64.b64decode(encoded).decode("utf-8", errors="replace")
        return content[:12000]


STEP_TOOL = {
    "name": "record_behavior_step",
    "description": "Record one read-only behavioral testing step and choose whether to follow a same-site navigation link.",
    "input_schema": {
        "type": "object",
        "properties": {
            "observation": {"type": "string"},
            "interpretation": {"type": "string"},
            "decision": {"type": "string"},
            "action": {"type": "string"},
            "outcome": {"type": "string"},
            "next_link_index": {"type": ["integer", "null"]},
            "task_complete": {"type": "boolean"},
            "task_success": {"type": ["boolean", "null"]},
            "friction_points": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "observation",
            "interpretation",
            "decision",
            "action",
            "outcome",
            "next_link_index",
            "task_complete",
            "task_success",
            "friction_points",
        ],
    },
}


async def ask_persona_for_step(
    client: anthropic.AsyncAnthropic,
    request: SimulationRequest,
    page: Optional[PageContext],
    prior_steps: list[dict[str, Any]],
    step_number: int,
    repo_readme: Optional[str],
) -> dict[str, Any]:
    if page:
        link_list = "\n".join(
            f"{index}. {link['label']}" for index, link in enumerate(page.links)
        ) or "(No same-site navigation links found.)"
        page_details = f"Current URL: {page.url}\nVisible page text:\n{page.text}\nAvailable same-site links:\n{link_list}"
    else:
        page_details = "No product URL was provided. Use the project description and README only; do not claim to have interacted with a live interface."

    context = {
        "project_description": request.project_description,
        "task": request.task,
        "persona_traits": request.persona_traits or "Average user",
        "page": page_details,
        "repository_readme": repo_readme or "No README supplied.",
        "previous_steps": prior_steps,
        "step_number": step_number,
        "max_steps": MAX_SIMULATION_STEPS,
    }
    response = await client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1200,
        system=(
            "You are a synthetic UX tester. Return one concrete next step using the provided record_behavior_step tool. "
            "Be concise and report only what is visible or supported by context. Never claim to submit forms, change data, "
            "or perform actions outside read-only same-site navigation. Choose next_link_index only from the provided list; "
            "use null when no safe next page is relevant. Mark task_success true only when the available evidence shows the goal was achieved."
        ),
        tools=[STEP_TOOL],
        tool_choice={"type": "tool", "name": "record_behavior_step"},
        messages=[{"role": "user", "content": json.dumps(context)}],
    )
    result = next((block.input for block in response.content if block.type == "tool_use"), None)
    if not isinstance(result, dict):
        raise RuntimeError("The AI provider returned no structured simulation step")
    return result


async def send_internal_request(path: str, payload: dict[str, Any]) -> None:
    if not INTERNAL_API_KEY:
        raise RuntimeError("INTERNAL_API_KEY is not configured")
    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.post(
            f"{API_URL}{path}",
            json=payload,
            headers={"X-Internal-Api-Key": INTERNAL_API_KEY},
        )
    response.raise_for_status()


async def update_simulation_status(simulation_id: str, status: str) -> None:
    if not INTERNAL_API_KEY:
        raise RuntimeError("INTERNAL_API_KEY is not configured")
    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.patch(
            f"{API_URL}/simulations/{simulation_id}",
            json={"status": status},
            headers={"X-Internal-Api-Key": INTERNAL_API_KEY},
        )
    response.raise_for_status()


async def enqueue_simulation(request: SimulationRequest) -> bool:
    if not REDIS_URL:
        return False
    global redis_client
    if redis_client is None:
        redis_client = Redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
    try:
        await redis_client.ping()
        await redis_client.rpush(QUEUE_KEY, request.model_dump_json())
    except Exception as error:
        print(f"Unable to enqueue simulation {request.simulation_id}: {error}")
        raise HTTPException(status_code=503, detail="Simulation queue is temporarily unavailable") from error
    return True


async def run_simulation_loop(request: SimulationRequest) -> None:
    try:
        if not ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured")
        await update_simulation_status(request.simulation_id, "RUNNING")
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        page = await Scraper.get_page_context(request.product_url) if request.product_url else None
        readme = await Scraper.get_readme(request.repo_url) if request.repo_url else None
        steps: list[dict[str, Any]] = []
        friction_points: list[str] = []
        task_success: Optional[bool] = None

        for step_number in range(1, MAX_SIMULATION_STEPS + 1):
            result = await ask_persona_for_step(client, request, page, steps, step_number, readme)
            next_link_index = result.get("next_link_index")
            if next_link_index is not None:
                if (
                    not isinstance(next_link_index, int)
                    or isinstance(next_link_index, bool)
                    or page is None
                    or next_link_index < 0
                    or next_link_index >= len(page.links)
                ):
                    result["outcome"] = f"{result['outcome']} The proposed navigation was rejected because it was not a valid same-site link."
                    result["next_link_index"] = None
                else:
                    next_url = page.links[next_link_index]["url"]
                    result["action"] = f"Open same-site page: {page.links[next_link_index]['label']}"
                    page = await Scraper.get_page_context(next_url)
                    result["outcome"] = f"{result['outcome']} Loaded the linked page successfully."

            step_data = {
                "step_number": step_number,
                "observation": str(result["observation"])[:8000],
                "interpretation": str(result["interpretation"])[:8000],
                "decision": str(result["decision"])[:8000],
                "action": str(result["action"])[:8000],
                "outcome": str(result["outcome"])[:8000],
            }
            await send_internal_request(f"/simulations/{request.simulation_id}/steps", step_data)
            steps.append(step_data)
            friction_points.extend(
                point.strip()[:1000]
                for point in result.get("friction_points", [])
                if isinstance(point, str) and point.strip()
            )
            if isinstance(result.get("task_success"), bool):
                task_success = result["task_success"]
            if result.get("task_complete") or result.get("next_link_index") is None:
                break

        completed = task_success is True
        if not steps:
            raise RuntimeError("Simulation ended without producing any steps")
        summary = (
            f"The persona {'completed' if completed else 'did not confirm completion of'} the task "
            f"after {len(steps)} read-only step{'s' if len(steps) != 1 else ''}."
        )
        if page is None:
            summary += " This run used project context only; no live product URL was configured."
        insights = list(dict.fromkeys(friction_points))[:25]
        if not insights:
            insights = ["No distinct friction point was identified during this read-only walkthrough."]

        await send_internal_request(
            f"/simulations/{request.simulation_id}/report",
            {"summary": summary, "insights": insights, "success": completed},
        )
        await update_simulation_status(request.simulation_id, "COMPLETED")
    except Exception as error:
        print(f"Simulation {request.simulation_id} failed: {error}")
        try:
            await update_simulation_status(request.simulation_id, "FAILED")
        except Exception as status_error:
            print(f"Could not record failure status for {request.simulation_id}: {status_error}")


@app.get("/health")
async def health_check():
    queue_ready = APP_ENV != "production"
    if REDIS_URL:
        try:
            global redis_client
            if redis_client is None:
                redis_client = Redis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                )
            await redis_client.ping()
            queue_ready = True
        except Exception:
            queue_ready = False
    return {
        "status": "ok" if queue_ready else "degraded",
        "service": "ShadowTest AI Engine",
        "ready": bool(ANTHROPIC_API_KEY and INTERNAL_API_KEY and queue_ready),
    }


@app.post("/validate/product-url")
async def validate_product_url(
    request: ProductURLValidationRequest,
    x_internal_api_key: Optional[str] = Header(default=None),
):
    validate_request_internal_key(x_internal_api_key)
    try:
        page = await Scraper.get_page_context(request.url)
    except HTTPException as error:
        raise HTTPException(status_code=422, detail="Unable to reach the product URL.") from error
    return {"status": "ok", "page_title": page.text[:200]}


@app.post("/simulate/start", status_code=202)
async def start_simulation(
    request: SimulationRequest,
    background_tasks: BackgroundTasks,
    x_internal_api_key: Optional[str] = Header(default=None),
):
    validate_request_internal_key(x_internal_api_key)
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY is not configured")
    if await enqueue_simulation(request):
        return {"status": "queued", "simulation_id": request.simulation_id}
    if APP_ENV == "production":
        raise HTTPException(status_code=503, detail="REDIS_URL is required in production")
    background_tasks.add_task(run_simulation_loop, request)
    return {"status": "started", "simulation_id": request.simulation_id}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
