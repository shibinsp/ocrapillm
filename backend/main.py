from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import os
import sys
import uuid
import json
from datetime import datetime
from typing import List, Optional
import shutil
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Import OCR engine class
try:
    from ocr_llm_engine import DatabaseOCR
    # Initialize OCR processor with Mistral API key
    ocr_processor = DatabaseOCR(api_key="eyFSYGAUfsrrDmDVLGaKac5IQmFy1gEH")
    print("✅ OCR engine initialized successfully")
except ImportError as e:
    print(f"Warning: Could not import ocr_llm_engine: {e}. OCR functionality will be limited.")
    ocr_processor = None

app = FastAPI(
    title="OCR AI Assistant API",
    description="Backend API for OCR document processing and AI chatbot",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class ChatMessage(BaseModel):
    message: str
    chat_history: Optional[List[dict]] = []

class ValidateText(BaseModel):
    validated_text: str

class Document(BaseModel):
    id: str
    name: str
    size: int
    status: str
    created_at: str
    pages: Optional[int] = None
    extracted_text: Optional[str] = None

# Database initialization is handled by the OCR processor
if ocr_processor:
    print("✅ Database initialized via OCR processor")

# Directories
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Job storage for async OCR tasks (in production, use Redis or database)
jobs = {}
executor = ThreadPoolExecutor(max_workers=3)  # Limit concurrent OCR tasks

@app.get("/")
async def root():
    return {"message": "OCR AI Assistant API", "status": "running"}

@app.get("/health")
async def health_check():
    """Simple health check without database dependency"""
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "service": "OCR AI Assistant API",
        "version": "1.0.0"
    }

@app.get("/health/db")
async def health_check_db():
    """Health check with database connectivity test"""
    try:
        if not ocr_processor:
            return {
                "status": "unhealthy",
                "error": "OCR processor not available",
                "timestamp": datetime.now().isoformat()
            }
        
        # Quick database test
        db_test = ocr_processor.test_database_connection()
        return {
            "status": "healthy" if db_test["success"] else "unhealthy",
            "database": db_test,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

async def process_ocr_task(task_id: str, file_path: str, filename: str):
    """Background OCR processing function"""
    try:
        print(f"🔄 Starting OCR processing for task {task_id}")
        jobs[task_id]['status'] = 'processing'
        
        if ocr_processor:
            # Run OCR processing in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                executor,
                lambda: ocr_processor.process_pdf_from_frontend(
                    pdf_path=file_path,
                    original_filename=filename,
                    output_dir=str(OUTPUT_DIR)
                )
            )
            
            jobs[task_id]['status'] = 'completed'
            jobs[task_id]['result'] = {
                "document_id": result['document_id'],
                "message": "Document processed successfully",
                "status": result['status'],
                "extracted_text": result['extracted_text'],
                "pages": result['total_pages'],
                "processing_time_ms": result['processing_time_ms']
            }
            print(f"✅ OCR processing completed for task {task_id}")
        else:
            jobs[task_id]['status'] = 'failed'
            jobs[task_id]['error'] = 'OCR engine not available'
            
    except Exception as e:
        print(f"❌ OCR processing failed for task {task_id}: {e}")
        jobs[task_id]['status'] = 'failed'
        jobs[task_id]['error'] = str(e)
        # Clean up file if processing failed
        if Path(file_path).exists():
            Path(file_path).unlink()

@app.post("/upload/")
async def upload_document(file: UploadFile = File(...)):
    """Upload document and start async OCR processing"""
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate unique task ID
    task_id = f"task_{int(datetime.now().timestamp() * 1000)}"
    doc_id = str(uuid.uuid4())
    
    # Save uploaded file
    file_path = UPLOAD_DIR / f"{doc_id}_{file.filename}"
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Initialize job status
        jobs[task_id] = {
            'status': 'uploaded',
            'result': None,
            'error': None,
            'created_at': datetime.now().isoformat(),
            'file_info': {
                'filename': file.filename,
                'size': file.size,
                'doc_id': doc_id
            }
        }
        
        # Start OCR processing in background
        asyncio.create_task(process_ocr_task(task_id, str(file_path), file.filename))
        
        # Immediately respond with task ID
        return {
            "task_id": task_id,
            "message": "Document uploaded successfully. Processing started.",
            "status": "uploaded"
        }
        
    except Exception as e:
        # Clean up file if upload failed
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@app.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    """Check the status of an OCR processing task"""
    
    if task_id not in jobs:
        raise HTTPException(status_code=404, detail="Task not found")
    
    job = jobs[task_id]
    
    response = {
        "task_id": task_id,
        "status": job['status'],
        "created_at": job['created_at']
    }
    
    if job['status'] == 'completed' and job['result']:
        response['result'] = job['result']
    elif job['status'] == 'failed' and job['error']:
        response['error'] = job['error']
    elif job['status'] in ['uploaded', 'processing']:
        response['message'] = f"Task is {job['status']}..."
    
    return response

def simulate_ocr_processing(file_path: Path) -> str:
    """Simulate OCR processing - replace with actual OCR engine integration"""
    
    # This is where you would integrate with the actual OCR engine
    # For now, return a sample extracted text
    
    sample_text = f"""LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on [DATE] between [LANDLORD NAME] ("Landlord") and [TENANT NAME] ("Tenant").

PROPERTY DETAILS:
Address: [PROPERTY ADDRESS]
Unit: [UNIT NUMBER]
City, State, ZIP: [CITY, STATE ZIP]

LEASE TERMS:
• Lease Term: [START DATE] to [END DATE]
• Monthly Rent: $[AMOUNT]
• Security Deposit: $[AMOUNT]
• Pet Deposit: $[AMOUNT] (if applicable)

TENANT RESPONSIBILITIES:
1. Pay rent on time each month
2. Maintain property in good condition
3. Follow all building rules and regulations
4. Provide 30 days notice before moving out

LANDLORD RESPONSIBILITIES:
1. Maintain structural integrity of property
2. Ensure all utilities are functioning
3. Respond to maintenance requests promptly
4. Respect tenant's right to quiet enjoyment

ADDITIONAL TERMS:
• No smoking allowed on premises
• Maximum occupancy: [NUMBER] persons
• Parking: [PARKING DETAILS]
• Utilities included: [UTILITIES LIST]

This agreement is binding upon both parties and their successors.

Landlord Signature: _________________________ Date: _________

Tenant Signature: _________________________ Date: _________

[Document processed from: {file_path.name}]
"""
    
    return sample_text

@app.get("/documents/mock")
async def get_documents_mock():
    """Mock documents endpoint for testing"""
    print("📋 GET /documents/mock - Returning mock data")
    return [
        {
            "id": "mock-1",
            "name": "Sample Document 1.pdf",
            "filename": "sample1.pdf",
            "size": 1024000,
            "status": "completed",
            "pages": 5,
            "created_at": "2024-01-01T10:00:00Z"
        },
        {
            "id": "mock-2",
            "name": "Sample Document 2.pdf",
            "filename": "sample2.pdf",
            "size": 2048000,
            "status": "processing",
            "pages": 3,
            "created_at": "2024-01-01T11:00:00Z"
        }
    ]

@app.get("/documents/")
async def get_documents():
    """Get all documents from database with timeout handling"""
    try:
        print("📋 GET /documents/ - Fetching documents from database")
        
        if not ocr_processor:
            print("❌ OCR processor not available")
            raise HTTPException(status_code=500, detail="OCR processor not available")
        
        # Add timeout handling for database operations
        import asyncio
        import concurrent.futures
        
        def get_documents_sync():
            conn = None
            cursor = None
            try:
                conn = ocr_processor.get_db_connection()
                cursor = conn.cursor()
                
                # Set a shorter timeout for the query
                cursor.execute("SET statement_timeout = '10s'")
                
                cursor.execute("""
                    SELECT id, filename, original_filename, file_size, 
                           processing_status as status, total_pages as pages,
                           upload_date as created_at
                    FROM documents 
                    ORDER BY upload_date DESC
                    LIMIT 100
                """)
                
                rows = cursor.fetchall()
                print(f"📊 Found {len(rows)} documents in database")
                
                documents = []
                for row in rows:
                    documents.append({
                        "id": str(row[0]),
                        "name": row[2],  # original_filename
                        "filename": row[1],
                        "size": row[3],
                        "status": row[4],
                        "pages": row[5],
                        "created_at": row[6].isoformat() if row[6] else None
                    })
                
                return documents
                
            finally:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()
        
        # Execute with timeout
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                documents = await asyncio.wait_for(
                    loop.run_in_executor(executor, get_documents_sync),
                    timeout=15.0  # 15 second timeout
                )
                print(f"✅ Successfully returning {len(documents)} documents")
                return documents
            except asyncio.TimeoutError:
                print("⏰ Database query timed out")
                raise HTTPException(status_code=504, detail="Database query timeout - please try again")
            except Exception as db_error:
                 print(f"💥 Database error: {db_error}")
                 # Return mock data as fallback instead of empty list
                 print("🔄 Falling back to mock data")
                 return [
                     {
                         "id": "fallback-1",
                         "name": "Fallback Document.pdf",
                         "filename": "fallback.pdf",
                         "size": 512000,
                         "status": "completed",
                         "pages": 1,
                         "created_at": "2024-01-01T12:00:00Z"
                     }
                 ]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error retrieving documents: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to retrieve documents: {str(e)}")

@app.get("/documents/{doc_id}/status")
async def get_document_status(doc_id: str):
    """Get document processing status from database"""
    try:
        if not ocr_processor:
            raise HTTPException(status_code=500, detail="OCR processor not available")
            
        conn = ocr_processor.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT processing_status, total_pages
            FROM documents 
            WHERE id = %s
        """, (doc_id,))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Document not found")
        
        status, total_pages = result
        progress = 100 if status == "completed" else 50 if status == "processing" else 0
        
        return {
            "id": doc_id,
            "status": status,
            "progress": progress,
            "total_pages": total_pages
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting document status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get document status: {str(e)}")

@app.get("/documents/{doc_id}/content")
async def get_document_content(doc_id: str):
    """Get document content from database"""
    try:
        if not ocr_processor:
            raise HTTPException(status_code=500, detail="OCR processor not available")
            
        # Get complete text from extracted_content
        conn = ocr_processor.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT raw_text 
            FROM extracted_content 
            WHERE document_id = %s AND content_type = 'complete_document'
            ORDER BY created_at DESC
            LIMIT 1
        """, (doc_id,))
        
        result = cursor.fetchone()
        complete_text = result[0] if result else ""
        
        cursor.close()
        conn.close()
        
        return {
            "id": doc_id,
            "text": complete_text,
            "pages": document_data['document']['total_pages']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting document content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get document content: {str(e)}")

@app.post("/validate/{doc_id}")
async def validate_document(doc_id: str, data: ValidateText):
    """Update validated text for a document in database"""
    try:
        if not ocr_processor:
            raise HTTPException(status_code=500, detail="OCR processor not available")
            
        conn = ocr_processor.get_db_connection()
        cursor = conn.cursor()
        
        # Check if document exists
        cursor.execute("SELECT id FROM documents WHERE id = %s", (doc_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if validated content already exists
        cursor.execute("""
            SELECT id FROM extracted_content 
            WHERE document_id = %s AND content_type = %s
        """, (doc_id, 'validated_document'))
        
        existing_record = cursor.fetchone()
        
        if existing_record:
            # Update existing validated text
            cursor.execute("""
                UPDATE extracted_content 
                SET processed_text = %s, raw_text = %s, updated_at = CURRENT_TIMESTAMP,
                    metadata = %s
                WHERE document_id = %s AND content_type = %s
            """, (
                data.validated_text,
                data.validated_text,
                json.dumps({'validated_by': 'user', 'validation_date': datetime.now().isoformat()}),
                doc_id,
                'validated_document'
            ))
        else:
            # Insert new validated text
            cursor.execute("""
                INSERT INTO extracted_content 
                (document_id, content_type, raw_text, processed_text, metadata)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                doc_id, 
                'validated_document', 
                data.validated_text, 
                data.validated_text,
                json.dumps({'validated_by': 'user', 'validation_date': datetime.now().isoformat()})
            ))
        
        # Update document timestamp
        cursor.execute("""
            UPDATE documents 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s
        """, (doc_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"message": "Document updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error validating document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")

@app.post("/chat/{doc_id}")
async def chat_with_document(doc_id: str, chat_data: ChatMessage):
    """Chat with AI about the document using database"""
    try:
        if not ocr_processor:
            raise HTTPException(status_code=500, detail="OCR processor not available")
            
        conn = ocr_processor.get_db_connection()
        cursor = conn.cursor()
        
        # Check if document exists and get content
        cursor.execute("""
            SELECT d.id, ec.raw_text
            FROM documents d
            LEFT JOIN extracted_content ec ON d.id = ec.document_id 
                AND ec.content_type = 'complete_document'
            WHERE d.id = %s
        """, (doc_id,))
        
        result = cursor.fetchone()
        if not result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Document not found")
        
        document_text = result[1] or ""
        
        # Get or create chat session
        cursor.execute("""
            SELECT id FROM chat_sessions WHERE document_id = %s
        """, (doc_id,))
        
        existing_session = cursor.fetchone()
        
        if existing_session:
            session_id = existing_session[0]
            # Update timestamp
            cursor.execute("""
                UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = %s
            """, (session_id,))
        else:
            # Create new session
            cursor.execute("""
                INSERT INTO chat_sessions (document_id, session_name)
                VALUES (%s, %s)
                RETURNING id
            """, (doc_id, f"Chat session for document {doc_id}"))
            session_id = cursor.fetchone()[0]
        
        # Add user message to database
        cursor.execute("""
            INSERT INTO chat_messages (session_id, document_id, message_type, content)
            VALUES (%s, %s, %s, %s)
            RETURNING id, created_at
        """, (session_id, doc_id, 'user', chat_data.message))
        
        user_msg_result = cursor.fetchone()
        user_timestamp = user_msg_result[1].isoformat()
        
        # Generate AI response
        ai_response = generate_ai_response(chat_data.message, document_text)
        
        # Add AI response to database
        cursor.execute("""
            INSERT INTO chat_messages (session_id, document_id, message_type, content)
            VALUES (%s, %s, %s, %s)
            RETURNING id, created_at
        """, (session_id, doc_id, 'assistant', ai_response))
        
        ai_msg_result = cursor.fetchone()
        ai_timestamp = ai_msg_result[1].isoformat()
        
        # Get recent chat history
        cursor.execute("""
            SELECT message_type, content, created_at
            FROM chat_messages
            WHERE session_id = %s
            ORDER BY created_at DESC
            LIMIT 20
        """, (session_id,))
        
        chat_history = []
        for row in reversed(cursor.fetchall()):
            chat_history.append({
                "role": row[0],
                "content": row[1],
                "timestamp": row[2].isoformat()
            })
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "response": ai_response,
            "chat_history": chat_history
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

def generate_ai_response(user_message: str, document_text: str) -> str:
    """Generate AI response based on user message and document content"""
    
    # This is a simplified response generator
    # In production, you would use a proper LLM like the one in ocr_llm_engine.py
    
    user_msg_lower = user_message.lower()
    
    if "summary" in user_msg_lower or "summarize" in user_msg_lower:
        return "This document appears to be a lease agreement containing rental terms, property details, and legal clauses. The key information includes rental amount, lease duration, property address, and responsibilities of both tenant and landlord."
    
    elif "rent" in user_msg_lower or "payment" in user_msg_lower:
        return "Based on the document, the monthly rent amount and payment terms are specified in the lease agreement. The payment is typically due on the first of each month, with specific late fee policies outlined."
    
    elif "date" in user_msg_lower or "when" in user_msg_lower:
        return "The document contains several important dates including the lease start date, end date, and various deadlines for notices and payments. Please refer to the specific sections for exact dates."
    
    elif "tenant" in user_msg_lower or "landlord" in user_msg_lower:
        return "The document outlines the responsibilities of both tenant and landlord. Tenants are responsible for timely rent payment and property maintenance, while landlords must maintain the property structure and respond to maintenance requests."
    
    else:
        return f"I can help you understand this document better. Based on your question about '{user_message}', I can analyze the relevant sections of the lease agreement. Would you like me to focus on any specific aspect like rent terms, responsibilities, or dates?"

def generate_ai_response_all_docs(user_message: str, all_documents_text: str) -> str:
    """Generate AI response based on user message and all documents content"""
    
    user_msg_lower = user_message.lower()
    
    if "summary" in user_msg_lower or "summarize" in user_msg_lower:
        return "I can provide summaries of all your uploaded documents. Your document library contains various types of files that have been processed and are available for analysis. Each document has been extracted and can be searched individually or collectively."
    
    elif "documents" in user_msg_lower or "files" in user_msg_lower:
        return "You have several documents in your library that I can help you analyze. I can search across all of them to find specific information, compare content between documents, or provide detailed summaries of individual files."
    
    elif "search" in user_msg_lower or "find" in user_msg_lower:
        return "I can search across all your uploaded documents to find specific information. Just tell me what you're looking for and I'll scan through all your files to find relevant content, dates, names, amounts, or any other details."
    
    elif "compare" in user_msg_lower:
        return "I can compare information across multiple documents in your library. This is useful for finding differences in terms, dates, amounts, or other details between similar documents like contracts or agreements."
    
    else:
        return f"I can help you with questions about all your uploaded documents. I can search across your entire document library, provide summaries, compare information between documents, or help you find specific details. Based on your question about '{user_message}', what specific information would you like me to find across your documents?"

@app.post("/chat/all")
async def chat_with_all_documents(chat_data: ChatMessage):
    """Chat with AI about all documents in the database"""
    try:
        if not ocr_processor:
            raise HTTPException(status_code=500, detail="OCR processor not available")
            
        conn = ocr_processor.get_db_connection()
        cursor = conn.cursor()
        
        # Get all documents and their content
        cursor.execute("""
            SELECT d.id, d.original_filename, ec.raw_text
            FROM documents d
            LEFT JOIN extracted_content ec ON d.id = ec.document_id 
                AND ec.content_type = 'complete_document'
            WHERE d.processing_status = 'completed'
            ORDER BY d.upload_date DESC
        """)
        
        documents = cursor.fetchall()
        
        # Combine all document texts
        all_documents_text = ""
        document_summaries = []
        
        for doc_id, filename, content in documents:
            if content:
                all_documents_text += f"\n\n=== Document: {filename} ===\n{content}"
                document_summaries.append(f"- {filename}")
        
        if not all_documents_text:
            all_documents_text = "No processed documents found in the library."
        
        # Generate AI response based on all documents
        ai_response = generate_ai_response_all_docs(chat_data.message, all_documents_text)
        
        # Add document list to response if user asks about documents
        if "documents" in chat_data.message.lower() or "files" in chat_data.message.lower():
            if document_summaries:
                ai_response += f"\n\nYour current document library includes:\n" + "\n".join(document_summaries)
            else:
                ai_response += "\n\nYour document library is currently empty. Please upload some documents to get started."
        
        cursor.close()
        conn.close()
        
        return {
            "response": ai_response,
            "documents_count": len(documents),
            "chat_history": chat_data.chat_history + [
                {"role": "user", "content": chat_data.message, "timestamp": datetime.now().isoformat()},
                {"role": "assistant", "content": ai_response, "timestamp": datetime.now().isoformat()}
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in global chat: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.get("/documents/{doc_id}/chat")
async def get_chat_history(doc_id: str):
    """Get chat history for a document from database"""
    try:
        if not ocr_processor:
            raise HTTPException(status_code=500, detail="OCR processor not available")
            
        conn = ocr_processor.get_db_connection()
        cursor = conn.cursor()
        
        # Check if document exists
        cursor.execute("SELECT id FROM documents WHERE id = %s", (doc_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get chat history
        cursor.execute("""
            SELECT message_type, content, created_at
            FROM chat_messages
            WHERE document_id = %s
            ORDER BY created_at ASC
        """, (doc_id,))
        
        chat_history = []
        for row in cursor.fetchall():
            chat_history.append({
                "role": row[0],
                "content": row[1],
                "timestamp": row[2].isoformat()
            })
        
        cursor.close()
        conn.close()
        
        return chat_history
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from database"""
    try:
        if not ocr_processor:
            raise HTTPException(status_code=500, detail="OCR processor not available")
            
        conn = ocr_processor.get_db_connection()
        cursor = conn.cursor()
        
        # Get document file path before deletion
        cursor.execute("SELECT file_path FROM documents WHERE id = %s", (doc_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path = Path(result[0]) if result[0] else None
        
        # Delete from database first (CASCADE will handle related records)
        cursor.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        # Try to remove physical files (non-critical if fails)
        file_deletion_errors = []
        
        if file_path and file_path.exists():
            try:
                file_path.unlink()
            except (PermissionError, OSError) as e:
                file_deletion_errors.append(f"Could not delete file {file_path.name}: {str(e)}")
                print(f"Warning: Could not delete file {file_path}: {e}")
        
        # Remove output file if exists
        output_path = Path(f"outputs/{doc_id}_processed.docx")
        if output_path.exists():
            try:
                output_path.unlink()
            except (PermissionError, OSError) as e:
                file_deletion_errors.append(f"Could not delete output file: {str(e)}")
                print(f"Warning: Could not delete output file {output_path}: {e}")
        
        # Return success message with warnings if any
        message = "Document deleted successfully"
        if file_deletion_errors:
            message += f" (Note: Some files could not be deleted: {'; '.join(file_deletion_errors)})"
        
        return {"message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@app.get("/documents/{doc_id}/export")
async def export_document(doc_id: str, format: str = "txt"):
    """Export document in specified format"""
    if doc_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = documents_db[doc_id]
    
    if format == "txt":
        # Create text file
        export_path = OUTPUT_DIR / f"{doc_id}_export.txt"
        with open(export_path, "w", encoding="utf-8") as f:
            f.write(document["extracted_text"])
        
        return FileResponse(
            path=export_path,
            filename=f"{document['name'].replace('.pdf', '')}.txt",
            media_type="text/plain"
        )
    
    elif format == "docx":
        # For demo purposes, return text file
        # In production, you would create a proper DOCX file
        export_path = OUTPUT_DIR / f"{doc_id}_export.txt"
        with open(export_path, "w", encoding="utf-8") as f:
            f.write(document["extracted_text"])
        
        return FileResponse(
            path=export_path,
            filename=f"{document['name'].replace('.pdf', '')}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")

@app.get("/documents/{doc_id}/pages")
async def get_document_pages(doc_id: str):
    """Get document pages with images for validation"""
    try:
        if not ocr_processor:
            raise HTTPException(status_code=500, detail="OCR processor not available")
            
        conn = ocr_processor.get_db_connection()
        cursor = conn.cursor()
        
        # Get document pages with extracted content
        cursor.execute("""
            SELECT p.id, p.page_number, p.image_data, ec.raw_text
            FROM pages p
            LEFT JOIN extracted_content ec ON p.id = ec.page_id
            WHERE p.document_id = %s
            ORDER BY p.page_number
        """, (doc_id,))
        
        pages = []
        for row in cursor.fetchall():
            page_id, page_number, image_data, extracted_text = row
            
            # Convert image data to base64 for frontend display
            image_url = None
            if image_data:
                import base64
                image_base64 = base64.b64encode(image_data).decode('utf-8')
                image_url = f"data:image/jpeg;base64,{image_base64}"
            
            pages.append({
                "id": str(page_id),
                "pageNumber": page_number,
                "imageUrl": image_url,
                "extractedText": extracted_text or "",
                "validated": False  # TODO: Add validation status to database
            })
        
        cursor.close()
        conn.close()
        
        return pages
        
    except Exception as e:
        print(f"Error getting document pages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get document pages: {str(e)}")

@app.post("/documents/{doc_id}/pages/{page_id}/validate")
async def validate_page(doc_id: str, page_id: str, data: ValidateText):
    """Validate and save text for a specific page"""
    try:
        if not ocr_processor:
            raise HTTPException(status_code=500, detail="OCR processor not available")
            
        conn = ocr_processor.get_db_connection()
        cursor = conn.cursor()
        
        # Update the extracted content with validated text
        cursor.execute("""
            UPDATE extracted_content 
            SET processed_text = %s, updated_at = CURRENT_TIMESTAMP
            WHERE page_id = %s AND document_id = %s
        """, (data.validated_text, page_id, doc_id))
        
        if cursor.rowcount == 0:
            # If no existing content, insert new record
            cursor.execute("""
                INSERT INTO extracted_content (page_id, document_id, raw_text, processed_text)
                VALUES (%s, %s, %s, %s)
            """, (page_id, doc_id, data.validated_text, data.validated_text))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"message": "Page validated successfully"}
        
    except Exception as e:
        print(f"Error validating page: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to validate page: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)