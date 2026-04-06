import { ENV } from '../config/environment';

export const useAnalytics = () => {
  const track = (event: string, data?: Record<string, unknown>) => {
    if (ENV.isDev) {
      console.debug('[Analytics]', event, data);
    }
    // Wire Mixpanel / Firebase Analytics here in a future step
  };

  return { track };
};
