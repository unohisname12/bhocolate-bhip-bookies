import { createContext } from 'react';
export const DeliveryCloudContext = createContext<null | { flush: () => Promise<boolean> }>(null);
