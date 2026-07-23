from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
TM_DIR = ROOT / "Tumor Map Projection"
IT_DIR = ROOT / "Immunotherapy Response Prediction"

# Streamlit OncoMap uses this module for map projection and neighborhood tables.


def _load_knn_projector_module():
    import importlib.util
    import sys

    mod_path = TM_DIR / "knn_map_projection.py"
    spec = importlib.util.spec_from_file_location("knn_map_projection", str(mod_path))
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import module from {mod_path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


def parse_uploaded_expression(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Returns expression DataFrame genes x samples (single sample preferred).
    Accepted:
      - 2-column table: gene, value
      - wide table: first col gene, remaining sample columns
    """
    if filename.lower().endswith(".tsv"):
        df = pd.read_csv(pd.io.common.BytesIO(file_bytes), sep="\t")
    else:
        df = pd.read_csv(pd.io.common.BytesIO(file_bytes))
    if df.empty or df.shape[1] < 2:
        raise ValueError("Uploaded file must have at least two columns.")
    first = str(df.columns[0]).strip().lower()
    if first != "gene":
        df = df.rename(columns={df.columns[0]: "gene"})
    df["gene"] = df["gene"].astype(str)
    if df.shape[1] == 2:
        out = pd.DataFrame(df.iloc[:, 1].to_numpy(), index=df["gene"], columns=["uploaded_sample"])
    else:
        out = df.set_index("gene")
    return out.astype(float)


@dataclass
class AppArtifacts:
    projector: object
    display_coords: pd.DataFrame
    response_model: object
    response_meta: dict
    color_fields: dict


def load_artifacts(
   
) -> AppArtifacts:
    ref_log2 = pd.read_parquet("projector_data/ref_log2tpm.parquet")
    ref_coords = pd.read_parquet("projector_data/ref_coords.parquet")
    ref_coords_proj = pd.read_parquet("projector_data/ref_coords_projector.parquet")
    ref_meta = pd.read_parquet("projector_data/ref_meta.parquet")
    from pathlib import Path
    fgenes = json.loads(Path("projector_data/feature_genes.json").read_text(encoding="utf-8")).get("feature_genes", [])
    if "sampleName" not in ref_meta.columns:
        raise ValueError("ref_meta.parquet must include sampleName")
    ref_meta = ref_meta.set_index("sampleName")

    mod = _load_knn_projector_module()
    projector = mod.TumorMapKNNProjector(
        ref_log2tpm=ref_log2,
        ref_coords=ref_coords_proj,
        ref_meta=ref_meta,
        feature_genes=fgenes,
        sample_id_col="sampleName",
        umap_cols=("VST_UMAP1_2D", "VST_UMAP2_2D"),
    )

    response_model = joblib.load("projector_data/response_model.pkl")
    response_meta = json.loads("projector_data/response_model_meta.json").read_text(encoding="utf-8")
    color_fields = {
        "dataset": "dataset" if "dataset" in ref_coords.columns else None,
        "gender": "gender" if "gender" in ref_meta.columns else None,
        "hpv_status": "hpv_status_color" if "hpv_status_color" in ref_meta.columns else None,
        "hpv_score": "hpv_score" if "hpv_score" in ref_meta.columns else None,
        "age": "age" if "age" in ref_meta.columns else None,
    }
    return AppArtifacts(
        projector=projector,
        display_coords=ref_coords,
        response_model=response_model,
        response_meta=response_meta,
        color_fields=color_fields,
    )


def run_projection_and_prediction(
    art: AppArtifacts,
    uploaded_expr: pd.DataFrame,
    *,
    age: float | None,
    gender: str,
    hpv_status: str,
    k: int = 15,
) -> dict:
    numeric_cols = [c for c in ("age", "hpv_score") if c in art.projector.ref_meta.columns]
    cat_cols = [c for c in ("gender", "hpv_status_color") if c in art.projector.ref_meta.columns]
    summary, neighbors = art.projector.project(
        uploaded_expr,
        k=k,
        weighting="invdist",
        min_genes=20,
        meta_numeric_cols=numeric_cols or None,
        meta_categorical_cols=cat_cols or None,
    )
    srow = summary.iloc[0].to_dict()
    n_top = neighbors.sort_values(["query_sample", "neighbor_rank"]).head(k).copy()

    # Build one-row feature frame for model pipeline
    model_obj = art.response_model
    if isinstance(model_obj, dict):
        pipe = model_obj["pipeline"]
    else:
        pipe = model_obj
    expected = art.response_meta.get("feature_columns_expected", [])
    genes = art.response_meta.get("gene_features", [])
    if uploaded_expr.shape[1] > 1:
        x_expr = uploaded_expr.iloc[:, 0]
    else:
        x_expr = uploaded_expr.iloc[:, 0]
    row = {}
    for g in genes:
        row[g] = float(x_expr[g]) if g in x_expr.index else 0.0
    row["age_num"] = float(age) if age is not None and not np.isnan(age) else np.nan
    row["gender"] = (gender or "missing").strip() or "missing"
    row["hpv_status"] = (hpv_status or "missing").strip() or "missing"
    X_pred = pd.DataFrame([row])
    if expected:
        for c in expected:
            if c not in X_pred.columns:
                X_pred[c] = np.nan if c == "age_num" else "missing"
        X_pred = X_pred.loc[:, expected]
    prob = float(pipe.predict_proba(X_pred)[0, 1])

    # Plain-language neighborhood summary
    if "neighbor_sample" in n_top.columns and "dataset" in art.projector.ref_coords.columns:
        ds = art.projector.ref_coords.set_index("sampleName").reindex(n_top["neighbor_sample"])["dataset"]
        top_dataset = ds.value_counts().idxmax() if ds.notna().any() else None
    else:
        top_dataset = None
    local_gender = summary.iloc[0].get("predicted_gender", None)
    local_age = summary.iloc[0].get("projected_age", None)
    local_hpv = summary.iloc[0].get("predicted_hpv_status_color", None)
    local_hpv_score = summary.iloc[0].get("projected_hpv_score", None)

    return {
        "summary": srow,
        "neighbors": n_top,
        "response_probability": prob,
        "insights": {
            "local_dataset": top_dataset,
            "local_gender_mode": local_gender,
            "local_age_estimate": local_age,
            "local_hpv_status": local_hpv,
            "local_hpv_score": local_hpv_score,
        },
    }
