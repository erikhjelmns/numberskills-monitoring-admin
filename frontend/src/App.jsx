import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import Dashboard from './components/Dashboard'
import CustomerList from './components/CustomerList'
import Analytics from './components/Analytics'
import Navigation from './components/Navigation'
import Login from './components/Login'

function App() {
  const { accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  // Show loading while authentication is in progress
  if (inProgress === 'startup' || inProgress === 'handleRedirect') {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />
  }

  // Get user info from MSAL account
  const user = accounts[0]

  return (
    <BrowserRouter>
      <div className="app">
        <Navigation user={user} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
