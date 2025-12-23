import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ModelSelector } from './ModelSelector';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { HistorySidebar } from './HistorySidebar';
import { PresetSelector } from './PresetSelector';
import { SettingsDrawer } from './SettingsDrawer';
import {
  Box, Drawer, AppBar, Toolbar, Typography, Button, Chip, Avatar,
  IconButton, Tooltip, Menu, MenuItem, ListItemIcon, Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { IPreset } from '../types';

const drawerWidth = 280;

export function ChatContainer() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { preferences } = useTheme();

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
  } = useChat(preferences.defaultModel || '', preferences.customSystemPrompt);

  const [presetSelectorOpen, setPresetSelectorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleSelectPreset = (preset: IPreset | null) => {
    startNewSession(preset);
  };

  const handleLogout = () => {
    setUserMenuAnchor(null);
    logout();
    navigate('/login');
  };

  const handleOpenAdmin = () => {
    setUserMenuAnchor(null);
    navigate('/admin');
  };

  const handleUserMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ mr: 4 }}>
            Ollama Chat
          </Typography>

          <Button
            color="secondary"
            variant="contained"
            size="small"
            onClick={() => navigate('/war')}
            sx={{ mr: 2 }}
          >
            AI War
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
            <Button
              color="inherit"
              onClick={() => setPresetSelectorOpen(true)}
              sx={{ mr: 'auto' }}
            >
              Choose Persona
            </Button>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ModelSelector
              currentModel={currentModel}
              onModelChange={setCurrentModel}
              disabled={isLoading}
              models={availableModels}
            />

            <Tooltip title="Settings">
              <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            {user && (
              <>
                <Chip
                  avatar={<Avatar sx={{ bgcolor: 'secondary.main' }}>{user.username[0].toUpperCase()}</Avatar>}
                  label={user.username}
                  onClick={handleUserMenuOpen}
                  sx={{ cursor: 'pointer', color: 'inherit' }}
                  variant="outlined"
                />
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={() => setUserMenuAnchor(null)}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </MenuItem>
                  <Divider />
                  {isAdmin && (
                    <MenuItem onClick={handleOpenAdmin}>
                      <ListItemIcon>
                        <AdminPanelSettingsIcon fontSize="small" />
                      </ListItemIcon>
                      Admin Panel
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => { setUserMenuAnchor(null); setSettingsOpen(true); }}>
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    Settings
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </>
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
          onNewChat={() => setPresetSelectorOpen(true)}
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
          px: { xs: 3, md: 6, lg: 12 },
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 2 }}>
          <MessageList messages={messages} isLoading={isLoading} activePreset={activePreset} />
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

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        models={availableModels}
      />
    </Box>
  );
}
