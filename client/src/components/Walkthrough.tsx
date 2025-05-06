import React, { useEffect, useState } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import type { CallBackProps, Step } from 'react-joyride';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  closeWalkthrough,
  completeWalkthrough,
  goToStep,
} from '../store/slices/walkthroughSlice';
import walkthroughConfig from '../config/walkthrough';

const Walkthrough: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { isOpen, currentStep, enabled, completed } = useAppSelector(
    (state: any) => state.walkthrough
  );
  const [steps, setSteps] = useState<Step[]>([]);

  // Convert our config steps to Joyride steps, with translated content
  useEffect(() => {
    const translatedSteps = walkthroughConfig.steps.map(step => ({
      ...step,
      content: t(`walkthrough.steps.${step.id}.content`, { defaultValue: step.content }),
      title: t(`walkthrough.steps.${step.id}.title`, { defaultValue: step.title }),
    }));
    setSteps(translatedSteps);
  }, [t]);

  // Handle Joyride callbacks
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, type, status } = data;

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Update current step in Redux when moving to the next or previous step
      dispatch(goToStep(index + (action === ACTIONS.PREV ? -1 : 1)));
    } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // Handle walkthrough completion
      dispatch(completeWalkthrough());
    } else if (action === ACTIONS.CLOSE) {
      // Close the walkthrough if the user clicks the X button
      dispatch(closeWalkthrough());
    }
  };

  // If walkthrough is disabled, not open, completed, or no steps, don't render
  if (!enabled || !isOpen || completed || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton={false}
      run={isOpen}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      stepIndex={currentStep}
      styles={{
        options: {
          arrowColor: theme.palette.background.paper,
          backgroundColor: theme.palette.background.paper,
          primaryColor: theme.palette.primary.main,
          textColor: theme.palette.text.primary,
          zIndex: 10000,
        },
        buttonBack: {
          marginRight: 10,
        },
        buttonNext: {
          backgroundColor: theme.palette.primary.main,
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
      locale={{
        back: t('common.back', 'Back'),
        close: t('common.close', 'Close'),
        last: t('common.finish', 'Finish'),
        next: t('common.next', 'Next'),
        skip: t('common.skip', 'Skip'),
      }}
    />
  );
};

export default Walkthrough; 