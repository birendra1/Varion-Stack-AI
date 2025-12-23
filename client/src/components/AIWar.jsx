import { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, AppBar, Toolbar, IconButton, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { ModelSelector } from './ModelSelector';
import { ChatInput } from './ChatInput';
import { Message } from './Message';
import { fetchModels, sendChatMessage } from '../api/chatService';

export function AIWar() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [modelA, setModelA] = useState('');
  const [modelB, setModelB] = useState('');
  
  const [messagesA, setMessagesA] = useState([]);
  const [messagesB, setMessagesB] = useState([]);
  
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const m = await fetchModels();
        setModels(m);
        if (m.length > 0) {
          setModelA(m[0].value);
          setModelB(m.length > 1 ? m[1].value : m[0].value);
        }
      } catch (e) {
        console.error("Failed to load models", e);
      }
    }
    load();
  }, []);

  const handleSend = async (content, files = []) => {
    if (!content.trim() && files.length === 0) return;

    const userMsg = { role: 'user', content, attachments: files.map(f => ({ filename: f.name })), timestamp: new Date().toISOString() };
    
    // Add user message to both panels
    setMessagesA(prev => [...prev, userMsg]);
    setMessagesB(prev => [...prev, userMsg]);
    
    setLoadingA(true);
    setLoadingB(true);

    // Trigger Model A
    const placeholderA = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
    setMessagesA(prev => [...prev, placeholderA]);
    
    sendChatMessage(modelA, [...messagesA, userMsg], null, files, (chunk) => {
        if (chunk.message?.content) {
            setMessagesA(prev => {
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                newMsgs[newMsgs.length - 1] = { ...last, content: last.content + chunk.message.content };
                return newMsgs;
            });
        }
        if (chunk.done) setLoadingA(false);
    }).catch(() => setLoadingA(false));

    // Trigger Model B
    const placeholderB = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
    setMessagesB(prev => [...prev, placeholderB]);

    sendChatMessage(modelB, [...messagesB, userMsg], null, files, (chunk) => {
        if (chunk.message?.content) {
            setMessagesB(prev => {
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                newMsgs[newMsgs.length - 1] = { ...last, content: last.content + chunk.message.content };
                return newMsgs;
            });
        }
        if (chunk.done) setLoadingB(false);
    }).catch(() => setLoadingB(false));
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            AI War: Model Comparison
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: 'hidden', p: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Model A Panel */}
          <Grid item xs={12} md={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper elevation={3} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight="bold">Contender A</Typography>
                <ModelSelector currentModel={modelA} onModelChange={setModelA} models={models} />
            </Paper>
            <Paper elevation={3} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#ffffff' }}>
                {messagesA.length === 0 && <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>Select a model and start chatting to see responses.</Typography>}
                {messagesA.map((msg, i) => (
                    <Message key={i} message={msg} />
                ))}
                {loadingA && <CircularProgress size={20} sx={{ mt: 1, ml: 2 }} />}
            </Paper>
          </Grid>

          {/* Model B Panel */}
          <Grid item xs={12} md={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper elevation={3} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight="bold">Contender B</Typography>
                <ModelSelector currentModel={modelB} onModelChange={setModelB} models={models} />
            </Paper>
            <Paper elevation={3} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#ffffff' }}>
                {messagesB.length === 0 && <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>Select a model and start chatting to see responses.</Typography>}
                {messagesB.map((msg, i) => (
                    <Message key={i} message={msg} />
                ))}
                 {loadingB && <CircularProgress size={20} sx={{ mt: 1, ml: 2 }} />}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 2 }}>
         <ChatInput onSend={handleSend} disabled={loadingA || loadingB} />
      </Container>
    </Box>
  );
}
