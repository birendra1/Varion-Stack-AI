import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { fetchUserPreferences, updateUserPreferences } from '../api/chatService';
import { useAuth } from './AuthContext';
import { IThemeContext, IUserPreferences } from '../types';

const ThemeContext = createContext<IThemeContext | undefined>(undefined);

const defaultPreferences: IUserPreferences = {
  theme: 'system',
  accentColor: '#1976d2',
  defaultModel: null,
  customSystemPrompt: null
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<IUserPreferences>(defaultPreferences);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);

  // Load preferences when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingPrefs(true);
      fetchUserPreferences()
        .then(prefs => {
          setPreferences(prev => ({ 
            ...prev, 
            ...prefs,
            defaultModel: prefs.defaultModel === undefined ? null : prefs.defaultModel, // Ensure null if undefined
            customSystemPrompt: prefs.customSystemPrompt === undefined ? null : prefs.customSystemPrompt // Ensure null if undefined
          }));
        })
        .catch(console.error)
        .finally(() => setIsLoadingPrefs(false));
    } else {
      // Reset to defaults when logged out
      setPreferences(defaultPreferences);
    }
  }, [isAuthenticated]);

  const updatePreferences = async (updates: Partial<IUserPreferences>) => {
    // Optimistic update
    const oldPrefs = preferences;
    const newPrefs = { 
      ...preferences, 
      ...updates,
      defaultModel: updates.defaultModel === undefined ? preferences.defaultModel : updates.defaultModel,
      customSystemPrompt: updates.customSystemPrompt === undefined ? preferences.customSystemPrompt : updates.customSystemPrompt
    };
    setPreferences(newPrefs);

    if (isAuthenticated) {
      try {
        const savedPrefs = await updateUserPreferences(updates);
        setPreferences(prev => ({ ...prev, ...savedPrefs }));
      } catch (err) {
        console.error('Failed to save preferences:', err);
        // Revert on error
        setPreferences(oldPrefs);
      }
    }
  };

  // Determine effective theme mode
  const effectiveMode = useMemo<'light' | 'dark'>(() => {
    if (preferences.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return preferences.theme as 'light' | 'dark';
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

  const value: IThemeContext = {
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
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
