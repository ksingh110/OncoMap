# Synthetic demo expression

`demo_patient_expression.csv` contains the per-gene median of the bundled reference log2-TPM values for the projector feature genes. It is synthetic demonstration data, not an individual patient's expression profile.

Uploads used for reference projection must use the same log2-TPM scale as the reference. Raw counts and untransformed TPM values are not interchangeable with these inputs. The API does not infer or automatically convert expression units.

Nearest-sample distances are Euclidean distances after each overlapping feature gene is standardized using the reference mean and population standard deviation. They are not UMAP coordinate distances, percentages, or calibrated clinical confidence scores.
