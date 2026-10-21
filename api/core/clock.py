"""Jam simulasi yang bisa dipercepat, dijeda, dan dipindah ke titik waktu tertentu."""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Protocol

MIN_SPEED_EXCLUSIVE = 0.0
MAX_SPEED = 600.0


class ClockLike(Protocol):
    """Apa pun yang bisa memberi waktu sekarang (aware, UTC)."""

    def now(self) -> datetime: ...


def _validate_speed(speed: float) -> float:
    if isinstance(speed, bool) or not isinstance(speed, (int, float)):
        raise ValueError(f"speed harus angka, bukan {type(speed).__name__}")
    if not (MIN_SPEED_EXCLUSIVE < speed <= MAX_SPEED):
        raise ValueError(f"speed harus 0 < speed <= {MAX_SPEED:g}, dapat {speed}")
    return float(speed)


def _validate_at(at: datetime) -> datetime:
    if not isinstance(at, datetime):
        raise ValueError(f"at harus datetime, bukan {type(at).__name__}")
    if at.tzinfo is None or at.utcoffset() is None:
        raise ValueError("at harus datetime aware (punya zona waktu)")
    return at.astimezone(timezone.utc)


class Clock:
    """Jam simulasi: waktu simulasi = sim_anchor + (time_fn() - real_anchor) * speed.

    Setiap perubahan lewat `set()` me-re-anchor terlebih dahulu, sehingga
    mengubah speed atau me-resume tidak membuat waktu melompat.
    """

    def __init__(
        self,
        speed: float = 1.0,
        time_fn: Callable[[], float] = time.monotonic,
    ) -> None:
        self._time_fn = time_fn
        self._speed = _validate_speed(speed)
        self._paused = False
        self._lock = threading.Lock()
        self._real_anchor = time_fn()
        self._sim_anchor = datetime.now(timezone.utc)

    @property
    def speed(self) -> float:
        return self._speed

    @property
    def paused(self) -> bool:
        return self._paused

    def _now_unlocked(self) -> datetime:
        if self._paused:
            return self._sim_anchor
        elapsed = self._time_fn() - self._real_anchor
        return self._sim_anchor + timedelta(seconds=elapsed * self._speed)

    def now(self) -> datetime:
        """Waktu simulasi saat ini sebagai datetime aware UTC."""
        with self._lock:
            return self._now_unlocked()

    def set(
        self,
        *,
        speed: float | None = None,
        at: datetime | None = None,
        paused: bool | None = None,
    ) -> None:
        """Ubah speed, posisi waktu, dan/atau status jeda.

        Semua argumen divalidasi dulu (ValueError bila tidak valid) sehingga
        tidak ada perubahan parsial.
        """
        new_speed = _validate_speed(speed) if speed is not None else None
        new_at = _validate_at(at) if at is not None else None
        if paused is not None and not isinstance(paused, bool):
            raise ValueError(f"paused harus bool, bukan {type(paused).__name__}")

        with self._lock:
            # Re-anchor: bekukan posisi sekarang sebelum mengubah apa pun.
            self._sim_anchor = self._now_unlocked()
            self._real_anchor = self._time_fn()

            if new_speed is not None:
                self._speed = new_speed
            if new_at is not None:
                self._sim_anchor = new_at
            if paused is not None:
                self._paused = paused
