import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, DARK_COLORS, LIGHT_COLORS } from '../constants/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [theme, setTheme] = useState(DARK_COLORS); // Default to dark initially or system

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      const colors = systemScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
      setTheme(colors);
    } else if (themeMode === 'dark') {
      setTheme(DARK_COLORS);
    } else {
      setTheme(LIGHT_COLORS);
    }
  }, [themeMode, systemScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@user_theme_preference');
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const updateTheme = async (newMode) => {
    try {
      setThemeMode(newMode);
      await AsyncStorage.setItem('@user_theme_preference', newMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, updateTheme, isDark: themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark') }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
