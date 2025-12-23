import { useState, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { ModelSelector } from './ModelSelector';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { HistorySidebar } from './HistorySidebar';
import { PresetSelector } from './PresetSelector';
import { LoginDialog } from './LoginDialog';
import { Box, Drawer, AppBar, Toolbar, Typography, CssBaseline, Button, Chip, Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { getAuthToken, setAuthToken } from '../api/chatService';
import { jwtDecode } from 'jwt-decode';

import { useNavigate } from 'react-router-dom';

const drawerWidth = 280;

export function ChatContainer() {
  const navigate = useNavigate();
  const {
    messages,
    currentModel,
    isLoading,
    sendMessage,
    setCurrentModel,
    startNewSession,
    sessionId,
    sessions,
    setSessionId,
    updateTitle,
    deleteChatSession,
    categories,
    presets,
    activePreset,
    availableModels,
  } = useChat();

  const [presetSelectorOpen, setPresetSelectorOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ username: decoded.username, role: decoded.role });
      } catch (e) {
        setAuthToken(null);
      }
    }
  }, []);

  const handleSelectPreset = (preset) => {
    startNewSession(preset);
  };

  const handleLoginSuccess = (data) => {
      setAuthToken(data.token);
      setUser({ username: data.username, role: data.role });
      // Reload page to refresh socket/history context if needed, or just let useChat handle it (it might need a trigger)
      window.location.reload(); 
  };

  const handleLogout = () => {
      setAuthToken(null);
      setUser(null);
      window.location.reload();
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ mr: 4 }}>
            Ollama Chat
          </Typography>
          
          <Button color="secondary" variant="contained" size="small" onClick={() => navigate('/war')} sx={{ mr: 2 }}>
             ⚔️ AI War
          </Button>

          {activePreset ? (
             <Chip 
                avatar={<Avatar><PersonIcon /></Avatar>} 
                label={`Talking with: ${activePreset.name}`} 
                color="secondary" 
                variant="filled"
                sx={{ mr: 'auto', fontSize: '1rem', px: 1 }}
                onClick={() => setPresetSelectorOpen(true)}
             />
          ) : (
            <Button color="inherit" onClick={() => setPresetSelectorOpen(true)} sx={{ mr: 'auto' }}>
                Choose Persona
            </Button>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ModelSelector
                currentModel={currentModel}
                onModelChange={setCurrentModel}
                disabled={isLoading}
                models={availableModels}
            />
            {user ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">Hi, {user.username}</Typography>
                    <Button color="inherit" size="small" onClick={handleLogout}>Logout</Button>
                </Box>
            ) : (
                <Button color="inherit" onClick={() => setLoginOpen(true)}>Login</Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <HistorySidebar 
          sessions={sessions}
          activeSessionId={sessionId}
          onSessionClick={setSessionId}
          onNewChat={startNewSession}
          onUpdateTitle={updateTitle}
          onDeleteSession={deleteChatSession}
        />
      </Drawer>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          bgcolor: 'background.default', 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          px: { xs: 3, md: 6, lg: 12 }, // Increased responsive horizontal padding
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 2 }}>
          <MessageList messages={messages} isLoading={isLoading} />
        </Box>
        <ChatInput 
          onSend={sendMessage} 
          disabled={isLoading} 
        />
      </Box>

      <PresetSelector
        open={presetSelectorOpen}
        onClose={() => setPresetSelectorOpen(false)}
        categories={categories}
        presets={presets}
        onSelectPreset={handleSelectPreset}
      />
      
      <LoginDialog 
        open={loginOpen} 
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </Box>
  );
}