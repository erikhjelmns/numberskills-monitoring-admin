import { useState, useEffect } from 'react'
import { Users, Activity, TrendingUp, AlertTriangle } from 'lucide-react'
import { api } from '../services/api'
import { useApi } from '../hooks/useApi'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeSubscriptions: 0,
    totalApiCalls: 0,
    recentFailures: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const { getToken } = useApi()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const token = await getToken()
      const [statsData, activityData] = await Promise.all([
        api.getDashboardStats(token),
        api.getRecentActivity(token)
      ])
      setStats(statsData)
      setRecentActivity(activityData)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Customers</p>
            <p className="stat-value">{stats.totalCustomers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Active Subscriptions</p>
            <p className="stat-value">{stats.activeSubscriptions}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">API Calls (30d)</p>
            <p className="stat-value">{stats.totalApiCalls.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Recent Failures (7d)</p>
            <p className="stat-value">{stats.recentFailures}</p>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.length === 0 ? (
            <p className="empty-state">No recent activity</p>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className={`activity-badge ${activity.type}`}>
                  {activity.type === 'success' ? '✓' : '✗'}
                </div>
                <div className="activity-details">
                  <p className="activity-customer">{activity.customer_name}</p>
                  <p className="activity-message">{activity.notebook_name} - {activity.status}</p>
                </div>
                <div className="activity-time">
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
