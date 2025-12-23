import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getAuthToken, setAuthToken } from '../api/chatService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
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

  const login = (data) => {
    setAuthToken(data.token);
    const decoded = jwtDecode(data.token);
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

  const value = {
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
