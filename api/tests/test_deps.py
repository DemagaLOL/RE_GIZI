from __future__ import annotations

from core.clock import Clock
from core.deps import get_clock


def test_get_clock_is_singleton() -> None:
    assert get_clock() is get_clock()
    assert isinstance(get_clock(), Clock)
