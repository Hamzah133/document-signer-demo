# Installation Update

New dependencies have been added to generate proper multi-page PDFs.

## Install New Dependencies

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

This will install:
- Pillow (for image processing)
- ReportLab (for PDF generation)

## What Changed

- PDF downloads now merge all pages into a single PDF file
- Downloads as `.pdf` instead of separate `.png` files
- All signatures and fields are preserved in the final PDF
