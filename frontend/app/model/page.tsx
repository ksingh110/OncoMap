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
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import Image from "next/image"

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
      if (percentage<=33){
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

              {result !== null && !showResultDialog && (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">Analysis complete</p>
                  <Button
                    onClick={() => setShowResultDialog(true)}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white mr-3"
                  >
                    View Results
                  </Button>
                  <Button
                    onClick={resetUpload}
                    variant="outline"
                    className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
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
                This prediction tool uses a penalized linear regression trained on head and neck cancer transcriptomic data to predict
                immunotherapy response rates. The model analyzes gene expression patterns from a specially chosen 51-gene panel to identify biomarkers
                associated with treatment success, providing clinicians with data-driven insights for personalized
                treatment planning. Using Differential Gene Expression analysis, we identified genes that are significantly associated with immunotherapy response,
                optimizing the efficiency of the model while minimzing computational costs. 
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
