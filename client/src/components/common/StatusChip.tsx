import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';

type Status = 'online' | 'offline' | 'warning' | 'error' | 'active' | 'inactive';

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: Status;
  size?: 'small' | 'medium';
}

const statusConfig: Record<Status, { color: ChipProps['color']; label: string }> = {
  online: { color: 'success', label: 'Online' },
  offline: { color: 'error', label: 'Offline' },
  warning: { color: 'warning', label: 'Warning' },
  error: { color: 'error', label: 'Error' },
  active: { color: 'success', label: 'Active' },
  inactive: { color: 'default', label: 'Inactive' },
};

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'small',
  ...props
}) => {
  const config = statusConfig[status];

  return (
    <Chip
      size={size}
      color={config.color}
      label={config.label}
      {...props}
    />
  );
}; 