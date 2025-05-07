import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import i18n from '../../i18n/i18n';

// Available language types
export type LanguageCode = 'en' | 'es';

// State interface
interface LanguageState {
  currentLanguage: LanguageCode;
}

// Get initial language from i18next
const getCurrentLanguage = (): LanguageCode => {
  const lang = i18n.language;
  return lang === 'es' ? 'es' : 'en'; // Default to 'en' if not supported
};

// Initial state
const initialState: LanguageState = {
  currentLanguage: getCurrentLanguage(),
};

// Create the language slice
const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<LanguageCode>) => {
      const newLanguage = action.payload;
      state.currentLanguage = newLanguage;
      
      // Update i18next language
      i18n.changeLanguage(newLanguage);
      
      // Save to localStorage (redundant with i18next, but useful for consistency)
      localStorage.setItem('aemos_language', newLanguage);
    },
  },
});

// Export actions and reducer
export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer; 