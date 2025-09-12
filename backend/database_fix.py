import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime
from pathlib import Path

class DatabaseManager:
    def __init__(self):
        self.db_type = None
        self.connection = None
        self.setup_database()
    
    def setup_database(self):
        """Try PostgreSQL first, fallback to SQLite"""
        # Try PostgreSQL first
        try:
            self.connection = psycopg2.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=int(os.getenv('DB_PORT', 5432)),
                database=os.getenv('DB_NAME', 'LLMAPI'),
                user=os.getenv('DB_USER', 'postgres'),
                password=os.getenv('DB_PASSWORD', 'shibin')
            )
            self.db_type = 'postgresql'
            print("✅ Connected to PostgreSQL database")
            self.init_postgresql_tables()
        except Exception as e:
            print(f"❌ PostgreSQL connection failed: {e}")
            print("🔄 Falling back to SQLite database...")
            
            # Fallback to SQLite
            try:
                sqlite_path = Path('ocr_database.db')
                self.connection = sqlite3.connect(str(sqlite_path), check_same_thread=False)
                self.connection.row_factory = sqlite3.Row  # Enable dict-like access
                self.db_type = 'sqlite'
                print("✅ Connected to SQLite database")
                self.init_sqlite_tables()
            except Exception as sqlite_error:
                print(f"❌ SQLite connection also failed: {sqlite_error}")
                raise Exception("Both PostgreSQL and SQLite connections failed")
    
    def init_postgresql_tables(self):
        """Initialize PostgreSQL tables"""
        cursor = self.connection.cursor()
        try:
            # Create documents table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    filename VARCHAR(255) NOT NULL,
                    original_filename VARCHAR(255) NOT NULL,
                    file_size BIGINT,
                    file_path TEXT,
                    processing_status VARCHAR(50) DEFAULT 'pending',
                    total_pages INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create pages table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
                    page_number INTEGER NOT NULL,
                    page_type VARCHAR(50) DEFAULT 'text',
                    processing_status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create extracted_content table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS extracted_content (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
                    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
                    content_type VARCHAR(50) DEFAULT 'text',
                    raw_text TEXT,
                    processed_text TEXT,
                    confidence_score REAL,
                    processing_method VARCHAR(100),
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            self.connection.commit()
            print("✅ PostgreSQL tables initialized")
            
        except Exception as e:
            print(f"❌ PostgreSQL table initialization failed: {e}")
            self.connection.rollback()
            raise
        finally:
            cursor.close()
    
    def init_sqlite_tables(self):
        """Initialize SQLite tables with compatible schema"""
        cursor = self.connection.cursor()
        try:
            # Create documents table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    file_size INTEGER,
                    file_path TEXT,
                    processing_status TEXT DEFAULT 'pending',
                    total_pages INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create pages table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pages (
                    id TEXT PRIMARY KEY,
                    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
                    page_number INTEGER NOT NULL,
                    page_type TEXT DEFAULT 'text',
                    processing_status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create extracted_content table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS extracted_content (
                    id TEXT PRIMARY KEY,
                    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
                    page_id TEXT REFERENCES pages(id),
                    content_type TEXT DEFAULT 'text',
                    raw_text TEXT,
                    processed_text TEXT,
                    confidence_score REAL,
                    processing_method TEXT,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            self.connection.commit()
            print("✅ SQLite tables initialized")
            
        except Exception as e:
            print(f"❌ SQLite table initialization failed: {e}")
            self.connection.rollback()
            raise
        finally:
            cursor.close()
    
    def get_connection(self):
        """Get database connection"""
        return self.connection
    
    def execute_query(self, query, params=None):
        """Execute query with proper parameter binding for both databases"""
        cursor = self.connection.cursor()
        try:
            if self.db_type == 'postgresql':
                cursor.execute(query, params or [])
            else:  # SQLite
                # Convert PostgreSQL %s placeholders to SQLite ? placeholders
                sqlite_query = query.replace('%s', '?')
                cursor.execute(sqlite_query, params or [])
            
            if query.strip().upper().startswith('SELECT'):
                return cursor.fetchall()
            else:
                self.connection.commit()
                return cursor.rowcount
        except Exception as e:
            self.connection.rollback()
            raise e
        finally:
            cursor.close()
    
    def insert_document(self, filename, original_filename, file_size, file_path, total_pages=0):
        """Insert a new document and return its ID"""
        doc_id = str(uuid.uuid4())
        
        if self.db_type == 'postgresql':
            query = """
                INSERT INTO documents (id, filename, original_filename, file_size, file_path, total_pages, processing_status)
                VALUES (%s, %s, %s, %s, %s, %s, 'completed')
            """
        else:  # SQLite
            query = """
                INSERT INTO documents (id, filename, original_filename, file_size, file_path, total_pages, processing_status)
                VALUES (?, ?, ?, ?, ?, ?, 'completed')
            """
        
        self.execute_query(query, [doc_id, filename, original_filename, file_size, file_path, total_pages])
        return doc_id
    
    def insert_extracted_content(self, document_id, raw_text, content_type='complete_document'):
        """Insert extracted content for a document"""
        content_id = str(uuid.uuid4())
        
        if self.db_type == 'postgresql':
            query = """
                INSERT INTO extracted_content (id, document_id, content_type, raw_text, processing_method)
                VALUES (%s, %s, %s, %s, 'ocr_extraction')
            """
        else:  # SQLite
            query = """
                INSERT INTO extracted_content (id, document_id, content_type, raw_text, processing_method)
                VALUES (?, ?, ?, ?, 'ocr_extraction')
            """
        
        self.execute_query(query, [content_id, document_id, content_type, raw_text])
        return content_id

def test_database_fix():
    """Test the database fix"""
    try:
        db = DatabaseManager()
        print(f"Database type: {db.db_type}")
        
        # Test inserting a sample document
        doc_id = db.insert_document(
            filename="test.pdf",
            original_filename="test.pdf",
            file_size=1024,
            file_path="/path/to/test.pdf",
            total_pages=1
        )
        print(f"✅ Inserted test document with ID: {doc_id}")
        
        # Test inserting extracted content
        content_id = db.insert_extracted_content(
            document_id=doc_id,
            raw_text="This is test extracted text from the document."
        )
        print(f"✅ Inserted extracted content with ID: {content_id}")
        
        # Test querying documents
        if db.db_type == 'postgresql':
            docs = db.execute_query("SELECT id, filename, original_filename, processing_status FROM documents ORDER BY created_at DESC LIMIT 5")
        else:
            docs = db.execute_query("SELECT id, filename, original_filename, processing_status FROM documents ORDER BY created_at DESC LIMIT 5")
        
        print(f"✅ Found {len(docs)} documents:")
        for doc in docs:
            print(f"  - {doc[1]} (Status: {doc[3]})")
        
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

if __name__ == '__main__':
    test_database_fix()