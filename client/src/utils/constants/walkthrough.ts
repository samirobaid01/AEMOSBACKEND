import type { Step as JoyrideStep } from 'react-joyride';

interface WalkthroughConfig {
  enabled: boolean;
  steps: WalkthroughStep[];
  apiEnabled: boolean;
  apiEndpoint: string;
}

export interface WalkthroughStep extends Omit<JoyrideStep, 'content'> {
  id: string;
  content: string;
}

const walkthroughConfig: WalkthroughConfig = {
  enabled: true, // Control locally if walkthrough is enabled
  apiEnabled: true, // Whether to check with API for walkthrough status
  apiEndpoint: '/api/walkthrough/status',
  steps: [
    {
      id: 'dashboard',
      target: '[data-tour="dashboard"]',
      title: 'Dashboard',
      content: 'This is your main dashboard where you can see all your devices and sensors at a glance.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      id: 'devices',
      target: '[data-tour="devices"]',
      title: 'Devices',
      content: 'View and manage all your connected devices here.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      id: 'sensors',
      target: '[data-tour="sensors"]',
      title: 'Sensors',
      content: 'Monitor all sensor readings and configure alerts.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      id: 'language',
      target: '[data-tour="language"]',
      title: 'Language',
      content: 'Change the application language here.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      id: 'settings',
      target: '[data-tour="settings"]',
      title: 'Settings',
      content: 'Configure your account preferences and application settings.',
      placement: 'top',
      disableBeacon: true,
    }
  ]
};

export default walkthroughConfig; 