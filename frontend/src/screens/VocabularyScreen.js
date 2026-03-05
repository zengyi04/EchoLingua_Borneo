import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import VocabularyCard from '../components/VocabularyCard';
import { vocabularyList } from '../data/mockData';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const LANGUAGE_OPTIONS = [
  { id: 'malay', label: 'Malay', flag: 'MY', speechCode: 'ms-MY' },
  { id: 'iban', label: 'Iban', flag: 'MY', speechCode: 'ms-MY' },
  { id: 'kadazan', label: 'Kadazan-Dusun', flag: 'MY', speechCode: 'ms-MY' },
  { id: 'english', label: 'English', flag: 'GB', speechCode: 'en-US' },
  { id: 'mandarin', label: 'Mandarin', flag: 'CN', speechCode: 'zh-CN' },
  { id: 'indonesian', label: 'Indonesian', flag: 'ID', speechCode: 'id-ID' },
];

const VOCABULARY_BY_DIFFICULTY = {
  easy: vocabularyList.filter((word) => word.difficulty === 'easy'),
  medium: vocabularyList.filter((word) => word.difficulty === 'medium'),
  hard: vocabularyList.filter((word) => word.difficulty === 'hard'),
};

export default function VocabularyScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [selectedLevel, setSelectedLevel] = useState('easy');
  const [savedWords, setSavedWords] = useState({ easy: [], medium: [], hard: [] });
  const [testingMode, setTestingMode] = useState(false);
  const [fromLanguage, setFromLanguage] = useState(LANGUAGE_OPTIONS[0]);
  const [toLanguage, setToLanguage] = useState(LANGUAGE_OPTIONS[3]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectingLanguageType, setSelectingLanguageType] = useState('from');

  const currentVocabulary = VOCABULARY_BY_DIFFICULTY[selectedLevel];

  const handleSaveWord = (word, level) => {
    const alreadySaved = savedWords[level].some((w) => w.id === word.id);
    if (alreadySaved) {
      setSavedWords({
        ...savedWords,
        [level]: savedWords[level].filter((w) => w.id !== word.id),
      });
      return;
    }
    setSavedWords({
      ...savedWords,
      [level]: [...savedWords[level], word],
    });
  };

  const isWordSaved = (word, level) => savedWords[level].some((w) => w.id === word.id);

  const selectLanguage = (lang) => {
    if (selectingLanguageType === 'from') {
      setFromLanguage(lang);
    } else {
      setToLanguage(lang);
    }
    setShowLanguageModal(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'HomeTab' });
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Learn Vocabulary</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Practice pronunciation and test yourself</Text>
        </View>
        <TouchableOpacity style={styles.testButton} onPress={() => setTestingMode(!testingMode)}>
          <MaterialCommunityIcons
            name="clipboard-check"
            size={24}
            color={testingMode ? theme.error : theme.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.languageSelectionContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.languageLabel, { color: theme.text }]}>Learning:</Text>
        <TouchableOpacity
          style={[styles.languageButton, { backgroundColor: theme.glassLight, borderColor: theme.border }]}
          onPress={() => {
            setSelectingLanguageType('from');
            setShowLanguageModal(true);
          }}
        >
          <Text style={[styles.languageText, { color: theme.text }]}>{fromLanguage.flag} {fromLanguage.label}</Text>
        </TouchableOpacity>
        <Ionicons name="arrow-forward" size={20} color={theme.textSecondary} />
        <TouchableOpacity
          style={[styles.languageButton, { backgroundColor: theme.glassLight, borderColor: theme.border }]}
          onPress={() => {
            setSelectingLanguageType('to');
            setShowLanguageModal(true);
          }}
        >
          <Text style={[styles.languageText, { color: theme.text }]}>{toLanguage.flag} {toLanguage.label}</Text>
        </TouchableOpacity>
      </View>

      {testingMode && (
        <View style={[styles.testingBanner, { backgroundColor: theme.primary + '20' }]}>
          <MaterialCommunityIcons name="lightbulb" size={18} color={theme.primary} />
          <Text style={[styles.testingText, { color: theme.primary }]}>Testing mode enabled: record speech and check accuracy.</Text>
        </View>
      )}

      <View style={[styles.tabsContainer, { backgroundColor: theme.surface }]}>
        {['easy', 'medium', 'hard'].map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.tab, { backgroundColor: theme.glassLight, borderColor: theme.border }, selectedLevel === level && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => setSelectedLevel(level)}
          >
            <Text style={[styles.tabText, { color: theme.textSecondary }, selectedLevel === level && { color: theme.surface, fontWeight: 'bold' }]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
            <Text style={[styles.tabCount, { color: theme.textSecondary, opacity: 0.7 }, selectedLevel === level && { color: theme.surface }]}>{VOCABULARY_BY_DIFFICULTY[level].length} words</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.counterRow}>
        <MaterialCommunityIcons name="bookmark" size={16} color={theme.success} />
        <Text style={[styles.counterText, { color: theme.textSecondary }]}>{savedWords[selectedLevel].length} saved</Text>
      </View>

      <FlatList
        data={currentVocabulary}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <VocabularyCard
            word={item}
            isSaved={isWordSaved(item, selectedLevel)}
            onSave={() => handleSaveWord(item, selectedLevel)}
            testingMode={testingMode}
            level={selectedLevel}
            fromLanguage={fromLanguage}
            toLanguage={toLanguage}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showLanguageModal} transparent animationType="slide" onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Select {selectingLanguageType === 'from' ? 'Source' : 'Translation'} Language
              </Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={26} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.languageList}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.languageOption,
                    { backgroundColor: theme.background, borderColor: theme.border }
                  ]}
                  onPress={() => selectLanguage(lang)}
                >
                  <Text style={[styles.languageOptionText, { color: theme.text }]}>{lang.flag} {lang.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  backButton: { paddingRight: SPACING.m },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  testButton: { padding: SPACING.s },
  languageSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.glassLight,
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  languageLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  languageButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.s,
    paddingVertical: 6,
    paddingHorizontal: SPACING.s,
  },
  languageText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  testingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.accent + '20',
    padding: SPACING.s,
    margin: SPACING.m,
    borderRadius: SPACING.s,
  },
  testingText: { fontSize: 12, color: COLORS.accent, flex: 1 },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.glassLight,
    padding: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.s,
    borderRadius: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 4,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  tabTextActive: { color: COLORS.surface },
  tabCount: { fontSize: 11, color: COLORS.textSecondary },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  counterText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  listContent: { paddingBottom: SPACING.xl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.glassLight,
    borderTopLeftRadius: SPACING.l,
    borderTopRightRadius: SPACING.l,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: SPACING.s },
  languageList: { padding: SPACING.m },
  languageOption: {
    backgroundColor: COLORS.background,
    borderRadius: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.m,
    marginBottom: SPACING.s,
  },
  languageOptionText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
});
