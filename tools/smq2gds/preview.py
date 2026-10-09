"""Layout preview PNG straight from the GDS polygons (matplotlib, no KLayout GUI needed)."""
from __future__ import annotations

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection


def _polys(comp):
    dbu = comp.kcl.dbu
    out = {}
    for li, ps in comp.get_polygons().items():
        info = comp.kcl.layer_infos()[li]
        out[(info.layer, info.datatype)] = [[(p.x * dbu, p.y * dbu) for p in poly.each_point_hull()] for poly in ps]
    return out


def png(comp, d: dict, path: str) -> None:
    polys = _polys(comp)
    g = d["geometry"]
    spiral = g["pcell"] == "spiral"
    fig, axs = plt.subplots(1, 2 if spiral else 1, figsize=(11 if spiral else 8, 5.2), squeeze=False)
    colors = {(1, 0): "#2b6cb0", (34, 0): "#c05621", (64, 0): "none"}
    for k, ax in enumerate(axs[0]):
        for lay, ps in polys.items():
            fc = colors.get(lay, "#888")
            if fc == "none":
                ax.add_collection(PolyCollection(ps, facecolors="none", edgecolors="#aaa", linewidths=0.5, linestyles="--"))
            else:
                ax.add_collection(PolyCollection(ps, facecolors=fc, edgecolors=fc, linewidths=0.2))
        bb = comp.bbox()
        dbu = 1.0
        if k == 0:
            ax.set_xlim(bb.left * dbu - 2, bb.right * dbu + 2)
            ax.set_ylim(bb.bottom * dbu - 2, bb.top * dbu + 2)
        else:  # zoom on the S-bend
            z = 3.2 * g["rin_um"]
            ax.set_xlim(-z, z)
            ax.set_ylim(-z, z)
        for p in comp.ports:
            ax.plot(*p.center, "o", ms=4, color="#d53f8c")
            if k == 0:
                ax.annotate(p.name, p.center, textcoords="offset points", xytext=(4, 4), fontsize=8, color="#d53f8c")
        ax.set_aspect("equal")
        ax.set_xlabel("x (µm)")
        ax.set_ylabel("y (µm)")
        ax.grid(alpha=0.2)
    t = f"{d['platform']['id']} · {d['level']['id']} · {d['level']['device']}"
    if spiral:
        t += f"\nτ {g['tau_ns']} ns, W {g['w_um']} µm, pitch {g['pitch_um']} µm, r_in {g['rin_um']} µm, S-bend {g['sbend']}"
        axs[0][1].set_title("centre S-bend (zoom)", fontsize=9)
    else:
        t += f"\nW {g['W_um']} × L {g['L_um']} µm, wₜ {g['wt_um']} µm, s {g['s_um']} µm, taper {g['taper_len_um']} µm"
    fig.suptitle(t, fontsize=10)
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)
