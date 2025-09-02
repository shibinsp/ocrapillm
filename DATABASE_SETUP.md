# OCR AI Assistant - Database Setup Guide

This guide helps you set up the PostgreSQL database for the OCR AI Assistant application.

## Prerequisites

### 1. PostgreSQL Installation
- Install PostgreSQL 12+ on your system
- Ensure PostgreSQL service is running
- Default configuration:
  - Host: `127.0.0.1` (localhost)
  - Port: `5432`
  - Database: `LLMAPI`
  - User: `postgres`
  - Password: `shibin`

### 2. Database Creation
Create the database using PostgreSQL command line or pgAdmin:

```sql
CREATE DATABASE "LLMAPI";
```

Or using command line:
```bash
psql -U postgres -c "CREATE DATABASE LLMAPI;"
```

## Quick Setup

### Step 1: Configure Database Settings
```bash
# Copy the database configuration template
cp .env.database .env
# Edit .env file with your database credentials if different from defaults
```

### Step 2: Install Migration Dependencies
```bash
pip install -r migration_requirements.txt
```

### Step 3: Run Database Migration
```bash
python database_migration.py
```

### Step 4: Verify Setup
The migration script will automatically verify that all tables were created successfully.

## Database Schema Overview

The migration creates the following tables:

### Core Tables
- **`documents`** - Stores uploaded document metadata
- **`pages`** - Individual pages of documents with processing info
- **`extracted_content`** - OCR results and processed text
- **`processing_logs`** - Detailed processing history and errors

### Chat Feature Tables
- **`chat_sessions`** - AI chat sessions linked to documents
- **`chat_messages`** - Individual messages in chat sessions

### Performance Indexes
The migration also creates optimized indexes for:
- Document status and upload date queries
- Page lookups by document
- Content searches
- Chat message retrieval

## Customizing Database Configuration

### Option 1: Using Environment Variables (Recommended)

Create a `.env` file in the project root or copy `.env.database` to `.env`:

```bash
# Copy the database environment template
cp .env.database .env
```

Then modify the values in `.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=LLMAPI
DB_USER=postgres
DB_PASSWORD=your_secure_password
```

### Option 2: Direct Code Modification

If you prefer, you can still modify the `DB_CONFIG` in `database_migration.py`:

```python
DB_CONFIG = {
    'host': 'your_host',
    'port': 5432,
    'database': 'your_database_name',
    'user': 'your_username',
    'password': 'your_password'
}
```

**Note**: Environment variables take precedence over hardcoded values.

## Troubleshooting

### Connection Issues
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Check if database exists: `psql -U postgres -l`
- Verify user permissions: `psql -U postgres -c "\du"`

### Permission Errors
- Grant necessary permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE "LLMAPI" TO postgres;
```

### Migration Failures
- Check PostgreSQL logs for detailed error messages
- Ensure the database is empty before running migration
- Verify PostgreSQL version compatibility (12+)

## Manual Table Verification

After migration, you can manually verify tables:

```sql
-- Connect to database
\c LLMAPI

-- List all tables
\dt

-- Check table structure
\d documents
\d pages
\d extracted_content
\d processing_logs
\d chat_sessions
\d chat_messages

-- Verify indexes
\di
```

## Next Steps

1. **Start the Application**: Run `start_application.bat` or start backend/frontend separately
2. **Test Upload**: Upload a PDF document to verify the system works
3. **Monitor Logs**: Check `processing_logs` table for any processing issues
4. **Backup Strategy**: Set up regular database backups for production use

## Production Considerations

- Change default passwords before production deployment
- Set up proper database user roles and permissions
- Configure connection pooling for better performance
- Implement regular backup and recovery procedures
- Monitor database performance and optimize queries as needed

---

**Need Help?** 
- Check the main application logs in the backend console
- Review PostgreSQL logs for database-specific issues
- Ensure all required Python packages are installed