import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert,
  Stepper, Step, StepLabel, InputAdornment, IconButton, Link,
  CircularProgress
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';
import { registerInit, registerVerify, resendOTP } from '../api/chatService';

const steps = ['Account Details', 'Verify Email'];

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      await registerInit(formData.username, formData.email, formData.password);
      setActiveStep(1);
      startResendCountdown();
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await registerVerify(
        formData.username,
        formData.email,
        formData.password,
        otp
      );
      login(data);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const startResendCountdown = () => {
    setResendCountdown(60);
    const timer = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await resendOTP(formData.email, 'registration');
      startResendCountdown();
    } catch (err) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={8} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Join Ollama Chat today
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {activeStep === 0 && (
            <Box component="form" onSubmit={handleStep1Submit}>
              <TextField
                fullWidth
                margin="normal"
                label="Username"
                value={formData.username}
                onChange={handleChange('username')}
                required
                autoFocus
                autoComplete="username"
              />

              <TextField
                fullWidth
                margin="normal"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                required
                autoComplete="email"
              />

              <TextField
                fullWidth
                margin="normal"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                required
                helperText="At least 8 characters"
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                required
                autoComplete="new-password"
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Sending Code...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </Box>
          )}

          {activeStep === 1 && (
            <Box component="form" onSubmit={handleVerifySubmit}>
              <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
                We've sent a verification code to{' '}
                <strong>{formData.email}</strong>
              </Typography>

              <TextField
                fullWidth
                margin="normal"
                label="Verification Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                inputProps={{
                  maxLength: 6,
                  style: { letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.5rem' }
                }}
                placeholder="000000"
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                sx={{ mt: 3, py: 1.5 }}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Verifying...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <Button
                fullWidth
                onClick={handleResend}
                disabled={isLoading || resendCountdown > 0}
                sx={{ mt: 2 }}
              >
                {resendCountdown > 0
                  ? `Resend Code (${resendCountdown}s)`
                  : 'Resend Code'
                }
              </Button>

              <Button
                fullWidth
                onClick={() => setActiveStep(0)}
                sx={{ mt: 1 }}
                color="inherit"
              >
                Back to Details
              </Button>
            </Box>
          )}

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" underline="hover">
                Sign In
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
