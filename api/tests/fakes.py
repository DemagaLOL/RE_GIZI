"""Test double untuk dependensi waktu."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


class FakeClock:
    """Jam manual untuk tes; memenuhi `core.clock.ClockLike`."""

    def __init__(self, start: datetime) -> None:
        self._now = self._ensure_aware(start)

    @staticmethod
    def _ensure_aware(at: datetime) -> datetime:
        if at.tzinfo is None or at.utcoffset() is None:
            raise ValueError("FakeClock butuh datetime aware")
        return at.astimezone(timezone.utc)

    def now(self) -> datetime:
        return self._now

    def advance(self, **timedelta_kwargs: float) -> datetime:
        """Majukan jam, mis. `advance(minutes=5)`. Mengembalikan waktu baru."""
        self._now += timedelta(**timedelta_kwargs)
        return self._now

    def set(self, at: datetime) -> None:
        self._now = self._ensure_aware(at)
