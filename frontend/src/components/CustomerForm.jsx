import { useState } from 'react'
import { X } from 'lucide-react'

export default function CustomerForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    tenant_id: '',
    tier: 'standard',
    requests_per_hour: 1000,
    requests_per_day: 10000
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Customer</h2>
          <button onClick={onCancel} className="close-button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="customer-form">
          <div className="form-group">
            <label htmlFor="customer_name">Customer Name *</label>
            <input
              type="text"
              id="customer_name"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              required
              placeholder="e.g., Contoso Inc"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tenant_id">Tenant ID *</label>
            <input
              type="text"
              id="tenant_id"
              name="tenant_id"
              value={formData.tenant_id}
              onChange={handleChange}
              required
              placeholder="e.g., abc-123-def-456"
            />
            <small>The customer's Microsoft Fabric tenant ID</small>
          </div>

          <div className="form-group">
            <label htmlFor="tier">Subscription Tier</label>
            <select
              id="tier"
              name="tier"
              value={formData.tier}
              onChange={handleChange}
            >
              <option value="basic">Basic (500 req/hour)</option>
              <option value="standard">Standard (1000 req/hour)</option>
              <option value="premium">Premium (5000 req/hour)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="requests_per_hour">Requests per Hour</label>
              <input
                type="number"
                id="requests_per_hour"
                name="requests_per_hour"
                value={formData.requests_per_hour}
                onChange={handleChange}
                min="100"
                max="10000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="requests_per_day">Requests per Day</label>
              <input
                type="number"
                id="requests_per_day"
                name="requests_per_day"
                value={formData.requests_per_day}
                onChange={handleChange}
                min="1000"
                max="100000"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
