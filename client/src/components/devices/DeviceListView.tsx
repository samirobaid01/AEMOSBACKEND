import React from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
}

interface DeviceListViewProps {
  devices: Device[];
  isLoading?: boolean;
  error?: string | null;
  onViewDevice: (id: string) => void;
  onEditDevice: (id: string) => void;
  onDeleteDevice: (id: string) => void;
}

const DeviceListView: React.FC<DeviceListViewProps> = ({
  devices,
  isLoading,
  error,
  onViewDevice,
  onEditDevice,
  onDeleteDevice,
}) => {
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Devices
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <List>
          {devices.map((device) => (
            <ListItem
              key={device.id}
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': {
                  borderBottom: 'none',
                },
              }}
            >
              <ListItemText
                primary={device.name}
                secondary={`Type: ${device.type} • Status: ${device.status} • Last seen: ${new Date(
                  device.lastSeen
                ).toLocaleString()}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="view"
                  onClick={() => onViewDevice(device.id)}
                  sx={{ mr: 1 }}
                >
                  <ViewIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => onEditDevice(device.id)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => onDeleteDevice(device.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default DeviceListView; 