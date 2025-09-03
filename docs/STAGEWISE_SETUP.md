# Stagewise Extension Setup

This document explains how to set up and use the stagewise extension for the OCR AI Assistant application.

## Overview

The stagewise extension allows you to configure different environments (development, staging, production) with their own specific settings, making deployment and environment management easier.

## Files Created

- `.env` - Development environment (default)
- `.env.staging` - Staging environment configuration
- `.env.production` - Production environment configuration
- `scripts/deploy.bat` - Windows batch deployment script
- `scripts/deploy.ps1` - PowerShell deployment script
- `docs/STAGEWISE_SETUP.md` - This documentation file

## Environment Configuration

### Development Environment
Uses `.env` file with:
- `ENVIRONMENT=development`
- Debug mode enabled
- Local database connections
- Relaxed security settings

### Staging Environment
Uses `.env.staging` file with:
- `ENVIRONMENT=staging`
- Production-like settings
- Staging database connections
- Moderate security settings

### Production Environment
Uses `.env.production` file with:
- `ENVIRONMENT=production`
- Optimized performance settings
- Production database connections
- Strict security settings

## Usage

### Using Batch Script (Windows)
```bash
# Set up development environment (default)
scripts/deploy.bat development

# Set up staging environment
scripts/deploy.bat staging

# Set up production environment
scripts/deploy.bat production
```

### Using PowerShell Script
```powershell
# Set up development environment (default)
scripts/deploy.ps1 development

# Set up staging environment
scripts/deploy.ps1 staging

# Set up production environment
scripts/deploy.ps1 production
```

### Manual Setup
1. Copy the appropriate environment file:
   - For staging: `copy .env.staging .env.current`
   - For production: `copy .env.production .env.current`

2. Update the environment variables in the copied file

3. Run the application: `scripts/start_application.bat`

## Configuration Variables

### Required Variables
- `ENVIRONMENT` - Current environment (development/staging/production)
- `SENTRY_DSN` - Sentry error tracking DSN
- `REACT_APP_SENTRY_DSN` - Frontend Sentry DSN

### Optional Variables
- `DATABASE_URL` - Database connection string
- `MISTRAL_API_KEY` - Mistral AI API key
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_CLOUD_VISION_API_KEY` - Google Cloud Vision API key
- `MAX_FILE_SIZE` - Maximum upload file size
- `MAX_WORKERS` - Number of worker processes
- `TIMEOUT` - Request timeout in seconds
- `CORS_ORIGINS` - Allowed CORS origins
- `ALLOWED_HOSTS` - Allowed host names

## Security Considerations

### Development
- Debug mode enabled
- Relaxed CORS settings
- Local connections allowed

### Staging
- Debug mode disabled
- Moderate security settings
- Limited CORS origins

### Production
- Debug mode disabled
- Strict security settings
- SSL enforcement
- Secure cookies
- Limited CORS origins

## Deployment Workflow

1. **Development**: Use `.env` for local development
2. **Testing**: Deploy to staging using `.env.staging`
3. **Production**: Deploy to production using `.env.production`

## Troubleshooting

### Common Issues

1. **Environment file not found**
   - Ensure the appropriate `.env.*` file exists
   - Run the deployment script to create missing files

2. **Permission errors**
   - Run PowerShell as administrator if needed
   - Check file permissions

3. **Configuration errors**
   - Verify all required environment variables are set
   - Check for typos in variable names

### Logs

Check the application logs for environment-specific issues:
- Development: Console output with detailed logs
- Staging: Log files with INFO level
- Production: Log files with WARNING level only

## Best Practices

1. **Never commit sensitive data** to version control
2. **Use different API keys** for each environment
3. **Test in staging** before production deployment
4. **Monitor logs** for each environment
5. **Keep environment files** up to date
6. **Use secure connections** in production
7. **Regular backups** of production data

## Support

For issues with the stagewise extension:
1. Check this documentation
2. Review the application logs
3. Verify environment variable configuration
4. Test with a clean environment setup