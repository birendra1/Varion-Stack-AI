import { Box, CircularProgress, Typography } from '@mui/material';

export function LoadingIndicator() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, alignItems: 'center' }}>
      <CircularProgress size={24} />
      <Typography variant="body1" sx={{ ml: 2, color: 'text.secondary' }}>
        Assistant is thinking...
      </Typography>
    </Box>
  );
}
