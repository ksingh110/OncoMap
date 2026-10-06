import Link from "next/link"
import styles from "./not-found.module.css"

const strand = (direction: number) => Array.from({ length: 65 }, (_, i) => {
  const y = i * 2 - 64
  const x = Math.sin((y + 64) * Math.PI / 64) * 25 * direction
  return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y}`
}).join(" ")

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand} aria-label="OncoMap home">
        <img
          src="android-chrome-192x192.png"
          alt=""
          className={styles.brandMark}
        />
        OncoMap
      </Link>
      <section className={styles.card} aria-labelledby="not-found-title">
        <h1 className={styles.srOnly} id="not-found-title">404 — Page not found</h1>
        <div className={styles.scene}>
          <svg viewBox="0 0 480 440" className={styles.art} aria-hidden="true">
            <defs>
              <linearGradient id="dna-404-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#0891b2" /><stop offset="1" stopColor="#14b8a6" />
              </linearGradient>
              <g id="dna-404-helix" fill="none" strokeLinecap="round">
                {Array.from({ length: 17 }, (_, i) => {
                  const y = i * 7 - 56
                  const x = Math.sin((y + 64) * Math.PI / 64) * 25
                  return <line key={i} x1={-x} x2={x} y1={y} y2={y} stroke="#67cdd0" strokeWidth="3" opacity=".65" />
                })}
                <path d={strand(1)} stroke="#0891b2" strokeWidth="6" />
                <path d={strand(-1)} stroke="#14b8a6" strokeWidth="6" />
              </g>
            </defs>
            <ellipse cx="240" cy="118" rx="52" ry="77" fill="none" stroke="#cce9e9" strokeWidth="1" strokeDasharray="3 8" />
            <text x="140" y="171" textAnchor="middle" className={styles.digit}>4</text>
            <text x="340" y="171" textAnchor="middle" className={styles.digit}>4</text>
            <path d="M240 326 L348 326 Q360 326 360 338 L360 366 Q360 378 348 378 L132 378 Q120 378 120 366 L120 338 Q120 326 132 326 L240 326" fill="none" stroke="url(#dna-404-gradient)" strokeWidth="3" pathLength="1" className={styles.outline} />
            <g className={styles.animatedDna}>
              <animateMotion dur="10s" repeatCount="indefinite" calcMode="linear"
                path="M240 118 L240 326 L348 326 Q360 326 360 338 L360 366 Q360 378 348 378 L132 378 Q120 378 120 366 L120 338 Q120 326 132 326 L240 326 L240 118"
                keyTimes="0;0.30;0.40;0.75;0.86;1" keyPoints="0;0;0.21183;0.78817;1;1" />
              <g>
                <animateTransform attributeName="transform" type="scale" dur="10s" repeatCount="indefinite"
                  values="1;1;0.16;0.16;1;1" keyTimes="0;0.30;0.40;0.75;0.86;1" />
                <g>
                  <animateTransform attributeName="transform" type="rotate" dur="10s" repeatCount="indefinite"
                    values="0;360;360;360" keyTimes="0;0.30;0.86;1" />
                  <use href="#dna-404-helix" />
                </g>
              </g>
            </g>
            <use href="#dna-404-helix" x="240" y="118" className={styles.staticDna} />
          </svg>
          <div className={styles.copy}>
            <h2>This page is off the map.</h2>
          </div>
          <Link href="/" className={styles.homeButton}>
            Go back to home <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
