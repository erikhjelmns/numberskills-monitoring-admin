import { useMsal } from '@azure/msal-react'
import { apiRequest } from '../authConfig'

export function useApi() {
  const { instance, accounts } = useMsal()

  const getToken = async () => {
    if (accounts.length === 0) {
      throw new Error('No active account')
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...apiRequest,
        account: accounts[0]
      })
      return response.accessToken
    } catch (error) {
      // If silent acquisition fails, try interactive
      const response = await instance.acquireTokenPopup(apiRequest)
      return response.accessToken
    }
  }

  return { getToken }
}
