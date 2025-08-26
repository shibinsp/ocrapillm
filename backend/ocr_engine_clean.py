import os
import requests
import json
import base64
import uuid
from datetime import datetime
from io import BytesIO
from pathlib import Path
from pdf2image import convert_from_path
from PIL import Image
from typing import List, Dict
import time
import subprocess
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import shutil
from google.cloud import vision
import os

class DatabaseOCR:
    def __init__(self, api_key: str = "eyFSYGAUfsrrDmDVLGaKac5IQmFy1gEH", init_db: bool = True):
        """
        Initialize Database OCR client with Mistral Pixtral API integration
        """
        # Mistral API Configuration
        self.api_key = api_key
        self.base_url = "https://api.mistral.ai/v1/chat/completions"
        self.model = "pixtral-12b-2409"

        # Google Cloud Vision API Configuration
        self.vision_client = vision.ImageAnnotatorClient()
        # Set Google Application Credentials environment variable
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "path/to/your/google_vision_api_key.json" # Replace with your actual path
        
        # Headers for API requests
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        # Database Configuration
        self.db_config = {
            'host': 'localhost',                 #'127.0.0.1',
            'port': 5432,
            'database': 'LLMAPI',
            'user': 'postgres',
            'password': 'sai'
        }
        
        # Ensure required packages are installed
        self.ensure_packages_installed()
        
        # Track database initialization status
        self.db_initialized = False
        
        # Initialize database only if requested
        if init_db:
            try:
                self.init_database()
                self.db_initialized = True
                print("✅ Database tables initialized successfully")
            except Exception as e:
                print(f"⚠️ Database initialization failed: {e}")
                print("Database functionality will be limited.")
    
    def ensure_database_initialized(self):
        """Ensure database is initialized before use"""
        if not self.db_initialized:
            try:
                self.init_database()
                self.db_initialized = True
                print("✅ Database tables initialized successfully")
            except Exception as e:
                print(f"⚠️ Database initialization failed: {e}")
                raise e

    def ensure_packages_installed(self):
        """Ensure required packages are installed"""
        required_packages = [
            'pdf2image',
            'pillow',
            'requests',
            'psycopg2-binary'
        ]
        
        for package in required_packages:
            try:
                __import__(package.replace('-', '_'))
            except ImportError:
                print(f"Installing {package}...")
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])

    def get_db_connection(self):
        """Get database connection"""
        try:
            conn = psycopg2.connect(**self.db_config)
            return conn
        except Exception as e:
            print(f"❌ Database connection error: {e}")
            raise
    
    def init_database(self):
        """Initialize database tables for OCR processing"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Create documents table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    filename VARCHAR(255) NOT NULL,
                    original_filename VARCHAR(255) NOT NULL,
                    file_size BIGINT,
                    file_path TEXT,
                    mime_type VARCHAR(100),
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processing_status VARCHAR(50) DEFAULT 'pending',
                    total_pages INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create pages table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
                    page_number INTEGER NOT NULL,
                    page_type VARCHAR(50) DEFAULT 'text',
                    image_data BYTEA,
                    processing_status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create extracted_content table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS extracted_content (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
                    content_type VARCHAR(50) DEFAULT 'text',
                    extracted_text TEXT,
                    confidence_score FLOAT,
                    processing_method VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create chat_sessions table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
                    session_name VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create chat_messages table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    message_type VARCHAR(20) CHECK (message_type IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            print("✅ Database tables initialized successfully")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Database initialization error: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def test_database_connection(self) -> Dict:
        """Test database connection"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if result:
                return {"success": True, "message": "Database connection successful"}
            else:
                return {"success": False, "error": "Database query failed"}
                
        except Exception as e:
            return {"success": False, "error": f"Database connection failed: {str(e)}"}

    def pdf_to_images(self, pdf_path: str, dpi: int = 300) -> List[Image.Image]:
        """Convert PDF to images"""

    def is_arc_diagram(self, image: Image.Image) -> bool:
        """Placeholder for arc diagram detection logic.
        In a real application, this would involve image analysis (e.g., using OpenCV or ML models).
        For now, it returns True for demonstration purposes.
        """
        # Implement actual arc diagram detection here
        # This could involve:
        # 1. Image segmentation to find distinct regions
        # 2. Shape detection (circles, arcs, lines)
        # 3. Text analysis (e.g., presence of specific keywords related to diagrams)
        # 4. Machine learning models trained on arc diagrams
        print("🔍 Running placeholder arc diagram detection...")
        return True
        print(f"Converting PDF to images: {pdf_path}")
        try:
            images = convert_from_path(pdf_path, dpi=dpi)
            print(f"✅ Converted PDF to {len(images)} images")
            return images
        except Exception as e:
            print(f"❌ Error converting PDF to images: {e}")
            raise

    def image_to_base64(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 string"""
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return img_str

    def extract_text_from_image(self, image: Image.Image, page_num: int = 1) -> Dict:
        """Extract text from image using Mistral Pixtral API"""
        try:
            # Convert image to base64
            base64_image = self.image_to_base64(image)
            
            # Prepare the request payload
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Please extract all text from this image. Maintain the original formatting and structure as much as possible. If there are tables, preserve the table structure. Return only the extracted text without any additional commentary."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 4000,
                "temperature": 0.1
            }
            
            print(f"🔄 Processing page {page_num} with Mistral Pixtral API...")
            
            # Make API request
            try:
                response = requests.post(
                    self.base_url,
                    headers=self.headers,
                    json=payload,
                    timeout=60
                )
                response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
                
                if response.status_code == 200:
                    result = response.json()
                    extracted_text = result['choices'][0]['message']['content']
                    
                    print(f"✅ Successfully extracted text from page {page_num}")
                    
                    return {
                        "success": True,
                        "text": extracted_text,
                        "page_number": page_num,
                        "confidence": 0.95,  # Mistral API doesn't provide confidence, using default
                        "method": "mistral_pixtral"
                    }
                else:
                    error_msg = f"API request failed with status {response.status_code}: {response.text}"
                    print(f"❌ {error_msg}")
                    return {
                        "success": False,
                        "text": None,
                        "page_number": page_num,
                        "confidence": 0.0,
                        "method": "mistral_pixtral",
                        "error": error_msg
                    }
            except requests.exceptions.RequestException as e:
                error_msg = f"Mistral API request failed: {e}"
                print(f"❌ {error_msg}")
                return {
                    "success": False,
                    "text": None,
                    "page_number": page_num,
                    "confidence": 0.0,
                    "method": "mistral_pixtral",
                    "error": error_msg
                }



        except Exception as e:
            error_msg = f"Google Vision API request failed: {e}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "text": None,
                "page_number": page_num,
                "confidence": 0.0,
                "method": "google_vision",
                "error": error_msg
            }
                


    def process_pdf_from_frontend(self, doc_id: str, pdf_path: str, original_filename: str, file_size: int, mime_type: str, output_dir: str = "outputs") -> Dict:
        """Process PDF from frontend upload"""
        try:
            print(f"🔄 Starting OCR processing for document {doc_id}: {original_filename}")

            # Insert document info into DB
            self.insert_document_info(doc_id, Path(pdf_path).name, original_filename, file_size, pdf_path, mime_type, len(images))
            
            # Convert PDF to images
            images = self.pdf_to_images(pdf_path)
            
            # Process each page
            results = []
            all_text = ""
            
            for i, image in enumerate(images, 1):
                print(f"🔄 Processing page {i}/{len(images)}...")
                
                # Determine which OCR method to use
                if i == len(images) and self.is_arc_diagram(image):  # Assuming last page is arc diagram
                    print(f"💡 Page {i} identified as potential arc diagram. Using Google Vision API...")
                    ocr_result = self.extract_text_from_diagram_with_google_vision(image, i)
                else:
                    ocr_result = self.extract_text_from_image(image, i)
                
                page_id = str(uuid.uuid4())
                if ocr_result["success"]:
                    page_text = ocr_result["text"]
                    all_text += f"\n\n--- Page {i} ---\n{page_text}"
                    
                    self.insert_page_info(page_id, doc_id, i, extracted_text=page_text, confidence_score=ocr_result.get("confidence", 0.95), processing_method=ocr_result.get("method", "mistral_pixtral"))

                    results.append({
                        "page_id": page_id,
                        "page_number": i,
                        "text": page_text,
                        "confidence": ocr_result.get("confidence", 0.95),
                        "method": ocr_result.get("method", "mistral_pixtral")
                    })
                else:
                    print(f"❌ Failed to process page {i}: {ocr_result.get('error', 'Unknown error')}")
                    self.insert_page_info(page_id, doc_id, i, processing_status='failed')
                    results.append({
                        "page_id": page_id,
                        "page_number": i,
                        "text": "",
                        "error": ocr_result.get("error", "Unknown error"),
                        "confidence": 0.0
                    })
            
            # Create output directory
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            # Save results to text file
            base_filename = Path(original_filename).stem
            text_output_path = output_path / f"{base_filename}_extracted.txt"
            
            with open(text_output_path, 'w', encoding='utf-8') as f:
                f.write(f"OCR Results for: {original_filename}\n")
                f.write(f"Processed on: {datetime.now().isoformat()}\n")
                f.write(f"Total pages: {len(images)}\n")
                f.write("=" * 50 + "\n")
                f.write(all_text)
            
            print(f"✅ OCR processing completed for {original_filename}")
            print(f"📄 Results saved to: {text_output_path}")
            
            # Update document status to completed
            self.insert_document_info(doc_id, Path(pdf_path).name, original_filename, file_size, pdf_path, mime_type, len(images))

            return {
                "success": True,
                "document_id": doc_id,
                "message": f"Successfully processed {len(images)} pages",
                "total_pages": len(images),
                "results": results,
                "output_file": str(text_output_path),
                "extracted_text": all_text.strip()
            }
            
        except Exception as e:
            error_msg = f"Error processing PDF {original_filename}: {str(e)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg
            }

    def insert_document_info(self, doc_id: str, filename: str, original_filename: str, file_size: int, file_path: str, mime_type: str, total_pages: int) -> None:
        """Insert document information into the database"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO documents (id, filename, original_filename, file_size, file_path, mime_type, processing_status, total_pages)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    filename = EXCLUDED.filename,
                    original_filename = EXCLUDED.original_filename,
                    file_size = EXCLUDED.file_size,
                    file_path = EXCLUDED.file_path,
                    mime_type = EXCLUDED.mime_type,
                    processing_status = EXCLUDED.processing_status,
                    total_pages = EXCLUDED.total_pages,
                    updated_at = CURRENT_TIMESTAMP
            """, (doc_id, filename, original_filename, file_size, file_path, mime_type, 'processing', total_pages))
            conn.commit()
            print(f"✅ Document {doc_id} info inserted/updated in DB")
        except Exception as e:
            conn.rollback()
            print(f"❌ Error inserting document info: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def insert_page_info(self, page_id: str, document_id: str, page_number: int, image_data: bytes = None, extracted_text: str = None, confidence_score: float = None, processing_method: str = None) -> None:
        """Insert page information and extracted content into the database"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO pages (id, document_id, page_number, image_data, processing_status)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    document_id = EXCLUDED.document_id,
                    page_number = EXCLUDED.page_number,
                    image_data = EXCLUDED.image_data,
                    processing_status = EXCLUDED.processing_status,
                    updated_at = CURRENT_TIMESTAMP
            """, (page_id, document_id, page_number, image_data, 'completed' if extracted_text else 'pending'))
            
            if extracted_text:
                cursor.execute("""
                    INSERT INTO extracted_content (id, page_id, content_type, extracted_text, confidence_score, processing_method)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        page_id = EXCLUDED.page_id,
                        content_type = EXCLUDED.content_type,
                        extracted_text = EXCLUDED.extracted_text,
                        confidence_score = EXCLUDED.confidence_score,
                        processing_method = EXCLUDED.processing_method
                """, (str(uuid.uuid4()), page_id, 'text', extracted_text, confidence_score, processing_method))
            
            conn.commit()
            print(f"✅ Page {page_number} info and content inserted/updated for document {document_id}")
        except Exception as e:
            conn.rollback()
            print(f"❌ Error inserting page info: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def get_all_documents_text(self) -> str:
        """Get all extracted text from all documents in database"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get all documents with their extracted content
            cursor.execute("""
                SELECT d.original_filename, d.upload_date, ec.extracted_text
                FROM documents d
                JOIN pages p ON d.id = p.document_id
                JOIN extracted_content ec ON p.id = ec.page_id
                WHERE ec.extracted_text IS NOT NULL AND ec.extracted_text != ''
                ORDER BY d.upload_date DESC, p.page_number ASC
            """)
            
            results = cursor.fetchall()
            
            if not results:
                return "No documents found in the database."
            
            # Combine all text
            all_text = ""
            current_doc = None
            
            for row in results:
                if current_doc != row['original_filename']:
                    current_doc = row['original_filename']
                    all_text += f"\n\n=== Document: {current_doc} ===\n"
                    all_text += f"Upload Date: {row['upload_date']}\n"
                    all_text += "=" * 50 + "\n"
                
                all_text += row['extracted_text'] + "\n"
            
            cursor.close()
            conn.close()
            
            return all_text.strip()
            
        except Exception as e:
            print(f"❌ Error getting documents text: {e}")
            return f"Error retrieving documents: {str(e)}"

    def generate_ai_response(self, user_message: str, document_text: str) -> str:
        """Generate AI response using Mistral API based on document content"""
        try:
            # Prepare the prompt
            system_prompt = """You are an intelligent document assistant. You have access to the content of uploaded documents. 
            Your job is to answer questions about these documents accurately and helpfully. 
            
            When answering:
            1. Base your answers on the document content provided
            2. Be specific and cite relevant parts of the document when possible
            3. If the question cannot be answered from the document content, say so clearly
            4. Provide detailed and informative responses
            5. If asked about document structure, formatting, or layout, describe what you can observe
            
            Document Content:
            {document_content}
            """
            
            payload = {
                "model": "mistral-large-latest",
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt.format(document_content=document_text[:8000])  # Limit context
                    },
                    {
                        "role": "user",
                        "content": user_message
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.3
            }
            
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result['choices'][0]['message']['content']
                return ai_response
            else:
                return f"Error generating response: API request failed with status {response.status_code}"
                
        except Exception as e:
            return f"Error generating AI response: {str(e)}"