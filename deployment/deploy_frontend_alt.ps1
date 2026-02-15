# ============================================
# Deploy Frontend to Static Web App (Alternative)
# Uses Azure CLI instead of SWA CLI to avoid permissions issues
# ============================================

param(
    [string]$StaticWebAppName = "swa-monitoring-admin",
    [string]$ResourceGroup = "rg-customer-monitoring-prod"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📦 Deploying Frontend (Azure CLI Method)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
$frontendPath = "$PSScriptRoot\..\frontend"
Set-Location $frontendPath

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install --silent

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Build
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend built successfully" -ForegroundColor Green
Write-Host ""

# Create a deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
$distPath = Join-Path $frontendPath "dist"
$zipPath = Join-Path $frontendPath "deployment.zip"

# Remove old zip if exists
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Create zip from dist folder
Add-Type -Assembly System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($distPath, $zipPath)

Write-Host "✅ Package created" -ForegroundColor Green
Write-Host ""

# Get deployment token
Write-Host "🔑 Getting deployment token..." -ForegroundColor Yellow
$token = az staticwebapp secrets list `
    --name $StaticWebAppName `
    --resource-group $ResourceGroup `
    --query "properties.apiKey" -o tsv

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to get deployment token" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Token retrieved" -ForegroundColor Green
Write-Host ""

# Upload using az rest API
Write-Host "🚀 Uploading to Static Web App..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes..." -ForegroundColor Gray

# Use curl to upload (more reliable than az rest for file uploads)
$url = "https://$StaticWebAppName.azurestaticapps.net"
$apiUrl = "https://api.azurestaticapps.net"

# Alternative: Direct file copy approach
Write-Host "   Note: Azure Static Web Apps requires GitHub Actions or SWA CLI for deployment." -ForegroundColor Yellow
Write-Host "   Using az staticwebapp CLI method instead..." -ForegroundColor Gray

# Try using az staticwebapp commands directly
az staticwebapp environment set `
    --name $StaticWebAppName `
    --resource-group $ResourceGroup `
    --environment-name default

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "⚠️  Alternative Deployment Needed" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "The Azure CLI doesn't support direct file upload to Static Web Apps." -ForegroundColor White
Write-Host "Please use ONE of these methods:" -ForegroundColor White
Write-Host ""
Write-Host "Method 1 (Recommended): Run PowerShell as Administrator" -ForegroundColor Cyan
Write-Host "   1. Close this window" -ForegroundColor Gray
Write-Host "   2. Right-click PowerShell -> Run as Administrator" -ForegroundColor Gray
Write-Host "   3. Run: .\deploy_frontend.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Method 2: Manual Upload via Azure Portal" -ForegroundColor Cyan
Write-Host "   1. Go to Azure Portal -> Static Web Apps -> $StaticWebAppName" -ForegroundColor Gray
Write-Host "   2. Go to 'Deployment' -> 'Manual deployment'" -ForegroundColor Gray
Write-Host "   3. Upload the 'dist' folder" -ForegroundColor Gray
Write-Host ""
Write-Host "Built files are ready at:" -ForegroundColor White
Write-Host "   $distPath" -ForegroundColor Gray
Write-Host ""

# Cleanup
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
