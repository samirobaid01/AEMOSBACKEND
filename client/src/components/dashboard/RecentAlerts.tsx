import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  NotificationsOutlined as AlertIcon,
  ErrorOutline as ErrorIcon,
  WarningAmber as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import type { Alert as AlertType } from '../../types/dashboard';

interface RecentAlertsProps {
  alerts?: AlertType[];
  isLoading?: boolean;
  error?: string | null;
}

export const RecentAlerts: React.FC<RecentAlertsProps> = ({
  alerts,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  const getAlertIcon = (severity?: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <AlertIcon />;
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <AlertIcon sx={{ mr: 1 }} />
        Recent Alerts
      </Typography>

      {alerts && alerts.length > 0 ? (
        <List>
          {alerts.map((alert) => (
            <ListItem key={alert.id}>
              <ListItemIcon>
                {getAlertIcon(alert.severity)}
              </ListItemIcon>
              <ListItemText
                primary={alert.message}
                secondary={new Date(alert.timestamp).toLocaleString()}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body1" color="text.secondary">
          No recent alerts
        </Typography>
      )}
    </Paper>
  );
}; 