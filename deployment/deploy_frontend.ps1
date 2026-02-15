# ============================================
# Deploy Frontend to Static Web App
# ============================================

param(
    [string]$StaticWebAppName = "swa-monitoring-admin",
    [string]$ResourceGroup = "rg-customer-monitoring-prod"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📦 Deploying Frontend" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location "$PSScriptRoot\..\frontend"

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

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

Write-Host "✅ Frontend built" -ForegroundColor Green
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

# Deploy using SWA CLI
Write-Host "🚀 Deploying to Static Web App (Default Production)..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes..." -ForegroundColor Gray

npx @azure/static-web-apps-cli deploy ./dist `
    --deployment-token $token `
    --no-use-keychain

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "✅ FRONTEND DEPLOYED!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Your Admin Portal:" -ForegroundColor Cyan
    Write-Host "   URL: https://$StaticWebAppName.azurestaticapps.net" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  Final Step:" -ForegroundColor Yellow
    Write-Host "   Add this redirect URI to your Azure AD app registration:" -ForegroundColor White
    Write-Host "   https://$StaticWebAppName.azurestaticapps.net/.auth/login/aad/callback" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}
