"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"

// Plotly touches `window`, so it can only load on the client.
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

type ColorMode = "Dataset" | "Gender" | "HPV status" | "Age"

const COLOR_MODE_TO_FIELD: Record<ColorMode, string> = {
  Dataset: "dataset",
  Gender: "gender",
  "HPV status": "hpv_score",
  Age: "age",
}

type ReferencePoint = {
  sampleName: string
  VST_UMAP1_2D: number
  VST_UMAP2_2D: number
  [key: string]: unknown
}

type ReferenceMapResponse = {
  points: ReferencePoint[]
  color_fields: Record<string, string | null>
}

type PatientPoint = {
  umap1: number
  umap2: number
  hpvScore?: number | null
  age?: number | null
}

const GREY = "#c9d3dc"
const QUALITATIVE_PALETTE = [
  "#0b6efd", "#0d9488", "#f97316", "#a855f7", "#ef4444",
  "#22c55e", "#eab308", "#06b6d4", "#ec4899", "#64748b",
]

function isUnlabeled(v: unknown) {
  if (v === null || v === undefined) return true
  const s = String(v).trim().toLowerCase()
  return s === "" || ["nan", "none", "missing", "na", "n/a"].includes(s)
}

export default function ReferenceMap({ patient }: { patient: PatientPoint | null }) {
  const [data, setData] = useState<ReferenceMapResponse | null>(null)
  const [colorMode, setColorMode] = useState<ColorMode>("Dataset")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reference-map`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load reference map")
        return res.json()
      })
      .then((json: ReferenceMapResponse) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        console.error("Reference map error:", err)
        if (!cancelled) setError("Couldn't load the reference landscape.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const traces = useMemo(() => {
    if (!data) return []
    const field = COLOR_MODE_TO_FIELD[colorMode]
    const points = data.points

    const x = (p: ReferencePoint) => p.VST_UMAP1_2D
    const y = (p: ReferencePoint) => p.VST_UMAP2_2D

    const result: Partial<Plotly.PlotData>[] = []

    if (!points.length || !field || !(field in (points[0] ?? {}))) {
      result.push({
        x: points.map(x),
        y: points.map(y),
        mode: "markers",
        type: "scatter",
        marker: { size: 7, color: GREY },
        name: "Reference cohort",
        opacity: 0.85,
      })
    } else if (field === "age" || field === "hpv_score") {
      const labeled = points.filter((p) => p[field] !== null && p[field] !== undefined)
      const unlabeled = points.filter((p) => p[field] === null || p[field] === undefined)
      if (unlabeled.length) {
        result.push({
          x: unlabeled.map(x),
          y: unlabeled.map(y),
          mode: "markers",
          type: "scatter",
          marker: { size: 7, color: GREY },
          name: "No label",
          opacity: 0.85,
        })
      }
      if (labeled.length) {
        result.push({
          x: labeled.map(x),
          y: labeled.map(y),
          mode: "markers",
          type: "scatter",
          marker: {
            size: 7,
            color: labeled.map((p) => Number(p[field])),
            colorscale: "Turbo",
            showscale: true,
            colorbar: { title: colorMode === "Age" ? "Age" : "HPV status score" },
          },
          name: colorMode,
          opacity: 0.85,
          showlegend: false,
        })
      }
    } else {
      const unlabeled = points.filter((p) => isUnlabeled(p[field]))
      const labeled = points.filter((p) => !isUnlabeled(p[field]))
      if (unlabeled.length) {
        result.push({
          x: unlabeled.map(x),
          y: unlabeled.map(y),
          mode: "markers",
          type: "scatter",
          marker: { size: 7, color: GREY },
          name: "(no label)",
          opacity: 0.85,
        })
      }
      const cats = Array.from(new Set(labeled.map((p) => String(p[field]).trim()))).sort()
      cats.forEach((cat, i) => {
        const subset = labeled.filter((p) => String(p[field]).trim() === cat)
        result.push({
          x: subset.map(x),
          y: subset.map(y),
          mode: "markers",
          type: "scatter",
          marker: { size: 7, color: QUALITATIVE_PALETTE[i % QUALITATIVE_PALETTE.length] },
          name: cat,
          opacity: 0.85,
        })
      })
    }

    // Uploaded patient marker (halo + diamond), same treatment as the
    // original Streamlit map.
    if (patient) {
      result.push({
        x: [patient.umap1],
        y: [patient.umap2],
        mode: "markers",
        type: "scatter",
        marker: { size: 34, color: "rgba(255,77,109,0.25)" },
        name: "Uploaded patient (halo)",
        hoverinfo: "skip",
        showlegend: false,
      })
      const paintValue = colorMode === "Age" ? patient.age : colorMode === "HPV status" ? patient.hpvScore : null
      result.push({
        x: [patient.umap1],
        y: [patient.umap2],
        mode: "markers+text",
        type: "scatter",
        marker:
          paintValue !== null && paintValue !== undefined
            ? { size: 18, color: [paintValue], colorscale: "Turbo", symbol: "diamond", line: { width: 3, color: "#fff" } }
            : { size: 18, color: "#ff4d6d", symbol: "diamond", line: { width: 3, color: "#fff" } },
        text: ["Patient"],
        textposition: "top center",
        name: "Uploaded patient",
      })
    }

    return result
  }, [data, colorMode, patient])

  return (
    <div className="bg-white border border-cyan-200 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Reference tumor landscape</h3>
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as ColorMode)}
          className="rounded-lg border border-cyan-200 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <option value="Dataset">Dataset</option>
          <option value="Gender">Gender</option>
          <option value="HPV status">HPV status</option>
          <option value="Age">Age</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-500 py-12 text-center">Loading reference landscape…</p>}
      {error && <p className="text-sm text-rose-600 py-12 text-center">{error}</p>}

      {!loading && !error && (
        <Plot
          data={traces}
          layout={{
            height: 560,
            margin: { l: 40, r: 20, t: 10, b: 40 },
            xaxis: { title: "VST_UMAP1_2D" },
            yaxis: { title: "VST_UMAP2_2D" },
            legend: { orientation: "v" },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "#ffffff",
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%" }}
        />
      )}
    </div>
  )
}