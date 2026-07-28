"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { downloadDataUrl, scanImage, ScanResult } from "@/lib/scanner";

const STATES = ["PREPARING SANITIZED COPY", "MAPPING LUMINANCE", "TRACING EDGE CLUSTERS", "COMPOSING EXPOSURE"];

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setPhase(value => Math.min(STATES.length - 1, value + 1)), 700);
    return () => window.clearInterval(timer);
  }, [busy]);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    if (!next) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(next); setPreview(URL.createObjectURL(next)); setResult(null); setError("");
  }

  async function analyze() {
    if (!file) return;
    setBusy(true); setPhase(0); setError("");
    try {
      const started = performance.now();
      const scan = await scanImage(file);
      const elapsed = performance.now() - started;
      if (elapsed < 2600) await new Promise(resolve => setTimeout(resolve, 2600 - elapsed));
      setResult(scan);
      window.setTimeout(() => document.querySelector("#result")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The exposure could not be analyzed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topline">
        <Link href="/">← FOOL MOON</Link>
        <span className="sensor"><i className="sensor-dot" />LOCAL MODE</span>
      </header>
      <h2 className="section-title">Open an exposure</h2>
      <p className="subtle">Choose a photograph. It will be decoded, stripped of embedded metadata, analyzed, and marked inside this browser.</p>

      {!preview ? (
        <label className="dropzone">
          <input aria-label="Choose a photograph" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choose} />
          <span>
            <i className="drop-icon">+</i>
            <strong>TAKE PHOTO OR CHOOSE IMAGE</strong>
            <small>JPEG, PNG or WebP · nothing is uploaded</small>
          </span>
        </label>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="preview" src={result?.markedUrl || preview} alt={result ? "Photograph with a local anomaly analysis overlay" : "Selected photograph preview"} />
          {!result && !busy && (
            <div className="button-row">
              <button className="action" onClick={analyze}>Analyze Exposure</button>
              <label className="secondary">
                Choose another
                <input hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choose} />
              </label>
            </div>
          )}
        </>
      )}

      {busy && (
        <section className="status-panel" aria-live="polite">
          <span className="result-heading">CALIBRATION IN PROGRESS</span>
          <div className="status-line"><span /></div>
          <p className="mono">{STATES[phase]}</p>
          <p className="truth">The image is being analyzed locally. No server request contains your photograph.</p>
        </section>
      )}

      {error && <section className="status-panel error" role="alert">{error}</section>}

      {result && (
        <section id="result" className="status-panel">
          <span className="result-heading">LOCAL EXPOSURE COMPLETE</span>
          <pre className="report">{result.report}</pre>
          <div className="button-row three">
            <button className="action" onClick={() => downloadDataUrl(result.markedUrl, `fool-moon-${result.shortId}.webp`)}>Save Result</button>
            <button className="secondary" onClick={() => downloadDataUrl(result.storyDataUrl, `fool-moon-story-${result.shortId}.png`)}>Save Story Card</button>
            <button className="secondary" onClick={() => { setResult(null); setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>New Exposure</button>
          </div>
        </section>
      )}

      <footer className="legal">
        <p className="legal-primary">This release runs entirely on your device. No account. No upload. No archive submission.</p>
        <p className="fine-print">This is a fictional paranormal interpretation built on real local pixel analysis. It is not scientific evidence of paranormal activity.</p>
        <div className="legal-bottom">
          <Link href="/privacy">Privacy</Link>
          <span className="maker">The Fool of The Moon</span>
        </div>
      </footer>
    </main>
  );
}
