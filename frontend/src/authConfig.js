// MSAL Authentication Configuration
export const msalConfig = {
  auth: {
    clientId: '3868a328-8043-4528-ab51-53f1464dd6ee',
    authority: 'https://login.microsoftonline.com/0ed11b7c-74bd-478f-8a21-38a7f2e78a5e',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  }
};

// Scopes for API access
export const loginRequest = {
  scopes: ['openid', 'profile', 'email']
};

export const apiRequest = {
  scopes: ['api://3868a328-8043-4528-ab51-53f1464dd6ee/.default']
};
