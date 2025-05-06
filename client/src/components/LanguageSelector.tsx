import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setLanguage, type LanguageCode } from '../store/slices/languageSlice';
import { SUPPORTED_LANGUAGES } from '../i18n';

interface LanguageSelectorProps {
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  sx?: React.CSSProperties;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'outlined',
  size = 'small',
  sx,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { currentLanguage } = useAppSelector((state) => state.language);

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value as LanguageCode;
    dispatch(setLanguage(newLanguage));
  };

  return (
    <FormControl variant={variant} size={size} sx={sx}>
      <InputLabel id="language-select-label">
        {t('settings.language')}
      </InputLabel>
      <Select
        labelId="language-select-label"
        id="language-select"
        value={currentLanguage}
        label={t('settings.language')}
        onChange={handleLanguageChange}
      >
        {SUPPORTED_LANGUAGES.map(({ code, name }) => (
          <MenuItem key={code} value={code}>
            {t(`languages.${code}`)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LanguageSelector; 