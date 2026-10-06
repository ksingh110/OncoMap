import math
import os
from threading import BoundedSemaphore
from urllib.parse import urlsplit

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from privacy import MemoryOnlyRequest, MAX_REQUEST_BYTES
from services import load_artifacts, parse_uploaded_expression, run_projection_and_prediction


def _json_safe(value):
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, float):
        return None if not math.isfinite(value) else value
    if hasattr(value, "item"):
        return _json_safe(value.item())
    return value


def _allowed_origins():
    origins = os.environ.get("ONCOMAP_ALLOWED_ORIGINS", "https://oncomap.us,https://www.oncomap.us").split(",")
    origins = [origin.strip() for origin in origins if origin.strip()]
    for origin in origins:
        parsed = urlsplit(origin)
        local = parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        if (parsed.scheme not in {"https", "http"} or not parsed.hostname or
                (parsed.scheme == "http" and not local) or parsed.username or parsed.password or
                parsed.path or parsed.query or parsed.fragment or "*" in origin):
            raise RuntimeError("ONCOMAP_ALLOWED_ORIGINS must contain exact HTTPS origins (HTTP only on localhost).")
    return origins


def _clinical_fields():
    allowed = {"age_missing", "age", "gender", "hpv_status"}
    if set(request.form) - allowed or any(len(request.form.getlist(key)) != 1 for key in request.form):
        raise ValueError("Invalid clinical fields")
    if any(len(value) > 32 for value in request.form.values()):
        raise ValueError("Invalid clinical fields")
    missing = request.form.get("age_missing", "false")
    if missing not in {"true", "false"}:
        raise ValueError("Invalid age_missing")
    age = None if missing == "true" else float(request.form.get("age", "60"))
    if age is not None and (not math.isfinite(age) or not 0 <= age <= 120):
        raise ValueError("Invalid age")
    gender = request.form.get("gender", "missing")
    hpv = request.form.get("hpv_status", "missing")
    if gender not in {"missing", "male", "female"} or hpv not in {"missing", "positive", "negative"}:
        raise ValueError("Invalid clinical category")
    return age, gender, hpv


def create_app(artifacts=None):
    app = Flask(__name__)
    app.request_class = MemoryOnlyRequest
    app.config.update(MAX_CONTENT_LENGTH=MAX_REQUEST_BYTES,
                      MAX_FORM_MEMORY_SIZE=128 * 1024, MAX_FORM_PARTS=8)
    origins = _allowed_origins()
    CORS(app, resources={r"/predict": {"origins": origins}, r"/reference-map": {"origins": origins}},
         methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type"], supports_credentials=False)
    # Limit expensive projections to one per worker, without retaining bodies in a queue.
    prediction_slot = BoundedSemaphore(1)
    artifacts = artifacts if artifacts is not None else load_artifacts()
    coords = artifacts.display_coords.copy()
    metadata = artifacts.projector.ref_meta.reset_index()
    overlap = (set(coords.columns) & set(metadata.columns)) - {"sampleName"}
    metadata = metadata.drop(columns=list(overlap), errors="ignore")
    reference_map = coords.merge(metadata, on="sampleName", how="left")

    @app.before_request
    def check_request():
        # Query strings are routinely recorded in proxy/access logs.
        if request.query_string:
            return jsonify(error="Query parameters are not accepted."), 400
        origin = request.headers.get("Origin")
        if origin is not None and origin not in origins:
            return jsonify(error="Origin not allowed."), 403
        if request.path == "/predict" and request.method == "POST" and request.mimetype != "multipart/form-data":
            return jsonify(error="Use a multipart CSV or TSV upload."), 415

    @app.after_request
    def privacy_headers(response):
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return response

    @app.errorhandler(HTTPException)
    def http_error(error):
        messages = {413: "Upload exceeds the size or form limits.", 404: "Not found.", 405: "Method not allowed."}
        return jsonify(error=messages.get(error.code, "Request rejected.")), error.code

    @app.errorhandler(Exception)
    def internal_error(error):
        # Do not log exceptions/traceback locals: parsers may include patient values.
        return jsonify(error="Unable to process the request."), 500

    @app.get("/")
    def home():
        return jsonify(status="OncoMap API running")

    @app.get("/reference-map")
    def reference_map_response():
        cols = ["sampleName", "VST_UMAP1_2D", "VST_UMAP2_2D"]
        for col in artifacts.color_fields.values():
            if col and col in reference_map.columns and col not in cols:
                cols.append(col)
        return jsonify(_json_safe({"points": reference_map[cols].to_dict(orient="records"),
                                   "color_fields": artifacts.color_fields}))

    @app.post("/predict")
    def predict():
        if not prediction_slot.acquire(blocking=False):
            return jsonify(error="Analysis is busy. Please try again shortly."), 503
        expr = result = payload = upload = None
        try:
            if set(request.files) != {"file"} or len(request.files.getlist("file")) != 1:
                return jsonify(error="Upload exactly one CSV or TSV file."), 400
            upload = request.files["file"]
            age, gender, hpv = _clinical_fields()
            # Read straight from the memory stream, avoiding an extra full byte copy.
            expr = parse_uploaded_expression(upload.stream, upload.filename or "")
            # The raw CSV is no longer needed once parsed.
            upload.close()
            result = run_projection_and_prediction(artifacts, expr, age=age, gender=gender, hpv_status=hpv, k=15)
            payload = {"response_probability": result["response_probability"], "summary": result["summary"],
                       "insights": result["insights"]}
            # Neighbor-level information is not used by the UI; minimize returned data.
            return jsonify(_json_safe(payload))
        except (ValueError, UnicodeError):
            return jsonify(error="Invalid input. Use one sample with unique genes and finite numeric expression values; check clinical fields."), 400
        finally:
            if upload is not None:
                upload.close()
            expr = result = payload = None
            prediction_slot.release()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
