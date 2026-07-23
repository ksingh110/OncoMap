import math

from flask import Flask, request, jsonify
from flask_cors import CORS

from services import (
    load_artifacts,
    parse_uploaded_expression,
    run_projection_and_prediction,
)

app = Flask(__name__)
CORS(app)


def _json_safe(value):
    """Recursively replace NaN/Inf (and numpy scalar types) with
    JSON-serializable equivalents. Real JSON has no NaN token, so
    leaving these in makes the response unparsable in the browser."""
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, float):
        return None if (math.isnan(value) or math.isinf(value)) else value
    if hasattr(value, "item"):  # numpy scalar (np.float64, np.int64, etc.)
        return _json_safe(value.item())
    return value


# Load once when server starts
artifacts = load_artifacts()

# Build the reference-cohort table once (background dots for the map),
# same merge logic the old Streamlit app used.
_ref_coords = artifacts.display_coords.copy()
_meta_side = artifacts.projector.ref_meta.reset_index()
_overlap = (set(_ref_coords.columns) & set(_meta_side.columns)) - {"sampleName"}
_meta_side = _meta_side.drop(columns=[c for c in _overlap if c in _meta_side.columns], errors="ignore")
_REFERENCE_MAP_DF = _ref_coords.merge(_meta_side, on="sampleName", how="left")


@app.route("/")
def home():
    return {
        "status": "OncoMap API running"
    }


@app.route("/reference-map", methods=["GET"])
def reference_map():
    cols = ["sampleName", "VST_UMAP1_2D", "VST_UMAP2_2D"]
    for field, col in artifacts.color_fields.items():
        if col and col in _REFERENCE_MAP_DF.columns and col not in cols:
            cols.append(col)

    df = _REFERENCE_MAP_DF[cols]

    return jsonify(_json_safe({
        "points": df.to_dict(orient="records"),
        "color_fields": artifacts.color_fields,
    }))


@app.route("/predict", methods=["POST"])
def predict():

    if "file" not in request.files:
        return jsonify({
            "error": "No RNA-seq file uploaded"
        }), 400

    file = request.files["file"]

    # Optional clinical fields (mirrors the old Streamlit expander:
    # age / age-missing / gender / hpv_status)
    age_missing = request.form.get("age_missing", "false").lower() == "true"
    age = None if age_missing else float(request.form.get("age", 60))
    gender = request.form.get("gender", "missing")
    hpv_status = request.form.get("hpv_status", "missing")

    try:
        expr = parse_uploaded_expression(
            file.read(),
            file.filename
        )

        result = run_projection_and_prediction(
            artifacts,
            expr,
            age=age,
            gender=gender,
            hpv_status=hpv_status,
            k=15
        )

        payload = {
            "response_probability":
                result["response_probability"],

            "summary":
                result["summary"],

            "neighbors":
                result["neighbors"].to_dict(
                    orient="records"
                ),

            "insights":
                result["insights"]
        }

        return jsonify(_json_safe(payload))

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 400


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000
    )