import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getAuthToken, setAuthToken } from '../api/chatService';
import { IUser, IAuthContext } from '../types';

interface DecodedToken {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  exp: number;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          setUser({
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
          });
        } else {
          // Token expired, clear it
          setAuthToken(null);
        }
      } catch (e) {
        // Invalid token, clear it
        setAuthToken(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (data: { token: string }) => {
    setAuthToken(data.token);
    const decoded = jwtDecode<DecodedToken>(data.token);
    setUser({
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    });
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const value: IAuthContext = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
