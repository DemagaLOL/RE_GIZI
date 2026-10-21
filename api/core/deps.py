"""Dependensi bersama untuk dipakai lewat FastAPI `Depends`."""

from __future__ import annotations

from functools import lru_cache

from core.clock import Clock, ClockLike


@lru_cache(maxsize=1)
def get_clock() -> ClockLike:
    """Singleton jam simulasi untuk seluruh proses.

    Pakai sebagai `clock: ClockLike = Depends(get_clock)`; di tes, timpa lewat
    `app.dependency_overrides[get_clock] = lambda: FakeClock(...)`.
    """
    return Clock()
