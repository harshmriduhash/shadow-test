import asyncio
import unittest
from types import SimpleNamespace

from browser import SafeBrowserSession


class SafeBrowserPolicyTests(unittest.TestCase):
    def setUp(self):
        self.session = SafeBrowserSession("https://example.com/start", "93.184.216.34")

    def test_navigation_only_allows_safe_same_host_https_urls(self):
        self.assertEqual(
            self.session._safe_navigation("https://example.com/docs", "Documentation"),
            "https://example.com/docs",
        )
        for url, label in (
            ("https://other.example/docs", "Documentation"),
            ("http://example.com/docs", "Documentation"),
            ("https://example.com:8443/docs", "Documentation"),
            ("https://example.com/logout", "Account"),
            ("https://example.com/docs?action=delete", "Documentation"),
        ):
            with self.subTest(url=url, label=label), self.assertRaises(ValueError):
                self.session._safe_navigation(url, label)

    def test_browser_refuses_private_pinned_addresses(self):
        with self.assertRaises(ValueError):
            SafeBrowserSession("https://example.com", "127.0.0.1")

    def test_request_guard_blocks_external_hosts_writes_and_background_calls(self):
        async def verify_request(url, method="GET", resource_type="document"):
            route = SimpleNamespace(
                request=SimpleNamespace(
                    url=url,
                    method=method,
                    resource_type=resource_type,
                    is_navigation_request=lambda: resource_type == "document",
                ),
                aborted=False,
                continued=False,
            )

            async def abort():
                route.aborted = True

            async def continue_request():
                route.continued = True

            route.abort = abort
            route.continue_ = continue_request
            await self.session._guard_request(route)
            return route

        approved = asyncio.run(verify_request("https://example.com/start"))
        external = asyncio.run(verify_request("https://other.example/resource"))
        write = asyncio.run(verify_request("https://example.com/start", method="POST"))
        background = asyncio.run(verify_request("https://example.com/api", resource_type="fetch"))
        unapproved_page = asyncio.run(verify_request("https://example.com/account"))
        unsafe_resource = asyncio.run(verify_request(
            "https://example.com/api/payment?token=delete",
            resource_type="image",
        ))

        self.assertTrue(approved.continued)
        self.assertTrue(external.aborted)
        self.assertTrue(write.aborted)
        self.assertTrue(background.aborted)
        self.assertTrue(unapproved_page.aborted)
        self.assertTrue(unsafe_resource.aborted)


if __name__ == "__main__":
    unittest.main()
