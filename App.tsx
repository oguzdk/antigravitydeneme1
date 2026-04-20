import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider, useAppContext } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { scheduleBackgroundFetch } from './src/services/screenTime';

function AppContent() {
  const { state, isLoading } = useAppContext();

  // Initialize background screen time fetch once user profile is loaded
  useEffect(() => {
    if (isLoading || !state.user) return;
    scheduleBackgroundFetch(state.user.checkInTime).catch(() => {});
  }, [isLoading, state.user?.checkInTime]);

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </AppProvider>
  );
}
