import fitz  # PyMuPDF
import cv2
import numpy as np
import os

# ---- CONFIG ----
# Use the uploaded sample images
sample_img_paths = [
    "/content/drive/MyDrive/Original_file/Screenshot 2025-08-13 155737.png",
    "/content/drive/MyDrive/Original_file/Screenshot 2025-08-13 155320.png",
    "/content/drive/MyDrive/Original_file/Screenshot 2025-08-13 155803.png",
    "/content/drive/MyDrive/Original_file/Screenshot 2025-08-13 171943.png"
]
PDF_PATH = "/content/drive/MyDrive/Original_file/GIBBON ESQ.pdf" # the PDF to scan
OUTPUT_PDF_PATH = "arc_pages_only.pdf"   # extracted pages
SIMILARITY_THRESHOLD = 0.15              # adjust if needed
# ----------------

# Load sample images and compute features
sample_features = []
orb = cv2.ORB_create(2000)

for sample_path in sample_img_paths:
    try:
        sample_img = cv2.imread(sample_path, cv2.IMREAD_GRAYSCALE)
        if sample_img is None:
            print(f"Warning: Could not load sample image {sample_path}")
            continue
        kp, des = orb.detectAndCompute(sample_img, None)
        if des is not None:
            sample_features.append({"kp": kp, "des": des})
    except Exception as e:
        print(f"Error processing sample image {sample_path}: {e}")


if not sample_features:
    print("No valid sample images loaded. Exiting.")
else:
    # PDF processing
    doc = fitz.open(PDF_PATH)
    arc_pages = set() # Use a set to store unique page numbers

    for page_num in range(len(doc)):
        try:
            pix = doc[page_num].get_pixmap(dpi=200)
            img_data = np.frombuffer(pix.samples, dtype=np.uint8)
            img = img_data.reshape(pix.height, pix.width, pix.n)
            if pix.n == 4:  # RGBA to RGB
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
            gray_page = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

            # ORB on PDF page
            kp2, des2 = orb.detectAndCompute(gray_page, None)
            if des2 is None:
                continue

            # Match features against all sample images
            max_similarity = 0
            for sample in sample_features:
                des1 = sample["des"]
                kp1 = sample["kp"]
                if des1 is None:
                    continue

                bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
                matches = bf.match(des1, des2)

                if not matches:
                    continue

                # Similarity = ratio of good matches to total keypoints in sample
                good_matches = [m for m in matches if m.distance < 50]
                similarity = len(good_matches) / len(kp1)
                max_similarity = max(max_similarity, similarity)

            print(f"Page {page_num+1} max similarity: {max_similarity:.2f}")

            if max_similarity > SIMILARITY_THRESHOLD:
                arc_pages.add(page_num) # Add page number to set

        except Exception as e:
            print(f"Error processing page {page_num+1}: {e}")
            continue


    # Save matched pages into new PDF
    if arc_pages:
        new_doc = fitz.open()
        # Sort page numbers before inserting
        sorted_arc_pages = sorted(list(arc_pages))
        for p in sorted_arc_pages:
            new_doc.insert_pdf(doc, from_page=p, to_page=p)
        new_doc.save(OUTPUT_PDF_PATH)
        print(f"[+] Saved {len(arc_pages)} pages to {OUTPUT_PDF_PATH}")
    else:
        print("[-] No matching pages found.")