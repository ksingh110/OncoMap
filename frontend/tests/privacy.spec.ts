import { expect, test } from "@playwright/test"

const result = {
  response_probability: 0.5,
  summary: { projected_umap1: 1, projected_umap2: 2 },
  insights: { local_dataset: "synthetic-cohort" },
  neighbors: [{ sample_id: "reference-A", rank: 1, distance: 0.5, weight: 1,
    embedding: { umap1: 3, umap2: 4 }, metadata: { dataset: "synthetic-cohort", age: 55, gender: "female" } }],
}
const input = { name: "patient-identifier.csv", mimeType: "text/csv", buffer: Buffer.from("gene,patient-identifier\nTP53,1\n") }

test.beforeEach(async ({ page }) => {
  await page.route("**/reference-map", async (route) => route.fulfill({ json: { points: [], color_fields: {} } }))
})

test("uploads use a generic filename and do not persist results", async ({ page }) => {
  let body = ""
  let headers: Record<string, string> = {}
  await page.route("**/predict", async (route) => {
    body = route.request().postData() ?? ""
    headers = route.request().headers()
    await route.fulfill({ json: result })
  })
  const response = await page.goto("/model")
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'")
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer")
  await page.locator("#fileInput").setInputFiles(input)
  await expect(page.getByRole("heading", { name: "Analysis", exact: true })).toBeVisible()
  expect(body).toContain('filename="expression.csv"')
  expect(body).not.toContain('filename="patient-identifier.csv"')
  expect(headers["referer"]).toBeUndefined()
  expect(headers["cookie"]).toBeUndefined()
  expect(await page.locator("#fileInput").evaluate((element: HTMLInputElement) => element.files?.length)).toBe(0)
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] })
  expect(await page.evaluate(() => caches.keys())).toEqual([])
  await page.getByRole("button", { name: "Upload Another File" }).click()
  await expect(page.getByText("Drop your file here")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Analysis", exact: true })).not.toBeVisible()
  await page.reload()
  await expect(page.getByText("Drop your file here")).toBeVisible()
})

test("results clear when leaving the page", async ({ page }) => {
  await page.route("**/predict", async (route) => route.fulfill({ json: result }))
  await page.goto("/model")
  await page.locator("#fileInput").setInputFiles(input)
  await expect(page.getByRole("heading", { name: "Analysis", exact: true })).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")))
  await expect(page.getByText("Drop your file here")).toBeVisible()
})

test("unsupported uploads never reach the API", async ({ page }) => {
  let requests = 0
  await page.route("**/predict", (route) => { requests++; return route.abort() })
  page.on("dialog", (dialog) => dialog.dismiss())
  await page.goto("/model")
  await page.locator("#fileInput").setInputFiles({ name: "data.json", mimeType: "application/json", buffer: Buffer.from("{}") })
  await expect(page.getByText("Drop your file here")).toBeVisible()
  expect(requests).toBe(0)
})

test("old OncoMap caches are removed", async ({ page }) => {
  await page.goto("/model")
  await page.evaluate(async () => {
    const cache = await caches.open("oncomap1")
    await cache.put("/model", new Response("old cached page"))
  })
  await page.reload()
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual([])
})


test("large results dialog minimizes, restores and exports complete JSON locally", async ({ page }) => {
  let predictions = 0
  await page.route("**/predict", async (route) => { predictions++; await route.fulfill({ json: result }) })
  await page.goto("/model")
  await page.locator("#fileInput").setInputFiles(input)
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("combobox", { name: "Color landscape by" })).toBeVisible()
  await expect(dialog.getByText("reference-A", { exact: true })).toBeVisible()
  const bounds = await dialog.boundingBox()
  const viewport = page.viewportSize()!
  await expect.poll(async () => (await dialog.boundingBox())!.width).toBeGreaterThan(viewport.width * 0.9)
  await expect.poll(async () => (await dialog.boundingBox())!.height).toBeGreaterThan(viewport.height * 0.9)
  expect(bounds!.x).toBeGreaterThan(0)
  expect(bounds!.y).toBeGreaterThan(0)
  await page.getByRole("button", { name: "Minimize results" }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole("button", { name: "Restore Results" }).click()
  await expect(dialog).toBeVisible()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download results (JSON)", exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe("oncomap-results.json")
  const { readFile } = await import("node:fs/promises")
  const exported = JSON.parse(await readFile((await download.path())!, "utf-8"))
  expect(exported.embedding.umap1).toBe(1)
  expect(exported.embedding.umap2).toBe(2)
  expect(exported.prediction.response_probability).toBe(0.5)
  expect(exported.prediction.percentage).toBe(50)
  expect(exported.prediction.probability_level).toBe("Medium")
  expect(exported.nearest_samples).toEqual(result.neighbors)
  expect(exported.projection_summary).toEqual(result.summary)
  expect(exported.neighborhood_insights).toEqual(result.insights)
  expect(JSON.stringify(exported)).not.toContain("patient-identifier")
  expect(predictions).toBe(1)
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
  await page.getByRole("button", { name: "Upload Another File" }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole("button", { name: "Restore Results" })).not.toBeVisible()
})

test("mobile results remain within screen margins", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.route("**/predict", async (route) => route.fulfill({ json: result }))
  await page.goto("/model")
  await page.locator("#fileInput").setInputFiles(input)
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  const bounds = await dialog.boundingBox()
  expect(bounds!.x).toBeGreaterThan(0)
  expect(bounds!.y).toBeGreaterThan(0)
  expect(bounds!.x + bounds!.width).toBeLessThan(375)
  expect(bounds!.y + bounds!.height).toBeLessThan(812)
  await expect(dialog.getByRole("button", { name: "Minimize results" })).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Download results (JSON)", exact: true })).toBeVisible()
})

for (const width of [375, 1280]) {
  test(`numeric landscape scales stay separate from the legend at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route("**/reference-map", (route) => route.fulfill({ json: {
      points: [
        { sampleName: "A", VST_UMAP1_2D: 0, VST_UMAP2_2D: 0, age: 20, hpv_score: 0 },
        { sampleName: "B", VST_UMAP1_2D: 2, VST_UMAP2_2D: 2, age: 90, hpv_score: 1 },
        { sampleName: "C", VST_UMAP1_2D: 3, VST_UMAP2_2D: 1, age: "missing", hpv_score: null },
      ], color_fields: {},
    } }))
    await page.route("**/predict", (route) => route.fulfill({ json: {
      ...result, summary: { ...result.summary, projected_age: 55, projected_hpv_score: 0.5 },
    } }))
    await page.goto("/model")
    await page.locator("#fileInput").setInputFiles(input)
    for (const mode of ["Age", "HPV status"]) {
      await page.getByRole("combobox", { name: "Color landscape by" }).selectOption(mode)
      const graph = page.getByRole("dialog").locator(".js-plotly-plot")
      await expect.poll(() => graph.evaluate((element) => {
        const bar = element.querySelector(".colorbar")?.getBoundingClientRect()
        const legend = element.querySelector(".legend")?.getBoundingClientRect()
        return !!bar && !!legend && bar.bottom <= legend.top
      })).toBe(true)
      const axes = await graph.evaluate((element) => {
        const plot = element as HTMLElement & { data: Array<{ name: string; marker: { coloraxis?: string } }>; _fullLayout: { coloraxis: { cmin: number; cmax: number } } }
        return { patient: plot.data.find((trace) => trace.name === "Uploaded patient")?.marker.coloraxis,
          reference: plot.data.find((trace) => trace.name === "Age" || trace.name === "HPV status")?.marker.coloraxis,
          min: plot._fullLayout.coloraxis.cmin, max: plot._fullLayout.coloraxis.cmax }
      })
      expect(axes.patient).toBe(axes.reference)
      expect(axes.patient).toBeTruthy()
      expect([axes.min, axes.max]).toEqual(mode === "Age" ? [20, 90] : [0, 1])
    }
  })
}

test("landscape point clicks reveal the matching sample metadata", async ({ page }) => {
  await page.route("**/reference-map", (route) => route.fulfill({ json: {
    points: [{ sampleName: "reference-click", VST_UMAP1_2D: 0, VST_UMAP2_2D: 0,
      dataset: "Test cohort", gender: "female", age: null, hpv_score: 0.7, HPV_status: "positive" }],
    color_fields: {},
  } }))
  await page.route("**/predict", (route) => route.fulfill({ json: result }))
  await page.goto("/model")
  await page.locator("#fileInput").setInputFiles(input)
  const dialog = page.getByRole("dialog")
  for (const mode of ["Dataset", "Age", "HPV status"]) {
    await page.getByRole("combobox", { name: "Color landscape by" }).selectOption(mode)
    await dialog.locator(".scatterlayer .trace .points .point").first().click({ force: true })
    const details = page.getByRole("region", { name: "Selected sample details" })
    await expect(details.getByText("reference-click", { exact: true })).toBeVisible()
    await expect(details.getByText("Test cohort", { exact: true })).toBeVisible()
    await expect(details.getByText("positive", { exact: true })).toBeVisible()
    await expect(details.getByText("Not available", { exact: true })).toBeVisible()
    await details.getByRole("button", { name: "Close details" }).click()
    await expect(details).not.toBeVisible()
  }
  await dialog.locator(".scatterlayer .trace .points .point").last().click({ force: true })
  await expect(page.getByRole("region", { name: "Selected sample details" }).getByText("Uploaded patient", { exact: true })).toBeVisible()
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] })
})

test("ranked sample IDs open their metadata table", async ({ page }) => {
  await page.route("**/predict", (route) => route.fulfill({ json: result }))
  await page.goto("/model")
  await page.locator("#fileInput").setInputFiles(input)
  await page.getByRole("button", { name: "reference-A", exact: true }).click()
  const metadata = page.getByRole("region", { name: "Selected sample details" })
  await expect(metadata.getByText("55", { exact: true })).toBeVisible()
  await expect(metadata.getByText("synthetic-cohort", { exact: true })).toBeVisible()
  await metadata.getByRole("button", { name: "Close details" }).click()
  await expect(metadata).not.toBeVisible()
  await expect(page.getByRole("combobox", { name: "Inspect sample" })).toHaveCount(0)
})
