# -*- coding: utf-8 -*-
"""
Text Extraction from Diagram using Google Cloud Vision API
Modified for integration with OCR workflow
"""

import os
import io
import fitz  # PyMuPDF
from pathlib import Path
from typing import Dict, List, Any, Optional
from google.cloud import vision
import tempfile
import cv2
import numpy as np

class DiagramTextExtractor:
    def __init__(self, credentials_path: str = None):
        """
        Initialize the Diagram Text Extractor
        
        Args:
            credentials_path: Path to Google Cloud service account JSON key file
        """
        # Set default credentials path if not provided
        if not credentials_path:
            credentials_path = os.path.join(os.path.dirname(__file__), "google_credentials.json")
        
        if credentials_path and os.path.exists(credentials_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
            print(f"📋 Using Google Cloud credentials from: {credentials_path}")
        
        try:
            self.client = vision.ImageAnnotatorClient()
            print("✅ Google Cloud Vision API client initialized successfully")
        except Exception as e:
            print(f"⚠️ Warning: Could not initialize Google Cloud Vision API client: {e}")
            self.client = None
    
    def extract_text_from_image(self, image_path: str) -> Dict[str, Any]:
        """
        Extract text from a single image using Google Cloud Vision API
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary containing extracted text and metadata
        """
        if not self.client:
            return {
                "error": "Google Cloud Vision API client not available",
                "full_text": "",
                "text_blocks": []
            }
        
        if not os.path.exists(image_path):
            return {
                "error": f"Image file '{image_path}' not found",
                "full_text": "",
                "text_blocks": []
            }
        
        try:
            # Load the image into memory
            with io.open(image_path, 'rb') as image_file:
                content = image_file.read()

            image = vision.Image(content=content)

            # Perform text detection on the image file
            print(f"🤖 Analyzing image: {image_path}")
            response = self.client.text_detection(image=image)

            # Check for errors
            if response.error.message:
                return {
                    "error": f"Vision API error: {response.error.message}",
                    "full_text": "",
                    "text_blocks": []
                }

            # Extract full text and individual text blocks
            full_text = response.text_annotations[0].description if response.text_annotations else ""
            
            text_blocks = []
            # Skip the first annotation as it's the full text
            for text in response.text_annotations[1:]:
                text_blocks.append({
                    "text": text.description,
                    "bounds": [(vertex.x, vertex.y) for vertex in text.bounding_poly.vertices]
                })
            
            return {
                "full_text": full_text,
                "text_blocks": text_blocks,
                "blocks_count": len(text_blocks)
            }
            
        except Exception as e:
            return {
                "error": f"Error processing image: {str(e)}",
                "full_text": "",
                "text_blocks": []
            }

    def extract_text_from_pdf(self, pdf_path: str, output_dir: str = None) -> Dict[str, Any]:
        """
        Extract text from all pages of a PDF by converting pages to images
        
        Args:
            pdf_path: Path to the PDF file
            output_dir: Directory to save extracted images (optional)
            
        Returns:
            Dictionary containing extracted text from all pages
        """
        if not self.client:
            return {
                "error": "Google Cloud Vision API client not available",
                "pages": [],
                "combined_text": ""
            }
        
        if not os.path.exists(pdf_path):
            return {
                "error": f"PDF file '{pdf_path}' not found",
                "pages": [],
                "combined_text": ""
            }
        
        try:
            doc = fitz.open(pdf_path)
            pages_data = []
            combined_text = ""
            
            print(f"Processing {len(doc)} pages for text extraction...")
            
            for page_num in range(len(doc)):
                try:
                    # Convert PDF page to image
                    pix = doc[page_num].get_pixmap(dpi=300)  # Higher DPI for better OCR
                    img_data = pix.tobytes("png")
                    
                    # Create Vision API image object
                    image = vision.Image(content=img_data)
                    
                    # Perform text detection
                    print(f"🤖 Analyzing page {page_num + 1}...")
                    response = self.client.text_detection(image=image)
                    
                    # Check for errors
                    if response.error.message:
                        print(f"⚠️ Error on page {page_num + 1}: {response.error.message}")
                        continue
                    
                    # Extract text
                    page_text = response.text_annotations[0].description if response.text_annotations else ""
                    
                    text_blocks = []
                    for text in response.text_annotations[1:]:
                        text_blocks.append({
                            "text": text.description,
                            "bounds": [(vertex.x, vertex.y) for vertex in text.bounding_poly.vertices]
                        })
                    
                    page_data = {
                        "page_number": page_num + 1,
                        "text": page_text,
                        "text_blocks": text_blocks,
                        "blocks_count": len(text_blocks)
                    }
                    
                    pages_data.append(page_data)
                    combined_text += f"\n\n--- Page {page_num + 1} ---\n{page_text}"
                    
                    # Save image if output directory is provided
                    if output_dir:
                        output_path = Path(output_dir)
                        output_path.mkdir(exist_ok=True)
                        pdf_name = Path(pdf_path).stem
                        image_path = output_path / f"{pdf_name}_page_{page_num + 1}.png"
                        pix.save(str(image_path))
                        page_data["image_path"] = str(image_path)
                    
                except Exception as e:
                    print(f"Error processing page {page_num + 1}: {e}")
                    continue
            
            doc.close()
            
            return {
                "pages": pages_data,
                "combined_text": combined_text.strip(),
                "total_pages": len(pages_data),
                "pdf_path": pdf_path
            }
            
        except Exception as e:
            return {
                "error": f"Error processing PDF: {str(e)}",
                "pages": [],
                "combined_text": ""
            }

# Convenience function for backward compatibility
def extract_text_from_pdf_diagrams(pdf_path: str, credentials_path: str = None, output_dir: str = None) -> Dict[str, Any]:
    """
    Convenience function to extract text from PDF diagrams
    
    Args:
        pdf_path: Path to the PDF file
        credentials_path: Path to Google Cloud service account JSON key file
        output_dir: Directory to save extracted images (optional)
        
    Returns:
        Dictionary with extraction results
    """
    extractor = DiagramTextExtractor(credentials_path=credentials_path)
    return extractor.extract_text_from_pdf(pdf_path, output_dir)