# FOOL MOON — Exposure 0

`v0.1.1-local` is the fully client-side FOOL MOON companion scanner.

## Included

- Mobile-first landing and scan flow
- JPEG, PNG, and WebP input
- Canvas sanitization (original EXIF/GPS metadata is not copied)
- Real luminance, contrast, Sobel edge, and ambiguity analysis
- SHA-256-seeded deterministic fictional interpretation
- Zero, one, or two restrained anomaly contours
- Marked-image export
- 1080 × 1920 Story-card export
- Explicit local-only privacy boundary

## Deliberately excluded

- Uploads or server submission
- Accounts, database, moderation, or public archive
- Turnstile and rate limits
- Audio and sigil modules

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm start
```

The app requires no environment variables.
