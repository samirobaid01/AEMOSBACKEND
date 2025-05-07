import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid as MuiGrid,
  Box,
  Switch,
  FormControlLabel,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';

const Grid = MuiGrid as any; // Temporary type assertion to fix Grid issues

interface SettingsViewProps {
  theme: 'light' | 'dark';
  language: 'en' | 'es';
  analyticsEnabled: boolean;
  notificationsEnabled: boolean;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLanguageChange: (language: 'en' | 'es') => void;
  onAnalyticsChange: (enabled: boolean) => void;
  onNotificationsChange: (enabled: boolean) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  language,
  analyticsEnabled,
  notificationsEnabled,
  onThemeChange,
  onLanguageChange,
  onAnalyticsChange,
  onNotificationsChange,
}) => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Appearance
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={theme === 'dark'}
                  onChange={(e) => onThemeChange(e.target.checked ? 'dark' : 'light')}
                />
              }
              label="Dark Mode"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Language
            </Typography>
            <FormControl variant="outlined" sx={{ minWidth: 200 }}>
              <InputLabel id="language-select-label">Language</InputLabel>
              <Select
                labelId="language-select-label"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as 'en' | 'es')}
                label="Language"
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Español</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationsEnabled}
                  onChange={(e) => onNotificationsChange(e.target.checked)}
                />
              }
              label="Enable Notifications"
            />
            {notificationsEnabled && (
              <Alert severity="info" sx={{ mt: 2 }}>
                You will receive notifications about device status changes and alerts
              </Alert>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Privacy
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={analyticsEnabled}
                  onChange={(e) => onAnalyticsChange(e.target.checked)}
                />
              }
              label="Allow Analytics"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Help us improve by sending anonymous usage data
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default SettingsView; 