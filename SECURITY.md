# Genetic data handling and deployment

## What this application does

RNA expression and optional clinical fields are sent directly from the browser
to the configured Python API over HTTPS. The v0/Vercel frontend does not proxy
the upload through a server action. The backend parses one sample per request,
projects it, predicts the response, and returns the result. There is no upload
folder, database, result cache, training update, analytics event, or application
log containing uploaded data. Reference/model files are read-only inputs.

Uploads use bounded RAM-only streams. The application never calls Werkzeug's
spooled upload implementation and cannot roll an upload to a temporary file.
The stream is closed and its mutable buffer overwritten after parsing, including
partial/malformed uploads. Parsed tables and prediction results are request-local
and their references are released after the response is built. Uploaded filenames
are replaced in the browser and sample headers are replaced in the parser.

The browser keeps results only in page memory until reset, navigation, or page
exit. The file input is cleared immediately and the file is not retained in React
state. Requests omit cookies/referrers, reject redirects, and use `no-store`.
Legacy OncoMap offline caches are retired and analytics is removed. Uploads are
limited to 4 MiB / 60,000 unique genes, one sample, CSV or TSV. Clinical fields are
validated, errors are generic, and one prediction runs per server worker.

This is **application-level non-retention**, not a guarantee that data can never
leak. The server necessarily sees plaintext in RAM to perform inference. Python,
NumPy, HTTP stacks, and browsers make copies that cannot be reliably zeroized.
Browser extensions, compromised devices/servers, swap, core dumps, APM agents,
or hosting/proxy capture remain outside the application guarantee. Cancelling a
browser request stops delivery but may not interrupt inference already running.
No HIPAA compliance or absolute zero retention claim is made.

## v0 / Vercel frontend

1. Use `frontend` as the project root, install with
   `pnpm install --frozen-lockfile`, and build with `pnpm build`.
2. Set `NEXT_PUBLIC_API_URL` to the exact HTTPS Render origin, with no path,
   query, fragment, or credentials (e.g. `https://YOUR-SERVICE.onrender.com`).
   Rebuild after changing it: Next.js embeds this public URL in the client and
   uses it for the Content Security Policy. Do not put secrets in public vars.
3. Do not add analytics, session replay, error/trace capture of bodies or locals,
   browser-storage persistence, prediction server actions, or third-party script
   tags to `/model`. Vercel host-level logging settings must be reviewed separately.
4. Old service workers and `oncomap*` Cache Storage entries are removed when
   visitors load the new frontend. Previously installed offline copies are not
   remotely erased until clients come online and receive the update.

## Existing Render backend service

Change the existing service rather than creating a second public backend:

- Root directory: `backend`.
- Build command:
  `python -m pip install --upgrade 'pip>=26.2.1' 'setuptools>=84.0.0' && python -m pip install -r requirements.txt`.
- Start command: `gunicorn -c gunicorn.conf.py app:app`.
- Environment: `ONCOMAP_ALLOWED_ORIGINS=https://oncomap.us,https://www.oncomap.us`.
  Add another origin only if you actually use it; use an exact origin, not a
  wildcard for v0/Vercel previews. Local development can use exact localhost HTTP
  origins. Preview apps are deliberately not allowed by default.
- Health check path: `/`. Keep debug mode off and do not attach a persistent disk
  for uploads/results. The Gunicorn config disables application access logs,
  disables core dumps, uses one worker/two threads to bound inference concurrency,
  and puts its heartbeat file on `/dev/shm` (not patient upload storage).
- Verify that the service's configured start command actually loads this config.
  Remove custom `GUNICORN_CMD_ARGS`/logging overrides that enable access or request
  capture. Do not enable APM/session replay that records inputs, outputs, or local
  variables. Do not log upload filenames, CSV contents, predictions, or clinical
  fields. Do not send these values in URLs.
- Ask Render to confirm edge proxy buffering, request/response body retention,
  swap/memory snapshots, diagnostic crash collection, and applicable contractual
  protections before using real patient data. This repository cannot inspect or
  control Render's managed edge or support tooling. Render can generate retained
  HTTP request metadata logs independently of the application. Rejecting query
  parameters in Flask cannot erase a query already recorded by the edge.
- Configure edge-level request rate/body limits where available. CORS is a browser
  policy, not authentication: scripts can call the public API without an Origin
  header. The app limits upload size and concurrent inference, but public endpoint
  abuse can still consume compute. Authenticated clinical use would require a
  separately designed access control flow.

Use de-identified files without patient names, identifiers, or identifying sample
headers. If the requirement is that genetic data must **never leave the device**,
this hosted Python design cannot meet it; use a locally run inference service or
port the model/projector to client-side inference.

## Repository/reference data

`projector_data` and `frontend/public/samples` already contain published reference
cohort/model/demo artifacts. Confirm their consent, de-identification, and rights
to public distribution separately; this patch does not remove them from Git
history. `joblib` can execute code when loading a model, so only trusted,
reviewed repository artifacts may be used; user uploads never reach `joblib`.
The existing sklearn model was serialized with 1.7.1 while the repository pins
1.7.2. The demo smoke test works, but that existing model compatibility warning
needs model-owner review before relying on numerical predictions clinically.

## Verification

```sh
python -m pip install -r backend/requirements-dev.txt
PYTHONPATH=backend pytest -q backend/tests
pip-audit -r backend/requirements.txt
cd frontend
pnpm install --frozen-lockfile
pnpm audit
NEXT_PUBLIC_API_URL=https://privacy-test.onrender.com NEXT_TELEMETRY_DISABLED=1 pnpm build
pnpm exec playwright install chromium
pnpm test:privacy
```

Tests use synthetic inputs only. Playwright traces, video, and screenshots are
disabled. Never put real genetic data into test fixtures, CI, bug reports, or logs.
Dependency audit results only cover known published advisories, not all possible
vulnerabilities. CSP currently allows inline hydration scripts/styles needed by
Next.js/Plotly, but blocks unconfigured third-party origins and framing; it is not
an XSS-proof sandbox.

References: [Flask upload behavior](https://flask.palletsprojects.com/en/stable/patterns/fileuploads/),
[Flask resource limits](https://flask.palletsprojects.com/en/stable/web-security/),
[Next.js September security release](https://nextjs.org/blog/september-2026-security-release),
[Render Flask deployment](https://render.com/docs/deploy-flask),
[Render logs](https://render.com/docs/logging), and
[Gunicorn settings](https://gunicorn.org/reference/settings/).
