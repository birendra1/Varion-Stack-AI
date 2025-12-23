import { Paper, Typography, Box, Avatar } from '@mui/material';

export function Message({ message }) {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '80%' }}>
        {!isUser && (
          <Avatar sx={{ bgcolor: 'primary.main', mr: 1.5 }}>
            A
          </Avatar>
        )}
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            bgcolor: isUser ? '#E3F2FD' : '#F3F3F3',
            border: 'none',
            borderRadius: '10px',
            wordWrap: 'break-word',
          }}
        >
          <Typography variant="body1">{message.content}</Typography>
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 1, color: 'text.secondary' }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </Typography>
        </Paper>
        {isUser && (
          <Avatar sx={{ bgcolor: 'secondary.main', ml: 1.5 }}>
            U
          </Avatar>
        )}
      </Box>
    </Box>
  );
}
