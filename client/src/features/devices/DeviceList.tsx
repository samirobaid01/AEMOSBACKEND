import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import apiClient from '../../api/apiClient';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'maintenance';
  location: string;
  lastConnection: string;
  sensors: number;
}

const DeviceList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch devices
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['devices', page, rowsPerPage, search],
    queryFn: async () => {
      const response = await apiClient.get('/devices', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: search || undefined
        }
      });
      return response.data.data;
    },
  });

  const devices = data?.devices || [];
  const totalCount = data?.totalCount || 0;

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleDeviceClick = (id: string) => {
    navigate(`/devices/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading devices. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Devices</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/devices/new')}
        >
          Add Device
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Search devices"
            variant="outlined"
            size="small"
            fullWidth
            value={search}
            onChange={handleSearchChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <IconButton onClick={() => refetch()} title="Refresh list">
            <RefreshIcon />
          </IconButton>
        </Box>
        
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Last Connection</TableCell>
                <TableCell>Sensors</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No devices found. Add your first device to get started.
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device: Device) => (
                  <TableRow
                    key={device.id}
                    sx={{ 
                      '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
                    }}
                    onClick={() => handleDeviceClick(device.id)}
                  >
                    <TableCell component="th" scope="row">
                      {device.name}
                    </TableCell>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>
                      <Chip 
                        label={device.status} 
                        color={getStatusColor(device.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{device.location}</TableCell>
                    <TableCell>
                      {new Date(device.lastConnection).toLocaleString()}
                    </TableCell>
                    <TableCell>{device.sensors}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/devices/${device.id}/edit`);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show delete confirmation
                          console.log('Delete device:', device.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default DeviceList; 