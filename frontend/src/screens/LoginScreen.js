import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const USER_STORAGE_KEY = '@echolingua_current_user';
const USERS_DATABASE_KEY = '@echolingua_users_database';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      // Load users database
      const usersData = await AsyncStorage.getItem(USERS_DATABASE_KEY);
      const users = usersData ? JSON.parse(usersData) : [];

      // Find user
      const user = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase().trim()
      );

      if (!user) {
        Alert.alert('Error', 'Account not found. Please sign up first.');
        setIsLoading(false);
        return;
      }

      // Verify password (in production, use proper hashing)
      if (user.password !== password) {
        Alert.alert('Error', 'Incorrect password');
        setIsLoading(false);
        return;
      }

      // Remove password before storing current user
      const { password: _, ...userWithoutPassword } = user;
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithoutPassword));

      // Update user's lastActive timestamp in database
      const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase().trim());
      users[userIndex] = { ...user, lastActive: new Date().toISOString() };
      await AsyncStorage.setItem(USERS_DATABASE_KEY, JSON.stringify(users));

      Alert.alert('Success', `Welcome back, ${user.fullName}!`, [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/appLogo.png')}
                style={styles.appLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>EchoLingua</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Preserving Indigenous Languages</Text>
          </View>

          {/* Login Form */}
          <View style={[styles.formContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Welcome Back</Text>
            <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>Log in to continue your journey</Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.primary }, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={[styles.loginButtonText, { color: theme.background }]}>
                {isLoading ? 'Logging in...' : 'Log In'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={theme.background} />
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: theme.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={[styles.signupLink, { color: theme.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Skip for Now */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => navigation.navigate('MainTabs')}
            >
              <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: theme.primary + '10' }]}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
            <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
              Create an account to save your progress, share stories, and connect with the community
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.m,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  appLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  formContainer: {
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    ...SHADOWS.medium,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.l,
  },
  inputGroup: {
    marginBottom: SPACING.m,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: SPACING.m,
    borderWidth: 1,
    height: 50,
  },
  input: {
    flex: 1,
    marginLeft: SPACING.s,
    fontSize: 15,
    color: COLORS.text,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.m,
    marginTop: SPACING.m,
    gap: SPACING.s,
    ...SHADOWS.small,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.l,
  },
  signupText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: SPACING.m,
    paddingVertical: SPACING.s,
  },
  skipButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: SPACING.m,
    marginTop: SPACING.xl,
    gap: SPACING.s,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
});
