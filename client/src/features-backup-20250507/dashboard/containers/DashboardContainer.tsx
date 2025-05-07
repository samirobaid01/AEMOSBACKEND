import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardView from '../components/DashboardView';

const DashboardContainer: React.FC = () => {
  const navigate = useNavigate();

  const handleViewDevices = () => {
    navigate('/devices');
  };

  const handleViewSensors = () => {
    navigate('/sensors');
  };

  return (
    <DashboardView
      onViewDevices={handleViewDevices}
      onViewSensors={handleViewSensors}
    />
  );
};

export default DashboardContainer; 