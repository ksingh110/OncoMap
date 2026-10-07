<p align="center">
  <a href="https://oncomap.us" target="_blank">
    <img src="https://github.com/user-attachments/assets/1b97b0ed-58fa-4779-b199-a28b7f4204e3" width="400" alt="OncoMap Logo">
  </a>
</p>
<h1 align="center">OncoMap</h1>
<p align="center">
<b>Translating Tumor Transcriptomics into Hyper-Personalized Cancer Care
</b>
</p>

<p align="center">
Machine Learning • Transcriptomics • Precision Oncology
</p>

<p align="center">

<a href="https://oncomap.us">
<img src="https://img.shields.io/badge/Website-oncomap.us-blue?style=for-the-badge">
</a>
<img src="https://img.shields.io/badge/R-4.x-276DC3?style=for-the-badge&logo=r&logoColor=white">
<img src="https://img.shields.io/badge/Python-3.11-yellow?style=for-the-badge&logo=python">


</p>

## About
OncoMap is a machine learning platform that predicts whether patients with head and neck cancer are likely to respond to PD-1 immunotherapy using RNA sequencing data before treatment begins. Driven by transcriptomics and expandable to other cancers, OncoMap delivers more than just a black-box prediction; rather, it lands the patient on a reference landscape. Created after rigorous bulk RNA-seq preprocessing and batch effect correction, this reference landscape uses the gene expression counts of 1000+ patients to guide by showcasing trends in covariates and other variables that the cancer may provide.


_**Founded by [Krishay Singh](https://github.com/ksingh110) and [Anshul Raghav](https://github.com/1053810-LWSD) with the help of the Holland Laboratory from Fred Hutchinson Cancer Center.**_

## Demo
<p align="center">
<img width="800" height="353" alt="oncomap_demo-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/497a8563-65d1-46df-aa88-3b9846137ebb" />
</p>


## Security and genetic data privacy

The hardened analysis flow processes uploads in bounded server memory and does
not save uploaded files or prediction results. See [SECURITY.md](SECURITY.md) for
the exact privacy boundary, v0/Render configuration, tests, and host-level settings
that must be verified before uploading real patient data.

## Documentation

The [Docs tab](https://oncomap.us/docs) explains upload preparation, the reference
landscape, sample metadata, distance, downloads, and data handling. Its source is
[frontend/app/docs/page.tsx](frontend/app/docs/page.tsx).

### Input format and units

Upload a UTF-8 CSV or TSV with a header and exactly two columns: gene identifier
and expression value, representing one sample. Identifiers must be unique and
values finite and non-negative. Limits: 4 MiB and 60,000 genes; at least 20 genes
must overlap the projector feature set.

The reference projector expects **log2-TPM on the reference scale**. Raw counts
and untransformed TPM are not interchangeable with this input. The API does not
infer units or convert them automatically. The bundled demo remains unchanged;
verify its preprocessing and units before interpreting its results.

### Results, metadata, and distance

Click a landscape point or ranked sample ID to inspect its available metadata in
the shared panel below the landscape and above the ranking. Missing metadata is
shown as “Not available.” Minimize/restore preserves results in page memory;
resetting or leaving the page clears them.

Nearest samples use Euclidean distance over overlapping expression features,
after standardizing each gene with the reference mean and population standard
deviation. This is **not UMAP coordinate distance**, a percentage, or a calibrated
clinical confidence score. Inverse-distance weights determine the projected
landscape position. Large distances warrant checking units and compatibility;
there is no clinical threshold established by this display.

Download results (JSON) exports the prediction and percentage, interpretation,
projected embedding, projection summary, neighborhood insights, and nearest
reference sample IDs, ranks, distances, weights, embeddings, and approved metadata.
It excludes raw uploaded expression and the original filename. Downloading saves
an explicit copy to the user's device.

### Local development

The web application lives in `frontend`; the Python API lives in `backend`.

```sh
cd frontend
pnpm install --frozen-lockfile
NEXT_PUBLIC_API_URL=http://127.0.0.1:5000 pnpm dev
```

In a separate terminal from the repository root:

```sh
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
ONCOMAP_ALLOWED_ORIGINS=http://localhost:3000 PYTHONPATH=backend python backend/app.py
```

For hosted deployments, use `frontend` as the Vercel root and configure
`NEXT_PUBLIC_API_URL` with the HTTPS API origin. See [SECURITY.md](SECURITY.md) for
deployment settings and the application-level non-retention boundary. The hosted
API receives data in memory; processing is not entirely in the browser.
