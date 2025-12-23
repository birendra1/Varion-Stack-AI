import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { fetchUserPreferences, updateUserPreferences } from '../api/chatService';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

const defaultPreferences = {
  theme: 'system',
  accentColor: '#1976d2',
  defaultModel: null,
  customSystemPrompt: null
};

export function ThemeProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);

  // Load preferences when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingPrefs(true);
      fetchUserPreferences()
        .then(prefs => {
          setPreferences(prev => ({ ...prev, ...prefs }));
        })
        .catch(console.error)
        .finally(() => setIsLoadingPrefs(false));
    } else {
      // Reset to defaults when logged out
      setPreferences(defaultPreferences);
    }
  }, [isAuthenticated]);

  const updatePreferences = async (updates) => {
    // Optimistic update
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);

    if (isAuthenticated) {
      try {
        const savedPrefs = await updateUserPreferences(updates);
        setPreferences(prev => ({ ...prev, ...savedPrefs }));
      } catch (err) {
        console.error('Failed to save preferences:', err);
        // Revert on error
        setPreferences(preferences);
      }
    }
  };

  // Determine effective theme mode
  const effectiveMode = useMemo(() => {
    if (preferences.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return preferences.theme;
  }, [preferences.theme]);

  // Create MUI theme
  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode: effectiveMode,
        primary: { main: preferences.accentColor },
        background: effectiveMode === 'dark' ? {
          default: '#121212',
          paper: '#1e1e1e'
        } : {
          default: '#f5f5f5',
          paper: '#ffffff'
        }
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              scrollbarColor: effectiveMode === 'dark' ? '#6b6b6b #2b2b2b' : '#c1c1c1 #f5f5f5',
              '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                width: 8,
              },
              '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                borderRadius: 8,
                backgroundColor: effectiveMode === 'dark' ? '#6b6b6b' : '#c1c1c1',
              },
            },
          },
        },
      },
    });
  }, [effectiveMode, preferences.accentColor]);

  const value = {
    preferences,
    updatePreferences,
    isLoadingPrefs,
    effectiveMode
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
