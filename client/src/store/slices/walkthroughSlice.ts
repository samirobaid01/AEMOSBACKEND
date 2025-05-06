import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import walkthroughConfig from '../../config/walkthrough';
import walkthroughService from '../../services/walkthroughService';

interface WalkthroughState {
  enabled: boolean;
  completed: boolean;
  currentStep: number;
  isOpen: boolean;
  loading: boolean;
  error: string | null;
}

// Check localStorage for completion status
const getInitialState = (): WalkthroughState => {
  const completed = localStorage.getItem('aemos_walkthrough_completed') === 'true';
  
  return {
    enabled: walkthroughConfig.enabled,
    completed,
    currentStep: 0,
    isOpen: false,
    loading: false,
    error: null
  };
};

// Check walkthrough status from API
export const fetchWalkthroughStatus = createAsyncThunk(
  'walkthrough/fetchStatus',
  async (_, { rejectWithValue }) => {
    if (!walkthroughConfig.apiEnabled) {
      return { enabled: walkthroughConfig.enabled };
    }
    
    try {
      const response = await walkthroughService.getWalkthroughStatus();
      return response;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch walkthrough status');
    }
  }
);

const walkthroughSlice = createSlice({
  name: 'walkthrough',
  initialState: getInitialState(),
  reducers: {
    openWalkthrough: (state) => {
      if (state.enabled && !state.completed) {
        state.isOpen = true;
      }
    },
    closeWalkthrough: (state) => {
      state.isOpen = false;
    },
    nextStep: (state) => {
      if (state.currentStep < walkthroughConfig.steps.length - 1) {
        state.currentStep += 1;
      }
    },
    prevStep: (state) => {
      if (state.currentStep > 0) {
        state.currentStep -= 1;
      }
    },
    goToStep: (state, action: PayloadAction<number>) => {
      if (action.payload >= 0 && action.payload < walkthroughConfig.steps.length) {
        state.currentStep = action.payload;
      }
    },
    completeWalkthrough: (state) => {
      state.completed = true;
      state.isOpen = false;
      localStorage.setItem('aemos_walkthrough_completed', 'true');
    },
    resetWalkthrough: (state) => {
      state.completed = false;
      state.currentStep = 0;
      localStorage.removeItem('aemos_walkthrough_completed');
    },
    setEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalkthroughStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalkthroughStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.enabled = action.payload.enabled;
      })
      .addCase(fetchWalkthroughStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { 
  openWalkthrough, 
  closeWalkthrough, 
  nextStep, 
  prevStep,
  goToStep,
  completeWalkthrough,
  resetWalkthrough,
  setEnabled
} = walkthroughSlice.actions;

export default walkthroughSlice.reducer; 