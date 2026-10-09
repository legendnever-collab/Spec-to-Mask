"""Load an smq-design/1 file and provide the same material models the game uses (so checks isolate model error, not material data)."""
from __future__ import annotations

import json
import math
from pathlib import Path

import yaml

from . import SCHEMA

HERE = Path(__file__).resolve().parent


def n_si(lam: float) -> float:
    l1, l2 = 1.1071, lam * lam
    return math.sqrt(11.6858 + 0.939816 / l2 + 0.00810461 * l1 * l1 / (l2 - l1 * l1))


def n_ox(lam: float) -> float:
    l2 = lam * lam
    return math.sqrt(1 + 0.6961663 * l2 / (l2 - 0.0684043**2) + 0.4079426 * l2 / (l2 - 0.1162414**2) + 0.8974794 * l2 / (l2 - 9.896161**2))


def n_sin(lam: float) -> float:
    l2 = lam * lam
    return math.sqrt(1 + 3.0249 * l2 / (l2 - 0.1353406**2) + 40314 * l2 / (l2 - 1239.842**2))


def n_core(mat: str, lam: float) -> float:
    return n_si(lam) if mat == "si" else n_sin(lam)


class DesignError(ValueError):
    pass


def load(path: str | Path) -> dict:
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    if d.get("schema") != SCHEMA:
        raise DesignError(f"schema must be {SCHEMA!r}, got {d.get('schema')!r}")
    for k in ("platform", "level", "params"):
        if k not in d:
            raise DesignError(f"missing field {k!r}")
    if not d.get("geometry"):
        raise DesignError(f"level {d['level'].get('id')} ({d['level'].get('kind')}) has no layout geometry yet — only MMI and delay-spiral PCells exist")
    pf = d["platform"]
    if pf.get("mat") not in ("si", "sin"):
        raise DesignError(f"unknown core material {pf.get('mat')!r}")
    return d


def layers(path: str | Path | None = None) -> dict:
    return yaml.safe_load(Path(path or HERE / "layers.yaml").read_text(encoding="utf-8"))
