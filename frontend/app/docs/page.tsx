import Link from "next/link"
import Image from "next/image"

const sections = [
  { id: "upload", title: "Prepare an upload", paragraphs: [
    "Upload one sample as a UTF-8 CSV or TSV with a header and exactly two columns: gene identifier, then expression value. Use unique gene identifiers, finite non-negative values, and a file no larger than 4 MiB (up to 60,000 genes).",
    "The reference projector expects log2-TPM values on the same scale as its reference. Raw counts and untransformed TPM are different units. OncoMap does not infer units or convert them automatically. Check your preprocessing before uploading; a successful upload does not prove that the units are correct.",
    "At least 20 genes must overlap the projector feature set. Optional age, gender, and HPV status can be supplied in the clinical details section. Leave unavailable fields missing. Use de-identified files without names or patient identifiers.",
  ] },
  { id: "results", title: "Explore results", paragraphs: [
    "The results window shows the response probability and a projected position on the reference tumor landscape. Change the landscape colors to explore dataset, gender, age, or HPV score. The two UMAP axes describe the reference visualization; they are not physical measurements.",
    "Click a landscape point or a ranked sample ID to open its available metadata in the shared panel beneath the landscape, above the ranking. Missing metadata appears as Not available. The uploaded patient is marked with a diamond.",
    "Minimize the window to return to the page, then restore it to continue exploring. Upload Another File clears the current analysis. Results clear when you leave the page.",
  ] },
  { id: "distance", title: "Understand sample distance", paragraphs: [
    "Nearest samples are ranked by Euclidean distance across overlapping gene-expression features. Each gene is standardized using the reference mean and population standard deviation before distances are calculated. Lower values mean a closer expression profile on that scale.",
    "This distance is not the gap between dots on the two-dimensional UMAP plot, a percentage, or a calibrated confidence score. The projector uses inverse-distance weights to estimate the uploaded sample’s landscape position. Large distances can indicate a scale mismatch or an expression profile unlike the reference; check input units rather than treating the number as a clinical threshold.",
  ] },
  { id: "download", title: "Download results", paragraphs: [
    "Download results (JSON) saves a copy to your device. It includes the prediction probability and percentage, interpretation, projected UMAP coordinates, projection summary, neighborhood insights, and nearest sample IDs, ranks, distances, weights, embeddings, and approved reference metadata.",
    "The export excludes the raw uploaded expression and original filename. It does not rerun the analysis or save a result on the server. Clearing the page cannot remove a downloaded copy from your device.",
  ] },
  { id: "privacy", title: "Data handling and limits", paragraphs: [
    "The browser sends expression data and optional clinical fields to the Python API for processing over HTTPS in hosted deployments. Processing takes place on the analysis server; it is not entirely inside your browser.",
    "The application processes uploads in bounded memory and does not save uploads or prediction results. Browser results stay in page memory, without local-storage persistence. This is application-level non-retention, not a guarantee against host logging, swap, crash dumps, compromised devices, or other infrastructure risks.",
    "Predictions describe this model’s output and are not a diagnosis or a treatment recommendation. Data compatibility, preprocessing, reference coverage, and model validation affect interpretation. A small distance alone does not establish clinical reliability.",
  ] },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-cyan-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo only */}
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
            <Link href="/docs" className="text-sm font-medium text-gray-700 hover:text-cyan-600 transition-colors">
              Docs
            </Link>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-5 pt-28 pb-16 max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">Documentation</p>
        <h1 className="mt-3 text-4xl font-bold text-gray-800">Using OncoMap</h1>
        <p className="mt-4 text-gray-600 max-w-2xl">Prepare expression data, explore the reference landscape, and understand what your results contain.</p>
        <nav aria-label="Documentation sections" className="my-8 flex flex-wrap gap-3">
          {sections.map((section) => <a key={section.id} href={`#${section.id}`} className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm text-cyan-800 hover:bg-cyan-50">{section.title}</a>)}
        </nav>
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28 rounded-2xl border border-cyan-100 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-gray-600 leading-relaxed">{paragraph}</p>)}
            </section>
          ))}
        </div>
        <Link href="/model" className="mt-8 inline-flex rounded-xl bg-cyan-700 px-6 py-3 font-medium text-white hover:bg-cyan-800">Open the model →</Link>
      </main>
    </div>
  )
}
