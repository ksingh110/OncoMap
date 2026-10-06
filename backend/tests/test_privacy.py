import io
import tempfile
import werkzeug.formparser
from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest

import app as api
from privacy import MAX_FILE_BYTES, MAX_REQUEST_BYTES, MemoryUpload
from services import parse_uploaded_expression


@pytest.fixture
def client():
    return api.app.test_client()


def upload(client, body=b"gene,patient-secret\nTP53,1\n", filename="patient-secret.csv", **kwargs):
    return client.post("/predict", data={"file": (io.BytesIO(body), filename)}, **kwargs)


@pytest.fixture
def mock_prediction(monkeypatch):
    calls = []
    def predict(artifacts, expr, **kwargs):
        calls.append((expr.columns.tolist(), kwargs))
        return {"response_probability": 0.5, "summary": {"query_sample": expr.columns[0]},
                "insights": {}, "neighbors": None}
    monkeypatch.setattr(api, "run_projection_and_prediction", predict)
    return calls


def test_large_upload_never_uses_temporary_files(client, monkeypatch, mock_prediction):
    def forbidden(*args, **kwargs):
        raise AssertionError("Upload must not touch disk")
    monkeypatch.setattr(tempfile, "TemporaryFile", forbidden)
    monkeypatch.setattr(tempfile, "SpooledTemporaryFile", forbidden)
    monkeypatch.setattr(werkzeug.formparser, "SpooledTemporaryFile", forbidden)
    monkeypatch.setattr(werkzeug.formparser, "default_stream_factory", forbidden)
    closed = []
    original = MemoryUpload.close
    def close(self):
        original(self)
        closed.append(self.closed)
    monkeypatch.setattr(MemoryUpload, "close", close)
    # Larger than Werkzeug's default 500 KiB rollover threshold.
    body = b"gene,patient-secret\n" + b"".join(f"ENSG{i:011d},123456789.0\n".encode() for i in range(30_000))
    body = body.replace(b"123456789.0", b"123456.0")
    assert len(body) > 512_000
    response = upload(client, body)
    assert response.status_code == 200
    assert mock_prediction[0][0] == ["uploaded_sample"]
    assert b"patient-secret" not in response.data
    assert "neighbors" not in response.json
    assert closed and all(closed)


@pytest.mark.parametrize("body", [b"gene,x\nTP53,patient-secret", b"gene,x\nTP53,NaN", b"gene,x\nTP53,inf",
                                   b"gene,x\nTP53,-1", b"gene,x\nTP53,1\nTP53,2", b"gene,x,y\nTP53,1,2",
                                   b"gene,x\n,1", b"gene,x\nTP53,1e309", b"gene,x\nTP53,1000000000001"])
def test_invalid_input_has_generic_errors(client, body, mock_prediction, caplog):
    response = upload(client, body)
    assert response.status_code == 400
    assert "patient-secret" not in response.get_data(as_text=True)
    assert "patient-secret" not in caplog.text
    assert not mock_prediction


@pytest.mark.parametrize("field,value", [("age", "nan"), ("age", "patient-secret"), ("age", "121"),
                                         ("gender", "patient-secret"), ("hpv_status", "unknown"), ("age_missing", "yes")])
def test_clinical_validation(client, field, value, mock_prediction):
    response = client.post("/predict", data={"file": (io.BytesIO(b"gene,x\nTP53,1"), "x.csv"), field: value})
    assert response.status_code == 400
    assert "patient-secret" not in response.get_data(as_text=True)
    assert not mock_prediction


def test_size_limits_and_partial_stream_cleanup(client, mock_prediction, monkeypatch):
    closed = []
    original = MemoryUpload.close
    def close(self):
        original(self)
        closed.append(self.closed)
    monkeypatch.setattr(MemoryUpload, "close", close)
    assert upload(client, b"x" * (MAX_FILE_BYTES + 1)).status_code == 413
    assert closed and all(closed)
    assert upload(client, b"x" * (MAX_REQUEST_BYTES + 1)).status_code == 413
    assert not mock_prediction


def test_origin_and_content_type_restrictions(client, mock_prediction):
    assert upload(client, headers={"Origin": "https://attacker.invalid"}).status_code == 403
    assert upload(client, headers={"Origin": "https://oncomap.us.attacker.invalid"}).status_code == 403
    assert client.post("/predict", json={"gene": "patient-secret"}).status_code == 415
    response = upload(client, headers={"Origin": "https://oncomap.us"})
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "https://oncomap.us"
    assert "Access-Control-Allow-Credentials" not in response.headers
    response = client.options("/predict", headers={"Origin": "https://attacker.invalid", "Access-Control-Request-Method": "POST"})
    assert "Access-Control-Allow-Origin" not in response.headers


def test_all_responses_are_no_store(client, mock_prediction):
    responses = [upload(client), upload(client, b"invalid"), client.get("/"), client.get("/reference-map"),
                 client.get("/missing"), client.post("/predict?patient=secret")]
    for response in responses:
        assert "no-store" in response.headers["Cache-Control"]
        assert response.headers["Referrer-Policy"] == "no-referrer"
        assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_internal_errors_do_not_leak_or_log_data(client, monkeypatch, caplog):
    def broken(*args, **kwargs):
        raise RuntimeError("patient-secret /private/path/to/model")
    monkeypatch.setattr(api, "run_projection_and_prediction", broken)
    response = upload(client)
    assert response.status_code == 500
    assert "patient-secret" not in response.get_data(as_text=True)
    assert "patient-secret" not in caplog.text


def test_concurrent_prediction_rejected_without_parsing(monkeypatch):
    started, release = Event(), Event()
    def slow(*args, **kwargs):
        started.set()
        assert release.wait(10)
        return {"response_probability": 0.5, "summary": {}, "insights": {}}
    monkeypatch.setattr(api, "run_projection_and_prediction", slow)
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(lambda: upload(api.app.test_client()))
        assert started.wait(10)
        try:
            with api.app.test_client() as client:
                response = upload(client, b"patient-secret malformed")
                assert response.status_code == 503
        finally:
            release.set()
        assert future.result().status_code == 200


def test_tsv_bom_and_sample_identifier_removal():
    frame = parse_uploaded_expression(b"\xef\xbb\xbfgene\tpatient-secret\nTP53\t1.5\n", "x.tsv")
    assert frame.columns.tolist() == ["uploaded_sample"]
    assert frame.loc["TP53", "uploaded_sample"] == 1.5


def test_unsupported_and_long_records():
    with pytest.raises(ValueError):
        parse_uploaded_expression(b"{}", "x.json")
    with pytest.raises(ValueError):
        parse_uploaded_expression(b"gene," + b"x" * 2048, "x.csv")


def test_extra_files_and_duplicate_fields_rejected(client, mock_prediction):
    from werkzeug.datastructures import MultiDict
    response = client.post("/predict", data=MultiDict([
        ("file", (io.BytesIO(b"gene,x\nTP53,1"), "x.csv")),
        ("age", "60"), ("age", "20"),
    ]))
    assert response.status_code == 400
    response = client.post("/predict", data={
        "file": (io.BytesIO(b"gene,x\nTP53,1"), "x.csv"),
        "extra": (io.BytesIO(b"patient-secret"), "other.csv"),
    })
    assert response.status_code == 400
    assert not mock_prediction


def test_gene_count_is_bounded(monkeypatch):
    import services
    monkeypatch.setattr(services, "MAX_GENE_ROWS", 2)
    with pytest.raises(ValueError):
        parse_uploaded_expression(b"gene,x\nA,1\nB,2\nC,3\n", "x.csv")
