export type Candidate = {
  x: number; y: number; w: number; h: number; score: number; darkness: number; edge: number;
};

export type ScanResult = {
  markedUrl: string;
  cleanUrl: string;
  hash: string;
  shortId: string;
  classification: string;
  status: string;
  edgeStability: number;
  unresolved: number;
  report: string;
  storyDataUrl: string;
};

const CLASSES = [
  "THE VEILED MOTHER", "THE ANCIENT HUNGER", "THE EMPTY BODY",
  "THE SEVERED FLIGHT", "THE BORROWED FORTUNE", "THE EXTENDED FORM",
  "UNCLASSIFIED PRESENCE",
];
const STATUSES = ["OCCLUDED / OBSERVING", "DORMANT / PARTIAL", "TRANSIENT / WITHDRAWING", "FIXED / UNRESOLVED"];

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function canvasBlob(canvas: HTMLCanvasElement, type = "image/webp", quality = .82) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image composition failed.")), type, quality)
  );
}

async function decode(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a JPEG, PNG, or WebP image.");
  return createImageBitmap(file);
}

function fit(width: number, height: number, maximum: number) {
  const ratio = Math.min(1, maximum / Math.max(width, height));
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, iw: number, ih: number, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(image, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

function analyze(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const lum = new Float32Array(width * height);
  let mean = 0, variance = 0;
  for (let i = 0; i < lum.length; i++) {
    const p = i * 4;
    const value = .2126 * pixels[p] + .7152 * pixels[p + 1] + .0722 * pixels[p + 2];
    lum[i] = value; mean += value;
  }
  mean /= lum.length;
  for (const value of lum) variance += (value - mean) ** 2;
  variance /= lum.length;

  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = -lum[i - width - 1] + lum[i - width + 1] - 2 * lum[i - 1] + 2 * lum[i + 1] - lum[i + width - 1] + lum[i + width + 1];
      const gy = -lum[i - width - 1] - 2 * lum[i - width] - lum[i - width + 1] + lum[i + width - 1] + 2 * lum[i + width] + lum[i + width + 1];
      edges[i] = Math.min(255, Math.hypot(gx, gy));
    }
  }

  const candidates: Candidate[] = [];
  const cols = 7, rows = 10;
  const cellW = Math.floor(width / cols), cellH = Math.floor(height / rows);
  for (let gy = 1; gy < rows - 1; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const x0 = gx * cellW, y0 = gy * cellH;
      let localMean = 0, localSq = 0, edgeSum = 0, count = 0;
      for (let y = y0; y < Math.min(height, y0 + cellH * 2); y += 2) {
        for (let x = x0; x < Math.min(width, x0 + cellW * 2); x += 2) {
          const value = lum[y * width + x];
          localMean += value; localSq += value * value; edgeSum += edges[y * width + x]; count++;
        }
      }
      localMean /= count;
      const contrast = Math.sqrt(Math.max(0, localSq / count - localMean ** 2)) / 64;
      const edge = Math.min(1, edgeSum / count / 80);
      const darkness = Math.max(0, Math.min(1, (175 - localMean) / 150));
      const score = .43 * Math.min(1, contrast) + .34 * edge + .23 * darkness;
      if (score > .27) candidates.push({ x: x0, y: y0, w: cellW * 2, h: cellH * 2, score, darkness, edge });
    }
  }
  return { candidates: candidates.sort((a, b) => b.score - a.score), mean, variance };
}

function contour(ctx: CanvasRenderingContext2D, c: Candidate, sx: number, sy: number, random: () => number, label: string) {
  const cx = (c.x + c.w / 2) * sx, cy = (c.y + c.h / 2) * sy;
  const rx = c.w * sx * .46, ry = c.h * sy * .46;
  const points = 14;
  ctx.save();
  ctx.strokeStyle = "#e3aa4b";
  ctx.fillStyle = "#e3aa4b";
  ctx.lineWidth = Math.max(1.5, sx * .8);
  ctx.setLineDash([7 * sx, 4 * sx]);
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const angle = (i % points) / points * Math.PI * 2;
    const wobble = .82 + random() * .28;
    const px = cx + Math.cos(angle) * rx * wobble;
    const py = cy + Math.sin(angle) * ry * wobble;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, sx * 2.4), 0, Math.PI * 2); ctx.fill();
  const labelX = Math.min(ctx.canvas.width - 190 * sx, Math.max(8 * sx, cx + rx * .72));
  const labelY = Math.max(24 * sy, cy - ry * .62);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(labelX, labelY); ctx.stroke();
  ctx.fillStyle = "rgba(8,8,6,.82)";
  ctx.fillRect(labelX, labelY - 18 * sy, 176 * sx, 24 * sy);
  ctx.fillStyle = "#e3aa4b";
  ctx.font = `700 ${Math.max(11, 11 * sx)}px Courier New`;
  ctx.fillText(label, labelX + 6 * sx, labelY - 3 * sy);
  ctx.restore();
}

export async function scanImage(file: File): Promise<ScanResult> {
  const bitmap = await decode(file);
  const exportSize = fit(bitmap.width, bitmap.height, 1600);
  const clean = document.createElement("canvas");
  clean.width = exportSize.width; clean.height = exportSize.height;
  const cleanCtx = clean.getContext("2d", { willReadFrequently: true })!;
  cleanCtx.fillStyle = "#080806"; cleanCtx.fillRect(0, 0, clean.width, clean.height);
  cleanCtx.drawImage(bitmap, 0, 0, clean.width, clean.height);
  bitmap.close();

  const cleanBlob = await canvasBlob(clean);
  const bytes = await cleanBlob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
  const seed = Number.parseInt(hash.slice(0, 8), 16);
  const random = mulberry32(seed);

  const aSize = fit(clean.width, clean.height, 384);
  const analysisCanvas = document.createElement("canvas");
  analysisCanvas.width = aSize.width; analysisCanvas.height = aSize.height;
  const analysisCtx = analysisCanvas.getContext("2d", { willReadFrequently: true })!;
  analysisCtx.drawImage(clean, 0, 0, aSize.width, aSize.height);
  const analysis = analyze(analysisCtx, aSize.width, aSize.height);

  const structurallyBlank = analysis.variance < 90 || analysis.candidates.length === 0;
  let unresolved = structurallyBlank ? 0 : random() < .23 ? 0 : 1;
  if (!structurallyBlank && analysis.candidates.length > 4 && random() < .1) unresolved = 2;
  const selected: Candidate[] = [];
  for (const candidate of analysis.candidates) {
    if (selected.length >= unresolved) break;
    const separate = selected.every(s => Math.hypot((s.x + s.w / 2) - (candidate.x + candidate.w / 2), (s.y + s.h / 2) - (candidate.y + candidate.h / 2)) > Math.min(aSize.width, aSize.height) * .22);
    if (separate) selected.push(candidate);
  }
  unresolved = selected.length;

  const marked = document.createElement("canvas");
  marked.width = clean.width; marked.height = clean.height;
  const markedCtx = marked.getContext("2d")!;
  markedCtx.drawImage(clean, 0, 0);
  const sx = clean.width / aSize.width, sy = clean.height / aSize.height;
  selected.forEach((candidate, index) => contour(markedCtx, candidate, sx, sy, random, `UNRESOLVED FORM ${String(index + 1).padStart(2, "0")}`));
  markedCtx.fillStyle = "rgba(8,8,6,.78)";
  markedCtx.fillRect(0, marked.height - Math.max(34, marked.height * .035), marked.width, Math.max(34, marked.height * .035));
  markedCtx.fillStyle = "#c4b07c";
  markedCtx.font = `700 ${Math.max(12, marked.width * .012)}px Courier New`;
  markedCtx.fillText("EXPOSURE 0 // FOOL MOON", Math.max(12, marked.width * .018), marked.height - Math.max(12, marked.height * .011));

  const classIndex = seed % CLASSES.length;
  const classification = unresolved ? CLASSES[classIndex] : "NO STABLE EXPOSURE";
  const status = unresolved ? STATUSES[(seed >>> 4) % STATUSES.length] : "INCONCLUSIVE";
  const edgeStability = unresolved ? Math.round(24 + (selected[0]?.edge || 0) * 58) : Math.round(Math.min(19, analysis.variance / 20));
  const shortId = hash.slice(0, 8).toUpperCase();
  const visible = unresolved ? Math.max(1, unresolved) : 0;
  const report = `EXPOSURE 0 // ANALYSIS COMPLETE

CASE: FM0-${shortId}
VISION ENGINE: LOCAL CANVAS
UNRESOLVED REGIONS: ${unresolved}

RECORDED PRESENCE: ${unresolved ? visible + 1 : 0}
VISIBLE PRESENCE: ${visible}

CLASSIFICATION: ${classification}
STATUS: ${status}
EDGE STABILITY: ${edgeStability}%`;

  const story = document.createElement("canvas");
  story.width = 1080; story.height = 1920;
  const storyCtx = story.getContext("2d")!;
  storyCtx.fillStyle = "#080806"; storyCtx.fillRect(0, 0, 1080, 1920);
  storyCtx.fillStyle = "#e3aa4b"; storyCtx.font = "700 24px Courier New"; storyCtx.fillText("FOOL MOON // EXPOSURE 0", 76, 116);
  storyCtx.fillStyle = "#d4d0c0"; storyCtx.font = "110px Impact"; storyCtx.fillText(classification, 76, 260, 930);
  drawCover(storyCtx, marked, marked.width, marked.height, 76, 350, 928, 940);
  storyCtx.strokeStyle = "#39372d"; storyCtx.strokeRect(76, 350, 928, 940);
  storyCtx.fillStyle = "#b7b29f"; storyCtx.font = "26px Courier New";
  const lines = report.split("\n").slice(2);
  lines.forEach((line, index) => storyCtx.fillText(line, 76, 1370 + index * 48));
  storyCtx.fillStyle = "#747263"; storyCtx.font = "22px Arial"; storyCtx.fillText("Fictional paranormal interpretation • processed locally", 76, 1834);

  return {
    markedUrl: marked.toDataURL("image/webp", .86),
    cleanUrl: clean.toDataURL("image/webp", .82),
    hash, shortId, classification, status, edgeStability, unresolved, report,
    storyDataUrl: story.toDataURL("image/png"),
  };
}

export function downloadDataUrl(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
}
