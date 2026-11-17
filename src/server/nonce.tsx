import { createContext, useContext } from 'react';

/** CSP nonce for the current SSR request; '' in the browser (nonce attr is hidden there). */
export const NonceContext = createContext<string>('');
export const useNonce = () => useContext(NonceContext);
