import { LogBox } from 'react-native';

// Keep the app usable while expo-av migration to expo-audio/expo-video is pending.
LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated',
  'Expo AV has been deprecated',
]);
