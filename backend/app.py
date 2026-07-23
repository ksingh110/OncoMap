from flask import Flask, request, jsonify
from flask_cors import CORS

from services import (
    load_artifacts,
    parse_uploaded_expression,
    run_projection_and_prediction,
)

app = Flask(__name__)
CORS(app)


# Load once when server starts
artifacts = load_artifacts()


@app.route("/")
def home():
    return {
        "status": "OncoMap API running"
    }


@app.route("/analyze", methods=["POST"])
def analyze():

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

        return jsonify({
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
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 400


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000
    )