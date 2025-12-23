import { useEffect, useRef } from 'react';
import { Message } from './Message';
import { LoadingIndicator } from './LoadingIndicator';
import { Box, Typography } from '@mui/material';

export function MessageList({ messages, isLoading }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box textAlign="center">
          <Typography variant="h4" gutterBottom>
            Start a conversation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select a model and send a message to get started
          </Typography>
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
