// API service for admin portal
const API_BASE = 'https://func-monitoring-admin.azurewebsites.net/api'

async function request(endpoint, token, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Dashboard
  getDashboardStats: (token) => request('/dashboard/stats', token),
  getRecentActivity: (token) => request('/dashboard/activity', token),

  // Customers
  getCustomers: (token) => request('/customers', token),
  createCustomer: (token, data) => request('/customers', token, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteCustomer: (token, customerId) => request(`/customers/${customerId}`, token, {
    method: 'DELETE'
  }),
  regenerateKey: (token, customerId) => request(`/customers/${customerId}/regenerate-key`, token, {
    method: 'POST'
  }),

  // Analytics
  getAnalytics: (token, days = 30) => request(`/analytics?days=${days}`, token)
}
