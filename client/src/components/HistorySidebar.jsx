import { useState } from 'react';
import { List, ListItem, ListItemButton, ListItemText, Typography, Button, Divider, Box, IconButton, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

export function HistorySidebar({ sessions, activeSessionId, onSessionClick, onNewChat, onUpdateTitle }) {
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleEditClick = (session) => {
    setEditingSessionId(session.sessionId);
    setEditingTitle(session.title);
  };

  const handleCancelClick = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleSaveClick = async () => {
    if (editingTitle.trim() && editingSessionId) {
      await onUpdateTitle(editingSessionId, editingTitle);
      setEditingSessionId(null);
      setEditingTitle('');
    }
  };

  return (
    <Box sx={{ p: 2, overflowY: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
        Chat History
      </Typography>
      
      <Button 
        variant="contained"
        onClick={onNewChat}
        fullWidth
        sx={{ mb: 2 }}
      >
        + New Chat
      </Button>

      <Divider />

      <List>
        {sessions.map(session => (
          <ListItem 
            key={session.sessionId} 
            disablePadding
            secondaryAction={
              editingSessionId !== session.sessionId && (
                <IconButton edge="end" aria-label="edit" onClick={() => handleEditClick(session)}>
                  <EditIcon />
                </IconButton>
              )
            }
          >
            {editingSessionId === session.sessionId ? (
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', p: '6px 8px' }}>
                <TextField 
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  variant="standard"
                  fullWidth
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClick(); }}
                />
                <IconButton onClick={handleSaveClick}><SaveIcon /></IconButton>
                <IconButton onClick={handleCancelClick}><CancelIcon /></IconButton>
              </Box>
            ) : (
              <ListItemButton
                selected={session.sessionId === activeSessionId}
                onClick={() => onSessionClick(session.sessionId)}
              >
                <ListItemText 
                  primary={session.title}
                  secondary={new Date(session.createdAt).toLocaleDateString()}
                  primaryTypographyProps={{ noWrap: true, title: session.title }}
                />
              </ListItemButton>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
