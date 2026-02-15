import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle } from 'lucide-react'
import { api } from '../services/api'
import { useApi } from '../hooks/useApi'

export default function Analytics() {
  const [analytics, setAnalytics] = useState({
    usageByCustomer: [],
    slaMetrics: [],
    topFailures: []
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')
  const { getToken } = useApi()

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      const token = await getToken()
      const data = await api.getAnalytics(token, timeRange)
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading analytics...</div>
  }

  return (
    <div className="analytics">
      <div className="page-header">
        <h1>Analytics</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="time-range-select"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h2>
            <TrendingUp size={20} />
            API Usage by Customer
          </h2>
          <div className="usage-table">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Total Calls</th>
                  <th>Avg Response Time</th>
                  <th>Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.usageByCustomer.map((item, index) => (
                  <tr key={index}>
                    <td>{item.customer_name}</td>
                    <td>{item.total_requests?.toLocaleString()}</td>
                    <td>{item.avg_response_time_ms}ms</td>
                    <td>
                      <span className={item.error_rate > 5 ? 'error-high' : 'error-low'}>
                        {item.error_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="analytics-card">
          <h2>
            <AlertCircle size={20} />
            SLA Metrics
          </h2>
          <div className="sla-table">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Total Runs</th>
                  <th>Failures</th>
                  <th>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.slaMetrics.map((item, index) => (
                  <tr key={index}>
                    <td>{item.customer_name}</td>
                    <td>{item.total_runs}</td>
                    <td>{item.failures}</td>
                    <td>
                      <span className={`sla-badge ${item.success_rate >= 95 ? 'good' : 'warning'}`}>
                        {item.success_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="analytics-card full-width">
        <h2>Top Failures (Last {timeRange} days)</h2>
        <div className="failures-list">
          {analytics.topFailures.length === 0 ? (
            <p className="empty-state">No failures recorded</p>
          ) : (
            analytics.topFailures.map((failure, index) => (
              <div key={index} className="failure-item">
                <div className="failure-header">
                  <strong>{failure.customer_name}</strong>
                  <span className="failure-count">{failure.count} failures</span>
                </div>
                <div className="failure-details">
                  <p>Notebook: {failure.notebook_name}</p>
                  <p className="error-message">{failure.error_message}</p>
                  <p className="failure-time">Last occurrence: {new Date(failure.last_occurrence).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
