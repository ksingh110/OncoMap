/** Patient data must only be sent to the configured HTTPS backend. */
export function apiUrl(path: "/predict" | "/reference-map"): string {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) throw new Error("API is not configured")
  const url = new URL(base)
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) {
    throw new Error("API must be an HTTPS origin")
  }
  return `${url.origin}${path}`
}
