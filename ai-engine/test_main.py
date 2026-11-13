import asyncio
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
        self.assertEqual(request.persona_profile.technical_knowledge, 3)

    def test_persona_profile_enforces_a_one_to_five_scale(self):
        with self.assertRaises(ValueError):
            main.SimulationRequest(
                project_id="project",
                persona_id="persona",
                task="Find the billing page",
                simulation_id="simulation",
                persona_profile={"technical_knowledge": 6},
            )

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
            controls=[{"label": "Account overview", "kind": "tab"}],
        )
        billing_page = main.PageContext(
            url="https://example.com/billing",
            text="Billing invoices",
            links=[],
        )
        model_results = [
            {
                "observation": "The account overview tab is visible.",
                "interpretation": "The link may lead to billing settings.",
                "decision": "Open the account overview tab.",
                "action": "Open account overview.",
                "outcome": "The panel should show more context.",
                "next_link_index": None,
                "next_control_index": 0,
                "task_complete": False,
                "task_success": None,
                "friction_points": [],
                "ux_events": [{
                    "type": "CONFUSION",
                    "severity": "MEDIUM",
                    "description": "The persona may not understand the section title.",
                    "evidence": "Dashboard",
                }, {
                    "type": "FRICTION",
                    "severity": "HIGH",
                    "description": "Invented unsupported friction.",
                    "evidence": "A product dashboard",
                }],
            },
            {
                "observation": "The dashboard has a Billing link.",
                "interpretation": "The requested destination is present.",
                "decision": "Open the Billing link.",
                "action": "Open Billing.",
                "outcome": "The billing area should open.",
                "next_link_index": 0,
                "next_control_index": None,
                "task_complete": False,
                "task_success": None,
                "friction_points": [],
                "ux_events": [],
            },
            {
                "observation": "The billing page is visible.",
                "interpretation": "The requested destination is present.",
                "decision": "Stop the walkthrough.",
                "action": "Review the billing page.",
                "outcome": "The task goal is visible.",
                "next_link_index": None,
                "next_control_index": None,
                "task_complete": True,
                "task_success": True,
                "friction_points": [],
                "ux_events": [],
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

        browser = SimpleNamespace(
            start=AsyncMock(),
            open=AsyncMock(return_value=page.model_dump()),
            click_control=AsyncMock(return_value=page.model_copy(update={"controls": []}).model_dump()),
            follow_link=AsyncMock(return_value=billing_page.model_dump()),
            close=AsyncMock(),
        )
        with (
            patch.object(main, "ANTHROPIC_API_KEY", "test-key"),
            patch.object(main.anthropic, "AsyncAnthropic", return_value=fake_client),
            patch.object(main, "validate_public_host", new=AsyncMock(return_value=["93.184.216.34"])),
            patch.object(main.Scraper, "get_page_context", new=AsyncMock(side_effect=[page, billing_page])) as preflight,
            patch.object(main, "SafeBrowserSession", return_value=browser),
            patch.object(main, "send_internal_request", new=record_request),
            patch.object(main, "simulation_is_cancelled", new=AsyncMock(return_value=False)),
            patch.object(main, "update_simulation_status", new=AsyncMock()) as update_status,
        ):
            asyncio.run(main.run_simulation_loop(request))

        browser.click_control.assert_awaited_once_with(0)
        browser.follow_link.assert_awaited_once_with(0, page.links[0])
        browser.close.assert_awaited_once()
        self.assertEqual(preflight.await_count, 2)
        self.assertEqual([path for path, _ in recorded_requests], [
            "/simulations/simulation/steps",
            "/simulations/simulation/steps",
            "/simulations/simulation/steps",
            "/simulations/simulation/report",
        ])
        self.assertTrue(recorded_requests[-1][1]["success"])
        self.assertEqual([event["type"] for event in recorded_requests[-1][1]["events"]], ["CONFUSION", "SUCCESS"])
        self.assertEqual(recorded_requests[-1][1]["events"][0]["evidence"], "Dashboard")
        self.assertEqual(update_status.await_args_list, [
            unittest.mock.call("simulation", "RUNNING"),
            unittest.mock.call("simulation", "COMPLETED"),
        ])

    def test_simulation_cancellation_during_model_response_does_not_record_a_step(self):
        request = main.SimulationRequest(
            project_id="project",
            persona_id="persona",
            task="Find billing",
            simulation_id="simulation",
        )
        with (
            patch.object(main, "ANTHROPIC_API_KEY", "test-key"),
            patch.object(main.anthropic, "AsyncAnthropic"),
            patch.object(
                main,
                "simulation_is_cancelled",
                new=AsyncMock(side_effect=[False, False, True]),
            ),
            patch.object(main, "ask_persona_for_step", new=AsyncMock(return_value={})) as ask,
            patch.object(main, "send_internal_request", new=AsyncMock()) as send,
            patch.object(main, "update_simulation_status", new=AsyncMock()) as update_status,
        ):
            asyncio.run(main.run_simulation_loop(request))

        ask.assert_awaited_once()
        send.assert_not_awaited()
        self.assertEqual(update_status.await_args_list, [
            unittest.mock.call("simulation", "RUNNING"),
            unittest.mock.call("simulation", "CANCELLED"),
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

    def test_readiness_endpoint_checks_core_services_and_document_features(self):
        with (
            patch.object(main, "ANTHROPIC_API_KEY", "test-key"),
            patch.object(main, "INTERNAL_API_KEY", "test-internal-key"),
            patch.object(main, "REDIS_URL", None),
            patch.object(main, "APP_ENV", "development"),
            patch.object(main, "check_s3_connectivity"),
            patch.object(main, "check_qdrant_connectivity"),
        ):
            response = self.client.get("/health/ready")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ready"])
        self.assertEqual(response.json()["features"], {"s3": True, "qdrant": True})

    def test_readiness_endpoint_reports_unavailable_document_services(self):
        with (
            patch.object(main, "ANTHROPIC_API_KEY", "test-key"),
            patch.object(main, "INTERNAL_API_KEY", "test-internal-key"),
            patch.object(main, "REDIS_URL", None),
            patch.object(main, "APP_ENV", "development"),
            patch.object(main, "check_s3_connectivity", side_effect=RuntimeError("unavailable")),
            patch.object(main, "check_qdrant_connectivity"),
        ):
            response = self.client.get("/health/ready")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ready"])
        self.assertEqual(response.json()["features"], {"s3": False, "qdrant": True})

    def test_health_is_degraded_without_queue_in_production(self):
        with patch.object(main, "APP_ENV", "production"), patch.object(main, "REDIS_URL", None):
            response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "degraded")
        self.assertFalse(response.json()["ready"])


class SimulationQueueTests(unittest.TestCase):
    def test_simulation_is_enqueued_with_stable_identity_and_retries(self):
        class FakeQueue:
            def __init__(self):
                self.jobs = []

            async def add(self, name, data, options):
                self.jobs.append((name, data, options))

        request = main.SimulationRequest(
            project_id="project",
            persona_id="persona",
            task="Find billing",
            simulation_id="simulation",
        )
        fake_queue = FakeQueue()
        with (
            patch.object(main, "REDIS_URL", "redis://queue"),
            patch.object(main, "bull_queue", fake_queue),
        ):
            enqueued = asyncio.run(main.enqueue_simulation(request))

        self.assertTrue(enqueued)
        name, data, options = fake_queue.jobs[0]
        self.assertEqual(name, "simulation")
        self.assertEqual(data["request"]["simulation_id"], "simulation")
        self.assertEqual(options["jobId"], "simulation-simulation")
        self.assertEqual(options["attempts"], 3)
        self.assertEqual(options["backoff"]["type"], "exponential")

    def test_worker_processes_simulation_jobs_with_retry_safe_failure_handling(self):
        class FakeJob:
            id = "simulation"
            name = "simulation"
            data = {
                "request": {
                    "project_id": "project",
                    "persona_id": "persona",
                    "task": "Find billing",
                    "simulation_id": "simulation",
                }
            }

        with patch.object(main, "run_simulation_loop", new=AsyncMock()) as run_simulation:
            result = asyncio.run(worker.process_queue_job(FakeJob()))

        self.assertEqual(result, {"status": "completed", "simulation_id": "simulation"})
        run_simulation.assert_awaited_once()
        self.assertFalse(run_simulation.await_args.kwargs["mark_failure"])

    def test_final_bullmq_attempt_marks_simulation_failed_but_retries_do_not(self):
        class FakeJob:
            id = "simulation"
            name = "simulation"
            data = {"request": {"simulation_id": "simulation"}}
            attempts = 3

            def __init__(self, attempts_made):
                self.attemptsMade = attempts_made

        async def verify():
            with patch.object(worker, "update_simulation_status", new=AsyncMock()) as update:
                worker.handle_failed_job(FakeJob(1), RuntimeError("retry"))
                await asyncio.sleep(0)
                update.assert_not_awaited()
                worker.handle_failed_job(FakeJob(3), RuntimeError("final"))
                await asyncio.gather(*tuple(worker.failure_status_tasks))
                update.assert_awaited_once_with("simulation", "FAILED")

        asyncio.run(verify())

    def test_document_index_jobs_use_the_same_durable_queue(self):
        class FakeQueue:
            async def add(self, name, data, options):
                self.job = (name, data, options)

        request = main.DocumentIndexRequest(
            document_id="document",
            project_id="project",
            storage_key="private/key",
            content_type="text/plain",
            file_name="guide.txt",
        )
        fake_queue = FakeQueue()
        with (
            patch.object(main, "REDIS_URL", "redis://queue"),
            patch.object(main, "bull_queue", fake_queue),
        ):
            enqueued = asyncio.run(main.enqueue_document_index(request))

        self.assertTrue(enqueued)
        self.assertEqual(fake_queue.job[0], "document_index")
        self.assertEqual(fake_queue.job[1]["document"]["document_id"], "document")
        self.assertEqual(fake_queue.job[2]["attempts"], 3)

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

    def test_worker_uses_bullmq_stall_recovery_and_bounded_concurrency(self):
        self.assertEqual(main.QUEUE_NAME, "shadowtest-jobs")
        self.assertEqual(worker.WORKER_CONCURRENCY, 2)
        self.assertEqual(worker.WORKER_MAX_STALLED_COUNT, 2)
        self.assertGreater(worker.WORKER_LOCK_DURATION_MS, worker.WORKER_STALLED_INTERVAL_MS)

    def test_worker_sets_a_ttl_on_heartbeat(self):
        class FakeRedis:
            def __init__(self):
                self.values = {}

            async def set(self, key, value, ex):
                self.values[key] = (value, ex)

        fake_redis = FakeRedis()
        with patch.object(worker.asyncio, "sleep", new=AsyncMock(side_effect=asyncio.CancelledError)):
            with self.assertRaises(asyncio.CancelledError):
                asyncio.run(worker.maintain_worker_heartbeat(fake_redis))

        self.assertEqual(
            fake_redis.values[worker.WORKER_HEARTBEAT_KEY],
            ("ready", worker.HEARTBEAT_TTL_SECONDS),
        )


if __name__ == "__main__":
    unittest.main()
