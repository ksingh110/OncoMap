"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload } from "lucide-react"
import Image from "next/image"

export default function ModelPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [level, setLevel] = useState<string | null>(null)

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Server error")
      }

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        setLoading(false)
        setFile(null)
        return
      }

      const percentage = data.probability * 100
      if (percentage<=33){
        setLevel("Low")
      } else if (percentage > 33 && percentage <= 66) {
        setLevel("Medium")
      } else {
        setLevel("High")
      }
      setResult(percentage)
      setLoading(false)
    } catch (err) {
      console.error("Prediction error:", err)
      alert("Prediction failed")
      setLoading(false)
      setFile(null)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setResult(null)
    setLoading(false)
    setLevel(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-cyan-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/upscalemedia-transformed.png"
              alt="OncoMap Logo"
              width={50}
              height={50}
              className="rounded-full"
            />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-cyan-600 transition-colors">
              Home
            </Link>
            <Link href="/model" className="text-sm font-medium text-gray-700 hover:text-cyan-600 transition-colors">
              Our Model
            </Link>
            <Link href="/business" className="text-sm font-medium text-gray-700 hover:text-cyan-600 transition-colors">
              Business
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16">
        {/* Back Button */}
        <div className="container mx-auto px-4 mb-8">
          <Button variant="ghost" asChild className="text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Link>
          </Button>
        </div>

        {/* Background Section */}
        <section className="container mx-auto px-4 mb-24">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
            Our Predictive Models
          </h1>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-white/80 to-cyan-50/50 border border-cyan-200 rounded-lg p-8 mb-12 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-cyan-700">Background</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Cancer immunotherapy has revolutionized oncology, but predicting which patients will respond remains a
                significant challenge. Our models leverage tumor transcriptomic signatures to predict treatment response
                with unprecedented accuracy.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                By analyzing gene expression patterns from thousands of tumor samples, we've developed machine learning
                models that can identify patients most likely to benefit from specific immunotherapy treatments,
                reducing unnecessary side effects and healthcare costs while improving outcomes.
              </p>
            </div>
          </div>
        </section>

        {/* KNN Model Section */}
        <section className="container mx-auto px-4 mb-24 bg-gradient-to-b from-white/50 to-cyan-50/30 -mx-4 px-4 py-24">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              K-Nearest Neighbors (KNN) Classification Model
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Video Placeholder 1 */}
              <div className="bg-gradient-to-br from-cyan-100/40 to-blue-100/30 border border-cyan-200 rounded-lg aspect-video flex items-center justify-center shadow-sm">
                <div className="text-center p-8">
                 <video
                    src="/videos/knn_1_vid.mov"
                    controls
                    className="w-full h-full rounded-lg border border-cyan-200 object-cover"
                  ></video>
                </div>
              </div>

              {/* Video Placeholder 2 */}
              <div className="bg-gradient-to-br from-blue-100/30 to-teal-100/40 border border-cyan-200 rounded-lg aspect-video flex items-center justify-center shadow-sm">
                <div className="text-center p-8">
                  <video
                    src="/videos/knn_2_vid.mov"
                    controls
                    className="w-full h-full rounded-lg border border-cyan-200 object-cover"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>

            <div className="bg-white/80 border border-cyan-200 rounded-lg p-8 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-teal-700">How It Works</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our KNN model analyzes tumor gene expression profiles by comparing them to known patient outcomes. The
                algorithm identifies the K most similar historical cases and predicts treatment response based on their
                collective outcomes.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-1">→</span>
                  <span>Processes high-dimensional transcriptomic data from tumor samples</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">→</span>
                  <span>Identifies similar patient profiles using distance metrics in gene expression space</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>Generates probabilistic predictions based on nearest neighbor outcomes</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Immunotherapy Prediction Tool */}
        <section className="container mx-auto px-4 mb-24">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Head & Neck Cancer Immunotherapy Prediction
            </h2>

            <div className="bg-white/80 border border-cyan-200 rounded-lg p-8 shadow-sm">
              <p className="text-center text-gray-700 mb-8">
                Upload patient transcriptomic data for real-time immunotherapy response prediction
              </p>

              {!loading && result === null && (
                <div
                  className="border-2 border-dashed border-cyan-300 rounded-lg p-12 text-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-50 transition-colors"
                  onClick={() => document.getElementById("fileInput")?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add("border-cyan-400", "bg-cyan-50")
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("border-cyan-400", "bg-cyan-50")
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove("border-cyan-400", "bg-cyan-50")
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      handleFile(files[0])
                    }
                  }}
                >
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <p className="font-semibold mb-2 text-gray-800">Drop file here or click to upload</p>
                  <p className="text-sm text-gray-600">Supported formats: CSV, TXT, JSON</p>
                </div>
              )}

              {loading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-cyan-700">Analyzing patient data...</p>
                </div>
              )}

              {result !== null && (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold mb-6 text-cyan-700">Immunotherapy Success Probability</h3>
                  <div className="text-7xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-8">
                    {result.toFixed(2)}%
                  </div>
                  {level && (
                    <p className="text-lg text-gray-700">
                      Immunotherapy Success Level: <span className="font-semibold text-cyan-700">{level}</span>
                    </p>
                  )}
                  <Button
                    onClick={resetUpload}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                  >
                    Upload Another File
                  </Button>
                </div>
              )}

              <input
                type="file"
                id="fileInput"
                className="hidden"
                accept=".csv,.txt,.json"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFile(e.target.files[0])
                  }
                }}
              />
            </div>

            <div className="mt-8 bg-gradient-to-br from-cyan-100/40 to-blue-100/30 border border-cyan-200 rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold mb-3 text-teal-700">About This Model</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                This prediction tool uses a neural network trained on head and neck cancer patient data to predict
                immunotherapy response rates. The model analyzes gene expression patterns to identify biomarkers
                associated with treatment success, providing clinicians with data-driven insights for personalized
                treatment planning.
              </p>
            </div>
          </div>
        </section>

        {/* Image Placeholder Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="mxax-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-teal-100/40 to-cyan-100/40 border border-cyan-200 rounded-lg aspect-video flex items-center justify-center shadow-sm">
              <div className="text-center p-8">
                 <img
                  src="/images/innovation_image.png"
                  alt="Immunotherapy Model Figures"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

     
    </div>
  )
}
