import sqlite3
import os

print('Database file exists:', os.path.exists('backend/ocr_database.db'))

conn = sqlite3.connect('backend/ocr_database.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print('Available tables:', [t[0] for t in tables])

if tables:
    for table in tables:
        table_name = table[0]
        print(f'\nTable: {table_name}')
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        for col in columns:
            print(f'  - {col[1]} ({col[2]})')

conn.close()