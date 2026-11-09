import asyncio
import json
import socket
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

import main
import worker


class PublicUrlValidationTests(unittest.TestCase):
    def test_accepts_public_https_url(self):
        parsed = main.parse_public_https_url("https://example.com/start")
        self.assertEqual(parsed.hostname, "example.com")

    def test_rejects_non_https_and_non_standard_ports(self):
        for url in ("http://example.com", "https://example.com:8443"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                main.parse_public_https_url(url)

    def test_rejects_local_private_and_reserved_targets(self):
        for url in (
            "https://localhost/",
            "https://service.internal/",
            "https://127.0.0.1/",
            "https://10.0.0.1/",
            "https://[::1]/",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                main.parse_public_https_url(url)

    def test_rejects_credentials_in_target_url(self):
        with self.assertRaises(ValueError):
            main.parse_public_https_url("https://user:pass@example.com/")


class PublicHostResolutionTests(unittest.TestCase):
    def test_public_host_resolution_returns_only_pinned_public_addresses(self):
        record = (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))
        with patch.object(main.socket, "getaddrinfo", return_value=[record]):
            addresses = asyncio.run(main.validate_public_host("example.com"))
        self.assertEqual(addresses, ["93.184.216.34"])

    def test_public_host_resolution_rejects_mixed_public_and_private_addresses(self):
        public = (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))
        private = (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))
        with (
            patch.object(main.socket, "getaddrinfo", return_value=[public, private]),
            self.assertRaises(ValueError),
        ):
            asyncio.run(main.validate_public_host("example.com"))

    def test_pinned_resolver_refuses_a_different_host_or_port(self):
        resolver = main.PinnedPublicResolver("example.com", ["93.184.216.34"])
        records = asyncio.run(resolver.resolve("example.com", 443))
        self.assertEqual(records[0]["host"], "93.184.216.34")
        for host, port in (("other.example", 443), ("example.com", 80)):
            with self.subTest(host=host, port=port), self.assertRaises(OSError):
                asyncio.run(resolver.resolve(host, port))


class InternalServiceAuthTests(unittest.TestCase):
    def setUp(self):
        self.previous_key = main.INTERNAL_API_KEY
        main.INTERNAL_API_KEY = "test-internal-key"

    def tearDown(self):
        main.INTERNAL_API_KEY = self.previous_key

    def test_accepts_matching_internal_key(self):
        main.validate_request_internal_key("test-internal-key")

    def test_rejects_wrong_internal_key(self):
        with self.assertRaises(HTTPException) as error:
            main.validate_request_internal_key("wrong")
        self.assertEqual(error.exception.status_code, 401)

    def test_fails_closed_when_internal_key_is_missing(self):
        main.INTERNAL_API_KEY = None
        with self.assertRaises(HTTPException) as error:
            main.validate_request_internal_key("anything")
        self.assertEqual(error.exception.status_code, 503)


class SimulationRequestTests(unittest.TestCase):
    def test_requires_project_persona_and_task(self):
        with self.assertRaises(ValueError):
            main.SimulationRequest(
                project_id="project",
                persona_id="persona",
                task="",
                simulation_id="simulation",
            )

    def test_accepts_a_bounded_simulation_request(self):
        request = main.SimulationRequest(
            project_id="project",
            project_description="A product dashboard",
            persona_id="persona",
            task="Find the billing page",
            simulation_id="simulation",
            product_url="https://example.com",
        )
        self.assertEqual(request.task, "Find the billing page")

    def test_simulation_records_steps_report_and_completion(self):
        request = main.SimulationRequest(
            project_id="project",
            project_description="A product dashboard",
            persona_id="persona",
            task="Find the billing page",
            simulation_id="simulation",
            product_url="https://example.com",
        )
        page = main.PageContext(
            url="https://example.com/",
            text="Dashboard",
            links=[{"label": "Billing", "url": "https://example.com/billing"}],
        )
        model_results = [
            {
                "observation": "The dashboard has a Billing link.",
                "interpretation": "The link may lead to billing settings.",
                "decision": "Open the Billing link.",
                "action": "Open Billing.",
                "outcome": "The billing area should open.",
                "next_link_index": 0,
                "task_complete": False,
                "task_success": None,
                "friction_points": [],
            },
            {
                "observation": "The billing page is visible.",
                "interpretation": "The requested destination is present.",
                "decision": "Stop the walkthrough.",
                "action": "Review the billing page.",
                "outcome": "The task goal is visible.",
                "next_link_index": None,
                "task_complete": True,
                "task_success": True,
                "friction_points": [],
            },
        ]
        fake_client = SimpleNamespace(
            messages=SimpleNamespace(
                create=AsyncMock(side_effect=[
                    SimpleNamespace(content=[SimpleNamespace(type="tool_use", input=result)])
                    for result in model_results
                ])
            )
        )
        recorded_requests = []

        async def record_request(path, payload):
            recorded_requests.append((path, payload))

        with (
            patch.object(main, "ANTHROPIC_API_KEY", "test-key"),
            patch.object(main.anthropic, "AsyncAnthropic", return_value=fake_client),
            patch.object(main.Scraper, "get_page_context", new=AsyncMock(return_value=page)) as fetch_page,
            patch.object(main, "send_internal_request", new=record_request),
            patch.object(main, "update_simulation_status", new=AsyncMock()) as update_status,
        ):
            asyncio.run(main.run_simulation_loop(request))

        self.assertEqual(fetch_page.await_count, 2)
        self.assertEqual([path for path, _ in recorded_requests], [
            "/simulations/simulation/steps",
            "/simulations/simulation/steps",
            "/simulations/simulation/report",
        ])
        self.assertTrue(recorded_requests[-1][1]["success"])
        self.assertEqual(update_status.await_args_list, [
            unittest.mock.call("simulation", "RUNNING"),
            unittest.mock.call("simulation", "COMPLETED"),
        ])


class APIEndpointTests(unittest.TestCase):
    def setUp(self):
        self.previous_key = main.INTERNAL_API_KEY
        main.INTERNAL_API_KEY = "test-internal-key"
        self.client = TestClient(main.app)

    def tearDown(self):
        main.INTERNAL_API_KEY = self.previous_key

    def test_simulation_endpoint_requires_internal_authentication(self):
        response = self.client.post(
            "/simulate/start",
            json={
                "project_id": "project",
                "persona_id": "persona",
                "task": "Find billing",
                "simulation_id": "simulation",
            },
        )
        self.assertEqual(response.status_code, 401)

    def test_product_validation_endpoint_requires_internal_authentication(self):
        response = self.client.post("/validate/product-url", json={"url": "https://example.com"})
        self.assertEqual(response.status_code, 401)

    def test_product_validation_endpoint_returns_success_only_for_reachable_page(self):
        page = main.PageContext(url="https://example.com/", text="Example product home", links=[])
        with patch.object(main.Scraper, "get_page_context", new=AsyncMock(return_value=page)):
            response = self.client.post(
                "/validate/product-url",
                headers={"X-Internal-Api-Key": "test-internal-key"},
                json={"url": "https://example.com"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_health_is_degraded_without_queue_in_production(self):
        with patch.object(main, "APP_ENV", "production"), patch.object(main, "REDIS_URL", None):
            response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "degraded")
        self.assertFalse(response.json()["ready"])


class SimulationQueueTests(unittest.TestCase):
    def test_simulation_is_enqueued_as_a_persistent_json_payload(self):
        class FakeRedis:
            def __init__(self):
                self.payloads = []

            async def ping(self):
                return True

            async def rpush(self, key, payload):
                self.payloads.append((key, payload))

        request = main.SimulationRequest(
            project_id="project",
            persona_id="persona",
            task="Find billing",
            simulation_id="simulation",
        )
        fake_redis = FakeRedis()
        with (
            patch.object(main, "REDIS_URL", "redis://queue"),
            patch.object(main, "redis_client", fake_redis),
        ):
            enqueued = asyncio.run(main.enqueue_simulation(request))

        self.assertTrue(enqueued)
        self.assertEqual(fake_redis.payloads[0][0], main.QUEUE_KEY)
        self.assertEqual(
            main.SimulationRequest.model_validate_json(fake_redis.payloads[0][1]).simulation_id,
            "simulation",
        )

    def test_document_index_jobs_are_queued_with_a_job_type(self):
        class FakeRedis:
            async def ping(self):
                return True

            async def rpush(self, key, payload):
                self.payload = json.loads(payload)

        request = main.DocumentIndexRequest(
            document_id="document",
            project_id="project",
            storage_key="private/key",
            content_type="text/plain",
            file_name="guide.txt",
        )
        fake_redis = FakeRedis()
        with (
            patch.object(main, "REDIS_URL", "redis://queue"),
            patch.object(main, "redis_client", fake_redis),
        ):
            enqueued = asyncio.run(main.enqueue_document_index(request))

        self.assertTrue(enqueued)
        self.assertEqual(fake_redis.payload["job_type"], "document_index")
        self.assertEqual(fake_redis.payload["document"]["document_id"], "document")

    def test_document_index_job_updates_ready_after_successful_index(self):
        details = ("document", "project", "private/key", "text/plain", "guide.txt")
        with (
            patch.object(main, "document_index_payload", return_value=details),
            patch.object(main.asyncio, "to_thread", new=AsyncMock(return_value=4)) as index,
            patch.object(main, "update_document_status", new=AsyncMock()) as update,
        ):
            asyncio.run(main.process_document_job({"document_id": "document"}))

        index.assert_awaited_once_with(main.index_document, *details)
        update.assert_awaited_once_with("document", "READY")

    def test_worker_recovers_jobs_left_in_processing(self):
        class FakeRedis:
            def __init__(self):
                self.processing = ["newer", "older"]
                self.pending = []

            async def rpoplpush(self, source, destination):
                if source != worker.PROCESSING_KEY or destination != worker.QUEUE_KEY:
                    self.fail("Worker used an unexpected recovery list")
                if not self.processing:
                    return None
                payload = self.processing.pop()
                self.pending.insert(0, payload)
                return payload

            def fail(self, message):
                raise AssertionError(message)

        fake_redis = FakeRedis()
        recovered = asyncio.run(worker.requeue_abandoned_jobs(fake_redis))
        self.assertEqual(recovered, 2)
        self.assertEqual(fake_redis.pending, ["newer", "older"])
        self.assertEqual(fake_redis.processing, [])


if __name__ == "__main__":
    unittest.main()
