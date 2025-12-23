import { useState } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSend(value);
      setValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Box 
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', alignItems: 'center', p: 1, backgroundColor: '#fff' }}
    >
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Type a message... (Enter to send)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus
        multiline
        maxRows={5}
        sx={{
            '& .MuiOutlinedInput-root': {
                borderRadius: '20px',
            }
        }}
      />
      <IconButton type="submit" color="primary" disabled={disabled || !value.trim()}>
        <SendIcon />
      </IconButton>
    </Box>
  );
}
