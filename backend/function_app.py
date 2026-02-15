"""
Numberskills Monitoring - Admin Portal API
Azure Functions backend for customer and subscription management
"""

import azure.functions as func
import json
import os
import logging
import pyodbc
from datetime import datetime, timedelta
from azure.mgmt.apimanagement import ApiManagementClient
from azure.identity import DefaultAzureCredential
import jwt
from jwt import PyJWKClient
import requests

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Configuration
SQL_CONNECTION_STRING = os.environ.get('SQL_CONNECTION_STRING')
APIM_SUBSCRIPTION_ID = os.environ.get('APIM_SUBSCRIPTION_ID')
APIM_RESOURCE_GROUP = os.environ.get('APIM_RESOURCE_GROUP', 'rg-apimgmt-numberskills')
APIM_SERVICE_NAME = os.environ.get('APIM_SERVICE_NAME', 'numberskills')
APIM_PRODUCT_ID = os.environ.get('APIM_PRODUCT_ID', 'monitoring-standard')

# Azure AD Configuration
AZURE_TENANT_ID = os.environ.get('AZURE_TENANT_ID', '0ed11b7c-74bd-478f-8a21-38a7f2e78a5e')
AZURE_API_CLIENT_ID = os.environ.get('AZURE_API_CLIENT_ID', 'api://32c15be5-cce0-4a91-aa79-8cc0d2add348')  # Backend API app ID with api:// prefix
AZURE_JWKS_URL = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/discovery/v2.0/keys"

def get_sql_connection():
    """Get SQL database connection"""
    return pyodbc.connect(SQL_CONNECTION_STRING)

def get_apim_client():
    """Get APIM management client"""
    credential = DefaultAzureCredential()
    return ApiManagementClient(credential, APIM_SUBSCRIPTION_ID)

def verify_auth(req: func.HttpRequest):
    """Verify Azure AD JWT token from MSAL"""

    # For local development, skip auth
    if os.environ.get('ENVIRONMENT') == 'development':
        return True

    # Get Authorization header
    auth_header = req.headers.get('Authorization')

    if not auth_header:
        logging.warning("No Authorization header found")
        return False

    # Extract Bearer token
    if not auth_header.startswith('Bearer '):
        logging.warning("Authorization header does not contain Bearer token")
        return False

    token = auth_header[7:]  # Remove "Bearer " prefix

    try:
        # Decode without validation first to see what's in the token
        unverified = jwt.decode(token, options={"verify_signature": False})
        logging.warning(f"DEBUG - Token audience (aud): {unverified.get('aud')}")
        logging.warning(f"DEBUG - Token issuer (iss): {unverified.get('iss')}")
        logging.warning(f"DEBUG - Expected audience: {AZURE_API_CLIENT_ID}")

        # Get signing keys from Azure AD
        jwks_client = PyJWKClient(AZURE_JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Decode and validate token (skip issuer validation temporarily)
        decoded_token = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=AZURE_API_CLIENT_ID,
            options={"verify_iss": False}
        )

        # Token is valid if we get here
        logging.info(f"Authenticated user: {decoded_token.get('preferred_username', 'unknown')}")
        return True

    except jwt.ExpiredSignatureError:
        logging.warning("Token has expired")
        return False
    except jwt.InvalidAudienceError:
        logging.warning(f"Invalid token audience. Expected: {AZURE_API_CLIENT_ID}")
        return False
    except jwt.InvalidIssuerError:
        logging.warning(f"Invalid token issuer. Expected: https://login.microsoftonline.com/{AZURE_TENANT_ID}/v2.0")
        return False
    except Exception as e:
        logging.error(f"Token validation failed: {e}")
        return False


# ============================================
# Health Check
# ============================================

@app.route(route="health", methods=["GET"])
def health(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint - no auth required"""
    return func.HttpResponse(
        json.dumps({"status": "healthy", "message": "Backend is running"}),
        status_code=200,
        mimetype="application/json"
    )


# ============================================
# Dashboard Endpoints
# ============================================

@app.route(route="dashboard/stats", methods=["GET"])
def dashboard_stats(req: func.HttpRequest) -> func.HttpResponse:
    """Get dashboard statistics"""

    if not verify_auth(req):
        return func.HttpResponse("Unauthorized", status_code=401)

    try:
        conn = get_sql_connection()
        cursor = conn.cursor()

        # Total customers
        cursor.execute("SELECT COUNT(*) FROM Customers")
        total_customers = cursor.fetchone()[0]

        # Active subscriptions
        cursor.execute("""
            SELECT COUNT(*) FROM ApiSubscriptions
            WHERE is_active = 1
            AND (expires_at IS NULL OR expires_at > GETDATE())
        """)
        active_subscriptions = cursor.fetchone()[0]

        # Total API calls (last 30 days)
        cursor.execute("""
            SELECT COUNT(*) FROM ApiUsageLog
            WHERE date_key >= DATEADD(day, -30, CAST(GETDATE() AS DATE))
        """)
        total_api_calls = cursor.fetchone()[0]

        # Recent failures (last 7 days)
        cursor.execute("""
            SELECT COUNT(*) FROM MonitoringEvents
            WHERE event_type = 'execution_failed'
            AND event_timestamp >= DATEADD(day, -7, GETDATE())
        """)
        recent_failures = cursor.fetchone()[0]

        conn.close()

        return func.HttpResponse(
            json.dumps({
                "totalCustomers": total_customers,
                "activeSubscriptions": active_subscriptions,
                "totalApiCalls": total_api_calls,
                "recentFailures": recent_failures
            }),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Dashboard stats error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


@app.route(route="dashboard/activity", methods=["GET"])
def dashboard_activity(req: func.HttpRequest) -> func.HttpResponse:
    """Get recent activity"""

    if not verify_auth(req):
        return func.HttpResponse("Unauthorized", status_code=401)

    try:
        conn = get_sql_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT TOP 10
                c.customer_name,
                e.notebook_name,
                e.status,
                e.event_type,
                e.event_timestamp as timestamp
            FROM MonitoringEvents e
            JOIN Customers c ON e.customer_id = c.tenant_id
            ORDER BY e.event_timestamp DESC
        """)

        activity = []
        for row in cursor.fetchall():
            activity.append({
                "customer_name": row.customer_name,
                "notebook_name": row.notebook_name,
                "status": row.status,
                "type": "success" if row.status == "completed" else "failed",
                "timestamp": row.timestamp.isoformat()
            })

        conn.close()

        return func.HttpResponse(
            json.dumps(activity),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Dashboard activity error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# ============================================
# Customer Management
# ============================================

@app.route(route="customers", methods=["GET", "POST"])
def customers(req: func.HttpRequest) -> func.HttpResponse:
    """Get all customers or create new customer"""

    if not verify_auth(req):
        return func.HttpResponse("Unauthorized", status_code=401)

    if req.method == "GET":
        return get_customers(req)
    elif req.method == "POST":
        return create_customer(req)


def get_customers(req: func.HttpRequest) -> func.HttpResponse:
    """Get all customers with their subscription info"""
    try:
        conn = get_sql_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                c.customer_name,
                c.tenant_id,
                s.subscription_key,
                s.tier,
                s.is_active,
                s.requests_per_hour,
                s.requests_per_day,
                COUNT(l.id) as usage_30d
            FROM Customers c
            LEFT JOIN ApiSubscriptions s ON c.tenant_id = s.customer_id
            LEFT JOIN ApiUsageLog l ON c.tenant_id = l.customer_id
                AND l.date_key >= DATEADD(day, -30, CAST(GETDATE() AS DATE))
            GROUP BY c.customer_name, c.tenant_id, s.subscription_key,
                     s.tier, s.is_active, s.requests_per_hour, s.requests_per_day
            ORDER BY c.customer_name
        """)

        customers = []
        for row in cursor.fetchall():
            customers.append({
                "customer_name": row.customer_name,
                "tenant_id": row.tenant_id,
                "subscription_key": row.subscription_key,
                "tier": row.tier,
                "is_active": bool(row.is_active) if row.is_active is not None else False,
                "requests_per_hour": row.requests_per_hour,
                "requests_per_day": row.requests_per_day,
                "usage_30d": row.usage_30d or 0
            })

        conn.close()

        return func.HttpResponse(
            json.dumps(customers),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Get customers error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


def create_customer(req: func.HttpRequest) -> func.HttpResponse:
    """Create new customer + APIM subscription + SQL entry (all-in-one)"""
    try:
        data = req.get_json()
        customer_name = data['customer_name']
        tenant_id = data['tenant_id']
        tier = data.get('tier', 'standard')
        requests_per_hour = data.get('requests_per_hour', 1000)
        requests_per_day = data.get('requests_per_day', 10000)

        conn = get_sql_connection()
        cursor = conn.cursor()

        # 1. Add customer to SQL
        cursor.execute("""
            INSERT INTO Customers (tenant_id, customer_name)
            VALUES (?, ?)
        """, tenant_id, customer_name)

        # 2. Create APIM subscription
        apim_client = get_apim_client()
        subscription_id = f"sub-{tenant_id[:8]}"

        subscription = apim_client.subscription.create_or_update(
            resource_group_name=APIM_RESOURCE_GROUP,
            service_name=APIM_SERVICE_NAME,
            sid=subscription_id,
            parameters={
                "scope": f"/products/{APIM_PRODUCT_ID}",
                "display_name": customer_name,
                "state": "active"
            }
        )

        # 3. Link subscription to SQL
        cursor.execute("""
            INSERT INTO ApiSubscriptions (
                customer_id, subscription_name, subscription_key,
                tier, requests_per_hour, requests_per_day
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, tenant_id, customer_name, subscription.primary_key,
             tier, requests_per_hour, requests_per_day)

        conn.commit()
        conn.close()

        return func.HttpResponse(
            json.dumps({
                "customer_id": tenant_id,
                "customer_name": customer_name,
                "api_key": subscription.primary_key,
                "tier": tier,
                "status": "created"
            }),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Create customer error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


@app.route(route="customers/{customer_id}", methods=["DELETE"])
def delete_customer(req: func.HttpRequest) -> func.HttpResponse:
    """Delete customer and their subscription"""

    if not verify_auth(req):
        return func.HttpResponse("Unauthorized", status_code=401)

    try:
        customer_id = req.route_params.get('customer_id')

        conn = get_sql_connection()
        cursor = conn.cursor()

        # Get subscription info before deleting
        cursor.execute("""
            SELECT subscription_key FROM ApiSubscriptions
            WHERE customer_id = ?
        """, customer_id)

        row = cursor.fetchone()
        if row:
            subscription_key = row.subscription_key

            # Delete from APIM (find subscription by key)
            try:
                apim_client = get_apim_client()
                subscriptions = apim_client.subscription.list(
                    resource_group_name=APIM_RESOURCE_GROUP,
                    service_name=APIM_SERVICE_NAME
                )

                for sub in subscriptions:
                    if sub.primary_key == subscription_key:
                        apim_client.subscription.delete(
                            resource_group_name=APIM_RESOURCE_GROUP,
                            service_name=APIM_SERVICE_NAME,
                            sid=sub.name
                        )
                        break
            except Exception as e:
                logging.warning(f"Failed to delete APIM subscription: {e}")

        # Delete from SQL (cascade will handle related records)
        cursor.execute("DELETE FROM ApiSubscriptions WHERE customer_id = ?", customer_id)
        cursor.execute("DELETE FROM Customers WHERE tenant_id = ?", customer_id)

        conn.commit()
        conn.close()

        return func.HttpResponse(
            json.dumps({"status": "deleted"}),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Delete customer error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


@app.route(route="customers/{customer_id}/regenerate-key", methods=["POST"])
def regenerate_key(req: func.HttpRequest) -> func.HttpResponse:
    """Regenerate API key for customer"""

    if not verify_auth(req):
        return func.HttpResponse("Unauthorized", status_code=401)

    try:
        customer_id = req.route_params.get('customer_id')

        conn = get_sql_connection()
        cursor = conn.cursor()

        # Get current subscription info
        cursor.execute("""
            SELECT subscription_key FROM ApiSubscriptions
            WHERE customer_id = ?
        """, customer_id)

        row = cursor.fetchone()
        if not row:
            return func.HttpResponse(
                json.dumps({"error": "Customer not found"}),
                status_code=404,
                mimetype="application/json"
            )

        old_key = row.subscription_key

        # Regenerate in APIM
        apim_client = get_apim_client()
        subscriptions = apim_client.subscription.list(
            resource_group_name=APIM_RESOURCE_GROUP,
            service_name=APIM_SERVICE_NAME
        )

        new_key = None
        for sub in subscriptions:
            if sub.primary_key == old_key:
                # Regenerate primary key
                apim_client.subscription.regenerate_primary_key(
                    resource_group_name=APIM_RESOURCE_GROUP,
                    service_name=APIM_SERVICE_NAME,
                    sid=sub.name
                )

                # Get new key
                updated_sub = apim_client.subscription.get(
                    resource_group_name=APIM_RESOURCE_GROUP,
                    service_name=APIM_SERVICE_NAME,
                    sid=sub.name
                )
                new_key = updated_sub.primary_key
                break

        if not new_key:
            raise Exception("Failed to regenerate key in APIM")

        # Update in SQL
        cursor.execute("""
            UPDATE ApiSubscriptions
            SET subscription_key = ?
            WHERE customer_id = ?
        """, new_key, customer_id)

        conn.commit()
        conn.close()

        return func.HttpResponse(
            json.dumps({"new_key": new_key}),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Regenerate key error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# ============================================
# Analytics
# ============================================

@app.route(route="analytics", methods=["GET"])
def analytics(req: func.HttpRequest) -> func.HttpResponse:
    """Get analytics data"""

    if not verify_auth(req):
        return func.HttpResponse("Unauthorized", status_code=401)

    try:
        days = int(req.params.get('days', 30))

        conn = get_sql_connection()
        cursor = conn.cursor()

        # Usage by customer
        cursor.execute("""
            SELECT
                c.customer_name,
                COUNT(*) as total_requests,
                AVG(l.response_time_ms) as avg_response_time_ms,
                CAST(SUM(CASE WHEN l.status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as error_rate
            FROM ApiUsageLog l
            JOIN Customers c ON l.customer_id = c.tenant_id
            WHERE l.date_key >= DATEADD(day, ?, CAST(GETDATE() AS DATE))
            GROUP BY c.customer_name
            ORDER BY total_requests DESC
        """, -days)

        usage_by_customer = []
        for row in cursor.fetchall():
            usage_by_customer.append({
                "customer_name": row.customer_name,
                "total_requests": row.total_requests,
                "avg_response_time_ms": round(row.avg_response_time_ms or 0),
                "error_rate": float(row.error_rate or 0)
            })

        # SLA metrics
        cursor.execute("""
            SELECT
                c.customer_name,
                COUNT(*) as total_runs,
                SUM(CASE WHEN e.status = 'failed' THEN 1 ELSE 0 END) as failures,
                CAST((COUNT(*) - SUM(CASE WHEN e.status = 'failed' THEN 1 ELSE 0 END)) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as success_rate
            FROM MonitoringEvents e
            JOIN Customers c ON e.customer_id = c.tenant_id
            WHERE e.event_timestamp >= DATEADD(day, ?, GETDATE())
            GROUP BY c.customer_name
            HAVING COUNT(*) > 0
            ORDER BY success_rate ASC
        """, -days)

        sla_metrics = []
        for row in cursor.fetchall():
            sla_metrics.append({
                "customer_name": row.customer_name,
                "total_runs": row.total_runs,
                "failures": row.failures,
                "success_rate": float(row.success_rate or 0)
            })

        # Top failures
        cursor.execute("""
            SELECT TOP 5
                c.customer_name,
                e.notebook_name,
                e.error_message,
                COUNT(*) as count,
                MAX(e.event_timestamp) as last_occurrence
            FROM MonitoringEvents e
            JOIN Customers c ON e.customer_id = c.tenant_id
            WHERE e.event_type = 'execution_failed'
            AND e.event_timestamp >= DATEADD(day, ?, GETDATE())
            GROUP BY c.customer_name, e.notebook_name, e.error_message
            ORDER BY count DESC
        """, -days)

        top_failures = []
        for row in cursor.fetchall():
            top_failures.append({
                "customer_name": row.customer_name,
                "notebook_name": row.notebook_name,
                "error_message": row.error_message,
                "count": row.count,
                "last_occurrence": row.last_occurrence.isoformat()
            })

        conn.close()

        return func.HttpResponse(
            json.dumps({
                "usageByCustomer": usage_by_customer,
                "slaMetrics": sla_metrics,
                "topFailures": top_failures
            }),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Analytics error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )
