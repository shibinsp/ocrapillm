#!/usr/bin/env python3
"""
Database Migration Script for OCR AI Assistant

This script creates all necessary PostgreSQL tables for the OCR application.
Run this script when setting up the application on a new environment.

Usage:
    python database_migration.py

Requirements:
    - PostgreSQL server running on localhost:5432
    - Database 'LLMAPI' created
    - User 'postgres' with password 'shibin' (or update DB_CONFIG)
"""

import psycopg2
import sys
import os
from datetime import datetime
from typing import Dict, Any
from pathlib import Path

# Load environment variables from .env file if it exists
def load_env_file(env_path: str = '.env'):
    """Load environment variables from .env file"""
    env_file = Path(env_path)
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

# Load environment variables
load_env_file()
load_env_file('.env.database')  # Also try database-specific env file

# Database Configuration with environment variable support
DB_CONFIG = {
    # 'host': os.getenv('DB_HOST', '127.0.0.1'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'LLMAPI'),
    'user': os.getenv('DB_USER', 'postgres'),
    # 'password': os.getenv('DB_PASSWORD', 'shibin')
    'password': os.getenv('DB_PASSWORD', 'sai')
}

class DatabaseMigration:
    def __init__(self, db_config: Dict[str, Any] = None):
        """Initialize database migration with configuration"""
        self.db_config = db_config or DB_CONFIG
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(**self.db_config)
            self.cursor = self.connection.cursor()
            print(f"✅ Connected to PostgreSQL database: {self.db_config['database']}")
            return True
        except psycopg2.Error as e:
            print(f"❌ Database connection failed: {e}")
            return False
    
    def disconnect(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        print("🔌 Database connection closed")
    
    def execute_sql(self, sql: str, description: str = ""):
        """Execute SQL statement with error handling"""
        try:
            self.cursor.execute(sql)
            if description:
                print(f"✅ {description}")
        except psycopg2.Error as e:
            print(f"❌ Error {description.lower()}: {e}")
            raise
    
    def create_documents_table(self):
        """Create documents table with enhanced constraints"""
        sql = """
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
        """
        self.execute_sql(sql, "Created documents table")
    
    def create_pages_table(self):
        """Create pages table with proper foreign key constraints"""
        sql = """
        CREATE TABLE IF NOT EXISTS pages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            page_number INTEGER NOT NULL CHECK (page_number > 0),
            page_type VARCHAR(50) DEFAULT 'text' 
                CHECK (page_type IN ('text', 'arc_diagram', 'image', 'mixed')),
            image_data BYTEA,
            processing_status VARCHAR(50) DEFAULT 'pending'
                CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(document_id, page_number)
        )
        """
        self.execute_sql(sql, "Created pages table")
    
    def create_extracted_content_table(self):
        """Create extracted_content table for OCR results"""
        sql = """
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
        """
        self.execute_sql(sql, "Created extracted_content table")
    
    def create_processing_logs_table(self):
        """Create processing_logs table for tracking OCR operations"""
        sql = """
        CREATE TABLE IF NOT EXISTS processing_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
            page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
            step_name VARCHAR(100),
            status VARCHAR(50) CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
            message TEXT,
            processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
            error_details JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        self.execute_sql(sql, "Created processing_logs table")
    
    def create_chat_sessions_table(self):
        """Create chat_sessions table for AI chat functionality"""
        sql = """
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            session_name VARCHAR(255) DEFAULT 'Chat Session',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        self.execute_sql(sql, "Created chat_sessions table")
    
    def create_chat_messages_table(self):
        """Create chat_messages table for storing chat history"""
        sql = """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        self.execute_sql(sql, "Created chat_messages table")
    
    def create_indexes(self):
        """Create database indexes for better performance"""
        indexes = [
            ("CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status)", 
             "documents status index"),
            ("CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC)", 
             "documents upload date index"),
            ("CREATE INDEX IF NOT EXISTS idx_pages_document_id ON pages(document_id)", 
             "pages document_id index"),
            ("CREATE INDEX IF NOT EXISTS idx_pages_page_number ON pages(document_id, page_number)", 
             "pages page_number index"),
            ("CREATE INDEX IF NOT EXISTS idx_extracted_content_document_id ON extracted_content(document_id)", 
             "extracted_content document_id index"),
            ("CREATE INDEX IF NOT EXISTS idx_extracted_content_type ON extracted_content(content_type)", 
             "extracted_content type index"),
            ("CREATE INDEX IF NOT EXISTS idx_extracted_content_page_id ON extracted_content(page_id)", 
             "extracted_content page_id index"),
            ("CREATE INDEX IF NOT EXISTS idx_processing_logs_document_id ON processing_logs(document_id)", 
             "processing_logs document_id index"),
            ("CREATE INDEX IF NOT EXISTS idx_processing_logs_created_at ON processing_logs(created_at DESC)", 
             "processing_logs created_at index"),
            ("CREATE INDEX IF NOT EXISTS idx_chat_sessions_document_id ON chat_sessions(document_id)", 
             "chat_sessions document_id index"),
            ("CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at)", 
             "chat_messages session index"),
            ("CREATE INDEX IF NOT EXISTS idx_chat_messages_document ON chat_messages(document_id)", 
             "chat_messages document index")
        ]
        
        for sql, description in indexes:
            self.execute_sql(sql, f"Created {description}")
    
    def verify_tables(self):
        """Verify that all tables were created successfully"""
        expected_tables = [
            'documents', 'pages', 'extracted_content', 'processing_logs', 
            'chat_sessions', 'chat_messages'
        ]
        
        self.cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """)
        
        existing_tables = [row[0] for row in self.cursor.fetchall()]
        
        print("\n📋 Table Verification:")
        for table in expected_tables:
            if table in existing_tables:
                print(f"✅ {table}")
            else:
                print(f"❌ {table} - MISSING")
        
        # Get table row counts
        print("\n📊 Table Statistics:")
        for table in expected_tables:
            if table in existing_tables:
                self.cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = self.cursor.fetchone()[0]
                print(f"📄 {table}: {count} rows")
    
    def run_migration(self):
        """Execute complete database migration"""
        print("🚀 Starting OCR Database Migration...")
        print(f"📅 Migration started at: {datetime.now()}")
        print(f"🎯 Target database: {self.db_config['host']}:{self.db_config['port']}/{self.db_config['database']}")
        print("="*60)
        
        if not self.connect():
            return False
        
        try:
            # Create all tables
            print("\n📋 Creating Tables:")
            self.create_documents_table()
            self.create_pages_table()
            self.create_extracted_content_table()
            self.create_processing_logs_table()
            self.create_chat_sessions_table()
            self.create_chat_messages_table()
            
            # Create indexes
            print("\n🔍 Creating Indexes:")
            self.create_indexes()
            
            # Commit all changes
            self.connection.commit()
            print("\n💾 All changes committed successfully")
            
            # Verify migration
            self.verify_tables()
            
            print("\n" + "="*60)
            print("🎉 Database migration completed successfully!")
            print(f"📅 Migration finished at: {datetime.now()}")
            print("\n📝 Next Steps:")
            print("   1. Start the OCR application backend")
            print("   2. Upload documents to test the system")
            print("   3. Monitor processing_logs for any issues")
            
            return True
            
        except Exception as e:
            self.connection.rollback()
            print(f"\n❌ Migration failed: {e}")
            print("🔄 All changes have been rolled back")
            return False
        
        finally:
            self.disconnect()

def main():
    """Main migration function"""
    print("OCR AI Assistant - Database Migration Tool")
    print("==========================================\n")
    
    # Check if custom config is needed
    if len(sys.argv) > 1 and sys.argv[1] == '--help':
        print(__doc__)
        return
    
    # Run migration
    migration = DatabaseMigration()
    success = migration.run_migration()
    
    if success:
        print("\n✨ Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()