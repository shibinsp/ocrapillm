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

# Load environment variables from .env files
def load_env_file(env_path: str):
    """Load environment variables from .env file"""
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

# Load environment variables
load_env_file('.env')
load_env_file('.env.database')
load_env_file('../.env')  # Try parent directory
load_env_file('../.env.database')  # Try parent directory

class DatabaseOCR:
    def __init__(self, api_key: str = "eyFSYGAUfsrrDmDVLGaKac5IQmFy1gEH", init_db: bool = True):
        """
        Initialize Database OCR client with Mistral Pixtral API integration
        """
        # Mistral API Configuration
        self.api_key = api_key
        self.base_url = "https://api.mistral.ai/v1/chat/completions"
        self.model = "pixtral-12b-2409"
        
        # Headers for API requests
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        # Database Configuration with environment variable support
        self.db_config = {
            # 'host': os.getenv('DB_HOST', '127.0.0.1'),
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 5432)),
            'database': os.getenv('DB_NAME', 'LLMAPI'),
            'user': os.getenv('DB_USER', 'postgres'),
            # 'password': os.getenv('DB_PASSWORD', 'shibin')
            'password': os.getenv('DB_PASSWORD', 'sai')
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
        """Initialize database tables for OCR processing with improved schema"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Ensure required extension for gen_random_uuid()
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

            # Create documents table with improved constraints
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    filename VARCHAR(255) NOT NULL,
                    original_filename VARCHAR(255) NOT NULL,
                    file_size BIGINT CHECK (file_size > 0),
                    file_path TEXT UNIQUE,
                    mime_type VARCHAR(100) DEFAULT 'application/pdf',
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processing_status VARCHAR(50) DEFAULT 'pending' 
                        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
                    total_pages INTEGER CHECK (total_pages >= 0),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create pages table with proper constraints
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    page_number INTEGER NOT NULL CHECK (page_number > 0),
                    page_type VARCHAR(50) DEFAULT 'text' 
                        CHECK (page_type IN ('text', 'diagram', 'arc', 'mixed')),
                    image_data BYTEA,
                    processing_status VARCHAR(50) DEFAULT 'pending' 
                        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(document_id, page_number)
                )
            """)
            
            # Create extracted_content table with improved structure
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS extracted_content (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
                    content_type VARCHAR(50) DEFAULT 'complete_document' 
                        CHECK (content_type IN ('complete_document', 'page_content', 'validated_document')),
                    raw_text TEXT,
                    processed_text TEXT,
                    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
                    processing_method VARCHAR(100),
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create chat_sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    session_name VARCHAR(255) DEFAULT 'Chat Session',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create chat_messages table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_pages_document_id ON pages(document_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_pages_page_number ON pages(document_id, page_number)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_extracted_content_document_id ON extracted_content(document_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_extracted_content_type ON extracted_content(content_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_extracted_content_page_id ON extracted_content(page_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_document ON chat_messages(document_id)")
            
            # Create unique constraint for extracted_content to support ON CONFLICT
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'extracted_content_document_type_unique'
                    ) THEN
                        ALTER TABLE extracted_content 
                        ADD CONSTRAINT extracted_content_document_type_unique 
                        UNIQUE (document_id, content_type);
                    END IF;
                END
                $$;
            """)
            conn.commit()
            print("✅ Database tables and indexes initialized successfully")
            
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
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=60
            )
            
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
                    "error": error_msg,
                    "page_number": page_num
                }
                
        except Exception as e:
            error_msg = f"Error extracting text from page {page_num}: {str(e)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "page_number": page_num
            }

    def process_pdf_from_frontend(self, pdf_path: str, original_filename: str, output_dir: str = "outputs") -> Dict:
        """Process PDF from frontend upload"""
        try:
            print(f"🔄 Starting OCR processing for: {original_filename}")
            
            # Convert PDF to images
            images = self.pdf_to_images(pdf_path)
            
            # Process each page
            results = []
            all_text = ""
            
            for i, image in enumerate(images, 1):
                print(f"🔄 Processing page {i}/{len(images)}...")
                
                # Extract text from image
                ocr_result = self.extract_text_from_image(image, i)
                
                if ocr_result["success"]:
                    page_text = ocr_result["text"]
                    all_text += f"\n\n--- Page {i} ---\n{page_text}"
                    
                    results.append({
                        "page_number": i,
                        "text": page_text,
                        "confidence": ocr_result.get("confidence", 0.95),
                        "method": ocr_result.get("method", "mistral_pixtral")
                    })
                else:
                    print(f"❌ Failed to process page {i}: {ocr_result.get('error', 'Unknown error')}")
                    results.append({
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
            
            return {
                "success": True,
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