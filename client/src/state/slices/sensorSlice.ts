import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Sensor, SensorListFilters, SensorListResponse } from '../../types/sensor';
import type { ApiResponse } from '../../types/api';
import { sensorService } from '../../services/api/sensorService';

// Define the state structure
interface SensorState {
  sensors: Sensor[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  filters: SensorListFilters;
}

// Initial state
const initialState: SensorState = {
  sensors: [],
  totalCount: 0,
  loading: false,
  error: null,
  filters: {
    page: 0,
    rowsPerPage: 10,
    search: '',
  },
};

// Helper function to safely extract data from response based on API format
const extractResponseData = <T>(response: any): T => {
  console.log('[API Debug] Response data structure:', response);
  
  // Try to extract data based on different possible response structures
  if (response.data) {
    if (response.data.data) {
      return response.data.data;
    }
    return response.data;
  }
  
  return response;
};

// Async thunks for sensor actions
export const fetchSensors = createAsyncThunk(
  'sensors/fetchSensors',
  async (filters: SensorListFilters, { rejectWithValue }) => {
    try {
      console.log('[Sensors API] Fetching sensors with filters:', filters);
      const response = await sensorService.getSensors(filters);
      console.log('[Sensors API] Response received:', response);
      const result = extractResponseData<SensorListResponse>(response);
      
      // If we don't have a proper sensors array, create a default structure
      if (!result.sensors && Array.isArray(result)) {
        return {
          sensors: result,
          totalCount: result.length
        };
      }
      
      return result;
    } catch (err: any) {
      console.error('[Sensors API] Error fetching sensors:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch sensors');
    }
  }
);

export const fetchSensorById = createAsyncThunk(
  'sensors/fetchSensorById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await sensorService.getSensor(id);
      return extractResponseData<Sensor>(response);
    } catch (err: any) {
      console.error('Error fetching sensor details:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch sensor details');
    }
  }
);

export const createSensor = createAsyncThunk(
  'sensors/createSensor',
  async (sensor: Omit<Sensor, 'id'>, { rejectWithValue, dispatch }) => {
    try {
      const response = await sensorService.createSensor(sensor);
      // After creating a sensor, refresh the list
      dispatch(fetchSensors({ page: 0, rowsPerPage: 10 }));
      return extractResponseData<Sensor>(response);
    } catch (err: any) {
      console.error('Error creating sensor:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to create sensor');
    }
  }
);

export const updateSensor = createAsyncThunk(
  'sensors/updateSensor',
  async ({ id, sensor }: { id: string; sensor: Partial<Sensor> }, { rejectWithValue, dispatch, getState }) => {
    try {
      const response = await sensorService.updateSensor(id, sensor);
      // After updating, refresh the list with current filters
      const state = getState() as { sensors: SensorState };
      dispatch(fetchSensors(state.sensors.filters));
      return extractResponseData<Sensor>(response);
    } catch (err: any) {
      console.error('Error updating sensor:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to update sensor');
    }
  }
);

export const deleteSensor = createAsyncThunk(
  'sensors/deleteSensor',
  async (id: string, { rejectWithValue, dispatch, getState }) => {
    try {
      await sensorService.deleteSensor(id);
      // After deletion, refresh the list with current filters
      const state = getState() as { sensors: SensorState };
      dispatch(fetchSensors(state.sensors.filters));
      return id;
    } catch (err: any) {
      console.error('Error deleting sensor:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to delete sensor');
    }
  }
);

// Create the sensor slice
const sensorSlice = createSlice({
  name: 'sensors',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<SensorListFilters>) => {
      state.filters = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchSensors
    builder
      .addCase(fetchSensors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSensors.fulfilled, (state, action: PayloadAction<SensorListResponse>) => {
        state.loading = false;
        state.sensors = action.payload.sensors || [];
        state.totalCount = action.payload.totalCount || action.payload.sensors?.length || 0;
      })
      .addCase(fetchSensors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Additional cases for other async thunks can be added here
    // For now, we focus on the fetchSensors functionality
  },
});

// Export actions and reducer
export const { setFilters, clearError } = sensorSlice.actions;
export default sensorSlice.reducer; 