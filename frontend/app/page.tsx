import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
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

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/40 via-blue-100/30 to-teal-100/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.08),transparent_60%)]" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="mb-8 flex justify-center">
            <Image
              src="/images/upscalemedia-transformed.png"
              alt="OncoMap Logo"
              width={200}
              height={200}
              className="rounded-full"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
            OncoMap
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-12 text-balance leading-relaxed">
            Translating Tumor Transcriptomics into Hyper-Personalized Cancer Care
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              asChild
              className="text-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0"
            >
              <Link href="/model">
                Explore Our Model <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
    
          </div>
        </div>

        {/* Scroll indicator */}
        
      </section>

      {/* Who We Are Section */}
      <section id="about" className="py-24 bg-gradient-to-b from-white/50 to-cyan-50/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                Who We Are
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                OncoMap is at the forefront of precision oncology, leveraging cutting-edge machine learning and
                transcriptomic analysis to revolutionize head and neck cancer treatment decision-making. In today's world, immunotherapy, specifically 
                PD-1 inhibitors, has emerged as a transformative treatment option for head and neck cancer patients. However, the challenge lies in identifying which patients will truly benefit from this therapy, as head and neck cancer
                lies at one of the lowest response rates of 15-30%. Due to this, many clinicians administer the therapy, which costs over $150,000, without knowing if it would help the patient. OncoMap addresses this critical need by 
                developing advanced predictive models that analyze tumor transcriptomic data to accurately forecast patient responses to immunotherapy while also predicting specific oncogenic features.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                OncoMap's team consists of 2 research interns, Anshul R. and Krishay S., from the Holland Lab at Fred Hutchinson Cancer Research Center in Bellevue, Washington. OncoMap's team works together to translate
                complex genomic data into actionable clinical insights, empowering oncologists and pathologists to make informed treatment
                decisions tailored to each patient's unique tumor profile.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                OncoMap strives for hyper-personalization; every head and neck cancer patient deserves a treatment plan as unique as their profile.
              </p>
            </div>
            <div className="bg-gradient-to-br from-cyan-100/40 to-teal-100/40 border border-cyan-200 rounded-lg aspect-video flex items-center justify-center">
              <div className="text-center p-8">
                <img
                  src="/images/team_image.png"
                  alt="OncoMap Team Image"
                  className="w-full h-full object-cover rounded-lg"
                />

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-gradient-to-b from-cyan-50/30 to-white/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Our Mission
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              To democratize access to hyper-personalized cancer treatment by transforming tumor transcriptomic data into
              precise treatment recommendations that improve head and neck cancer patient outcomes and quality of life.
            </p>
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <div className="w-8 h-8 bg-white rounded-full" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-cyan-700">Precision</h3>
                <p className="text-gray-600">Highly accurate predictions tailored to individual tumor profiles</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                  <div className="w-8 h-2 bg-white rounded-full" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-teal-700">Cost-Efficent</h3>
                <p className="text-gray-600">Saving hundreds of thousands of dollars that could possibly be lost otherwise when guessing if the therapy would work</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white rounded-full" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-blue-700">Accessibility</h3>
                <p className="text-gray-600">Making advanced genomic insights available to all oncologists</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Try out first-hand how our predictive models can enhance head and neck cancer clinical decision-making processes.
          </p>
          <Button size="lg" variant="secondary" asChild className="bg-white text-cyan-600 hover:bg-gray-100">
            <Link href="/model">
              View Our Models <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
      
    </div>
  )
}
