import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="shell">
      <header className="topline"><Link href="/">← FOOL MOON</Link><span>v0.1.1 LOCAL</span></header>
      <h2 className="section-title">Privacy boundary</h2>
      <div className="report">YOUR PHOTOGRAPH DOES NOT LEAVE THIS DEVICE.</div>
      <p className="subtle">Exposure 0 decodes, resizes, analyzes, marks, and exports your selected image in the browser. The exported copy is redrawn through Canvas, removing the original file’s EXIF and GPS metadata.</p>
      <p className="subtle">This release contains no image-upload endpoint, user account, analytics identifier, submission queue, or public archive. Closing or refreshing the page clears the current exposure.</p>
      <p className="truth">The anomaly report is fictional entertainment generated deterministically from actual local pixel measurements. It does not verify paranormal activity.</p>
      <div className="button-row"><Link className="action" href="/scan">Open Scanner</Link></div>
    </main>
  );
}
