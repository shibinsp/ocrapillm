# aaPanel Deployment Guide for OCR Application

This guide provides step-by-step instructions for deploying the OCR application on aaPanel with Docker, NGINX, and PostgreSQL.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   aaPanel       │    │   Docker         │    │   PostgreSQL    │
│   NGINX         │────│   FastAPI        │────│   Database      │
│   (Frontend)    │    │   (Backend)      │    │   (Container)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

- **Frontend**: React app served by aaPanel's NGINX
- **Backend**: FastAPI in Docker container
- **Database**: PostgreSQL in Docker container
- **Proxy**: NGINX proxies `/api/*` requests to FastAPI

## Prerequisites

1. **aaPanel installed** on your server
2. **Docker and Docker Compose** installed
3. **Domain name** pointed to your server
4. **SSL certificate** (optional but recommended)

## Step 1: Server Preparation

### Install Docker (if not already installed)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### Create Application Directory
```bash
sudo mkdir -p /var/www/ocr-app
sudo chown $USER:$USER /var/www/ocr-app
cd /var/www/ocr-app
```

## Step 2: Upload Application Files

### Upload via aaPanel File Manager or SCP
```bash
# Using SCP (from your local machine)
scp -r ./ocrapillm/* user@your-server:/var/www/ocr-app/

# Or use aaPanel's file manager to upload the entire project
```

### Set Proper Permissions
```bash
cd /var/www/ocr-app
sudo chown -R www-data:www-data .
sudo chmod -R 755 .
sudo chmod -R 777 backend/uploads backend/outputs
```

## Step 3: Configure Environment

### Create Production Environment File
```bash
cp .env.production.template .env
nano .env
```

### Configure the .env file:
```env
# Environment
ENVIRONMENT=production

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ocr_database
DB_USER=ocr_user
DB_PASSWORD=your_secure_password_here

# API Keys
MISTRAL_API_KEY=your_mistral_api_key_here
GOOGLE_VISION_API_KEY=your_google_vision_api_key_here

# Frontend Configuration
FRONTEND_URL=https://your-domain.com
PRODUCTION_DOMAIN=your-domain.com

# CORS Configuration
ALLOW_ALL_ORIGINS=false
```

## Step 4: Build and Deploy Backend with Docker

### Start the Backend Services
```bash
# Build and start containers
docker-compose up -d

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Verify Backend is Running
```bash
# Test health endpoint
curl http://localhost:8000/health

# Should return: {"status": "healthy", ...}
```

## Step 5: Build React Frontend

### Install Dependencies and Build
```bash
cd frontend

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install

# Set production API base URL
echo "REACT_APP_API_BASE_URL=/api" > .env.production.local

# Build for production
npm run build
```

### Copy Build Files to Web Directory
```bash
# Create web directory
sudo mkdir -p /var/www/html/ocr-app

# Copy build files
sudo cp -r build/* /var/www/html/ocr-app/
sudo chown -R www-data:www-data /var/www/html/ocr-app
```

## Step 6: Configure aaPanel Website

### Create New Website in aaPanel
1. Login to aaPanel
2. Go to **Website** → **Add Site**
3. Configure:
   - **Domain**: your-domain.com
   - **Root Directory**: `/var/www/html/ocr-app`
   - **PHP Version**: Not required (static files)

### Configure NGINX
1. Go to **Website** → **Settings** → **Config File**
2. Replace the NGINX configuration with the content from `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html/ocr-app;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Client max body size for file uploads
    client_max_body_size 100M;
    
    # Serve React app
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to FastAPI backend
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Step 7: SSL Configuration (Recommended)

### Using aaPanel SSL Manager
1. Go to **Website** → **SSL**
2. Choose your preferred method:
   - **Let's Encrypt** (free, automatic)
   - **Upload Certificate** (if you have one)
   - **Self-signed** (for testing)

### Force HTTPS Redirect
Add this to the top of your NGINX config:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Step 8: Database Migration

### Run Initial Database Setup
```bash
cd /var/www/ocr-app

# Install Python dependencies for migration
pip3 install -r migration_requirements.txt

# Run database migration
python3 scripts/database_migration.py
```

## Step 9: Monitoring and Maintenance

### Set up Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/ocr-app
```

Add:
```
/var/www/ocr-app/backend/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### Create Backup Script
```bash
#!/bin/bash
# /var/www/ocr-app/scripts/backup.sh

BACKUP_DIR="/var/backups/ocr-app"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec ocr_postgres pg_dump -U ocr_user ocr_database > $BACKUP_DIR/db_backup_$DATE.sql

# Backup uploaded files
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /var/www/ocr-app/backend/uploads

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*backup*" -mtime +7 -delete
```

### Set up Cron Jobs
```bash
crontab -e
```

Add:
```
# Daily backup at 2 AM
0 2 * * * /var/www/ocr-app/scripts/backup.sh

# Restart containers weekly (Sunday 3 AM)
0 3 * * 0 cd /var/www/ocr-app && docker-compose restart
```

## Step 10: Testing and Verification

### Test Frontend
1. Visit `https://your-domain.com`
2. Verify the React app loads correctly
3. Check browser console for errors

### Test Backend API
```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Test file upload (with a small PDF)
curl -X POST -F "file=@test.pdf" https://your-domain.com/api/upload/
```

### Test Full Workflow
1. Upload a PDF document
2. Wait for OCR processing
3. View extracted text
4. Test chat functionality
5. Export document

## Troubleshooting

### Common Issues

#### 1. API Requests Failing
- Check NGINX proxy configuration
- Verify backend container is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`

#### 2. File Upload Issues
- Check file permissions: `ls -la backend/uploads`
- Verify `client_max_body_size` in NGINX config
- Check disk space: `df -h`

#### 3. Database Connection Issues
- Verify PostgreSQL container: `docker-compose logs postgres`
- Check database credentials in `.env`
- Test connection: `docker exec -it ocr_postgres psql -U ocr_user -d ocr_database`

#### 4. CORS Issues
- Check `allowed_origins` in backend logs
- Verify `FRONTEND_URL` and `PRODUCTION_DOMAIN` in `.env`
- Consider setting `ALLOW_ALL_ORIGINS=true` temporarily for testing

### Useful Commands

```bash
# View all container logs
docker-compose logs -f

# Restart specific service
docker-compose restart backend

# Update containers
docker-compose pull && docker-compose up -d

# Check NGINX configuration
nginx -t

# Reload NGINX
sudo systemctl reload nginx

# Monitor system resources
htop
docker stats
```

## Security Considerations

1. **Firewall**: Only open ports 80, 443, and SSH
2. **Updates**: Keep system and Docker images updated
3. **Backups**: Regular automated backups
4. **Monitoring**: Set up monitoring and alerts
5. **SSL**: Always use HTTPS in production
6. **Environment Variables**: Never commit sensitive data to git

## Performance Optimization

1. **NGINX Caching**: Enable static file caching
2. **Database**: Regular maintenance and optimization
3. **Docker**: Limit container resources if needed
4. **CDN**: Consider using a CDN for static assets
5. **Monitoring**: Use tools like Grafana + Prometheus

## Support

For issues and questions:
1. Check the application logs
2. Review this documentation
3. Check the main README.md
4. Consult aaPanel documentation
5. Docker and NGINX documentation