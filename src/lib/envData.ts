export const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'production'

// Where the tenant's "Support" sidebar link sends them — kept out of code
// since this is expected to change (e.g. a different support portal per
// environment, or the URL moving entirely). Empty means the link is hidden
// rather than pointing nowhere.
export const SUPPORT_LOGIN_URL = process.env.NEXT_PUBLIC_SUPPORT_LOGIN_URL || ''

console.log('App env: ', APP_ENV);
