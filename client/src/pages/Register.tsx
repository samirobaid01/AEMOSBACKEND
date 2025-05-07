import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  TextField,
  Link,
  Paper,
  Box,
  Typography,
  Alert,
  Stack,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { register as registerUser, clearError } from '../state/slices/authSlice';
import analyticsService from '../services/analytics';
import type { RootState } from '../state/store';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    termsAndConditions: false
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector((state: RootState) => state.auth);
  const { enabled: analyticsEnabled } = useAppSelector((state: RootState) => state.analytics);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Track registration attempt if analytics is enabled
    if (analyticsEnabled) {
      analyticsService.trackEvent('registration_attempt', {
        has_username: Boolean(formData.userName),
        has_email: Boolean(formData.email),
        accepted_terms: formData.termsAndConditions
      });
    }
    
    // Validation
    if (!formData.userName || !formData.email || !formData.password) {
      setValidationError('Please fill in all required fields');
      
      // Track validation error
      if (analyticsEnabled) {
        analyticsService.trackEvent('registration_validation_error', {
          error: 'missing_required_fields'
        });
      }
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      
      // Track validation error
      if (analyticsEnabled) {
        analyticsService.trackEvent('registration_validation_error', {
          error: 'passwords_mismatch'
        });
      }
      return;
    }

    if (!formData.termsAndConditions) {
      setValidationError('You must accept the terms and conditions');
      
      // Track validation error
      if (analyticsEnabled) {
        analyticsService.trackEvent('registration_validation_error', {
          error: 'terms_not_accepted'
        });
      }
      return;
    }
    
    // Clear form validation errors
    setValidationError(null);
    
    // Extract confirmPassword from formData
    const { confirmPassword, ...userData } = formData;
    
    // Dispatch register action
    dispatch(registerUser(userData))
      .unwrap()
      .then(() => {
        // Track successful registration
        if (analyticsEnabled) {
          analyticsService.trackEvent('registration_success', {
            has_first_name: Boolean(formData.firstName),
            has_last_name: Boolean(formData.lastName),
            has_phone: Boolean(formData.phoneNumber)
          });
          
          // Identify the user for future tracking
          analyticsService.identify(formData.email, {
            email: formData.email,
            userName: formData.userName,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneNumber: formData.phoneNumber,
            signupDate: new Date().toISOString()
          });
        }
        
        navigate('/');
      })
      .catch(() => {
        // Track failed registration
        if (analyticsEnabled) {
          analyticsService.trackEvent('registration_failed', {
            reason: error
          });
        }
        // Error is handled in the slice
      });
  };

  // Display either validation error or backend error
  const displayError = validationError || error;

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
          backgroundImage: 'url(https://source.unsplash.com/random?environment)',
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
            my: 6,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign up for AEMOS
          </Typography>
          
          {displayError && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {displayError}
            </Alert>
          )}
          
          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  autoComplete="given-name"
                  name="firstName"
                  required
                  fullWidth
                  id="firstName"
                  label="First Name"
                  autoFocus
                  value={formData.firstName}
                  onChange={handleChange}
                />
                <TextField
                  required
                  fullWidth
                  id="lastName"
                  label="Last Name"
                  name="lastName"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </Stack>
              
              <TextField
                required
                fullWidth
                id="userName"
                label="Username"
                name="userName"
                autoComplete="username"
                value={formData.userName}
                onChange={handleChange}
              />
              
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
              />
              
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
              />
              
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              
              <TextField
                fullWidth
                name="phoneNumber"
                label="Phone Number"
                id="phoneNumber"
                autoComplete="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    name="termsAndConditions"
                    checked={formData.termsAndConditions}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label="I agree to the Terms and Conditions"
              />
            </Stack>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
            
            <Box display="flex" justifyContent="flex-end">
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Register; 