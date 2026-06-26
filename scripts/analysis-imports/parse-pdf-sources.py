#!/usr/bin/env python3
"""Parse marketplace PDF sources into normalized JSON for marketplace-intelligence cache."""
import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("pdfplumber required: python3 -m venv .venv-pdf && .venv-pdf/bin/pip install pdfplumber", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "analysis-imports" / "sources"
OUT = ROOT / "data" / "marketplace-intelligence"


def parse_price(value: str) -> float | None:
    if not value:
        return None
    cleaned = str(value).replace("₺", "").replace(" ", "").strip()
    if not cleaned:
        return None
    # Formats: 1288.86 | 141.32 | 1.234,56 | 1,234.56
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        parts = cleaned.split(",")
        if len(parts) == 2 and len(parts[1]) <= 2:
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_rate(value: str) -> float | None:
    if not value:
        return None
    m = re.search(r"(\d+[,\.]?\d*)", str(value))
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


MAX_DESI_IMPORT = 100


def extract_shipping_tables(pdf_path: Path, carrier_columns: dict[str, int]):
    """Extract desi rows from PDF tables. carrier_columns maps carrier id -> column index."""
    rows: dict[int, dict[str, float]] = {}
    with pdfplumber.open(pdf_path) as doc:
        for page in doc.pages:
            for table in page.extract_tables() or []:
                for row in table:
                    if not row or not row[0]:
                        continue
                    first = str(row[0]).strip()
                    if not first.isdigit():
                        continue
                    desi = int(first)
                    if desi > MAX_DESI_IMPORT:
                        continue
                    carrier_prices: dict[str, float] = {}
                    for carrier, col_idx in carrier_columns.items():
                        if col_idx < len(row):
                            price = parse_price(row[col_idx])
                            if price is not None:
                                carrier_prices[carrier] = price
                    if carrier_prices:
                        rows[desi] = carrier_prices
    return rows


def rows_to_brackets(marketplace: str, rows: dict[int, dict[str, float]], vat_note: str):
    brackets = []
    for desi in sorted(rows):
        for carrier, price in rows[desi].items():
            brackets.append({
                "marketplace": marketplace,
                "carrier": carrier,
                "desiMin": desi,
                "desiMax": desi,
                "price": price,
                "currency": "TRY",
                "vatIncluded": False,
                "vatNote": vat_note,
            })
    return brackets


def parse_trendyol_shipping():
    carrier_columns = {
        "aras": 1,
        "dhl": 2,
        "kolay_gelsin": 3,
        "ptt": 4,
        "surat": 5,
        "yurtici": 7,
    }
    carrier_labels = {
        "aras": "Aras",
        "dhl": "DHL eCommerce",
        "kolay_gelsin": "Kolay Gelsin",
        "ptt": "PTT",
        "surat": "Sürat",
        "yurtici": "Yurtiçi",
    }
    rows = extract_shipping_tables(SRC / "trendyol.pdf", carrier_columns)
    return {
        "source": {
            "sourceName": "Trendyol Kargo Ücretleri",
            "sourceFile": "trendyol.pdf",
            "sourceType": "pdf",
            "effectiveDate": "2026-05-22",
            "vatIncluded": False,
            "vatNote": "KDV hariç",
            "version": "2026-05-22",
            "confidence": "official",
        },
        "carriers": carrier_labels,
        "brackets": rows_to_brackets("trendyol", rows, "KDV hariç"),
    }


def parse_hepsiburada_shipping():
    carrier_columns = {
        "aras": 1,
        "dhl": 2,
        "kolay_gelsin": 4,
        "ptt": 5,
        "surat": 6,
        "yurtici": 7,
    }
    carrier_labels = {
        "aras": "Aras Kargo",
        "dhl": "DHL eCommerce",
        "kolay_gelsin": "Kolay Gelsin",
        "ptt": "PTT Kargo",
        "surat": "Sürat Kargo",
        "yurtici": "Yurtiçi Kargo",
    }
    rows = extract_shipping_tables(SRC / "hepsiburada.pdf", carrier_columns)
    return {
        "source": {
            "sourceName": "Hepsiburada Kargo Ücretleri",
            "sourceFile": "hepsiburada.pdf",
            "sourceType": "pdf",
            "effectiveDate": "2026-01-02",
            "vatIncluded": False,
            "vatNote": "KDV hariç",
            "version": "2026-01-02",
            "confidence": "official",
        },
        "carriers": carrier_labels,
        "brackets": rows_to_brackets("hepsiburada", rows, "KDV hariç"),
    }


def parse_ciceksepeti_shipping():
    carrier_columns = {
        "surat": 1,
        "yurtici": 2,
        "mng": 3,
        "aras": 4,
        "ups": 5,
    }
    carrier_labels = {
        "surat": "Sürat",
        "yurtici": "Yurtiçi",
        "mng": "MNG",
        "aras": "Aras",
        "ups": "UPS",
    }
    rows = extract_shipping_tables(SRC / "c_ic_ek.pdf", carrier_columns)
    return {
        "source": {
            "sourceName": "ÇiçekSepeti Kargo Ücretleri",
            "sourceFile": "c_ic_ek.pdf",
            "sourceType": "pdf",
            "effectiveDate": "2026-01-01",
            "vatIncluded": False,
            "vatNote": "KDV ve posta hizmet bedeli hariç",
            "version": "2026",
            "confidence": "official",
        },
        "carriers": carrier_labels,
        "brackets": rows_to_brackets("ciceksepeti", rows, "KDV ve posta hizmet bedeli hariç"),
    }


def parse_hepsiburada_commissions():
    entries = []
    skipped = []
    with pdfplumber.open(SRC / "Hepsibu_Komisyon_Listesi.pdf") as doc:
        for page in doc.pages:
            for table in page.extract_tables() or []:
                for row in table:
                    if not row or len(row) < 4:
                        continue
                    main_cat = (row[0] or "").strip().replace("\n", " ")
                    sub_cat = (row[1] or "").strip().replace("\n", " ")
                    product_group = (row[2] or "").strip().replace("\n", " ")
                    rate_str = (row[3] or "").strip()
                    if not main_cat or main_cat.lower() in ("ana kategori", "hepsiburada komisyon listesi"):
                        continue
                    rate = parse_rate(rate_str)
                    if rate is None:
                        skipped.append(str(row))
                        continue
                    entries.append({
                        "marketplace": "hepsiburada",
                        "mainCategory": main_cat,
                        "subCategory": sub_cat,
                        "productGroup": product_group,
                        "ratePercent": rate,
                        "vatIncluded": False,
                        "vatNote": "Tüm komisyonlar listeleme fiyatı üzerinden +KDV olarak hesaplanacaktır",
                        "serviceFees": [],
                    })

    seen = set()
    unique = []
    for e in entries:
        key = (e["mainCategory"], e["subCategory"], e["productGroup"])
        if key not in seen:
            seen.add(key)
            unique.append(e)

    return {
        "source": {
            "sourceName": "Hepsiburada Komisyon Listesi",
            "sourceFile": "Hepsibu_Komisyon_Listesi.pdf",
            "sourceType": "pdf",
            "effectiveDate": "2026-01-01",
            "vatIncluded": False,
            "vatNote": "Tüm komisyonlar listeleme fiyatı üzerinden +KDV olarak hesaplanacaktır",
            "version": "2026",
            "confidence": "official",
        },
        "entries": unique,
        "skipped": skipped[:50],
    }


def parse_trendyol_commissions():
    entries = []
    skipped = []
    seen_keys: set[tuple[str, str, str]] = set()

    with pdfplumber.open(SRC / "Trendyol_Komisyon_Oranlar_.pdf") as doc:
        for page in doc.pages:
            for table in page.extract_tables() or []:
                for row in table:
                    if not row or len(row) < 6:
                        continue
                    no = (row[0] or "").strip()
                    if not no.isdigit():
                        continue
                    main_cat = (row[1] or "").strip().replace("\n", " ")
                    sub_cat = (row[2] or "").strip().replace("\n", " ")
                    product_group = (row[3] or "").strip().replace("\n", " ")
                    rate = parse_rate(row[5] or "")
                    if not main_cat or rate is None:
                        skipped.append(str(row[:6]))
                        continue
                    pg_key = product_group or sub_cat
                    key = (main_cat, sub_cat, pg_key)
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)
                    entries.append({
                        "marketplace": "trendyol",
                        "mainCategory": main_cat,
                        "subCategory": sub_cat,
                        "productGroup": pg_key,
                        "ratePercent": rate,
                        "vatIncluded": True,
                        "serviceFees": [],
                    })

    return {
        "source": {
            "sourceName": "Trendyol Komisyon Oranları",
            "sourceFile": "Trendyol_Komisyon_Oranlar_.pdf",
            "sourceType": "pdf",
            "effectiveDate": "2026-01-01",
            "vatIncluded": True,
            "vatNote": "Komisyon oranları KDV dahil",
            "version": "2026",
            "confidence": "official",
        },
        "entries": entries,
        "skipped": skipped[:50],
    }


def n11_commissions_manual():
    entries_data = [
        {"mainCategory": "Ev Tekstili", "subCategory": "Perde", "ratePercent": 20},
        {"mainCategory": "Ev Tekstili", "subCategory": "Koltuk Örtüsü", "ratePercent": 20},
        {"mainCategory": "Ev Tekstili", "subCategory": "Mutfak Tekstili", "ratePercent": 20},
        {"mainCategory": "Ev Tekstili", "subCategory": "Halı & Kilim", "ratePercent": 20},
        {"mainCategory": "Ev Tekstili", "subCategory": "Yatak Odası Tekstili", "ratePercent": 20},
        {"mainCategory": "Ev Tekstili", "subCategory": "Banyo Tekstili", "ratePercent": 20},
        {"mainCategory": "Dekorasyon & Aydınlatma", "subCategory": "Duvar Dekorasyonu", "ratePercent": 21},
        {"mainCategory": "Dekorasyon & Aydınlatma", "subCategory": "Tablo", "ratePercent": 21},
        {"mainCategory": "Dekorasyon & Aydınlatma", "subCategory": "Ayna", "ratePercent": 23},
        {"mainCategory": "Dekorasyon & Aydınlatma", "subCategory": "Saat", "ratePercent": 23},
        {"mainCategory": "Mobilya", "subCategory": "Mobilya", "ratePercent": 19},
        {"mainCategory": "Hobi & Oyun", "subCategory": "Puzzle", "ratePercent": 17},
        {"mainCategory": "Hobi & Oyun", "subCategory": "Poster", "ratePercent": 17},
        {"mainCategory": "Mutfak Gereçleri", "subCategory": "Kupa & Bardak", "ratePercent": 18},
    ]
    service_fees = [
        {"id": "marketing", "label": "Pazarlama Hizmet Bedeli", "ratePercent": 1, "vatIncluded": False, "vatNote": "+KDV"},
        {"id": "marketplace", "label": "Pazaryeri Hizmet Bedeli", "ratePercent": 0.67, "vatIncluded": False, "vatNote": "+KDV"},
    ]
    entries = []
    for e in entries_data:
        entries.append({
            "marketplace": "n11",
            "mainCategory": e["mainCategory"],
            "subCategory": e["subCategory"],
            "productGroup": e["subCategory"],
            "ratePercent": e["ratePercent"],
            "vatIncluded": True,
            "serviceFees": service_fees,
        })
    return {
        "source": {
            "sourceName": "N11 Komisyon Oranları 2026",
            "sourceType": "manual",
            "effectiveDate": "2026-01-01",
            "vatIncluded": True,
            "version": "2026",
            "confidence": "official",
        },
        "serviceFees": service_fees,
        "entries": entries,
    }


def n11_shipping_manual():
    bracket_points = [
        (1, 52.9), (2, 55.9), (3, 58.9), (4, 61.9), (5, 64.9),
        (6, 69.9), (7, 74.9), (8, 79.9), (9, 87.9), (10, 94.9),
        (15, 124.9), (20, 159.9), (30, 219.9),
    ]
    brackets = []
    for desi in range(1, 31):
        price = bracket_points[-1][1]
        for up_to, p in bracket_points:
            if desi <= up_to:
                price = p
                break
        brackets.append({
            "marketplace": "n11",
            "carrier": "yurtici",
            "desiMin": desi,
            "desiMax": desi,
            "price": price,
            "currency": "TRY",
            "vatIncluded": True,
            "vatNote": "KDV dahil (özel kargo kampanyası)",
        })
    return {
        "source": {
            "sourceName": "N11 Özel Kargo Kampanyası",
            "sourceUrl": "https://www.n11.com/kampanyalar/ozel-kargo-kampanyasi",
            "sourceType": "manual",
            "effectiveDate": "2026-01-01",
            "vatIncluded": True,
            "version": "2026",
            "confidence": "official",
        },
        "carriers": {"yurtici": "Yurtiçi Kargo"},
        "brackets": brackets,
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    outputs = {
        "trendyol-shipping-2026-05-22.json": parse_trendyol_shipping(),
        "hepsiburada-shipping-2026-01-02.json": parse_hepsiburada_shipping(),
        "ciceksepeti-shipping-2026.json": parse_ciceksepeti_shipping(),
        "trendyol-commissions-2026.json": parse_trendyol_commissions(),
        "hepsiburada-commissions-2026.json": parse_hepsiburada_commissions(),
        "n11-commissions-2026.json": n11_commissions_manual(),
        "n11-shipping-2026.json": n11_shipping_manual(),
    }
    for name, data in outputs.items():
        path = OUT / name
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        count = len(data.get("entries", data.get("brackets", [])))
        print(f"Wrote {path} ({count} records)")

    ty = outputs["trendyol-shipping-2026-05-22.json"]
    ty90 = next(b for b in ty["brackets"] if b["carrier"] == "yurtici" and b["desiMin"] == 90)
    print(f"Trendyol Yurtiçi 90 desi: {ty90['price']}")

    cs = outputs["ciceksepeti-shipping-2026.json"]
    cs10 = next(b for b in cs["brackets"] if b["carrier"] == "yurtici" and b["desiMin"] == 10)
    cs90 = next(b for b in cs["brackets"] if b["carrier"] == "yurtici" and b["desiMin"] == 90)
    print(f"ÇiçekSepeti Yurtiçi 10 desi: {cs10['price']}")
    print(f"ÇiçekSepeti Yurtiçi 90 desi: {cs90['price']}")

    n11 = outputs["n11-shipping-2026.json"]
    n11_10 = next(b for b in n11["brackets"] if b["desiMin"] == 10)
    print(f"N11 Yurtiçi 10 desi: {n11_10['price']}")

    hb = outputs["hepsiburada-commissions-2026.json"]
    hali = next(e for e in hb["entries"] if e["subCategory"] == "Halı & Kilim")
    yatak = next(e for e in hb["entries"] if e["subCategory"] == "Yatak Odası Tekstili" and e["mainCategory"] == "Ev Tekstili")
    print(f"HB Halı & Kilim: {hali['ratePercent']}%")
    print(f"HB Yatak Odası Tekstili: {yatak['ratePercent']}%")


if __name__ == "__main__":
    main()
