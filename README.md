# Numberskills Monitoring Admin Portal

Admin portal for managing customer monitoring subscriptions.

## Architecture

- **Frontend**: React with Vite, MSAL authentication
- **Backend**: Azure Functions (Python)
- **Hosting**: Azure Static Web Apps
- **Authentication**: Azure AD (MSAL)

## Prerequisites

- Node.js 18+
- Python 3.9+
- Azure CLI
- Azure subscription

## Azure AD Configuration

1. Client ID: 3868a328-8043-4528-ab51-53f1464dd6ee
2. Tenant ID: 0ed11b7c-74bd-478f-8a21-38a7f2e78a5e
3. Platform: Single-page application
4. Redirect URIs configured for both production and preview environments

## Local Development

### Frontend

cd frontend
npm install
npm run dev

### Backend

cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
func start

## Deployment

Deployment is automated via GitHub Actions. Push to main branch to trigger deployment.

### Setup GitHub Secret

Add the Azure Static Web Apps deployment token as a GitHub secret:

1. Go to your GitHub repository settings
2. Navigate to Secrets and variables > Actions
3. Add a new secret named AZURE_STATIC_WEB_APPS_API_TOKEN
4. Use the deployment token from Azure

## Project Structure

admin-portal/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks (useApi)
│   │   ├── services/     # API service
│   │   └── styles/       # CSS styles
│   └── public/           # Static assets
├── backend/              # Azure Functions backend
│   ├── function_app.py   # Function definitions
│   └── requirements.txt  # Python dependencies
└── .github/workflows/    # GitHub Actions workflows

## Azure Resources

- Static Web App: swa-monitoring-admin
- Function App: func-monitoring-admin
- Resource Group: rg-customer-monitoring-prod
