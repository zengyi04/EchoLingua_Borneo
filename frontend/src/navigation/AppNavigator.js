import React, { useState, useEffect } from 'react';
import { View, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const USER_STORAGE_KEY = '@echolingua_current_user';

// Screens
import HomeScreen from '../screens/HomeScreen';
import VocabularyScreen from '../screens/VocabularyScreen';
import StoryScreen from '../screens/StoryScreen';
import StoryLibraryScreen from '../screens/StoryLibraryScreen';
import QuizScreen from '../screens/QuizScreen';
import RecordScreen from '../screens/RecordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LivingLanguageScreen from '../screens/LivingLanguageScreen';
import MapScreen from '../screens/MapScreen';
import AIChatScreen from '../screens/AIChatScreen';
// New Feature Screens
import CommunityStoryScreen from '../screens/CommunityStoryScreen';
import ProgressTrackerScreen from '../screens/ProgressTrackerScreen';
import CulturalEventsScreen from '../screens/CulturalEventsScreen';
import DictionaryScreen from '../screens/DictionaryScreen';
import CulturalKnowledgeScreen from '../screens/CulturalKnowledgeScreen';
import FamilyLearningScreen from '../screens/FamilyLearningScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 0,
          elevation: 0,
          ...SHADOWS.medium,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'LearnTab') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'RecordTab') {
            return (
               <View style={[styles.floatingButton, { backgroundColor: theme.secondary }]}>
                 <Ionicons name="mic" size={32} color={theme.surface} />
               </View>
            );
          } else if (route.name === 'StoriesTab') {
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="LearnTab" component={LivingLanguageScreen} options={{ tabBarLabel: 'Learn' }} />
      <Tab.Screen name="RecordTab" component={RecordScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="StoriesTab" component={StoryLibraryScreen} options={{ tabBarLabel: 'Stories' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await AsyncStorage.getItem(USER_STORAGE_KEY);
      setIsLoggedIn(!!user);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isLoggedIn ? "MainTabs" : "Login"}>
      {/* Authentication Screens */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      
      {/* Main App Entry Point */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      
      {/* Feature Screens */}
      <Stack.Screen name="CommunityStory" component={CommunityStoryScreen} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="ProgressTracker" component={ProgressTrackerScreen} />
      <Stack.Screen name="CulturalEvents" component={CulturalEventsScreen} />
      <Stack.Screen name="Dictionary" component={DictionaryScreen} />
      <Stack.Screen name="CulturalKnowledge" component={CulturalKnowledgeScreen} />
      <Stack.Screen name="FamilyLearning" component={FamilyLearningScreen} />
      <Stack.Screen name="Vocabulary" component={VocabularyScreen} />
      <Stack.Screen name="Story" component={StoryScreen} />
      <Stack.Screen name="LivingLanguage" component={LivingLanguageScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="AIChat" component={AIChatScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    top: -24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
});