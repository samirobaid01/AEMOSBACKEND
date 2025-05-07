import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { StatusChip } from '../common/StatusChip';
import type { Device, DeviceListFilters } from '../../types/device';

interface DeviceListProps {
  devices: Device[];
  totalCount: number;
  filters: DeviceListFilters;
  isLoading: boolean;
  error: Error | null;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
  onDeviceClick: (id: string) => void;
  onAddDevice: () => void;
  onEditDevice: (id: string) => void;
  onDeleteDevice: (id: string) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  totalCount,
  filters,
  isLoading,
  error,
  onPageChange,
  onRowsPerPageChange,
  onSearchChange,
  onRefresh,
  onDeviceClick,
  onAddDevice,
  onEditDevice,
  onDeleteDevice,
}) => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Devices</Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddDevice}
          >
            Add Device
          </Button>
        </Box>
      </Box>

      <Box mb={3}>
        <TextField
          label="Search devices"
          variant="outlined"
          size="small"
          value={filters.search}
          onChange={onSearchChange}
          fullWidth
        />
      </Box>

      {error && (
        <Box mb={3}>
          <Alert severity="error">
            {error.message || 'An error occurred while loading devices'}
          </Alert>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Connection</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : devices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  No devices found
                </TableCell>
              </TableRow>
            ) : (
              devices.map((device) => (
                <TableRow
                  key={device.id}
                  hover
                  onClick={() => onDeviceClick(device.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.type}</TableCell>
                  <TableCell>{device.location}</TableCell>
                  <TableCell>
                    <StatusChip status={device.status} />
                  </TableCell>
                  <TableCell>
                    {new Date(device.lastConnection).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditDevice(device.id);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDevice(device.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={filters.page}
        onPageChange={onPageChange}
        rowsPerPage={filters.rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Box>
  );
}; 