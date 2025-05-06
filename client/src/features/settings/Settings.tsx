import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  Stack,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleTheme } from '../../store/slices/uiSlice';
import { setAnalyticsEnabled } from '../../store/slices/analyticsSlice';
import { resetWalkthrough, setEnabled as setWalkthroughEnabled } from '../../store/slices/walkthroughSlice';
import LanguageSelector from '../../components/LanguageSelector';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state) => state.ui);
  const { enabled: analyticsEnabled } = useAppSelector((state) => state.analytics);
  const { enabled: walkthroughEnabled, completed: walkthroughCompleted } = useAppSelector((state: any) => state.walkthrough);

  const handleThemeChange = () => {
    dispatch(toggleTheme());
  };

  const handleAnalyticsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setAnalyticsEnabled(event.target.checked));
  };

  const handleWalkthroughEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setWalkthroughEnabled(event.target.checked));
  };

  const handleResetWalkthrough = () => {
    dispatch(resetWalkthrough());
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('settings.title')}
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Preferences Section */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('settings.preferences')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Language Setting */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.language')}
              </Typography>
              <LanguageSelector sx={{ minWidth: 200 }} />
            </Box>

            {/* Theme Setting */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.theme.title')}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={theme === 'dark'}
                    onChange={handleThemeChange}
                    color="primary"
                  />
                }
                label={t(
                  theme === 'dark'
                    ? 'settings.theme.dark'
                    : 'settings.theme.light'
                )}
              />
            </Box>

            {/* Analytics Setting */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.analytics.title', 'Analytics')}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={analyticsEnabled}
                    onChange={handleAnalyticsChange}
                    color="primary"
                  />
                }
                label={t(
                  analyticsEnabled
                    ? 'settings.analytics.enabled'
                    : 'settings.analytics.disabled',
                  analyticsEnabled ? 'Enabled' : 'Disabled'
                )}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t(
                  'settings.analytics.description',
                  'Help us improve by allowing anonymous usage data collection.'
                )}
              </Typography>
            </Box>

            {/* Walkthrough Settings */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.walkthrough.title', 'Application Walkthrough')}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={walkthroughEnabled}
                    onChange={handleWalkthroughEnabledChange}
                    color="primary"
                  />
                }
                label={t(
                  walkthroughEnabled
                    ? 'settings.walkthrough.enabled'
                    : 'settings.walkthrough.disabled',
                  walkthroughEnabled ? 'Enabled' : 'Disabled'
                )}
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleResetWalkthrough}
                  size="small"
                  disabled={!walkthroughCompleted}
                >
                  {t('settings.walkthrough.reset', 'Reset Walkthrough')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t(
                    'settings.walkthrough.description',
                    'Reset the application walkthrough to see it again on your next login.'
                  )}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Account Settings Section */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('settings.account')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {/* Account settings content here */}
            <Typography variant="body2">
              Account settings will be implemented in a future update.
            </Typography>
          </Paper>

          {/* Notification Settings */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('settings.notifications')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {/* Notification settings content here */}
            <Typography variant="body2">
              Notification settings will be implemented in a future update.
            </Typography>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};

export default Settings; 