import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const ImpersonationContext = createContext(null);

export function ImpersonationProvider({ children }) {
  const { user: realUser } = useAuth();
  const [impersonated, setImpersonated] = useState(null);

  const startImpersonation = (u) => setImpersonated(u);
  const stopImpersonation = () => setImpersonated(null);

  const effectiveUser = impersonated || realUser;
  const isImpersonating = !!impersonated;

  return (
    <ImpersonationContext.Provider
      value={{ effectiveUser, realUser, isImpersonating, startImpersonation, stopImpersonation }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export const useImpersonation = () => useContext(ImpersonationContext);
