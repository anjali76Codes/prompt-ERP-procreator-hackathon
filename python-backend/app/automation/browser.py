"""Playwright browser-automation harness.

This is a scaffold — fill in concrete flows (e.g. open_fee_receipt) as they
become needed. Each flow should be small, parameterised, and registered as a
Tool in `app.tools.builtin` (or a sibling module) so agents can invoke it.

The harness manages a single shared Playwright instance / browser context for
the process. Spin up dedicated contexts per user/session if you need
isolation.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from app.core.logging import get_logger

if TYPE_CHECKING:
    from playwright.async_api import Browser, BrowserContext, Playwright

log = get_logger("automation.browser")

_playwright: "Playwright | None" = None
_browser: "Browser | None" = None


async def start_browser(headless: bool = True) -> None:
    global _playwright, _browser
    if _browser is not None:
        return
    from playwright.async_api import async_playwright  # type: ignore[import-not-found]

    _playwright = await async_playwright().start()
    _browser = await _playwright.chromium.launch(headless=headless)
    log.info("playwright browser started", headless=headless)


async def stop_browser() -> None:
    global _playwright, _browser
    if _browser is not None:
        await _browser.close()
        _browser = None
    if _playwright is not None:
        await _playwright.stop()
        _playwright = None
    log.info("playwright browser stopped")


@asynccontextmanager
async def new_context():
    """Yield a fresh browser context. Use this per flow to keep cookies/storage isolated."""
    if _browser is None:
        await start_browser()
    assert _browser is not None
    ctx: BrowserContext = await _browser.new_context()
    try:
        yield ctx
    finally:
        await ctx.close()
