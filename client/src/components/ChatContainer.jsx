import { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { ModelSelector } from './ModelSelector';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { HistorySidebar } from './HistorySidebar';
import { PresetSelector } from './PresetSelector';
import { Box, Drawer, AppBar, Toolbar, Typography, CssBaseline, Button } from '@mui/material';

const drawerWidth = 280;

export function ChatContainer() {
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
    categories,
    presets,
    activePreset,
  } = useChat();

  const [presetSelectorOpen, setPresetSelectorOpen] = useState(false);

  const handleSelectPreset = (preset) => {
    startNewSession(preset);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Ollama Chat {activePreset && `(${activePreset.name})`}
          </Typography>
          <Button color="inherit" onClick={() => setPresetSelectorOpen(true)}>
            Choose Persona
          </Button>
          <ModelSelector
            currentModel={currentModel}
            onModelChange={setCurrentModel}
            disabled={isLoading}
          />
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
        />
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          <MessageList messages={messages} isLoading={isLoading} />
        </Box>
        <ChatInput 
          onSend={sendMessage} 
          disabled={isLoading || !sessionId} 
        />
      </Box>

      <PresetSelector
        open={presetSelectorOpen}
        onClose={() => setPresetSelectorOpen(false)}
        categories={categories}
        presets={presets}
        onSelectPreset={handleSelectPreset}
      />
    </Box>
  );
}