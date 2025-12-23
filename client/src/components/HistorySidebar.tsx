import { useState, MouseEvent } from 'react';
import { List, ListItem, ListItemButton, ListItemText, Typography, Button, Divider, Box, IconButton, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import { ISessionListItem } from '../types';

interface HistorySidebarProps {
  sessions: ISessionListItem[];
  activeSessionId: string | null;
  onSessionClick: (sessionId: string) => void;
  onNewChat: () => void;
  onUpdateTitle: (sessionId: string, title: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function HistorySidebar({ sessions, activeSessionId, onSessionClick, onNewChat, onUpdateTitle, onDeleteSession }: HistorySidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  const handleEditClick = (e: MouseEvent, session: ISessionListItem) => {
    e.stopPropagation();
    setEditingSessionId(session.sessionId);
    setEditingTitle(session.title);
  };

  const handleDeleteClick = async (e: MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat?")) {
      await onDeleteSession(sessionId);
    }
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
    <Box sx={{ p: 1.5, overflowY: 'auto' }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, textAlign: 'center', fontWeight: 'bold' }}>
        Chat History
      </Typography>
      
      <Button
        variant="contained"
        onClick={handleNewChat}
        fullWidth
        size="small"
        sx={{ mb: 1.5 }}
      >
        + New Chat
      </Button>

      <Divider sx={{ mb: 1 }} />

      <List dense>
        {sessions.map(session => (
          <ListItem 
            key={session.sessionId} 
            disablePadding
            secondaryAction={
              editingSessionId !== session.sessionId && (
                <Box>
                  <IconButton edge="end" aria-label="edit" size="small" onClick={(e) => handleEditClick(e, session)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" size="small" onClick={(e) => handleDeleteClick(e, session.sessionId)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )
            }
            sx={{ mb: 0.5 }}
          >
            {editingSessionId === session.sessionId ? (
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', p: '4px 6px' }}>
                <TextField 
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  variant="standard"
                  fullWidth
                  autoFocus
                  size="small"
                  inputProps={{ style: { fontSize: '0.9rem' } }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClick(); }}
                />
                <IconButton onClick={handleSaveClick} size="small"><SaveIcon fontSize="small" /></IconButton>
                <IconButton onClick={handleCancelClick} size="small"><CancelIcon fontSize="small" /></IconButton>
              </Box>
            ) : (
              <ListItemButton
                selected={session.sessionId === activeSessionId}
                onClick={() => onSessionClick(session.sessionId)}
                sx={{ borderRadius: 1, py: 0.5 }}
              >
                <ListItemText 
                  primary={session.title}
                  secondary={new Date(session.createdAt).toLocaleDateString()}
                  primaryTypographyProps={{ noWrap: true, title: session.title, fontSize: '0.9rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  sx={{ pr: 6, my: 0 }} 
                />
              </ListItemButton>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
