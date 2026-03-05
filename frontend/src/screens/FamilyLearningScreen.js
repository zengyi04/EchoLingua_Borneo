import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const FAMILY_ACCOUNTS_KEY = 'familyAccounts';
const ACTIVE_ACCOUNT_KEY = 'activeAccount';

export default function FamilyLearningScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('Child');
  const [newAccountAge, setNewAccountAge] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👤');

  const AVATARS = ['👤', '👦', '👧', '👨', '👩', '👴', '👵', '🧒', '🧔', '👨‍🦱'];
  const ROLES = ['Parent', 'Child', 'Grandparent', 'Teen'];

  const { theme } = useTheme();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const storedAccounts = await AsyncStorage.getItem(FAMILY_ACCOUNTS_KEY);
      const storedActive = await AsyncStorage.getItem(ACTIVE_ACCOUNT_KEY);

      if (storedAccounts) {
        const accountsList = JSON.parse(storedAccounts);
        setAccounts(accountsList);

        if (storedActive) {
          const active = accountsList.find((acc) => acc.id === storedActive);
          setActiveAccount(active);
        } else if (accountsList.length > 0) {
          setActiveAccount(accountsList[0]);
          await AsyncStorage.setItem(ACTIVE_ACCOUNT_KEY, accountsList[0].id);
        }
      } else {
        // Create default account
        const defaultAccount = {
          id: Date.now().toString(),
          name: 'You',
          role: 'Parent',
          age: null,
          avatar: '👤',
          progress: {
            wordsLearned: 0,
            quizzesTaken: 0,
            storiesRead: 0,
            streak: 0,
          },
          createdAt: new Date().toISOString(),
        };
        const newAccounts = [defaultAccount];
        await AsyncStorage.setItem(FAMILY_ACCOUNTS_KEY, JSON.stringify(newAccounts));
        await AsyncStorage.setItem(ACTIVE_ACCOUNT_KEY, defaultAccount.id);
        setAccounts(newAccounts);
        setActiveAccount(defaultAccount);
      }
    } catch (error) {
      console.error('Load accounts error:', error);
    }
  };

  const saveAccounts = async (updatedAccounts) => {
    try {
      await AsyncStorage.setItem(FAMILY_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
      setAccounts(updatedAccounts);
    } catch (error) {
      console.error('Save accounts error:', error);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const newAccount = {
      id: Date.now().toString(),
      name: newAccountName.trim(),
      role: newAccountRole,
      age: newAccountAge ? parseInt(newAccountAge) : null,
      avatar: selectedAvatar,
      progress: {
        wordsLearned: 0,
        quizzesTaken: 0,
        storiesRead: 0,
        streak: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const updatedAccounts = [...accounts, newAccount];
    await saveAccounts(updatedAccounts);

    setNewAccountName('');
    setNewAccountRole('Child');
    setNewAccountAge('');
    setSelectedAvatar('👤');
    setShowAddModal(false);
    Alert.alert('Success', `Account for ${newAccount.name} created!`);
  };

  const handleSwitchAccount = async (account) => {
    setActiveAccount(account);
    await AsyncStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
    Alert.alert('Switched', `Now using ${account.name}'s account`);
  };

  const handleDeleteAccount = (accountId) => {
    if (accounts.length === 1) {
      Alert.alert('Error', 'Cannot delete the last account');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? This will erase all progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedAccounts = accounts.filter((acc) => acc.id !== accountId);
            await saveAccounts(updatedAccounts);

            if (activeAccount?.id === accountId) {
              handleSwitchAccount(updatedAccounts[0]);
            }
          },
        },
      ]
    );
  };

  // Family Activities Handlers
  const handleGroupPractice = () => {
    if (!activeAccount) {
      Alert.alert('Select Account', 'Please select an active account first');
      return;
    }
    navigation.navigate('VocabularyScreen');
  };

  const handleFamilyChallenge = () => {
    if (!activeAccount) {
      Alert.alert('Select Account', 'Please select an active account first');
      return;
    }
    navigation.navigate('QuizScreen');
  };

  const handleStoryTime = () => {
    if (!activeAccount) {
      Alert.alert('Select Account', 'Please select an active account first');
      return;
    }
    navigation.navigate('StoryLibraryScreen');
  };

  const handleFamilyProgress = () => {
    if (!activeAccount) {
      Alert.alert('Select Account', 'Please select an active account first');
      return;
    }
    
    // Calculate combined family progress
    const totalWords = accounts.reduce((sum, acc) => sum + acc.progress.wordsLearned, 0);
    const totalQuizzes = accounts.reduce((sum, acc) => sum + acc.progress.quizzesTaken, 0);
    const totalStories = accounts.reduce((sum, acc) => sum + acc.progress.storiesRead, 0);
    const maxStreak = Math.max(...accounts.map(acc => acc.progress.streak));

    const progressMessage = `Family Achievements:\n\n` +
      `👥 ${accounts.length} Family Members\n` +
      `📚 ${totalWords} Total Words Learned\n` +
      `✅ ${totalQuizzes} Total Quizzes Completed\n` +
      `📖 ${totalStories} Stories Read Together\n` +
      `🔥 ${maxStreak} Day Best Streak\n\n` +
      `Keep learning together!`;

    Alert.alert('Family Progress', progressMessage);
  };

  const renderAccountCard = (account) => {
    const isActive = activeAccount?.id === account.id;

    return (
      <View 
        key={account.id} 
        style={[
          styles.accountCard, 
          { backgroundColor: theme.surface, borderColor: theme.border },
          isActive && [styles.accountCardActive, { borderColor: theme.primary }]
        ]}
      >
        <TouchableOpacity
          style={styles.accountCardContent}
          onPress={() => handleSwitchAccount(account)}
          activeOpacity={0.7}
        >
          <Text style={styles.accountAvatar}>{account.avatar}</Text>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: theme.text }]}>{account.name}</Text>
            <Text style={[styles.accountRole, { color: theme.textSecondary }]}>{account.role}</Text>
            {account.age && <Text style={[styles.accountAge, { color: theme.textSecondary }]}>Age: {account.age}</Text>}
          </View>
          {isActive && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={24} color={theme.success} />
            </View>
          )}
        </TouchableOpacity>

        {/* Progress Stats */}
        <View style={[styles.progressSection, { borderTopColor: theme.border }]}>
          <View style={styles.statItem}>
            <Ionicons name="book" size={16} color={theme.primary} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{account.progress.wordsLearned} words</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="clipboard-outline" size={16} color={theme.secondary} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{account.progress.quizzesTaken} quizzes</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={16} color="#FF6B35" />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{account.progress.streak} day streak</Text>
          </View>
        </View>

        {/* Actions */}
        {accounts.length > 1 && !isActive && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteAccount(account.id)}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'HomeTab' });
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Family Learning</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.surfaceVariant }]}>
          <FontAwesome5 name="users" size={20} color={theme.primary} />
          <Text style={[styles.infoBannerText, { color: theme.text }]}>
            Learn together! Create accounts for family members and track everyone's progress.
          </Text>
        </View>

        {/* Active Account Highlight */}
        {activeAccount && (
          <View style={styles.activeAccountSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Currently Learning</Text>
            <View style={[styles.activeAccountCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
              <Text style={styles.activeAccountAvatar}>{activeAccount.avatar}</Text>
              <View style={styles.activeAccountInfo}>
                <Text style={[styles.activeAccountName, { color: theme.text }]}>{activeAccount.name}</Text>
                <Text style={[styles.activeAccountRole, { color: theme.textSecondary }]}>{activeAccount.role}</Text>
              </View>
              <Ionicons name="star" size={32} color="#FFD93D" />
            </View>
          </View>
        )}

        {/* All Accounts */}
        <View style={styles.accountsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Family Members ({accounts.length})</Text>
          {accounts.map(renderAccountCard)}
        </View>

        {/* Family Activities */}
        <View style={styles.activitiesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Family Activities</Text>

          <TouchableOpacity 
            style={[styles.activityCard, { backgroundColor: theme.surface, borderColor: theme.border }]} 
            onPress={handleGroupPractice} 
            activeOpacity={0.7}
          >
            <View style={[styles.activityIcon, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="people" size={28} color={theme.primary} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>Group Practice</Text>
              <Text style={[styles.activityDescription, { color: theme.textSecondary }]}>Practice vocabulary together</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.activityCard, { backgroundColor: theme.surface, borderColor: theme.border }]} 
            onPress={handleFamilyChallenge} 
            activeOpacity={0.7}
          >
            <View style={[styles.activityIcon, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="trophy" size={28} color="#FFD93D" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>Family Challenge</Text>
              <Text style={[styles.activityDescription, { color: theme.textSecondary }]}>Compete in friendly quizzes</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.activityCard, { backgroundColor: theme.surface, borderColor: theme.border }]} 
            onPress={handleStoryTime} 
            activeOpacity={0.7}
          >
            <View style={[styles.activityIcon, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="book-outline" size={28} color={theme.secondary} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>Story Time</Text>
              <Text style={[styles.activityDescription, { color: theme.textSecondary }]}>Read stories as a family</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.activityCard, { backgroundColor: theme.surface, borderColor: theme.border }]} 
            onPress={handleFamilyProgress} 
            activeOpacity={0.7}
          >
            <View style={[styles.activityIcon, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="bar-chart" size={28} color="#4ECDC4" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>Family Progress</Text>
              <Text style={[styles.activityDescription, { color: theme.textSecondary }]}>View combined achievements</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Account Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Enter name"
                placeholderTextColor={theme.textSecondary}
                value={newAccountName}
                onChangeText={setNewAccountName}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Role</Text>
              <View style={styles.roleContainer}>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption, 
                      { backgroundColor: theme.background, borderColor: theme.border },
                      newAccountRole === role && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => setNewAccountRole(role)}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        { color: theme.text },
                        newAccountRole === role && { color: theme.surface, fontWeight: '600' },
                      ]}
                    >
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.text }]}>Age (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Enter age"
                placeholderTextColor={theme.textSecondary}
                value={newAccountAge}
                onChangeText={setNewAccountAge}
                keyboardType="number-pad"
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Choose Avatar</Text>
              <View style={styles.avatarContainer}>
                {AVATARS.map((avatar) => (
                  <TouchableOpacity
                    key={avatar}
                    style={[
                      styles.avatarOption,
                      { backgroundColor: theme.background, borderColor: theme.border },
                      selectedAvatar === avatar && { backgroundColor: theme.surfaceVariant, borderColor: theme.primary },
                    ]}
                    onPress={() => setSelectedAvatar(avatar)}
                  >
                    <Text style={styles.avatarEmoji}>{avatar}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.primary }]} onPress={handleAddAccount}>
                <Text style={[styles.createBtnText, { color: theme.background }]}>Create Account</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
    borderRadius: 12,
    gap: SPACING.s,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  activeAccountSection: {
    paddingHorizontal: SPACING.l,
    marginTop: SPACING.l,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  activeAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    padding: SPACING.m,
    borderWidth: 2,
    borderColor: '#FFD93D',
  },
  activeAccountAvatar: {
    fontSize: 48,
    marginRight: SPACING.m,
  },
  activeAccountInfo: {
    flex: 1,
  },
  activeAccountName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  activeAccountRole: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  accountsSection: {
    paddingHorizontal: SPACING.l,
    marginTop: SPACING.l,
  },
  accountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.small,
  },
  accountCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  accountCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  accountAvatar: {
    fontSize: 40,
    marginRight: SPACING.m,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  accountRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  accountAge: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activeBadge: {
    marginLeft: SPACING.s,
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deleteBtn: {
    position: 'absolute',
    top: SPACING.s,
    right: SPACING.s,
    padding: SPACING.xs,
  },
  activitiesSection: {
    paddingHorizontal: SPACING.l,
    marginTop: SPACING.l,
    marginBottom: SPACING.xl,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.small,
  },
  activityIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.l,
    paddingBottom: SPACING.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalScrollView: {
    marginBottom: SPACING.m,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.m,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.m,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  roleOption: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  roleOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  roleOptionTextActive: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  avatarContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  avatarOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.m,
    alignItems: 'center',
    marginTop: SPACING.l,
    ...SHADOWS.small,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
});
