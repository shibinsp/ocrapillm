import sqlite3

def check_database():
    try:
        conn = sqlite3.connect('ocr_database.db')
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print('Tables:', tables)
        
        # Check pages table structure
        cursor.execute("PRAGMA table_info(pages);")
        pages_schema = cursor.fetchall()
        print('\nPages table schema:')
        for col in pages_schema:
            print(f'  {col[1]} ({col[2]})')
        
        # Check extracted_content table structure
        cursor.execute("PRAGMA table_info(extracted_content);")
        content_schema = cursor.fetchall()
        print('\nExtracted_content table schema:')
        for col in content_schema:
            print(f'  {col[1]} ({col[2]})')
        
        # Check pages data
        cursor.execute("SELECT * FROM pages ORDER BY created_at DESC LIMIT 3;")
        pages = cursor.fetchall()
        print('\nRecent pages:')
        for row in pages:
            print(f'Page: {row}')
        
        # Check extracted_content data
        cursor.execute("SELECT * FROM extracted_content ORDER BY created_at DESC LIMIT 3;")
        content = cursor.fetchall()
        print('\nRecent extracted content:')
        for row in content:
            print(f'Content: {row[:3]}... (truncated)')
        
        conn.close()
        
    except Exception as e:
        print(f'Database error: {e}')

if __name__ == '__main__':
    check_database()