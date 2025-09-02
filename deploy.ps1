# OCR AI Assistant - Stagewise Deployment Script
# Usage: .\deploy.ps1 [development|staging|production]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "staging", "production")]
    [string]$Stage
)

function Show-Usage {
    Write-Host "Usage: .\deploy.ps1 [development|staging|production]" -ForegroundColor Yellow
    Write-Host "Current environment files:" -ForegroundColor Cyan
    if (Test-Path ".env") { Write-Host "  - .env (development)" -ForegroundColor Green }
    if (Test-Path ".env.staging") { Write-Host "  - .env.staging" -ForegroundColor Green }
    if (Test-Path ".env.production") { Write-Host "  - .env.production" -ForegroundColor Green }
}

if (-not $Stage) {
    Show-Usage
    exit 1
}

Write-Host "Setting up environment for $Stage..." -ForegroundColor Cyan

switch ($Stage) {
    "development" {
        if (Test-Path ".env") {
            Write-Host "Using existing .env for development" -ForegroundColor Green
        } else {
            Write-Host "Error: .env file not found for development" -ForegroundColor Red
            exit 1
        }
    }
    "staging" {
        if (Test-Path ".env.staging") {
            Copy-Item ".env.staging" ".env.current" -Force
            Write-Host "Environment configured for staging" -ForegroundColor Green
        } else {
            Write-Host "Error: .env.staging file not found" -ForegroundColor Red
            exit 1
        }
    }
    "production" {
        if (Test-Path ".env.production") {
            Copy-Item ".env.production" ".env.current" -Force
            Write-Host "Environment configured for production" -ForegroundColor Green
        } else {
            Write-Host "Error: .env.production file not found" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
Write-Host "Stage-wise deployment setup complete for $Stage!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update the environment variables in the appropriate .env file"
Write-Host "2. Run the application using: .\start_application.bat"
Write-Host ""
Write-Host "Environment files:" -ForegroundColor Cyan
Write-Host "  - .env (development - default)"
Write-Host "  - .env.staging (staging environment)"
Write-Host "  - .env.production (production environment)"
Write-Host "  - .env.current (currently active for non-development)"

Read-Host "Press Enter to continue"