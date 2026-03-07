import React, { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import VocabularyCard from '../components/VocabularyCard';
import { vocabularyList } from '../data/mockData';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { WORLD_LANGUAGES } from '../constants/languages';

const SPEECH_CODES = {
  malay: 'ms-MY',
  english: 'en-US',
  indonesian: 'id-ID',
  mandarin: 'zh-CN',
  spanish: 'es-ES',
  french: 'fr-FR',
  arabic: 'ar-SA',
  japanese: 'ja-JP',
  korean: 'ko-KR',
  german: 'de-DE',
  portuguese: 'pt-PT',
  thai: 'th-TH',
  vietnamese: 'vi-VN',
  russian: 'ru-RU',
  italian: 'it-IT',
  turkish: 'tr-TR',
  hindi: 'hi-IN',
  cantonese: 'zh-HK',
  tagalog: 'fil-PH',
  urdu: 'ur-PK',
  tamil: 'ta-IN',
};

const LANGUAGE_OPTIONS = WORLD_LANGUAGES.map((language) => ({
  id: language.id,
  label: language.label,
  flag: language.flag,
  speechCode: SPEECH_CODES[language.id] || 'en-US',
}));

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
  const [activeView, setActiveView] = useState('vocabulary');
  const [fromLanguage, setFromLanguage] = useState(
    LANGUAGE_OPTIONS.find((language) => language.id === 'malay') || LANGUAGE_OPTIONS[0]
  );
  const [toLanguage, setToLanguage] = useState(
    LANGUAGE_OPTIONS.find((language) => language.id === 'english') || LANGUAGE_OPTIONS[0]
  );
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectingLanguageType, setSelectingLanguageType] = useState('from');

  const currentVocabulary = VOCABULARY_BY_DIFFICULTY[selectedLevel];
  const collectedVocabulary = useMemo(
    () =>
      Object.entries(savedWords).flatMap(([level, words]) =>
        words.map((word) => ({ ...word, savedLevel: level }))
      ),
    [savedWords]
  );

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

      <View style={[styles.viewSwitcher, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <TouchableOpacity
          style={[
            styles.viewButton,
            { borderColor: theme.border, backgroundColor: theme.glassLight },
            activeView === 'vocabulary' && { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
          onPress={() => setActiveView('vocabulary')}
        >
          <MaterialCommunityIcons name="book-open-page-variant" size={16} color={activeView === 'vocabulary' ? theme.surface : theme.primary} />
          <Text style={[styles.viewButtonText, { color: activeView === 'vocabulary' ? theme.surface : theme.text }]}>Vocabulary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewButton,
            { borderColor: theme.border, backgroundColor: theme.glassLight },
            activeView === 'collections' && { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
          onPress={() => setActiveView('collections')}
        >
          <MaterialCommunityIcons name="bookmark-multiple" size={16} color={activeView === 'collections' ? theme.surface : theme.primary} />
          <Text style={[styles.viewButtonText, { color: activeView === 'collections' ? theme.surface : theme.text }]}>Collections</Text>
        </TouchableOpacity>
      </View>

      {testingMode && (
        <View style={[styles.testingBanner, { backgroundColor: theme.primary + '20' }]}>
          <MaterialCommunityIcons name="lightbulb" size={18} color={theme.primary} />
          <Text style={[styles.testingText, { color: theme.primary }]}>Testing mode enabled: record speech and check accuracy.</Text>
        </View>
      )}

      {activeView === 'vocabulary' && (
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
      )}

      <View style={styles.counterRow}>
        <MaterialCommunityIcons name="bookmark" size={16} color={theme.success} />
        <Text style={[styles.counterText, { color: theme.textSecondary }]}>
          {activeView === 'vocabulary'
            ? `${savedWords[selectedLevel].length} saved in ${selectedLevel}`
            : `${collectedVocabulary.length} words in your collection`}
        </Text>
      </View>

      {activeView === 'vocabulary' ? (
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
      ) : (
        <FlatList
          data={collectedVocabulary}
          keyExtractor={(item) => `${item.savedLevel}-${item.id}`}
          renderItem={({ item }) => (
            <VocabularyCard
              word={item}
              isSaved={true}
              onSave={() => handleSaveWord(item, item.savedLevel)}
              testingMode={testingMode}
              level={item.savedLevel}
              fromLanguage={fromLanguage}
              toLanguage={toLanguage}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyCollectionContainer}>
              <MaterialCommunityIcons name="bookmark-off-outline" size={42} color={theme.textSecondary} />
              <Text style={[styles.emptyCollectionTitle, { color: theme.text }]}>No saved vocabulary yet</Text>
              <Text style={[styles.emptyCollectionText, { color: theme.textSecondary }]}>Save words from Easy, Medium, or Hard tabs, then view them here.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

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
  viewSwitcher: {
    flexDirection: 'row',
    gap: SPACING.s,
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
    paddingBottom: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderRadius: SPACING.s,
    paddingVertical: SPACING.s,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
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
  emptyCollectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.xxl,
    gap: SPACING.s,
  },
  emptyCollectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCollectionText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
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
