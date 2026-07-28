import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <header className="topline">
        <span>FM-0 / LOCAL TERMINAL</span>
        <span className="sensor"><i className="sensor-dot" />DEVICE READY</span>
      </header>
      <section className="hero">
        <p className="eyebrow">Full moon exposure window</p>
        <h1>FOOL<br />MOON<span>Exposure 0</span></h1>
        <p className="lead">Your camera records more than you see.</p>
        <Link className="action" href="/scan">Enter Exposure 0</Link>
        <p className="privacy-note">Images are analyzed on this device. This release has no upload, account, server queue, or public archive.</p>
      </section>
    </main>
  );
}
