# QA Test Files — Aragon Image Upload Pipeline

Drag these into the upload dropzone during your Loom walkthrough.

| # | File | Expected Result | Why |
|---|------|----------------|-----|
| 1 | `valid-portrait.jpg` | **ACCEPTED** | 1024×1024, single face, sharp, >50KB |
| 2 | `valid-portrait-2.jpg` | **ACCEPTED** | Second distinct face — all checks pass |
| 3 | `too-small.jpg` | **REJECTED — TOO_SMALL** | 400×300px (under 800px min dimension) |
| 4 | `too-small-filesize.jpg` | **REJECTED — TOO_SMALL** | 1200×1200px but 11KB (under 50KB minimum) |
| 5 | `blurry.jpg` | **REJECTED — BLURRY** | Laplacian variance 47 (threshold 200) |
| 6 | `duplicate.jpg` | **REJECTED — DUPLICATE** | Byte-identical to `valid-portrait.jpg` |
| 7 | `no-face.jpg` | **REJECTED — NO_FACE** | Gradient image, zero faces detected |
| 8 | `face-too-small.jpg` | **REJECTED — FACE_TOO_SMALL** | 120×120 face on 3000×2000 canvas (0.24% < 5%) |
| 9 | `multiple-faces.jpg` | **REJECTED — MULTIPLE_FACES** | 4 faces composited into one image |
| 10 | `fake-image.jpg` | **REJECTED — INVALID_FORMAT** | Text file with `.jpg` extension (wrong magic bytes) |

## Edge Cases to Demonstrate

- **Same-batch duplicate**: Drag `valid-portrait.jpg` + `duplicate.jpg` together → first ACCEPTED, second DUPLICATE
- **Multiple rejection reasons**: (e.g. if you drag `too-small.jpg` into an existing duplicate check — it's only one reason per file here, but explain the pipeline aggregates all)
- **Polling timeout**: Kill server mid-validation → client shows error after 120s
- **Cancel/Delete**: Upload in-progress → click delete → verify DB + Storage cleanup
- **Bulk delete**: After uploading several, use the "Delete all" flow

## For HEIC Testing

Use a real `.heic` file from an iPhone. The pipeline:
1. Detects HEIC via magic bytes
2. Converts to JPEG via `heic-convert`
3. Uploads the JPEG to storage
4. Deletes the original HEIC from storage
