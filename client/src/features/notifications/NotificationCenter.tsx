import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Button,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationCenter: React.FC = () => {
  // Remove or comment out the unused navigate constant
  // const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead, 
    removeNotification 
  } = useNotifications();
  const [tabValue, setTabValue] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTypeFilterChange = (event: SelectChangeEvent) => {
    setTypeFilter(event.target.value);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClick = (id: string) => {
    markAsRead(id);
    // Navigate to related content based on notification type
    // This would be enhanced with actual routing logic
  };

  // Filter notifications based on tab and type filter
  const filteredNotifications = notifications.filter(notification => {
    // First filter by read/unread based on tab
    const readFilter = tabValue === 0 ? true : tabValue === 1 ? !notification.read : false;
    
    // Then filter by type if a type filter is selected
    const typeFilterMatch = typeFilter === 'all' || notification.type === typeFilter;
    
    return readFilter && typeFilterMatch;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <InfoIcon color="primary" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'success':
        return <CheckCircleIcon color="success" />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading notifications: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4">Notifications</Typography>
        <Button
          variant="contained"
          onClick={handleMarkAllAsRead}
          disabled={!notifications.some(n => !n.read)}
        >
          Mark All as Read
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All" />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography>Unread</Typography>
                {notifications.some(n => !n.read) && (
                  <Chip 
                    label={notifications.filter(n => !n.read).length} 
                    color="error" 
                    size="small" 
                    sx={{ ml: 1 }} 
                  />
                )}
              </Box>
            } 
          />
        </Tabs>
      </Paper>

      <Box sx={{ display: 'flex', mb: 2, justifyContent: 'flex-end' }}>
        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={typeFilter}
            label="Filter by Type"
            onChange={handleTypeFilterChange}
            startAdornment={<FilterListIcon sx={{ mr: 1 }} />}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="error">Error</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper>
        {filteredNotifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tabValue === 1 
                ? "You don't have any unread notifications."
                : "You don't have any notifications yet."}
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    bgcolor: notification.read ? undefined : 'action.hover',
                    py: 2,
                  }}
                  secondaryAction={
                    <IconButton 
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                  onClick={() => handleClick(notification.id)}
                >
                  <ListItemIcon>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {notification.title}
                        </Typography>
                        <Chip 
                          label={getNotificationTypeLabel(notification.type)} 
                          size="small"
                          color={notification.type as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" component="div" color="text.secondary">
                          {new Date(notification.createdAt).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default NotificationCenter; 