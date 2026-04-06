export const ENV = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  firebaseEnabled: !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== 'undefined'
  ),
  version: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.1.0',
} as const;
