import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleTheme } from '../../store/slices/uiSlice';
import LanguageSelector from '../../components/LanguageSelector';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state) => state.ui);

  const handleThemeChange = () => {
    dispatch(toggleTheme());
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('settings.title')}
      </Typography>

      <Grid container spacing={3}>
        {/* Preferences Section */}
        <Grid size={{ xs: 12, md: 6 }}>
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
            <Box>
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
          </Paper>
        </Grid>

        {/* Account Settings Section */}
        <Grid size={{ xs: 12, md: 6 }}>
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings; 