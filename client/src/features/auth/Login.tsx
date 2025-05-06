import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Link,
  Paper,
  Box,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, clearError } from '../../store/slices/authSlice';
import analyticsService from '../../services/analytics';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector(state => state.auth);
  const { enabled: analyticsEnabled } = useAppSelector(state => state.analytics);
  const navigate = useNavigate();

  // Clear any errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!email || !password) {
      // You can dispatch an action to set a form error here if you want
      return;
    }
    
    // Track login attempt if analytics is enabled
    if (analyticsEnabled) {
      analyticsService.trackEvent('login_attempt', {
        method: 'email',
        has_email: Boolean(email),
        remember_me: rememberMe
      });
    }
    
    // Dispatch login action
    dispatch(login({ email, password }))
      .unwrap()
      .then(() => {
        // Track successful login
        if (analyticsEnabled) {
          analyticsService.trackEvent('login_success', {
            method: 'email'
          });
          
          // Identify the user for future tracking
          analyticsService.identify(email, {
            email,
            $name: email.split('@')[0],
            loginDate: new Date().toISOString()
          });
        }
        
        navigate('/');
      })
      .catch(() => {
        // Track failed login
        if (analyticsEnabled) {
          analyticsService.trackEvent('login_failed', {
            method: 'email',
            reason: error
          });
        }
        // Error is handled in the slice
      });
  };

  return (
    <Box sx={{ 
      display: 'flex',
      height: '100vh',
      flexDirection: { xs: 'column', sm: 'row' }
    }}>
      <Box
        sx={{
          flex: { xs: 0, sm: 7 },
          display: { xs: 'none', sm: 'block' },
          backgroundImage: 'url(https://source.unsplash.com/random?hydroponics)',
          backgroundRepeat: 'no-repeat',
          backgroundColor: (t: Theme) =>
            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Box 
        component={Paper} 
        elevation={6}
        square
        sx={{ flex: { xs: 12, sm: 5 } }}
      >
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in to AEMOS
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FormControlLabel
              control={
                <Checkbox 
                  value="remember" 
                  color="primary"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)} 
                />
              }
              label="Remember me"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Stack direction="row" justifyContent="space-between">
              <Link component={RouterLink} to="/forgot-password" variant="body2">
                Forgot password?
              </Link>
              <Link component={RouterLink} to="/signup" variant="body2">
                {"Don't have an account? Sign Up"}
              </Link>
            </Stack>
            <Box mt={5}>
              <Typography variant="body2" color="text.secondary" align="center">
                {'Copyright © AEMOS '}
                {new Date().getFullYear()}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login; 