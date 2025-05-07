import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';

interface ErrorAlertProps {
  title?: string;
  message: string | React.ReactNode;
  severity?: 'error' | 'warning' | 'info' | 'success';
  onClose?: () => void;
  center?: boolean;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title,
  message,
  severity = 'error',
  onClose,
  center = false,
}) => {
  const alert = (
    <Alert severity={severity} onClose={onClose} sx={{ maxWidth: 600, width: '100%' }}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  );

  if (!center) {
    return alert;
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      width="100%"
      p={2}
    >
      {alert}
    </Box>
  );
}; 