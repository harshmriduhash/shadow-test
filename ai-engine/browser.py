import asyncio
import ipaddress
import re
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from bs4 import BeautifulSoup
from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright


MAX_PAGE_TEXT = 6000
MAX_LINKS = 30
MAX_CONTROLS = 30
UNSAFE_NAVIGATION = re.compile(
    r"(?:log[- ]?out|sign[- ]?out|delete|remove|purchase|checkout|subscribe|"
    r"unsubscribe|payment|submit|save|update|create|invite|connect|token|"
    r"auth|login|sign[- ]?in|register)",
    re.IGNORECASE,
)


class SafeBrowserSession:
    def __init__(self, initial_url: str, pinned_ip: str):
        parsed = urlsplit(initial_url)
        if parsed.scheme != "https" or not parsed.hostname or parsed.port not in (None, 443):
            raise ValueError("Browser walkthrough requires a standard HTTPS URL")
        if not pinned_ip or not ipaddress.ip_address(pinned_ip).is_global:
            raise ValueError("Browser walkthrough requires a pinned public IP address")
        self.hostname = parsed.hostname.rstrip(".").lower()
        self.initial_url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.query, ""))
        self.pinned_ip = pinned_ip
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._approved_navigation = {self.initial_url}

    async def start(self) -> None:
        self._playwright = await async_playwright().start()
        resolver_rules = f"MAP {self.hostname} {self.pinned_ip}"
        self._browser = await self._playwright.chromium.launch(
            args=[f"--host-resolver-rules={resolver_rules}"],
            headless=True,
        )
        self._context = await self._browser.new_context(
            service_workers="block",
            accept_downloads=False,
            java_script_enabled=True,
            ignore_https_errors=False,
        )
        await self._context.add_init_script(
            """() => {
                document.addEventListener('submit', event => {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }, true);
                window.fetch = () => Promise.reject(new Error('Network requests are disabled in this walkthrough'));
                XMLHttpRequest.prototype.open = function() {
                    throw new Error('Network requests are disabled in this walkthrough');
                };
                navigator.sendBeacon = () => false;
                window.open = () => null;
                window.WebSocket = function() {
                    throw new Error('Network requests are disabled in this walkthrough');
                };
            }"""
        )
        await self._context.route("**/*", self._guard_request)
        self._page = await self._context.new_page()
        self._page.set_default_navigation_timeout(10_000)
        self._page.set_default_timeout(3_000)
        self._page.on("popup", lambda popup: asyncio.create_task(popup.close()))

    async def close(self) -> None:
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._page = None
        self._context = None
        self._browser = None
        self._playwright = None

    async def open(self) -> dict[str, Any]:
        if not self._page:
            raise RuntimeError("Browser session has not started")
        response = await self._page.goto(self.initial_url, wait_until="domcontentloaded")
        if response is None or response.status >= 400:
            raise RuntimeError("The public product page could not be opened")
        return await self.snapshot()

    async def follow_link(self, index: int, link: dict[str, str]) -> dict[str, Any]:
        page = self._require_page()
        target_url = self._safe_navigation(link["url"], link["label"])
        self._approved_navigation.add(target_url)
        locator = page.locator(f'a[data-shadowtest-link-index="{index}"]')
        await locator.click()
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        return await self.snapshot()

    async def click_control(self, index: int) -> dict[str, Any]:
        page = self._require_page()
        controls = await self._annotate_controls()
        if index < 0 or index >= len(controls):
            raise ValueError("The selected control is not available")
        await page.locator(f'[data-shadowtest-control-index="{index}"]').click()
        await page.wait_for_timeout(100)
        return await self.snapshot()

    async def snapshot(self) -> dict[str, Any]:
        page = self._require_page()
        current_url = self._safe_navigation(page.url, "")
        self._approved_navigation.add(current_url)
        links = await page.locator("a[href]").evaluate_all(
            """anchors => {
                const results = [];
                const seen = new Set();
                for (const anchor of anchors) {
                    const label = (anchor.innerText || anchor.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 160);
                    let url;
                    try { url = new URL(anchor.href).href; } catch { continue; }
                    const key = url.split('#')[0];
                    if (!label || seen.has(key) || anchor.target === '_blank') continue;
                    if (/log[- ]?out|sign[- ]?out|delete|remove|purchase|checkout|subscribe|unsubscribe|payment|submit|save|update|create|invite|connect|token|auth|login|sign[- ]?in|register/i.test(label + ' ' + new URL(url).pathname)) continue;
                    seen.add(key);
                    results.push({ label, url: key });
                    if (results.length >= 30) break;
                }
                return results;
            }"""
        )
        valid_links: list[dict[str, str]] = []
        for link in links:
            try:
                target = self._safe_navigation(link["url"], link["label"])
            except ValueError:
                continue
            valid_links.append({"label": link["label"], "url": target})
        valid_links = valid_links[:MAX_LINKS]
        await page.locator("a[href]").evaluate_all(
            """(anchors, links) => {
                const indices = new Map(links.map((link, index) => [link.url, String(index)]));
                for (const anchor of anchors) {
                    const key = new URL(anchor.href).href.split('#')[0];
                    const index = indices.get(key);
                    if (index === undefined) anchor.removeAttribute('data-shadowtest-link-index');
                    else anchor.setAttribute('data-shadowtest-link-index', index);
                }
            }""",
            valid_links,
        )
        controls = await self._annotate_controls()
        text = " ".join((await page.locator("body").inner_text()).split())[:MAX_PAGE_TEXT]
        return {
            "url": current_url,
            "text": text,
            "links": valid_links,
            "controls": controls,
        }

    async def _annotate_controls(self) -> list[dict[str, str]]:
        page = self._require_page()
        controls = await page.locator(
            '[role="tab"], details > summary, button[aria-expanded="false"][aria-controls]'
        ).evaluate_all(
            """elements => {
                const results = [];
                for (const element of elements) {
                    const rect = element.getBoundingClientRect();
                    const label = (element.innerText || element.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 160);
                    if (!label || rect.width <= 0 || rect.height <= 0 || element.disabled) continue;
                    if (/log[- ]?out|sign[- ]?out|delete|remove|purchase|checkout|subscribe|unsubscribe|payment|submit|save|update|create|invite|connect|token|auth|login|sign[- ]?in|register/i.test(label)) continue;
                    const kind = element.matches('[role="tab"]') ? 'tab' : element.matches('summary') ? 'disclosure' : 'accordion';
                    element.setAttribute('data-shadowtest-control-index', String(results.length));
                    results.push({ label, kind });
                    if (results.length >= 30) break;
                }
                return results;
            }"""
        )
        return controls[:MAX_CONTROLS]

    async def _guard_request(self, route: Any) -> None:
        request = route.request
        parsed = urlsplit(request.url)
        is_public_page = (
            parsed.scheme == "https"
            and parsed.hostname is not None
            and parsed.hostname.rstrip(".").lower() == self.hostname
            and parsed.port in (None, 443)
        )
        if not is_public_page or request.method != "GET":
            await route.abort()
            return
        if UNSAFE_NAVIGATION.search(f"{parsed.path} {parsed.query}"):
            await route.abort()
            return
        if request.resource_type in {"fetch", "xhr", "websocket", "eventsource", "media"}:
            await route.abort()
            return
        if request.is_navigation_request():
            try:
                target = self._safe_navigation(request.url, "")
            except ValueError:
                await route.abort()
                return
            if target not in self._approved_navigation:
                await route.abort()
                return
        await route.continue_()

    def _safe_navigation(self, url: str, label: str) -> str:
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.hostname.rstrip(".").lower() != self.hostname
            or parsed.port not in (None, 443)
            or parsed.username
            or parsed.password
            or UNSAFE_NAVIGATION.search(f"{label} {parsed.path} {parsed.query}")
        ):
            raise ValueError("Only safe, same-host public HTTPS navigation is allowed")
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.query, ""))

    def _require_page(self) -> Page:
        if not self._page:
            raise RuntimeError("Browser session has not started")
        return self._page
