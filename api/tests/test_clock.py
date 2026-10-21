from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from core.clock import Clock, ClockLike
from tests.fakes import FakeClock

START = datetime(2026, 1, 1, 7, 0, tzinfo=timezone.utc)


class FakeTime:
    """Pengganti time.monotonic yang dimajukan manual."""

    def __init__(self) -> None:
        self.t = 1000.0

    def __call__(self) -> float:
        return self.t

    def tick(self, seconds: float) -> None:
        self.t += seconds


@pytest.fixture
def real() -> FakeTime:
    return FakeTime()


def make_clock(real: FakeTime, speed: float = 1.0) -> Clock:
    clock = Clock(speed=speed, time_fn=real)
    clock.set(at=START)
    return clock


def test_now_is_aware_utc(real: FakeTime) -> None:
    now = make_clock(real).now()
    assert now.tzinfo is not None
    assert now.utcoffset() == timedelta(0)


def test_speed_1_follows_real_time(real: FakeTime) -> None:
    clock = make_clock(real)
    real.tick(5)
    assert clock.now() == START + timedelta(seconds=5)


def test_speed_60_one_real_second_is_sixty_sim_seconds(real: FakeTime) -> None:
    clock = make_clock(real, speed=60)
    real.tick(1)
    assert clock.now() == START + timedelta(seconds=60)


def test_changing_speed_midway_does_not_jump(real: FakeTime) -> None:
    clock = make_clock(real, speed=1)
    real.tick(10)
    before = clock.now()
    clock.set(speed=60)
    assert clock.now() == before
    real.tick(2)
    assert clock.now() == before + timedelta(seconds=120)


def test_pause_freezes_time(real: FakeTime) -> None:
    clock = make_clock(real, speed=60)
    real.tick(1)
    clock.set(paused=True)
    frozen = clock.now()
    real.tick(100)
    assert clock.now() == frozen
    assert clock.paused


def test_resume_continues_from_frozen_point(real: FakeTime) -> None:
    clock = make_clock(real, speed=60)
    real.tick(1)
    clock.set(paused=True)
    frozen = clock.now()
    real.tick(100)
    clock.set(paused=False)
    assert clock.now() == frozen
    real.tick(1)
    assert clock.now() == frozen + timedelta(seconds=60)


def test_set_at_while_paused_stays_frozen_at_new_point(real: FakeTime) -> None:
    clock = make_clock(real)
    clock.set(paused=True)
    target = START + timedelta(hours=3)
    clock.set(at=target)
    real.tick(50)
    assert clock.now() == target


def test_set_at_converts_to_utc(real: FakeTime) -> None:
    clock = make_clock(real)
    wib = timezone(timedelta(hours=7))
    clock.set(at=datetime(2026, 1, 1, 14, 0, tzinfo=wib))
    assert clock.now() == START
    assert clock.now().utcoffset() == timedelta(0)


def test_naive_datetime_raises(real: FakeTime) -> None:
    clock = make_clock(real)
    with pytest.raises(ValueError):
        clock.set(at=datetime(2026, 1, 1, 7, 0))  # noqa: DTZ001 - sengaja naive


@pytest.mark.parametrize("speed", [0, -1, 600.0001, 1000])
def test_speed_out_of_range_raises(real: FakeTime, speed: float) -> None:
    with pytest.raises(ValueError):
        Clock(speed=speed, time_fn=real)
    clock = make_clock(real)
    with pytest.raises(ValueError):
        clock.set(speed=speed)


def test_speed_boundary_600_allowed(real: FakeTime) -> None:
    clock = make_clock(real)
    clock.set(speed=600)
    real.tick(1)
    assert clock.now() == START + timedelta(minutes=10)


def test_invalid_set_does_not_partially_apply(real: FakeTime) -> None:
    clock = make_clock(real)
    with pytest.raises(ValueError):
        clock.set(speed=60, at=datetime(2026, 1, 1))  # noqa: DTZ001 - sengaja naive
    assert clock.speed == 1.0
    assert clock.now() == START


def test_fake_clock_satisfies_protocol() -> None:
    fake = FakeClock(START)
    clock: ClockLike = fake
    assert clock.now() == START
    fake.advance(minutes=5)
    assert clock.now() == START + timedelta(minutes=5)
    fake.set(START + timedelta(days=1))
    assert clock.now() == START + timedelta(days=1)
