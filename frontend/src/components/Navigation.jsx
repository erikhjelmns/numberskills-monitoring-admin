import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, BarChart3, LogOut } from 'lucide-react'
import { useMsal } from '@azure/msal-react'

export default function Navigation({ user }) {
  const location = useLocation()
  const { instance } = useMsal()

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    instance.logoutRedirect()
  }

  // MSAL account object has username (UPN) and name properties
  const userEmail = user?.username || user?.userPrincipalName || ''
  const userName = user?.name || userEmail.split('@')[0]

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>Numberskills</h2>
        <p>Monitoring Admin</p>
      </div>

      <ul className="nav-menu">
        <li>
          <Link to="/" className={isActive('/') ? 'active' : ''}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
        </li>
        <li>
          <Link to="/customers" className={isActive('/customers') ? 'active' : ''}>
            <Users size={20} />
            <span>Customers</span>
          </Link>
        </li>
        <li>
          <Link to="/analytics" className={isActive('/analytics') ? 'active' : ''}>
            <BarChart3 size={20} />
            <span>Analytics</span>
          </Link>
        </li>
      </ul>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {userName?.charAt(0)?.toUpperCase()}
          </div>
          <div className="user-details">
            <p className="user-name">{userName}</p>
            <p className="user-email">{userEmail}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}
