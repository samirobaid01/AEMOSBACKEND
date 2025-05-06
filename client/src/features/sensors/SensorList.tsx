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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import apiClient from '../../api/apiClient';

interface Sensor {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  deviceId: string;
  deviceName: string;
  location: string;
  lastReading: {
    value: number;
    unit: string;
    timestamp: string;
  } | null;
}

const SensorList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch sensors
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['sensors', page, rowsPerPage, search, statusFilter],
    queryFn: async () => {
      const response = await apiClient.get('/sensors', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }
      });
      return response.data.data;
    },
  });

  const sensors = data?.sensors || [];
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

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleSensorClick = (id: string) => {
    navigate(`/sensors/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'error':
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
        Error loading sensors. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Sensors</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/sensors/new')}
        >
          Add Sensor
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Search sensors"
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={handleStatusFilterChange}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
            </Select>
          </FormControl>
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
                <TableCell>Device</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Last Reading</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sensors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No sensors found. Add your first sensor to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sensors.map((sensor: Sensor) => (
                  <TableRow
                    key={sensor.id}
                    sx={{ 
                      '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
                    }}
                    onClick={() => handleSensorClick(sensor.id)}
                  >
                    <TableCell component="th" scope="row">
                      {sensor.name}
                    </TableCell>
                    <TableCell>{sensor.type}</TableCell>
                    <TableCell>
                      <Chip 
                        label={sensor.status} 
                        color={getStatusColor(sensor.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{sensor.deviceName}</TableCell>
                    <TableCell>{sensor.location}</TableCell>
                    <TableCell>
                      {sensor.lastReading ? (
                        <>
                          {sensor.lastReading.value} {sensor.lastReading.unit}
                          <Typography variant="caption" display="block" color="text.secondary">
                            {new Date(sensor.lastReading.timestamp).toLocaleString()}
                          </Typography>
                        </>
                      ) : (
                        'No data'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sensors/${sensor.id}/edit`);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show delete confirmation
                          console.log('Delete sensor:', sensor.id);
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

export default SensorList; 