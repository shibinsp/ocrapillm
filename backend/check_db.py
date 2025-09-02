import psycopg2

try:
    conn = psycopg2.connect(
        host='127.0.0.1',
        port=5432,
        database='LLMAPI',
        user='postgres',
        password='shibin'
    )
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, filename FROM documents LIMIT 5')
    print('Document IDs in database:')
    for row in cursor.fetchall():
        print(f'ID: {row[0]}, Filename: {row[1]}')
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f'Error: {e}')