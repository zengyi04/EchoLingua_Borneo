import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Text, ActivityIndicator, AppState, LogBox } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Keep app logs clean while audio migration from expo-av is in progress.
LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated',
  'Expo AV has been deprecated',
]);

function AppContent() {
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const sessionStartTime = useRef(Date.now());

  useEffect(() => {
    // Simulate loading resources (e.g., fonts, API check)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, []);

  // Track app session time
  useEffect(() => {
    // Record session start time
    sessionStartTime.current = Date.now();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Save session time when app unmounts
      saveLearningTime();
      subscription?.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState) => {
    if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
      // App is going to background - save learning time
      await saveLearningTime();
    } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App is coming to foreground - reset start time
      sessionStartTime.current = Date.now();
    }
    appState.current = nextAppState;
  };

  const saveLearningTime = async () => {
    try {
      const sessionDuration = Math.floor((Date.now() - sessionStartTime.current) / 1000 / 60); // in minutes
      
      if (sessionDuration > 0) {
        const existingTimeStr = await AsyncStorage.getItem('@total_learning_time');
        const existingTime = existingTimeStr ? parseInt(existingTimeStr) : 0;
        const newTotalTime = existingTime + sessionDuration;
        
        await AsyncStorage.setItem('@total_learning_time', newTotalTime.toString());
        console.log(`✅ Learning time saved: +${sessionDuration} min (Total: ${newTotalTime} min)`);
      }
    } catch (error) {
      console.error('Failed to save learning time:', error);
    }
  };
  
  const NavigationTheme = isDark ? DarkTheme : DefaultTheme;
  const MyTheme = {
    ...NavigationTheme,
    colors: {
      ...NavigationTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.accent,
    },
  };

  if (isLoading) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: theme.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Image 
          source={require('./assets/appLogo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <Text style={[styles.appName, { color: theme.primary }]}>EchoLingua</Text>
        <Text style={[styles.tagline, { color: theme.secondary }]}>Revitalizing Borneo's Voices</Text>
        <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyTheme}>
      <AppNavigator />
      <StatusBar style={isDark ? "light" : "dark"} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    // Background color is handled in style prop
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    // Color handled in style prop
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    // Color handled in style prop
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  }
});