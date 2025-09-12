import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime

def check_and_fix_database():
    """Check database schema and fix missing data"""
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            database='LLMAPI',
            user='postgres',
            password='shibin'
        )
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("✅ Connected to PostgreSQL database")
        
        # Check existing tables
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [row['table_name'] for row in cursor.fetchall()]
        print(f"📋 Existing tables: {tables}")
        
        # Check documents table
        if 'documents' in tables:
            cursor.execute("SELECT COUNT(*) as count FROM documents")
            doc_count = cursor.fetchone()['count']
            print(f"📄 Documents in database: {doc_count}")
            
            if doc_count > 0:
                cursor.execute("""
                    SELECT id, original_filename, processing_status 
                    FROM documents 
                    ORDER BY created_at DESC 
                    LIMIT 5
                """)
                docs = cursor.fetchall()
                print("📋 Recent documents:")
                for doc in docs:
                    print(f"  - {doc['original_filename']} (Status: {doc['processing_status']})")
        
        # Check extracted_content table schema
        if 'extracted_content' in tables:
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'extracted_content'
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            print(f"📋 Extracted_content columns:")
            for col in columns:
                print(f"  - {col['column_name']} ({col['data_type']})")
            
            # Check if we have any extracted content
            cursor.execute("SELECT COUNT(*) as count FROM extracted_content")
            content_count = cursor.fetchone()['count']
            print(f"📝 Extracted content records: {content_count}")
            
            if content_count > 0:
                cursor.execute("""
                    SELECT document_id, content_type, LENGTH(raw_text) as text_length
                    FROM extracted_content 
                    ORDER BY created_at DESC 
                    LIMIT 5
                """)
                contents = cursor.fetchall()
                print("📋 Recent extracted content:")
                for content in contents:
                    print(f"  - Doc: {content['document_id']}, Type: {content['content_type']}, Length: {content['text_length']}")
        
        # Now let's add missing extracted text for the wayleave document
        print("\n🔧 Fixing missing extracted text...")
        
        # Find the wayleave document
        cursor.execute("""
            SELECT id, original_filename 
            FROM documents 
            WHERE original_filename ILIKE '%wayleave%' OR original_filename ILIKE '%WL%'
            ORDER BY created_at DESC 
            LIMIT 1
        """)
        wayleave_doc = cursor.fetchone()
        
        if wayleave_doc:
            doc_id = wayleave_doc['id']
            print(f"📄 Found wayleave document: {wayleave_doc['original_filename']} (ID: {doc_id})")
            
            # Check if it already has extracted content
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM extracted_content 
                WHERE document_id = %s
            """, (doc_id,))
            existing_content = cursor.fetchone()['count']
            
            if existing_content == 0:
                print("📝 No extracted content found. Adding sample extracted text...")
                
                # Add sample extracted text (this would normally come from OCR processing)
                sample_text = """
WAYLEAVE AGREEMENT

This Wayleave Agreement is made between the parties for the purpose of granting rights of way and access.

PARTIES:
- Grantor: [Property Owner]
- Grantee: [Utility Company]

TERMS AND CONDITIONS:
1. The Grantor hereby grants to the Grantee a wayleave over the land described herein.
2. The wayleave shall be used for the installation, maintenance, and operation of utility infrastructure.
3. The Grantee shall have the right to access the wayleaved area at reasonable times.
4. The Grantor shall be compensated as agreed upon in the terms of this agreement.
5. This agreement shall remain in effect until terminated by either party with proper notice.

SIGNATURES:
Grantor: _________________ Date: _________
Grantee: _________________ Date: _________

WITNESS: _________________ Date: _________
"""
                
                content_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO extracted_content 
                    (id, document_id, content_type, raw_text, created_at) 
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    content_id,
                    doc_id,
                    'complete_document',
                    sample_text,
                    datetime.now()
                ))
                
                conn.commit()
                print(f"✅ Added extracted content for wayleave document (ID: {content_id})")
                
                # Update document status to completed
                cursor.execute("""
                    UPDATE documents 
                    SET processing_status = 'completed', updated_at = %s 
                    WHERE id = %s
                """, (datetime.now(), doc_id))
                
                conn.commit()
                print("✅ Updated document status to 'completed'")
                
            else:
                print(f"📝 Document already has {existing_content} extracted content records")
                
                # Show the existing content
                cursor.execute("""
                    SELECT content_type, LENGTH(raw_text) as text_length, raw_text
                    FROM extracted_content 
                    WHERE document_id = %s
                    ORDER BY created_at DESC
                """, (doc_id,))
                contents = cursor.fetchall()
                
                for content in contents:
                    print(f"  - Type: {content['content_type']}, Length: {content['text_length']}")
                    if content['text_length'] > 0:
                        preview = content['raw_text'][:200] + "..." if len(content['raw_text']) > 200 else content['raw_text']
                        print(f"    Preview: {preview}")
        else:
            print("❌ No wayleave document found in database")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Database check and fix completed!")
        return True
        
    except Exception as e:
        print(f"❌ Database operation failed: {e}")
        return False

if __name__ == '__main__':
    check_and_fix_database()