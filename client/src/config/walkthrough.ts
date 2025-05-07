export interface WalkthroughStep {
  id?: string;
  target: string;
  content: string;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  disableBeacon?: boolean;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'dashboard-overview',
    target: '[data-tour="dashboard"]',
    content: 'Welcome to AEMOS! This is your dashboard where you can monitor all your devices and sensors.',
    title: 'Dashboard Overview',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    id: 'device-list',
    target: '[data-tour="devices"]',
    content: 'Here you can see all your connected devices and their current status.',
    title: 'Device Management',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    id: 'sensor-stats',
    target: '[data-tour="sensors"]',
    content: 'Monitor your sensor readings and alerts in real-time.',
    title: 'Sensor Monitoring',
    placement: 'right',
    disableBeacon: true,
  },
  {
    id: 'notifications',
    target: '[data-tour="notifications"]',
    content: 'Stay informed with real-time alerts and notifications about your devices and sensors.',
    title: 'Notifications',
    placement: 'left',
    disableBeacon: true,
  },
  {
    id: 'settings',
    target: '[data-tour="settings"]',
    content: 'Configure your preferences and system settings here.',
    title: 'Settings',
    placement: 'left',
    disableBeacon: true,
  },
];

export interface WalkthroughConfig {
  enabled: boolean;
  showSkip: boolean;
  showProgress: boolean;
  continuous: boolean;
  disableOverlayClose: boolean;
  spotlightClicks: boolean;
  apiEnabled: boolean;
}

export const WALKTHROUGH_CONFIG: WalkthroughConfig = {
  enabled: false,
  showSkip: true,
  showProgress: true,
  continuous: true,
  disableOverlayClose: true,
  spotlightClicks: false,
  apiEnabled: false,
}; 