#!/usr/bin/env python3
"""
Zero-cost OCR for arc-diagram PDF

Input:  Path to PDF (Windows-safe with pathlib)
Output: ./ocr_output/  (images + JSON + clean text)
"""

import os
import pathlib
import json
import textwrap
import re
import sys

import cv2
import numpy as np
from pdf2image import convert_from_path

try:
    import keras_ocr
except ImportError:
    sys.exit(
        "ERROR: keras_ocr not found. Install it with:\n"
        "    pip install keras-ocr\n"
    )

from symspellpy import SymSpell
from langdetect import detect

# ---------- CONFIG ----------
DPI = 300          # 300 → sharp text
MIN_CONF = 0.30
OUT_DIR = pathlib.Path("ocr_output")
OUT_DIR.mkdir(exist_ok=True)


# ---------- 1. PDF → IMAGES ----------
def pdf_to_images(pdf_path: pathlib.Path):
    pages = convert_from_path(str(pdf_path), dpi=DPI, fmt="png")
    img_paths = []
    for idx, page in enumerate(pages, 1):
        out = OUT_DIR / f"page_{idx:03d}.png"
        page.save(out, "PNG")
        img_paths.append(out)
    return img_paths


# ---------- 2. PRE-PROCESS ----------
def preprocess(img_bgr: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 3)
    th = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 25, 15
    )

    # Deskew
    coords = np.column_stack(np.where(th > 0))
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle += 90
    if abs(angle) > 5:
        (h, w) = th.shape
        M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
        th = cv2.warpAffine(
            th, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )

    return cv2.cvtColor(th, cv2.COLOR_GRAY2BGR)


# ---------- 3. OCR ----------
def load_ocr_pipeline():
    return keras_ocr.pipeline.Pipeline()

def ocr_image(img_bgr: np.ndarray, pipeline) -> list:
    preds = pipeline.recognize([img_bgr])[0]
    return [(word, box) for word, box in preds if word.strip()]


# ---------- 4. SPELL FIX ----------
def load_symspell():
    sym = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
    dict_path = pathlib.Path("frequency_dictionary_en_82_765.txt")
    if not dict_path.exists():
        import urllib.request
        print("Downloading frequency dictionary...")
        urllib.request.urlretrieve(
            "https://raw.githubusercontent.com/wolfgarbe/SymSpell/master/SymSpell/frequency_dictionary_en_82_765.txt",
            dict_path
        )
    sym.load_dictionary(str(dict_path), term_index=0, count_index=1)
    return sym


def post_correct(words, sym):
    out = []
    for w in words:
        if re.fullmatch(r'[\d\W]+', w):  # numbers/punctuation
            out.append(w)
            continue
        sugg = sym.lookup_compound(w, max_edit_distance=2)
        out.append(sugg[0].term if sugg else w)
    return out


# ---------- 5. MAIN ----------
def run(pdf_path: pathlib.Path):
    if not pdf_path.exists():
        sys.exit(f"ERROR: File not found → {pdf_path}")

    print(f"Converting PDF to images @ {DPI} DPI...")
    imgs = pdf_to_images(pdf_path)

    print("Loading spell checker dictionary...")
    sym = load_symspell()

    print("Loading keras-ocr pipeline (first time may download models)...")
    pipeline = load_ocr_pipeline()

    all_text = []

    for img_p in imgs:
        print(f"OCR on {img_p.name} ...")
        img_bgr = cv2.imread(str(img_p))
        img_pp = preprocess(img_bgr)
        preds = ocr_image(img_pp, pipeline)

        words = [w for w, _ in preds]
        try:
            if detect(" ".join(words)).startswith("en"):
                words = post_correct(words, sym)
        except Exception:
            pass

        all_text.extend(words)

        # Save JSON
        json_path = OUT_DIR / f"{img_p.stem}.json"
        json.dump(preds, open(json_path, "w"), default=lambda x: x.tolist())

        # Save pre-processed image
        cv2.imwrite(str(OUT_DIR / f"{img_p.stem}_pp.png"), img_pp)

    # Dump combined text
    txt_path = OUT_DIR / "combined.txt"
    txt_path.write_text("\n".join(textwrap.wrap(" ".join(all_text), 100)))

    print("DONE →", OUT_DIR.resolve())


if __name__ == "__main__":
    # Example usage: update with your PDF path
    # Using pathlib makes it OS-safe
    pdf_input = pathlib.Path(r"D:/trae/ocrapillm/arc_pages_only (1).pdf")
    run(pdf_input)
