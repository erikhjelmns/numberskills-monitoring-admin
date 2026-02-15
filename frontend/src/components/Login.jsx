import { Building2, Lock } from 'lucide-react'
import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../authConfig'

export default function Login() {
  const { instance } = useMsal()

  const handleLogin = async () => {
    try {
      await instance.loginRedirect(loginRequest)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Building2 size={48} className="logo" />
          <h1>Numberskills Monitoring</h1>
          <p>Admin Portal</p>
        </div>

        <div className="login-body">
          <button onClick={handleLogin} className="login-button">
            <Lock size={20} />
            Sign in with Microsoft
          </button>

          <p className="login-info">
            Only authorized Numberskills staff can access this portal.
          </p>
        </div>
      </div>
    </div>
  )
}
