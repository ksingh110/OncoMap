"""
K-nearest-neighbor projection of new bulk RNA-seq samples onto a fixed tumor map (2D UMAP).

Aligned with the logic in Anshul_V13_2-11-2026.R::project_new_samples_knn:
z-score expression (log2-TPM) using reference mean/sd per gene, Euclidean distance,
inverse-distance weights, interpolate VST_UMAP1_2D / VST_UMAP2_2D (and optional metadata).

Website integration
-------------------
1. Export once from R (or your ETL): reference ``log2_tpm`` (genes × samples), ``batch_corrected_map``
   coordinates (at least sampleName, VST_UMAP1_2D, VST_UMAP2_2D), optional metadata rows keyed by
   sample id, and ``feature_genes_projector`` as a JSON list.
2. Store as Parquet/CSV on the server; load at process start.
3. Build ``TumorMapKNNProjector`` and call ``project()`` per uploaded profile; return
   ``projection_to_json(summary, neighbors)`` to the front end.

Example (FastAPI)::

    from knn_map_projection import TumorMapKNNProjector, projection_to_json
    # projector = global singleton loaded from Parquet
    summary, neigh = projector.project(query_df, k=15)
    return projection_to_json(summary, neigh)

Cell Genomics (2024) S2666-979X(24)00132-0: confirm k, metric, and normalization in their Methods
if you need strict parity with the paper.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from typing import Any, Literal

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors

Weighting = Literal["uniform", "invdist"]


def align_query_to_genes(
    query_log2tpm: pd.DataFrame,
    ref_genes: list[str],
    *,
    fill_value: float = 0.0,
    min_overlap_frac: float = 0.0,
) -> pd.DataFrame:
    """Align query matrix (genes × samples) to ``ref_genes`` order; missing genes filled."""
    qgenes = query_log2tpm.index.astype(str)
    ref_genes = [str(g) for g in ref_genes]
    overlap = [g for g in ref_genes if g in set(qgenes)]
    if len(ref_genes) and len(overlap) / len(ref_genes) < min_overlap_frac:
        raise ValueError(
            f"Gene overlap {len(overlap)}/{len(ref_genes)} is below min_overlap_frac={min_overlap_frac}."
        )
    out = pd.DataFrame(
        fill_value,
        index=ref_genes,
        columns=query_log2tpm.columns,
        dtype=np.float64,
    )
    common = [g for g in ref_genes if g in qgenes]
    out.loc[common, :] = query_log2tpm.loc[common, :].astype(np.float64)
    return out


def _weighted_mean(values: np.ndarray, weights: np.ndarray) -> float:
    m = np.isfinite(values) & np.isfinite(weights)
    if not np.any(m):
        return math.nan
    w = weights[m]
    w = w / np.sum(w)
    return float(np.sum(values[m] * w))


def _weighted_mode(values: np.ndarray, weights: np.ndarray) -> Any:
    from collections import defaultdict

    acc: defaultdict[str, float] = defaultdict(float)
    for v, w in zip(values, weights):
        if v is None or (isinstance(v, float) and math.isnan(v)):
            continue
        key = str(v)
        acc[key] += float(w)
    if not acc:
        return None
    return max(acc, key=lambda k: acc[k])


@dataclass
class TumorMapKNNProjector:
    """
    Reference: log2-TPM (genes × samples), UMAP coordinates and optional metadata per sample.
    """

    ref_log2tpm: pd.DataFrame
    ref_coords: pd.DataFrame
    ref_meta: pd.DataFrame | None = None
    feature_genes: list[str] | None = None
    sample_id_col: str = "sampleName"
    umap_cols: tuple[str, str] = ("VST_UMAP1_2D", "VST_UMAP2_2D")
    _ref_sample_ids: list[str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        if self.sample_id_col not in self.ref_coords.columns:
            raise ValueError(f"ref_coords missing column {self.sample_id_col!r}")
        u1, u2 = self.umap_cols
        for c in (u1, u2):
            if c not in self.ref_coords.columns:
                raise ValueError(f"ref_coords missing UMAP column {c!r}")

        ids = self.ref_coords[self.sample_id_col].astype(str).tolist()
        miss = set(ids) - set(self.ref_log2tpm.columns.astype(str))
        if miss:
            raise ValueError(f"{len(miss)} ref_coords samples missing from ref_log2tpm columns.")

        # Same column order as coords table
        self.ref_log2tpm = self.ref_log2tpm.loc[:, ids].copy()
        self._ref_sample_ids = ids

        if self.ref_meta is not None:
            self.ref_meta = self.ref_meta.copy()
            self.ref_meta.index = self.ref_meta.index.astype(str)
            meta_ix = set(self.ref_meta.index.astype(str))
            miss_m = set(ids) - meta_ix
            if miss_m:
                raise ValueError(f"{len(miss_m)} reference samples missing from ref_meta index.")

        rg = set(self.ref_log2tpm.index.astype(str))
        if self.feature_genes is not None:
            fg = set(str(g) for g in self.feature_genes)
            g0 = sorted(rg & fg)
        else:
            g0 = sorted(rg)
        if len(g0) < 20:
            raise ValueError(
                f"Need at least 20 reference feature genes (ref ∩ feature_genes); got {len(g0)}."
            )

    def _common_genes(self, query_genes: set[str]) -> list[str]:
        rg = set(self.ref_log2tpm.index.astype(str))
        qg = query_genes
        if self.feature_genes is not None:
            fg = set(str(g) for g in self.feature_genes)
            common = sorted(rg & qg & fg)
        else:
            common = sorted(rg & qg)
        return common

    def project(
        self,
        query_log2tpm: pd.DataFrame,
        *,
        k: int = 15,
        weighting: Weighting = "invdist",
        min_genes: int = 20,
        meta_numeric_cols: list[str] | None = None,
        meta_categorical_cols: list[str] | None = None,
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        """
        Parameters
        ----------
        query_log2tpm
            Genes × samples (same units as reference: log2-TPM).
        meta_numeric_cols / meta_categorical_cols
            Subset of ref_meta columns to summarize from neighbors (weighted mean / mode).
            If None and ref_meta is set, auto: all numeric → mean, all non-numeric → mode.

        Returns
        -------
        summary : one row per query sample (projected UMAP + optional meta projections).
        neighbors : long table of neighbor ids, distances, weights per query.
        """
        genes = self._common_genes(set(query_log2tpm.index.astype(str)))
        if len(genes) < min_genes:
            raise ValueError(
                f"Too few overlapping genes between query, reference, and feature set: {len(genes)} < {min_genes}."
            )

        ref_sub = self.ref_log2tpm.loc[genes, self._ref_sample_ids].values.astype(np.float64)
        mean = np.nanmean(ref_sub, axis=1)
        sd = np.nanstd(ref_sub, axis=1, ddof=0)
        sd = np.where(np.isnan(sd) | (sd < 1e-12), 1.0, sd)

        q_aligned = query_log2tpm.loc[genes, :].astype(np.float64)
        new_sub = q_aligned.values.astype(np.float64)
        ref_z = (ref_sub - mean[:, None]) / sd[:, None]
        new_z = (new_sub - mean[:, None]) / sd[:, None]

        ref_X = ref_z.T
        query_X = new_z.T
        k_eff = min(k, ref_X.shape[0])
        nn = NearestNeighbors(metric="euclidean", algorithm="auto", n_neighbors=k_eff)
        nn.fit(ref_X)
        dist, idx = nn.kneighbors(query_X)

        u1, u2 = self.umap_cols
        coord1 = self.ref_coords.set_index(self.sample_id_col)[u1].reindex(self._ref_sample_ids).values
        coord2 = self.ref_coords.set_index(self.sample_id_col)[u2].reindex(self._ref_sample_ids).values

        if weighting == "uniform":
            w = np.full_like(dist, 1.0 / k_eff, dtype=np.float64)
        else:
            w = 1.0 / (dist + 1e-8)
            w = w / np.sum(w, axis=1, keepdims=True)

        qcols = list(q_aligned.columns)
        n_q = len(qcols)
        pu1 = np.zeros(n_q)
        pu2 = np.zeros(n_q)
        for j in range(n_q):
            jj = idx[j]
            ww = w[j]
            pu1[j] = _weighted_mean(coord1[jj], ww)
            pu2[j] = _weighted_mean(coord2[jj], ww)

        summary = pd.DataFrame(
            {
                "sample_id": qcols,
                "projected_umap1": pu1,
                "projected_umap2": pu2,
                "nearest_distance": dist[:, 0],
                "mean_knn_distance": np.mean(dist, axis=1),
            }
        )

        if self.ref_meta is not None:
            num_cols, cat_cols = self._resolve_meta_cols(meta_numeric_cols, meta_categorical_cols)
            for col in num_cols:
                vals = self.ref_meta.reindex(self._ref_sample_ids)[col].values
                proj = np.empty(n_q)
                for j in range(n_q):
                    jj = idx[j]
                    proj[j] = _weighted_mean(vals[jj], w[j])
                summary[f"projected_{col}"] = proj
            for col in cat_cols:
                vals = self.ref_meta.reindex(self._ref_sample_ids)[col].values
                out = []
                for j in range(n_q):
                    jj = idx[j]
                    out.append(_weighted_mode(vals[jj], w[j]))
                summary[f"predicted_{col}"] = out

        neigh_rows = []
        for j, sid in enumerate(qcols):
            jj = idx[j]
            ww = w[j]
            for rank in range(k_eff):
                nid = self._ref_sample_ids[jj[rank]]
                row = {
                    "query_sample": sid,
                    "neighbor_rank": rank + 1,
                    "neighbor_sample": nid,
                    "distance": float(dist[j, rank]),
                    "weight": float(ww[rank]),
                }
                if "dataset" in self.ref_coords.columns:
                    ds = self.ref_coords.set_index(self.sample_id_col)["dataset"]
                    row["neighbor_dataset"] = ds.get(nid, None)
                neigh_rows.append(row)

        neighbors = pd.DataFrame(neigh_rows)
        return summary, neighbors

    def _resolve_meta_cols(
        self,
        meta_numeric_cols: list[str] | None,
        meta_categorical_cols: list[str] | None,
    ) -> tuple[list[str], list[str]]:
        assert self.ref_meta is not None
        if meta_numeric_cols is not None or meta_categorical_cols is not None:
            num = list(meta_numeric_cols or [])
            cat = list(meta_categorical_cols or [])
            return num, cat
        num, cat = [], []
        for col in self.ref_meta.columns:
            if pd.api.types.is_numeric_dtype(self.ref_meta[col]):
                num.append(col)
            else:
                cat.append(col)
        return num, cat


def plot_projection_overlay(
    ref_coords: pd.DataFrame,
    summary: pd.DataFrame,
    *,
    umap_cols: tuple[str, str] = ("VST_UMAP1_2D", "VST_UMAP2_2D"),
    out_path: str | None = None,
):
    """
    Matplotlib scatter: reference (grey) + projected queries (red). Optional ``out_path`` PNG.
    """
    import matplotlib.pyplot as plt

    u1, u2 = umap_cols
    fig, ax = plt.subplots(figsize=(8, 8))
    ax.scatter(
        ref_coords[u1],
        ref_coords[u2],
        c="lightgray",
        s=12,
        alpha=0.45,
        linewidths=0,
        label="Reference",
    )
    ax.scatter(
        summary["projected_umap1"],
        summary["projected_umap2"],
        c="firebrick",
        s=36,
        alpha=0.9,
        label="Projected",
    )
    ax.set_xlabel(u1)
    ax.set_ylabel(u2)
    ax.legend(loc="best")
    ax.set_title("KNN projection on tumor map")
    fig.tight_layout()
    if out_path is not None:
        fig.savefig(out_path, dpi=150)
    return fig, ax


def projection_to_json(summary: pd.DataFrame, neighbors: pd.DataFrame) -> dict[str, Any]:
    """Convert projection outputs to JSON-serializable structures (for FastAPI/Flask)."""
    def _clean_records(df: pd.DataFrame) -> list[dict[str, Any]]:
        records = df.replace({np.nan: None}).to_dict(orient="records")
        out = []
        for r in records:
            row = {}
            for k, v in r.items():
                if hasattr(v, "item"):
                    v = v.item()
                if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                    row[k] = None
                else:
                    row[k] = v
            out.append(row)
        return out

    return {
        "summary": _clean_records(summary),
        "neighbors": _clean_records(neighbors),
    }


def load_projector_config(path_json: str) -> dict[str, Any]:
    """Load JSON sidecar written next to exported reference tables (see module docstring)."""
    with open(path_json, encoding="utf-8") as f:
        return json.load(f)


def sweep_k_leave_one_out(
    projector: TumorMapKNNProjector,
    k_values: list[int],
    *,
    weighting: Weighting = "invdist",
) -> pd.DataFrame:
    """Mean / median map-space error vs k (expensive: refits leave-one-out per k)."""
    rows = []
    for k in k_values:
        df = leave_one_out_map_error(projector, k=k, weighting=weighting)
        rows.append(
            {
                "k": k,
                "weighting": weighting,
                "mean_map_error": float(df["map_euclidean_error"].mean()),
                "median_map_error": float(df["map_euclidean_error"].median()),
            }
        )
    return pd.DataFrame(rows)


def leave_one_out_map_error(
    projector: TumorMapKNNProjector,
    *,
    k: int = 15,
    weighting: Weighting = "invdist",
) -> pd.DataFrame:
    """
    Leave-one-reference-sample-out: predict each reference sample using the others; report
    Euclidean error in UMAP space (sanity check, in-distribution).
    """
    u1, u2 = projector.umap_cols
    true1 = projector.ref_coords.set_index(projector.sample_id_col)[u1].reindex(projector._ref_sample_ids).values
    true2 = projector.ref_coords.set_index(projector.sample_id_col)[u2].reindex(projector._ref_sample_ids).values

    errors = []
    for i, sid in enumerate(projector._ref_sample_ids):
        sub_ids = [s for j, s in enumerate(projector._ref_sample_ids) if j != i]
        sub_log = projector.ref_log2tpm.loc[:, sub_ids]
        sub_coords = projector.ref_coords[
            projector.ref_coords[projector.sample_id_col].astype(str).isin(sub_ids)
        ].copy()
        sub_meta = None
        if projector.ref_meta is not None:
            sub_meta = projector.ref_meta.loc[sub_ids]

        p = TumorMapKNNProjector(
            sub_log,
            sub_coords,
            sub_meta,
            feature_genes=projector.feature_genes,
            sample_id_col=projector.sample_id_col,
            umap_cols=projector.umap_cols,
        )
        q = projector.ref_log2tpm.loc[:, [sid]]
        summ, _ = p.project(q, k=k, weighting=weighting)
        e = math.hypot(summ["projected_umap1"].iloc[0] - true1[i], summ["projected_umap2"].iloc[0] - true2[i])
        errors.append({"sample_id": sid, "map_euclidean_error": e})
    return pd.DataFrame(errors)
