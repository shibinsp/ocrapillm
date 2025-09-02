import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='LLMAPI',
    user='postgres',
    password='shibin'
)
cursor = conn.cursor()
cursor.execute("SELECT id, filename FROM documents WHERE id::text LIKE 'task_%';")
task_docs = cursor.fetchall()
print('Task ID documents:', task_docs)
cursor.close()
conn.close()