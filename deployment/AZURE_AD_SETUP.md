# Azure AD Security Group Setup

## Overview

The admin portal uses **Azure AD security groups** to control access. Only users in the "Monitoring-Admins" group can access the portal.

## 🔐 Setup Steps

### 1. Create Azure AD Security Group

**In Azure Portal:**

```
1. Go to Azure Active Directory
2. Click "Groups" → "New group"
3. Group type: Security
4. Group name: "Monitoring-Admins"
5. Group description: "Administrators for Numberskills Monitoring Portal"
6. Membership type: Assigned
7. Click "Create"
```

**Get the Group Object ID:**
```
1. Open the "Monitoring-Admins" group
2. Copy the "Object Id" (e.g., 12345678-1234-1234-1234-123456789abc)
3. Save this - you'll need it for app registration
```

### 2. Add Members to Group

**Add staff who should have access:**

```
1. In the "Monitoring-Admins" group
2. Click "Members" → "Add members"
3. Search for users (e.g., erik@numberskills.com)
4. Select users and click "Select"
```

### 3. Create Azure AD App Registration

**Create app:**

```
1. Azure Active Directory → App registrations
2. Click "New registration"
3. Name: "Numberskills Monitoring Admin Portal"
4. Supported account types: "Single tenant"
5. Redirect URI: Leave blank (we'll add later)
6. Click "Register"
```

**Save important values:**
```
- Application (client) ID: <copy this>
- Directory (tenant) ID: <copy this>
```

### 4. Configure App Roles

**Add App Roles for the security group:**

```
1. In your app registration → "App roles"
2. Click "Create app role"

Admin Role:
-----------
Display name: Admin
Allowed member types: Users/Groups
Value: admin
Description: Administrator access to monitoring portal
Enabled: ✓

3. Click "Apply"

4. Create another role:

Operator Role:
--------------
Display name: Operator
Allowed member types: Users/Groups
Value: operator
Description: Operator access to monitoring portal (read-only)
Enabled: ✓

5. Click "Apply"
```

### 5. Assign Group to App Roles

**Assign the security group to the admin role:**

```
1. Go to Azure Active Directory → Enterprise applications
2. Find "Numberskills Monitoring Admin Portal"
3. Click "Users and groups"
4. Click "Add user/group"
5. Under "Users and groups", click "None Selected"
6. Search for "Monitoring-Admins"
7. Select the group
8. Under "Select a role", choose "Admin"
9. Click "Assign"
```

### 6. Create Client Secret

```
1. In app registration → "Certificates & secrets"
2. Click "New client secret"
3. Description: "Admin Portal"
4. Expires: 24 months
5. Click "Add"
6. COPY THE SECRET VALUE NOW (you can't see it again!)
```

### 7. Configure API Permissions (Optional)

**If you want to read group membership:**

```
1. In app registration → "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Select "Delegated permissions"
5. Search for and add:
   - User.Read (already added)
   - GroupMember.Read.All
6. Click "Add permissions"
7. Click "Grant admin consent for [your tenant]"
```

### 8. Enable Group Claims

**Configure token to include groups:**

```
1. In app registration → "Token configuration"
2. Click "Add groups claim"
3. Select: "Security groups"
4. For both ID and Access tokens, select:
   - Group ID
5. Click "Add"
```

### 9. Add Redirect URI (After Deployment)

**After deploying Static Web App:**

```
1. Get your Static Web App URL (e.g., https://swa-monitoring-admin.azurestaticapps.net)
2. In app registration → "Authentication"
3. Click "Add a platform"
4. Select "Web"
5. Redirect URI: https://<your-app>.azurestaticapps.net/.auth/login/aad/callback
6. Check: ID tokens
7. Click "Configure"
```

### 10. Update Static Web App Settings

**Configure the Static Web App with your Azure AD settings:**

```powershell
# Set the client ID and secret
az staticwebapp appsettings set `
    --name swa-monitoring-admin `
    --resource-group rg-customer-monitoring-prod `
    --setting-names `
        AZURE_CLIENT_ID="<your-client-id>" `
        AZURE_CLIENT_SECRET="<your-client-secret>"
```

### 11. Update Configuration Files

**Update `staticwebapp.config.json` with your tenant ID:**

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<YOUR_TENANT_ID>/v2.0"
        }
      }
    }
  }
}
```

Replace `<YOUR_TENANT_ID>` with your actual tenant ID.

## ✅ Testing

### Test Access Control

**User in "Monitoring-Admins" group:**
```
1. Navigate to admin portal URL
2. Click "Sign in with Microsoft"
3. Sign in with your @numberskills.com account
4. Should see dashboard ✓
```

**User NOT in group:**
```
1. Navigate to admin portal URL
2. Click "Sign in with Microsoft"
3. Sign in with account not in group
4. Should see "Unauthorized" or be redirected to login ✗
```

### Verify Roles

Check user's roles in browser console:
```javascript
// After login, check:
fetch('/.auth/me')
  .then(res => res.json())
  .then(data => console.log(data))

// Should show:
// userRoles: ["admin"]
```

## 🔧 Troubleshooting

### Issue: User can login but can't access portal

**Solution 1: Check group membership**
```
1. Azure AD → Groups → Monitoring-Admins
2. Check if user is in Members list
```

**Solution 2: Check role assignment**
```
1. Azure AD → Enterprise applications → Your app
2. Users and groups
3. Verify "Monitoring-Admins" is assigned to "Admin" role
```

**Solution 3: Re-login**
```
User needs to logout and login again for new group membership to take effect
```

### Issue: "No roles found" error in Function logs

**Solution: Enable group claims**
```
1. App registration → Token configuration
2. Add groups claim
3. Select "Security groups"
4. User must re-login
```

### Issue: Client ID/Secret not working

**Solution: Verify settings**
```powershell
# Check current settings
az staticwebapp appsettings list `
    --name swa-monitoring-admin `
    --resource-group rg-customer-monitoring-prod

# Verify AZURE_CLIENT_ID and AZURE_CLIENT_SECRET are set
```

## 📋 Quick Reference

**Required Azure AD Configuration:**
- ✅ Security group created ("Monitoring-Admins")
- ✅ Users added to security group
- ✅ App registration created
- ✅ App roles created (admin, operator)
- ✅ Security group assigned to app role
- ✅ Client secret generated
- ✅ Group claims enabled in token
- ✅ Redirect URI configured
- ✅ Static Web App settings updated

**Values You Need:**
```
TENANT_ID:          <from Azure AD>
CLIENT_ID:          <from app registration>
CLIENT_SECRET:      <from client secrets>
GROUP_OBJECT_ID:    <from Monitoring-Admins group>
```

## 🎯 Best Practices

1. **Use separate groups for different access levels:**
   - "Monitoring-Admins" → Full access (admin role)
   - "Monitoring-Operators" → Read-only (operator role)

2. **Regular access reviews:**
   - Review group membership quarterly
   - Remove users who no longer need access

3. **Secret rotation:**
   - Rotate client secret every 12 months
   - Use Azure Key Vault for production

4. **Audit logging:**
   - Enable Azure AD sign-in logs
   - Monitor for unauthorized access attempts

5. **Conditional Access (optional):**
   - Require MFA for admin access
   - Restrict to corporate network/devices

---

**Security**: Only users in your Azure AD security group can access the portal! 🔒
