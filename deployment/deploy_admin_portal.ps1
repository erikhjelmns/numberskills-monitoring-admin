# ============================================
# Deploy Admin Portal
# ============================================
# Deploys the Numberskills Monitoring Admin Portal
# - Azure Static Web App (Frontend)
# - Azure Functions (Backend API)

param(
    [string]$ResourceGroup = "rg-customer-monitoring-prod",
    [string]$Location = "swedencentral",
    [string]$StaticWebAppName = "swa-monitoring-admin",
    [string]$FunctionAppName = "func-monitoring-admin",
    [string]$StorageAccountName = "stmonadmin$(Get-Random -Maximum 9999)",
    [string]$AadTenantId = "",  # Your Azure AD tenant ID
    [string]$AadClientId = "",  # Azure AD app client ID (create in Azure Portal)
    [string]$AadClientSecret = ""  # Azure AD app client secret
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🚀 Deploying Admin Portal" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if logged in
$context = Get-AzContext
if (-not $context) {
    Write-Host "❌ Not logged in to Azure. Please run 'Connect-AzAccount'" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged in as: $($context.Account.Id)" -ForegroundColor Green
Write-Host ""

# ============================================
# 1. Create Azure Static Web App
# ============================================

Write-Host "📦 Creating Azure Static Web App..." -ForegroundColor Yellow

# Note: Static Web Apps has limited region availability
# Using West Europe (closest to Sweden Central)
# The actual hosting is global via CDN regardless of region
$staticWebAppLocation = "westeurope"
Write-Host "   Using West Europe for Static Web App (Sweden Central not supported)" -ForegroundColor Gray

$staticWebApp = az staticwebapp create `
    --name $StaticWebAppName `
    --resource-group $ResourceGroup `
    --location $staticWebAppLocation `
    --sku Free `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Static Web App created" -ForegroundColor Green
    Write-Host "   URL: https://$($staticWebApp.defaultHostname)" -ForegroundColor Gray
} else {
    Write-Host "❌ Failed to create Static Web App" -ForegroundColor Red
    exit 1
}

# ============================================
# 2. Configure Azure AD Authentication
# ============================================

if ($AadTenantId -and $AadClientId -and $AadClientSecret) {
    Write-Host ""
    Write-Host "🔐 Configuring Azure AD authentication..." -ForegroundColor Yellow

    az staticwebapp appsettings set `
        --name $StaticWebAppName `
        --resource-group $ResourceGroup `
        --setting-names AZURE_CLIENT_ID=$AadClientId AZURE_CLIENT_SECRET=$AadClientSecret

    Write-Host "✅ Azure AD configured" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Azure AD not configured. Please set up manually:" -ForegroundColor Yellow
    Write-Host "   1. Create Azure AD app registration" -ForegroundColor Gray
    Write-Host "   2. Add redirect URI: https://$($staticWebApp.defaultHostname)/.auth/login/aad/callback" -ForegroundColor Gray
    Write-Host "   3. Set app settings: AZURE_CLIENT_ID and AZURE_CLIENT_SECRET" -ForegroundColor Gray
}

# ============================================
# 3. Create Storage Account for Functions
# ============================================

Write-Host ""
Write-Host "📦 Creating Storage Account..." -ForegroundColor Yellow

$storage = az storage account create `
    --name $StorageAccountName `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Standard_LRS `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Storage Account created" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create Storage Account" -ForegroundColor Red
    exit 1
}

# ============================================
# 4. Create Function App
# ============================================

Write-Host ""
Write-Host "📦 Creating Function App..." -ForegroundColor Yellow

$functionApp = az functionapp create `
    --name $FunctionAppName `
    --resource-group $ResourceGroup `
    --storage-account $StorageAccountName `
    --consumption-plan-location $Location `
    --runtime python `
    --runtime-version 3.11 `
    --functions-version 4 `
    --os-type Linux `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Function App created" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create Function App" -ForegroundColor Red
    exit 1
}

# ============================================
# 5. Configure Function App Settings
# ============================================

Write-Host ""
Write-Host "⚙️  Configuring Function App..." -ForegroundColor Yellow

# Get SQL connection string from existing monitoring function
$sqlConnStr = az functionapp config appsettings list `
    --name "func-customer-monitoring-prod" `
    --resource-group $ResourceGroup `
    --query "[?name=='SQL_CONNECTION_STRING'].value" -o tsv

# Get Azure subscription ID
$subscriptionId = $context.Subscription.Id

# Set Function App settings
az functionapp config appsettings set `
    --name $FunctionAppName `
    --resource-group $ResourceGroup `
    --settings `
        SQL_CONNECTION_STRING=$sqlConnStr `
        APIM_SUBSCRIPTION_ID=$subscriptionId `
        APIM_RESOURCE_GROUP="rg-apimgmt-numberskills" `
        APIM_SERVICE_NAME="numberskills" `
        APIM_PRODUCT_ID="monitoring-standard"

Write-Host "✅ Function App configured" -ForegroundColor Green

# ============================================
# 6. Enable Managed Identity
# ============================================

Write-Host ""
Write-Host "🔐 Enabling Managed Identity..." -ForegroundColor Yellow

az functionapp identity assign `
    --name $FunctionAppName `
    --resource-group $ResourceGroup

Write-Host "✅ Managed Identity enabled" -ForegroundColor Green
Write-Host "   ⚠️  You need to grant this identity APIM Contributor role manually" -ForegroundColor Yellow

# ============================================
# 7. Build and Deploy
# ============================================

Write-Host ""
Write-Host "📦 Building frontend..." -ForegroundColor Yellow

Push-Location "..\frontend"
npm install
npm run build
Pop-Location

Write-Host "✅ Frontend built" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Deploying Function App..." -ForegroundColor Yellow

Push-Location "..\backend"
func azure functionapp publish $FunctionAppName --python
Pop-Location

Write-Host "✅ Function App deployed" -ForegroundColor Green

# ============================================
# Summary
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ ADMIN PORTAL DEPLOYED!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Your Admin Portal:" -ForegroundColor Cyan
Write-Host "   URL: https://$($staticWebApp.defaultHostname)" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Set up Azure AD app registration" -ForegroundColor White
Write-Host "   2. Configure redirect URI in Azure AD" -ForegroundColor White
Write-Host "   3. Grant APIM Contributor role to Function's managed identity:" -ForegroundColor White
Write-Host "      az role assignment create --assignee <managed-identity-id>" -ForegroundColor Gray
Write-Host "        --role 'API Management Service Contributor'" -ForegroundColor Gray
Write-Host "        --scope /subscriptions/$subscriptionId/resourceGroups/rg-apimgmt-numberskills" -ForegroundColor Gray
Write-Host "   4. Deploy frontend:" -ForegroundColor White
Write-Host "      cd frontend && swa deploy --app-name $StaticWebAppName" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Get deployment token:" -ForegroundColor Yellow
Write-Host "   az staticwebapp secrets list --name $StaticWebAppName" -ForegroundColor Gray
Write-Host ""
