"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Upload, CheckCircle2, AlertCircle, XCircle, FlaskConical, FileText } from "lucide-react"
import Image from "next/image"

const TEST_SAMPLES = [
  { name: "High Response Sample", description: "Responder profile", file: "high_response_sample.csv" },
  { name: "Medium Response Sample", description: "Moderate responder", file: "medium_response_sample.csv" },
  { name: "Low Response Sample", description: "Non-responder profile", file: "low_response_sample.csv" },
]

export default function ModelPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [level, setLevel] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)

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
      if (percentage <= 33) {
        setLevel("Low")
        setMessage("Using a novel machine learning framework, we predict a low probability of immunotherapy success. Consider alternative treatments or further determine whether immunotherapy will be effective for you. Based on this, you seem to be a non-responder to PD-1 immunotherapy.")
      } else if (percentage > 33 && percentage <= 66) {
        setLevel("Medium")
        setMessage("Using a novel machine learning framework, we predict a moderate probability of immunotherapy success. Immunotherapy may be worth considering, but further evaluation and discussion with your healthcare provider are recommended to determine the best treatment approach. There is a possibility that you may respond to PD-1 immunotherapy, but additional factors should be considered before making a treatment decision.")
      } else {
        setLevel("High")
        setMessage("Using a novel machine learning framework, we predict a high probability of immunotherapy success. Immunotherapy may be a promising treatment option to consider. You may be a strong candidate for PD-1 immunotherapy, but it's important to discuss this with your healthcare provider to determine the best treatment plan based on your individual circumstances. Based on this, you seem to be a responder to PD-1 immunotherapy.")
      }
      setResult(percentage)
      setLoading(false)
      setShowResultDialog(true)
    } catch (err) {
      console.error("Prediction error:", err)
      alert("Prediction failed")
      setLoading(false)
      setFile(null)
    }
  }

  const handleTestSample = async (sampleFile: string) => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/samples/${sampleFile}`)
      const blob = await response.blob()
      const file = new File([blob], sampleFile, { type: "text/csv" })
      handleFile(file)
    } catch (err) {
      console.error("Error loading test sample:", err)
      alert("Failed to load test sample")
      setLoading(false)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setResult(null)
    setLoading(false)
    setLevel(null)
    setMessage(null)
    setShowResultDialog(false)
  }

  const getLevelConfig = (level: string | null) => {
    switch (level) {
      case "High":
        return {
          icon: CheckCircle2,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
          progressColor: "bg-emerald-500",
          badgeBg: "bg-emerald-100",
          badgeText: "text-emerald-700",
        }
      case "Medium":
        return {
          icon: AlertCircle,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          progressColor: "bg-amber-500",
          badgeBg: "bg-amber-100",
          badgeText: "text-amber-700",
        }
      case "Low":
      default:
        return {
          icon: XCircle,
          color: "text-rose-600",
          bgColor: "bg-rose-50",
          borderColor: "border-rose-200",
          progressColor: "bg-rose-500",
          badgeBg: "bg-rose-100",
          badgeText: "text-rose-700",
        }
    }
  }

  const levelConfig = getLevelConfig(level)

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
        {/* Hero Title */}
        <div className="container mx-auto px-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
            Immunotherapy Response Predictor
          </h1>
          <p className="text-center text-gray-600 mt-3 max-w-2xl mx-auto">
            Upload transcriptomic data to predict immunotherapy response for head &amp; neck cancer patients
          </p>
        </div>

        {/* Main Content - Model Upload + Test Samples Sidebar */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Upload Area */}
              <div className="flex-1">
                <div className="bg-white border border-cyan-200 rounded-2xl p-8 shadow-lg h-full">
                  {!loading && result === null && (
                    <div
                      className="border-2 border-dashed border-cyan-300 rounded-xl p-16 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/50 transition-all"
                      onClick={() => document.getElementById("fileInput")?.click()}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.add("border-cyan-500", "bg-cyan-50/50")
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove("border-cyan-500", "bg-cyan-50/50")
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.remove("border-cyan-500", "bg-cyan-50/50")
                        const files = e.dataTransfer.files
                        if (files.length > 0) {
                          handleFile(files[0])
                        }
                      }}
                    >
                      <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
                          <Upload className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      <p className="text-xl font-semibold mb-2 text-gray-800">Drop your file here</p>
                      <p className="text-gray-500 mb-4">or click to browse</p>
                      <p className="text-sm text-gray-400">Supported: CSV, TXT, JSON</p>
                    </div>
                  )}

                  {loading && (
                    <div className="text-center py-20">
                      <div className="w-20 h-20 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6" />
                      <p className="text-lg text-cyan-700 font-medium">Analyzing transcriptomic data...</p>
                      <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                    </div>
                  )}

                  {result !== null && !showResultDialog && (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      </div>
                      <p className="text-lg text-gray-700 mb-6">Analysis complete</p>
                      <div className="flex justify-center gap-3">
                        <Button
                          onClick={() => setShowResultDialog(true)}
                          className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white px-6"
                        >
                          View Results
                        </Button>
                        <Button
                          onClick={resetUpload}
                          variant="outline"
                          className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                        >
                          New Analysis
                        </Button>
                      </div>
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
              </div>

              {/* Test Samples Sidebar */}
              <div className="lg:w-72">
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-cyan-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <FlaskConical className="w-5 h-5 text-teal-600" />
                    <h3 className="font-semibold text-gray-800">Test Samples</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Try the model with pre-loaded patient samples
                  </p>
                  <div className="space-y-3">
                    {TEST_SAMPLES.map((sample) => (
                      <button
                        key={sample.file}
                        onClick={() => handleTestSample(sample.file)}
                        disabled={loading}
                        className="w-full text-left p-3 bg-white rounded-lg border border-cyan-200 hover:border-cyan-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-cyan-600 mt-0.5 group-hover:text-cyan-700" />
                          <div>
                            <p className="text-sm font-medium text-gray-800 group-hover:text-cyan-700">{sample.name}</p>
                            <p className="text-xs text-gray-500">{sample.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section - Compact */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white/60 border border-cyan-200 rounded-xl p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">About This Model</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    This prediction tool uses penalized linear regression trained on head and neck cancer transcriptomic data. 
                    It analyzes gene expression patterns from a 51-gene panel identified through Differential Gene Expression analysis 
                    to predict PD-1 immunotherapy response rates.
                  </p>
                </div>
                <div className="md:w-64">
                  <img
                    src="/images/innovation_image.png"
                    alt="Model visualization"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Results Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-xl bg-white border-0 shadow-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl font-bold text-center text-gray-800">
              Immunotherapy Analysis Results
            </DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              Prediction based on uploaded transcriptomic data
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {/* Classification Badge */}
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full ${levelConfig.bgColor} ${levelConfig.borderColor} border-2`}>
                <levelConfig.icon className={`w-10 h-10 ${levelConfig.color}`} />
              </div>
              <div className={`px-6 py-2 rounded-full ${levelConfig.badgeBg} ${levelConfig.borderColor} border`}>
                <span className={`text-xl font-bold ${levelConfig.badgeText}`}>
                  {level} Probability
                </span>
              </div>
            </div>

            {/* Percentage Display */}
            <div className="text-center">
              <div className="text-6xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                {result?.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-500">Success Probability Score</p>
            </div>

            {/* Progress Bar */}
            <div className="px-4">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full transition-all duration-700 ease-out rounded-full ${levelConfig.progressColor}`}
                  style={{ width: `${result || 0}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-400">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Advice Section */}
            {message && (
              <div className={`p-4 rounded-lg ${levelConfig.bgColor} ${levelConfig.borderColor} border`}>
                <h4 className={`font-semibold mb-2 ${levelConfig.color}`}>Clinical Guidance</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={resetUpload}
              variant="outline"
              className="w-full sm:w-auto border-cyan-300 text-cyan-700 hover:bg-cyan-50"
            >
              Upload Another File
            </Button>
            <Button
              onClick={() => setShowResultDialog(false)}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
