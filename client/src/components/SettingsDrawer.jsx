import { useState } from 'react';
import {
  Drawer, Box, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Divider, Alert, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api/chatService';

const ACCENT_COLORS = [
  { name: 'Blue', value: '#1976d2' },
  { name: 'Purple', value: '#7b1fa2' },
  { name: 'Teal', value: '#00796b' },
  { name: 'Orange', value: '#f57c00' },
  { name: 'Red', value: '#d32f2f' },
  { name: 'Green', value: '#388e3c' },
  { name: 'Pink', value: '#c2185b' },
  { name: 'Indigo', value: '#303f9f' },
];

export function SettingsDrawer({ open, onClose, models = [] }) {
  const { preferences, updatePreferences } = useTheme();
  const { isAuthenticated, user } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      setPasswordError('All fields are required');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError("Passwords don't match");
      return;
    }
    if (passwordForm.new.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(passwordForm.current, passwordForm.new);
      setPasswordSuccess(true);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 360, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Settings</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {isAuthenticated && user && (
          <>
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Signed in as
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Appearance
        </Typography>

        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Theme</InputLabel>
          <Select
            value={preferences.theme || 'system'}
            label="Theme"
            onChange={(e) => updatePreferences({ theme: e.target.value })}
          >
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Accent Color</InputLabel>
          <Select
            value={preferences.accentColor || '#1976d2'}
            label="Accent Color"
            onChange={(e) => updatePreferences({ accentColor: e.target.value })}
          >
            {ACCENT_COLORS.map(color => (
              <MenuItem key={color.value} value={color.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{
                    width: 20,
                    height: 20,
                    bgcolor: color.value,
                    borderRadius: 1,
                    border: '1px solid rgba(0,0,0,0.1)'
                  }} />
                  {color.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Chat Preferences
        </Typography>

        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Default Model</InputLabel>
          <Select
            value={preferences.defaultModel || ''}
            label="Default Model"
            onChange={(e) => updatePreferences({ defaultModel: e.target.value || null })}
          >
            <MenuItem value="">Use last selected</MenuItem>
            {models.map(m => (
              <MenuItem key={m.value} value={m.value}>{m.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Custom System Prompt"
          placeholder="Enter a default system prompt for new chats..."
          value={preferences.customSystemPrompt || ''}
          onChange={(e) => updatePreferences({ customSystemPrompt: e.target.value || null })}
          margin="normal"
          size="small"
          helperText="This will be used as the default persona for new chats"
        />

        {isAuthenticated && (
          <>
            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Change Password
            </Typography>

            {passwordError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPasswordError(null)}>
                {passwordError}
              </Alert>
            )}
            {passwordSuccess && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setPasswordSuccess(false)}>
                Password updated successfully!
              </Alert>
            )}

            <TextField
              fullWidth
              margin="dense"
              label="Current Password"
              type="password"
              size="small"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
            />
            <TextField
              fullWidth
              margin="dense"
              label="New Password"
              type="password"
              size="small"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
              helperText="At least 8 characters"
            />
            <TextField
              fullWidth
              margin="dense"
              label="Confirm New Password"
              type="password"
              size="small"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
            />

            <Button
              onClick={handlePasswordChange}
              variant="outlined"
              sx={{ mt: 2 }}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
}
