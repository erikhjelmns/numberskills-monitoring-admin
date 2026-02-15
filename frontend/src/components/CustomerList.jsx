import { useState, useEffect } from 'react'
import { Plus, Key, Trash2, Copy, Check, RefreshCw, ExternalLink } from 'lucide-react'
import { api } from '../services/api'
import { useApi } from '../hooks/useApi'
import CustomerForm from './CustomerForm'

export default function CustomerList() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [copiedKey, setCopiedKey] = useState(null)
  const { getToken } = useApi()

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const token = await getToken()
      const data = await api.getCustomers(token)
      setCustomers(data)
    } catch (error) {
      console.error('Failed to load customers:', error)
      alert('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async (customerData) => {
    try {
      const token = await getToken()
      await api.createCustomer(token, customerData)
      await loadCustomers()
      setShowForm(false)
      alert('Customer created successfully!')
    } catch (error) {
      console.error('Failed to create customer:', error)
      alert('Failed to create customer: ' + error.message)
    }
  }

  const handleDeleteCustomer = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer? This will also delete their subscription.')) {
      return
    }

    try {
      const token = await getToken()
      await api.deleteCustomer(token, customerId)
      await loadCustomers()
      alert('Customer deleted successfully')
    } catch (error) {
      console.error('Failed to delete customer:', error)
      alert('Failed to delete customer')
    }
  }

  const handleRegenerateKey = async (customerId) => {
    if (!confirm('Regenerate API key? The old key will stop working immediately.')) {
      return
    }

    try {
      const token = await getToken()
      const newKey = await api.regenerateKey(token, customerId)
      alert(`New API key: ${newKey}\n\nPlease copy it now!`)
      await loadCustomers()
    } catch (error) {
      console.error('Failed to regenerate key:', error)
      alert('Failed to regenerate key')
    }
  }

  const copyToClipboard = (text, customerId) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(customerId)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const maskApiKey = (key) => {
    if (!key) return 'No key'
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
  }

  if (loading) {
    return <div className="loading">Loading customers...</div>
  }

  return (
    <div className="customer-list">
      <div className="page-header">
        <h1>Customers</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {showForm && (
        <CustomerForm
          onSubmit={handleCreateCustomer}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="customers-table">
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Tenant ID</th>
              <th>API Key</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Usage (30d)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  No customers yet. Click "Add Customer" to get started.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.tenant_id}>
                  <td>
                    <strong>{customer.customer_name}</strong>
                  </td>
                  <td>
                    <code className="tenant-id">{customer.tenant_id}</code>
                  </td>
                  <td>
                    <div className="api-key-cell">
                      <code>{maskApiKey(customer.subscription_key)}</code>
                      {customer.subscription_key && (
                        <button
                          onClick={() => copyToClipboard(customer.subscription_key, customer.tenant_id)}
                          className="icon-button"
                          title="Copy full API key"
                        >
                          {copiedKey === customer.tenant_id ? (
                            <Check size={16} className="success" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${customer.tier || 'standard'}`}>
                      {customer.tier || 'standard'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${customer.is_active ? 'active' : 'inactive'}`}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {customer.usage_30d ? customer.usage_30d.toLocaleString() : '0'} calls
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleRegenerateKey(customer.tenant_id)}
                        className="icon-button"
                        title="Regenerate API key"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <a
                        href={`https://numberskills.azure-api.net/monitoring/v1/health`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-button"
                        title="Test API"
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button
                        onClick={() => handleDeleteCustomer(customer.tenant_id)}
                        className="icon-button danger"
                        title="Delete customer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
