export type Neighbor = {
  sample_id: string
  rank: number
  distance: number
  weight: number
  embedding: { umap1: number; umap2: number } | null
  metadata: Record<string, string | number | null>
}

export type AnalysisResult = {
  response_probability: number
  summary: Record<string, unknown> & {
    projected_umap1?: number
    projected_umap2?: number
    projected_hpv_score?: number | null
    projected_age?: number | null
  }
  insights: Record<string, unknown> & { local_dataset?: string }
  neighbors: Neighbor[]
}

export function resultExport(analysis: AnalysisResult, level: string | null, interpretation: string | null) {
  return {
    schema_version: "1.0",
    application: "OncoMap",
    exported_at: new Date().toISOString(),
    prediction: {
      response_probability: analysis.response_probability,
      percentage: analysis.response_probability * 100,
      probability_level: level,
      interpretation,
    },
    embedding: {
      method: "k-nearest-neighbor projection into the reference UMAP landscape",
      axes: ["VST_UMAP1_2D", "VST_UMAP2_2D"],
      umap1: analysis.summary.projected_umap1 ?? null,
      umap2: analysis.summary.projected_umap2 ?? null,
    },
    projection_summary: analysis.summary,
    neighborhood_insights: analysis.insights,
    nearest_samples: analysis.neighbors,
  }
}
