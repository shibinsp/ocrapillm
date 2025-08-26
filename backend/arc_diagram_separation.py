import fitz  # PyMuPDF
import cv2
import numpy as np
import os
from pathlib import Path
from typing import Tuple, List, Dict, Any

class ArcDiagramSeparator:
    def __init__(self, similarity_threshold: float = 0.15):
        """
        Initialize the Arc Diagram Separator
        
        Args:
            similarity_threshold: Threshold for determining arc diagram similarity
        """
        self.similarity_threshold = similarity_threshold
        current_dir = Path(__file__).parent
        self.sample_img_paths = [
            str(current_dir / "sample_image" / "image1.png"),
            str(current_dir / "sample_image" / "image2.png"),
            str(current_dir / "sample_image" / "image3.png"),
            str(current_dir / "sample_image" / "image4.png")
        ]
        self.sample_features = []
        self.orb = cv2.ORB_create(2000)
        self._load_sample_features()
    
    def _load_sample_features(self):
        """Load and compute features for sample arc diagram images"""
        for sample_path in self.sample_img_paths:
            try:
                sample_img = cv2.imread(sample_path, cv2.IMREAD_GRAYSCALE)
                if sample_img is None:
                    print(f"Warning: Could not load sample image {sample_path}")
                    continue
                kp, des = self.orb.detectAndCompute(sample_img, None)
                if des is not None:
                    self.sample_features.append({"kp": kp, "des": des})
            except Exception as e:
                print(f"Error processing sample image {sample_path}: {e}")

    def separate_arc_diagrams(self, pdf_path: str, output_dir: str = None) -> Dict[str, Any]:
        """
        Separate arc diagram pages from regular content pages
        
        Args:
            pdf_path: Path to the input PDF file
            output_dir: Directory to save separated PDFs (optional)
            
        Returns:
            Dictionary containing:
            - arc_pages: List of page numbers containing arc diagrams
            - non_arc_pages: List of page numbers without arc diagrams
            - arc_pdf_path: Path to saved arc diagrams PDF (if output_dir provided)
            - non_arc_pdf_path: Path to saved non-arc content PDF (if output_dir provided)
            - total_pages: Total number of pages processed
        """
        if not self.sample_features:
            return {
                "error": "No valid sample images loaded",
                "arc_pages": [],
                "non_arc_pages": [],
                "total_pages": 0
            }
        
        try:
            doc = fitz.open(pdf_path)
            arc_pages = set()
            total_pages = len(doc)
            
            print(f"Processing {total_pages} pages for arc diagram detection...")
            
            for page_num in range(total_pages):
                try:
                    pix = doc[page_num].get_pixmap(dpi=200)
                    img_data = np.frombuffer(pix.samples, dtype=np.uint8)
                    img = img_data.reshape(pix.height, pix.width, pix.n)
                    if pix.n == 4:  # RGBA to RGB
                        img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
                    gray_page = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

                    # ORB on PDF page
                    kp2, des2 = self.orb.detectAndCompute(gray_page, None)
                    if des2 is None:
                        continue

                    # Match features against all sample images
                    max_similarity = 0
                    for sample in self.sample_features:
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

                    if max_similarity > self.similarity_threshold:
                        arc_pages.add(page_num)

                except Exception as e:
                    print(f"Error processing page {page_num+1}: {e}")
                    continue
            
            # Create lists of arc and non-arc pages
            arc_page_list = sorted(list(arc_pages))
            non_arc_page_list = [i for i in range(total_pages) if i not in arc_pages]
            
            result = {
                "arc_pages": arc_page_list,
                "non_arc_pages": non_arc_page_list,
                "total_pages": total_pages,
                "arc_count": len(arc_page_list),
                "non_arc_count": len(non_arc_page_list)
            }
            
            # Save separated PDFs if output directory is provided
            if output_dir:
                output_path = Path(output_dir)
                output_path.mkdir(exist_ok=True)
                
                pdf_name = Path(pdf_path).stem
                
                # Save arc diagrams PDF
                if arc_page_list:
                    arc_doc = fitz.open()
                    for p in arc_page_list:
                        arc_doc.insert_pdf(doc, from_page=p, to_page=p)
                    arc_pdf_path = output_path / f"{pdf_name}_arc_diagrams.pdf"
                    arc_doc.save(str(arc_pdf_path))
                    arc_doc.close()
                    result["arc_pdf_path"] = str(arc_pdf_path)
                    print(f"[+] Saved {len(arc_page_list)} arc diagram pages to {arc_pdf_path}")
                
                # Save non-arc content PDF
                if non_arc_page_list:
                    non_arc_doc = fitz.open()
                    for p in non_arc_page_list:
                        non_arc_doc.insert_pdf(doc, from_page=p, to_page=p)
                    non_arc_pdf_path = output_path / f"{pdf_name}_content_only.pdf"
                    non_arc_doc.save(str(non_arc_pdf_path))
                    non_arc_doc.close()
                    result["non_arc_pdf_path"] = str(non_arc_pdf_path)
                    print(f"[+] Saved {len(non_arc_page_list)} content pages to {non_arc_pdf_path}")
            
            doc.close()
            return result
            
        except Exception as e:
            return {
                "error": f"Error processing PDF: {str(e)}",
                "arc_pages": [],
                "non_arc_pages": [],
                "total_pages": 0
            }

# Convenience function for backward compatibility
def separate_arc_diagrams_from_pdf(pdf_path: str, output_dir: str = None, similarity_threshold: float = 0.15) -> Dict[str, Any]:
    """
    Convenience function to separate arc diagrams from a PDF
    
    Args:
        pdf_path: Path to the input PDF file
        output_dir: Directory to save separated PDFs (optional)
        similarity_threshold: Threshold for arc diagram detection
        
    Returns:
        Dictionary with separation results
    """
    separator = ArcDiagramSeparator(similarity_threshold=similarity_threshold)
    return separator.separate_arc_diagrams(pdf_path, output_dir)