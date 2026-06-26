# Marketplace Intelligence Import Sources

PDF kaynakları repo'ya dahil edilmez. Dosyaları şuraya kopyalayın:

`data/analysis-imports/sources/`

Gerekli dosyalar:
- `Trendyol_Komisyon_Oranlar_.pdf`
- `trendyol.pdf`
- `Hepsibu_Komisyon_Listesi.pdf`
- `hepsiburada.pdf`
- `c_ic_ek.pdf`

Import:

```bash
python3 -m venv .venv-pdf
.venv-pdf/bin/pip install pdfplumber
.venv-pdf/bin/python scripts/analysis-imports/parse-pdf-sources.py
# veya
npx tsx scripts/import-marketplace-intelligence.ts
```

Nihai cache: `data/marketplace-intelligence/*.json`
