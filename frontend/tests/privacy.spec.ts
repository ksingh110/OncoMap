import { expect, test } from "@playwright/test"

const result = { response_probability: 0.5, summary: { projected_umap1: 1, projected_umap2: 2 }, insights: {} }
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
  await expect(page.getByRole("heading", { name: "Immunotherapy Analysis Results" })).toBeVisible()
  expect(body).toContain('filename="expression.csv"')
  expect(body).not.toContain('filename="patient-identifier.csv"')
  expect(headers["referer"]).toBeUndefined()
  expect(headers["cookie"]).toBeUndefined()
  expect(await page.locator("#fileInput").evaluate((element: HTMLInputElement) => element.files?.length)).toBe(0)
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] })
  expect(await page.evaluate(() => caches.keys())).toEqual([])
  await page.getByRole("button", { name: "Upload Another File" }).click()
  await expect(page.getByText("Drop your file here")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Immunotherapy Analysis Results" })).not.toBeVisible()
  await page.reload()
  await expect(page.getByText("Drop your file here")).toBeVisible()
})

test("results clear when leaving the page", async ({ page }) => {
  await page.route("**/predict", async (route) => route.fulfill({ json: result }))
  await page.goto("/model")
  await page.locator("#fileInput").setInputFiles(input)
  await expect(page.getByRole("heading", { name: "Immunotherapy Analysis Results" })).toBeVisible()
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
