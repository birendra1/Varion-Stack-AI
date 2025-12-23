import { useEffect, useRef } from 'react';
import { Message } from './Message';
import { LoadingIndicator } from './LoadingIndicator';
import { Box, Typography, Chip, Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

export function MessageList({ messages, isLoading, activePreset }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Box textAlign="center" sx={{ maxWidth: 400 }}>
          {activePreset ? (
            <>
              <Avatar sx={{ width: 64, height: 64, margin: '0 auto 16px', bgcolor: 'secondary.main' }}>
                <PersonIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {activePreset.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {activePreset.description}
              </Typography>
              <Chip label="Persona Active" color="secondary" variant="outlined" size="small" />
            </>
          ) : (
            <>
              <Typography variant="h4" gutterBottom>
                Start a conversation
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Select a model and send a message to get started
              </Typography>
            </>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <>
      {messages.map((message, index) => (
        <Message key={index} message={message} />
      ))}
      {isLoading && <LoadingIndicator />}
      <div ref={messagesEndRef} />
    </>
  );
}
