import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { WALKTHROUGH_CONFIG, WALKTHROUGH_STEPS } from '../../config/walkthrough';
import walkthroughService from '../../services/walkthroughService';
import { getWalkthroughStatus, saveWalkthroughStatus } from '../../utils/walkthroughHelpers';

// EMERGENCY FIX: Force walkthrough to be always completed
// This is to prevent any redirection/reload issues on the sensors page
const forceDisabled = true;

// Load initial state from localStorage
const savedStatus = getWalkthroughStatus();

// Override saved status to always be completed
if (forceDisabled) {
  savedStatus.completed = true;
  // Also ensure localStorage is set correctly
  saveWalkthroughStatus(true, 0);
}

interface WalkthroughState {
  enabled: boolean;
  completed: boolean;
  currentStep: number;
  steps: typeof WALKTHROUGH_STEPS;
  config: typeof WALKTHROUGH_CONFIG;
  isOpen: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: WalkthroughState = {
  // EMERGENCY FIX: Force disable the walkthrough
  enabled: !forceDisabled && WALKTHROUGH_CONFIG.enabled,
  completed: forceDisabled || savedStatus.completed || false,
  currentStep: savedStatus.currentStep || 0,
  steps: WALKTHROUGH_STEPS,
  config: WALKTHROUGH_CONFIG,
  isOpen: false,
  loading: false,
  error: null
};

// Check walkthrough status from API
export const fetchWalkthroughStatus = createAsyncThunk(
  'walkthrough/fetchStatus',
  async (_, { rejectWithValue }) => {
    // EMERGENCY FIX: Don't fetch from API if we've forcibly disabled
    if (forceDisabled) {
      return { enabled: false };
    }
    
    if (!WALKTHROUGH_CONFIG.apiEnabled) {
      return { enabled: WALKTHROUGH_CONFIG.enabled };
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
  initialState,
  reducers: {
    setEnabled: (state, action: PayloadAction<boolean>) => {
      // EMERGENCY FIX: If force disabled, always keep it disabled
      state.enabled = forceDisabled ? false : action.payload;
    },
    setCompleted: (state, action: PayloadAction<boolean>) => {
      // EMERGENCY FIX: If force disabled, always keep it completed
      state.completed = forceDisabled ? true : action.payload;
      saveWalkthroughStatus(state.completed, state.currentStep);
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
      saveWalkthroughStatus(state.completed, action.payload);
    },
    nextStep: (state) => {
      if (state.currentStep < state.steps.length - 1) {
        state.currentStep += 1;
        saveWalkthroughStatus(state.completed, state.currentStep);
      } else {
        state.completed = true;
        saveWalkthroughStatus(true, state.currentStep);
      }
    },
    previousStep: (state) => {
      if (state.currentStep > 0) {
        state.currentStep -= 1;
        saveWalkthroughStatus(state.completed, state.currentStep);
      }
    },
    resetWalkthrough: (state) => {
      // EMERGENCY FIX: If force disabled, don't allow reset
      if (!forceDisabled) {
        state.currentStep = 0;
        state.completed = false;
        saveWalkthroughStatus(false, 0);
      }
    },
    openWalkthrough: (state) => {
      // EMERGENCY FIX: If force disabled, never open
      if (!forceDisabled && state.enabled && !state.completed) {
        state.isOpen = true;
      }
    },
    closeWalkthrough: (state) => {
      state.isOpen = false;
    },
    completeWalkthrough: (state) => {
      state.completed = true;
      state.isOpen = false;
      saveWalkthroughStatus(true, state.currentStep);
    },
    goToStep: (state, action: PayloadAction<number>) => {
      const stepIndex = action.payload;
      if (stepIndex >= 0 && stepIndex < state.steps.length) {
        state.currentStep = stepIndex;
        saveWalkthroughStatus(state.completed, stepIndex);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalkthroughStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalkthroughStatus.fulfilled, (state, action) => {
        state.loading = false;
        // EMERGENCY FIX: If force disabled, always keep it disabled
        state.enabled = forceDisabled ? false : action.payload.enabled;
      })
      .addCase(fetchWalkthroughStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  setEnabled,
  setCompleted,
  setCurrentStep,
  nextStep,
  previousStep,
  resetWalkthrough,
  openWalkthrough,
  closeWalkthrough,
  completeWalkthrough,
  goToStep,
} = walkthroughSlice.actions;

export default walkthroughSlice.reducer; 