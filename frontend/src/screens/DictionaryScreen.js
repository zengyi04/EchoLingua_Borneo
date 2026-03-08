import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { WORLD_LANGUAGES } from '../constants/languages';

const CORE_WORD_TEMPLATES = [
  { key: 'hello', word: 'Hello', translation: 'Hello', pronunciation: 'heh-loh', partOfSpeech: 'Greeting', category: 'Greetings' },
  { key: 'thanks', word: 'Thank you', translation: 'Thank you', pronunciation: 'thangk-yoo', partOfSpeech: 'Expression', category: 'Expressions' },
  { key: 'family', word: 'Family', translation: 'Family', pronunciation: 'fa-muh-lee', partOfSpeech: 'Noun', category: 'Family' },
  { key: 'learn', word: 'Learn', translation: 'Learn', pronunciation: 'lurn', partOfSpeech: 'Verb', category: 'Learning' },
];

const BORNEO_LANGUAGE_ENTRIES = [
  {
    id: 'borneo-kadazan-1',
    word: 'Kotobian',
    language: 'Kadazan-Dusun',
    translation: 'Good morning',
    pronunciation: 'koh-toh-bee-ahn',
    partOfSpeech: 'Greeting',
    examples: ['Kotobian poinsian - Good morning to you'],
    relatedWords: ['Kotobian tadau - Good day', 'Kopiodong - Good evening'],
    category: 'Greetings',
  },
  {
    id: 'borneo-kadazan-2',
    word: 'Kaamatan',
    language: 'Kadazan-Dusun',
    translation: 'Harvest festival',
    pronunciation: 'kah-ah-mah-tahn',
    partOfSpeech: 'Noun',
    examples: ['Pesta Kaamatan - Harvest Festival'],
    relatedWords: ['Padi - Rice', 'Sumazau - Dance'],
    category: 'Culture',
  },
  {
    id: 'borneo-iban-1',
    word: 'Ngajat',
    language: 'Iban',
    translation: 'Traditional warrior dance',
    pronunciation: 'ngah-jaht',
    partOfSpeech: 'Noun',
    examples: ['Bengar ngajat - Dance the ngajat'],
    relatedWords: ['Gawai - Festival', 'Pua Kumbu - Textile'],
    category: 'Culture',
  },
  {
    id: 'borneo-bidayuh-1',
    word: 'Gawai',
    language: 'Bidayuh',
    translation: 'Festival celebration',
    pronunciation: 'gah-why',
    partOfSpeech: 'Noun',
    examples: ['Hari Gawai disambut setiap tahun.'],
    relatedWords: ['Tapai - Rice wine', 'Bamboo dance'],
    category: 'Culture',
  },
  {
    id: 'borneo-murut-1',
    word: 'Lansaran',
    language: 'Murut',
    translation: 'Traditional spring platform',
    pronunciation: 'lahn-sah-rahn',
    partOfSpeech: 'Noun',
    examples: ['Minsibut di lansaran - Jump on the platform'],
    relatedWords: ['Magunatip - Dance', 'Sompoton - Instrument'],
    category: 'Culture',
  },
  {
    id: 'borneo-penan-1',
    word: 'Belian',
    language: 'Penan',
    translation: 'Traditional healer',
    pronunciation: 'beh-lee-ahn',
    partOfSpeech: 'Noun',
    examples: ['Belian memimpin upacara komuniti.'],
    relatedWords: ['Ritual', 'Heritage'],
    category: 'Culture',
  },
];

const GENERATED_WORLD_LANGUAGE_ENTRIES = WORLD_LANGUAGES.flatMap((language) =>
  CORE_WORD_TEMPLATES.map((template) => ({
    id: `world-${language.id}-${template.key}`,
    word: template.word,
    language: language.label,
    translation: template.translation,
    pronunciation: template.pronunciation,
    partOfSpeech: template.partOfSpeech,
    examples: [`${template.word} in ${language.label} context.`],
    relatedWords: ['Culture', 'Community', 'Heritage'],
    category: template.category,
  }))
);

const DICTIONARY_DATA = [...BORNEO_LANGUAGE_ENTRIES, ...GENERATED_WORLD_LANGUAGE_ENTRIES];

const COMMUNITY_ENTRIES_KEY = 'dictionaryCommunityEntries';
const USER_STORAGE_KEY = '@echolingua_current_user';
const TRANSLATION_LANGUAGE_IDS = [
  'english',
  'malay',
  'indonesian',
  'mandarin',
  'spanish',
  'french',
  'arabic',
  'japanese',
  'korean',
  'german',
  'portuguese',
  'thai',
  'vietnamese',
  'russian',
  'italian',
  'turkish',
  'hindi',
  'iban',
  'bidayuh',
  'kadazan',
  'murut',
];

const TRANSLATION_LANGUAGE_OPTIONS = WORLD_LANGUAGES.filter((lang) =>
  TRANSLATION_LANGUAGE_IDS.includes(lang.id)
);

const sortWordsAtoZ = (items) =>
  [...items].sort((a, b) => a.word.localeCompare(b.word, undefined, { sensitivity: 'base' }));

const parseWordsFromText = (text) => {
  if (!text) return [];

  const cleaned = text
    .replace(/[^A-Za-z0-9\s'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const parts = cleaned.split(' ').filter((part) => part.length > 0);
  const unique = [];
  const seen = new Set();

  parts.forEach((part) => {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  });

  return unique;
};

const getLanguageLabelById = (languageId) => {
  const found = WORLD_LANGUAGES.find((lang) => lang.id === languageId);
  return found?.label || languageId;
};

export default function DictionaryScreen({ navigation }) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWord, setSelectedWord] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [communityEntries, setCommunityEntries] = useState([]);
  const [showDocumentationProject, setShowDocumentationProject] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newMeaningUsage, setNewMeaningUsage] = useState('');
  const [newPronunciation, setNewPronunciation] = useState('');
  const [newCulturalContext, setNewCulturalContext] = useState('');
  const [uploadedPronunciation, setUploadedPronunciation] = useState(null);
  const [sourceLanguageId, setSourceLanguageId] = useState('english');
  const [targetLanguageId, setTargetLanguageId] = useState('malay');
  const [currentUserRole, setCurrentUserRole] = useState('learner');
  const [activePronunciationWordId, setActivePronunciationWordId] = useState(null);
  const [isPronunciationPlaying, setIsPronunciationPlaying] = useState(false);
  const [pronunciationRecording, setPronunciationRecording] = useState(null);
  const [isRecordingPronunciation, setIsRecordingPronunciation] = useState(false);
  const pronunciationSoundRef = useRef(null);

  const dictionaryWords = useMemo(() => {
    const merged = [...DICTIONARY_DATA, ...communityEntries];
    return sortWordsAtoZ(merged);
  }, [communityEntries]);

  useEffect(() => {
    loadFavorites();
    loadRecentSearches();
    loadCommunityEntries();
    loadCurrentUserRole();
  }, []);

  useEffect(() => {
    return () => {
      if (pronunciationSoundRef.current) {
        pronunciationSoundRef.current.unloadAsync();
      }
      if (pronunciationRecording) {
        pronunciationRecording.stopAndUnloadAsync();
      }
    };
  }, [pronunciationRecording]);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('dictionaryFavorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Load favorites error:', error);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Load recent searches error:', error);
    }
  };

  const loadCommunityEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(COMMUNITY_ENTRIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCommunityEntries(parsed);
        }
      }
    } catch (error) {
      console.error('Load community entries error:', error);
    }
  };

  const saveCommunityEntries = async (entries) => {
    try {
      await AsyncStorage.setItem(COMMUNITY_ENTRIES_KEY, JSON.stringify(entries));
      setCommunityEntries(entries);
    } catch (error) {
      console.error('Save community entries error:', error);
      Alert.alert('Save Failed', 'Unable to store your contribution locally. Please try again.');
    }
  };

  const loadCurrentUserRole = async () => {
    try {
      const rawUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (!rawUser) {
        setCurrentUserRole('learner');
        return;
      }

      const parsed = JSON.parse(rawUser);
      setCurrentUserRole(parsed?.role || 'learner');
    } catch (error) {
      console.error('Load current user role error:', error);
      setCurrentUserRole('learner');
    }
  };

  const userCanVerifyEntries =
    currentUserRole === 'admin' || currentUserRole === 'moderator' || currentUserRole === 'language_expert';

  const verifyCommunityEntry = async (entryId) => {
    if (!userCanVerifyEntries) {
      Alert.alert('Moderator Access', 'Only moderators or language experts can verify entries.');
      return;
    }

    const updatedEntries = communityEntries.map((entry) => {
      if (entry.id !== entryId) {
        return entry;
      }

      return {
        ...entry,
        verificationStatus: 'Verified by language expert',
        verifiedAt: new Date().toISOString(),
      };
    });

    await saveCommunityEntries(updatedEntries);

    if (selectedWord?.id === entryId) {
      const verifiedEntry = updatedEntries.find((entry) => entry.id === entryId);
      if (verifiedEntry) {
        setSelectedWord(verifiedEntry);
      }
    }
  };

  const saveFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem('dictionaryFavorites', JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Save favorites error:', error);
    }
  };

  const saveRecentSearch = async (word) => {
    try {
      const updated = [word, ...recentSearches.filter((w) => w !== word)].slice(0, 10);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('Save recent search error:', error);
    }
  };

  const toggleFavorite = (wordId) => {
    const isFavorite = favorites.includes(wordId);
    const newFavorites = isFavorite
      ? favorites.filter((id) => id !== wordId)
      : [...favorites, wordId];
    saveFavorites(newFavorites);
  };

  const handleWordPress = (word) => {
    setSelectedWord(word);
    saveRecentSearch(word.word);
  };

  const playPronunciation = async (word) => {
    try {
      if (word.pronunciationAudioUri) {
        // Toggle pause/play if this word's audio is already loaded.
        if (pronunciationSoundRef.current && activePronunciationWordId === word.id) {
          if (isPronunciationPlaying) {
            await pronunciationSoundRef.current.pauseAsync();
            setIsPronunciationPlaying(false);
          } else {
            await pronunciationSoundRef.current.playAsync();
            setIsPronunciationPlaying(true);
          }
          return;
        }

        if (pronunciationSoundRef.current) {
          await pronunciationSoundRef.current.unloadAsync();
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: word.pronunciationAudioUri },
          { shouldPlay: true }
        );

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          setIsPronunciationPlaying(status.isPlaying);

          if (status.didJustFinish) {
            setIsPronunciationPlaying(false);
            setActivePronunciationWordId(null);
          }
        });

        pronunciationSoundRef.current = sound;
        setActivePronunciationWordId(word.id);
        setIsPronunciationPlaying(true);
        return;
      }

      Alert.alert('Pronunciation', `Playing pronunciation for: ${word.word}\n${word.pronunciation}`);
    } catch (error) {
      console.error('Play pronunciation error:', error);
      Alert.alert('Audio Error', 'Unable to play pronunciation audio on this device.');
    }
  };

  const startPronunciationRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Needed', 'Microphone permission is required to record pronunciation.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      setPronunciationRecording(recording);
      setIsRecordingPronunciation(true);
    } catch (error) {
      console.error('Start pronunciation recording error:', error);
      Alert.alert('Recording Error', 'Could not start pronunciation recording.');
    }
  };

  const stopPronunciationRecording = async () => {
    try {
      if (!pronunciationRecording) {
        return;
      }

      await pronunciationRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = pronunciationRecording.getURI();
      const filename = `pronunciation-${Date.now()}.m4a`;

      if (uri) {
        setUploadedPronunciation({
          uri,
          name: filename,
          mimeType: 'audio/m4a',
        });
      }

      setPronunciationRecording(null);
      setIsRecordingPronunciation(false);
    } catch (error) {
      console.error('Stop pronunciation recording error:', error);
      Alert.alert('Recording Error', 'Could not save pronunciation recording.');
      setIsRecordingPronunciation(false);
      setPronunciationRecording(null);
    }
  };

  const resetContributionForm = () => {
    setNewWord('');
    setNewLanguage('');
    setNewMeaningUsage('');
    setNewPronunciation('');
    setNewCulturalContext('');
    setUploadedPronunciation(null);
    setIsRecordingPronunciation(false);
    setPronunciationRecording(null);
  };

  const pickPronunciationAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setUploadedPronunciation(result.assets[0]);
      }
    } catch (error) {
      console.error('Pick pronunciation audio error:', error);
      Alert.alert('Upload Error', 'Could not select pronunciation audio.');
    }
  };

  const addCommunityEntry = async () => {
    if (!newWord.trim() || !newLanguage.trim() || !newMeaningUsage.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in word, language, and meaning/usage.');
      return;
    }

    const entry = {
      id: `community-${Date.now()}`,
      word: newWord.trim(),
      language: newLanguage.trim(),
      translation: newMeaningUsage.trim(),
      pronunciation: newPronunciation.trim() || 'N/A',
      partOfSpeech: 'Community Entry',
      examples: [newMeaningUsage.trim()],
      relatedWords: newCulturalContext.trim() ? [newCulturalContext.trim()] : [],
      category: 'Community',
      meaningAndUsage: newMeaningUsage.trim(),
      culturalContext: newCulturalContext.trim(),
      pronunciationAudioUri: uploadedPronunciation?.uri || null,
      pronunciationAudioName: uploadedPronunciation?.name || null,
      verificationStatus: 'Pending expert review',
      source: 'community',
      createdAt: new Date().toISOString(),
    };

    const updatedEntries = sortWordsAtoZ([...communityEntries, entry]);
    await saveCommunityEntries(updatedEntries);
    resetContributionForm();
    Alert.alert('Contribution Submitted', 'Your word is saved locally and pending language expert verification.');
  };

  const openScanOptions = () => {
    navigation.navigate('ScanImage');
  };

  const filteredWords = dictionaryWords.filter((word) => {
    const matchesSearch =
      word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      word.translation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = selectedLanguage === 'all' || word.language === selectedLanguage;
    const matchesCategory = selectedCategory === 'all' || word.category === selectedCategory;

    return matchesSearch && matchesLanguage && matchesCategory;
  });

  const sortedFilteredWords = sortWordsAtoZ(filteredWords);

  const renderWordCard = ({ item }) => (
    <TouchableOpacity style={[styles.wordCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => handleWordPress(item)} activeOpacity={0.8}>
      <View style={styles.wordCardHeader}>
        <View style={styles.wordCardInfo}>
          <Text style={[styles.wordText, { color: theme.text }]}>{item.word}</Text>
          <Text style={[styles.translationText, { color: theme.textSecondary }]}>{item.translation}</Text>
          <Text style={[styles.languageText, { color: theme.primary }]}>{item.language}</Text>
          {item.verificationStatus ? (
            <Text style={[styles.verificationBadge, { color: theme.warning || '#F59E0B' }]}>{item.verificationStatus}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
          <Ionicons
            name={favorites.includes(item.id) ? 'heart' : 'heart-outline'}
            size={24}
            color={favorites.includes(item.id) ? theme.error || '#FF6B6B' : theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderWordDetail = () => {
    if (!selectedWord) return null;

    return (
      <View style={[styles.detailContainer, { backgroundColor: theme.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedWord(null)}>
              <Ionicons name="arrow-back" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.detailTitle, { color: theme.text }]}>Word Details</Text>
            <TouchableOpacity onPress={() => toggleFavorite(selectedWord.id)}>
              <Ionicons
                name={favorites.includes(selectedWord.id) ? 'heart' : 'heart-outline'}
                size={28}
                color={favorites.includes(selectedWord.id) ? theme.error || '#FF6B6B' : theme.text}
              />
            </TouchableOpacity>
          </View>

          {/* Word Card */}
          <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.detailWord, { color: theme.text }]}>{selectedWord.word}</Text>
            <Text style={[styles.detailTranslation, { color: theme.textSecondary }]}>{selectedWord.translation}</Text>
            <View style={styles.metaContainer}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Language</Text>
                <Text style={[styles.metaValue, { color: theme.primary }]}>{selectedWord.language}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Type</Text>
                <Text style={[styles.metaValue, { color: theme.primary }]}>{selectedWord.partOfSpeech}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Category</Text>
                <Text style={[styles.metaValue, { color: theme.primary }]}>{selectedWord.category}</Text>
              </View>
            </View>
          </View>

          {/* Pronunciation */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Pronunciation</Text>
            <View style={[styles.pronunciationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pronunciationText, { color: theme.text }]}>{selectedWord.pronunciation}</Text>
                <Text style={[styles.pronunciationHint, { color: theme.textSecondary }]}>
                  {selectedWord.pronunciationAudioUri
                    ? activePronunciationWordId === selectedWord.id && isPronunciationPlaying
                      ? 'Playing uploaded pronunciation'
                      : 'Tap to play or pause uploaded pronunciation'
                    : 'No uploaded audio. Text pronunciation only.'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => playPronunciation(selectedWord)}
              >
                <Ionicons
                  name={
                    selectedWord.pronunciationAudioUri
                      ? activePronunciationWordId === selectedWord.id && isPronunciationPlaying
                        ? 'pause-circle'
                        : 'play-circle'
                      : 'play-circle-outline'
                  }
                  size={48}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {selectedWord.meaningAndUsage ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Meaning and Usage</Text>
              <View style={[styles.exampleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                <Text style={[styles.exampleText, { color: theme.text }]}>{selectedWord.meaningAndUsage}</Text>
              </View>
            </View>
          ) : null}

          {selectedWord.culturalContext ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Cultural Context</Text>
              <View style={[styles.exampleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                <Text style={[styles.exampleText, { color: theme.text }]}>{selectedWord.culturalContext}</Text>
              </View>
            </View>
          ) : null}

          {selectedWord.verificationStatus ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Moderation</Text>
              <View style={[styles.pronunciationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                <Text style={[styles.exampleText, { color: theme.text }]}>Status: {selectedWord.verificationStatus}</Text>
              </View>
              {selectedWord.source === 'community' && selectedWord.verificationStatus !== 'Verified by language expert' ? (
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { borderColor: theme.border, marginTop: SPACING.s }]}
                  onPress={() => verifyCommunityEntry(selectedWord.id)}
                  disabled={!userCanVerifyEntries}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={18}
                    color={userCanVerifyEntries ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.secondaryActionText,
                      { color: userCanVerifyEntries ? theme.text : theme.textSecondary },
                    ]}
                  >
                    Expert Verify
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {selectedWord.pronunciationAudioName ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Uploaded Pronunciation</Text>
              <View style={[styles.relatedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                <Text style={[styles.relatedText, { color: theme.text }]}>Audio file: {selectedWord.pronunciationAudioName}</Text>
              </View>
            </View>
          ) : null}

          {/* Examples */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Examples</Text>
            {(selectedWord.examples || []).map((example, index) => (
              <View key={index} style={[styles.exampleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.exampleText, { color: theme.text }]}>{example}</Text>
              </View>
            ))}
          </View>

          {/* Related Words */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Related Words</Text>
            {(selectedWord.relatedWords || []).map((related, index) => (
              <View key={index} style={[styles.relatedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.relatedText, { color: theme.text }]}>{related}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </View>
    );
  };

  if (selectedWord) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {renderWordDetail()}
      </SafeAreaView>
    );
  }

  const categories = ['all', ...new Set(dictionaryWords.map((w) => w.category))];
  const languages = ['all', ...new Set(dictionaryWords.map((w) => w.language))];
  const verifiedCount = communityEntries.filter((entry) => entry.verificationStatus === 'Verified by language expert').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Dictionary</Text>
        <TouchableOpacity onPress={() => Alert.alert('Info', `${dictionaryWords.length} words available`)}>
          <Ionicons name="information-circle" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search words..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={openScanOptions}
          style={{ padding: 4 }}
        >
          <Ionicons name="camera" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Recent Searches */}
      {searchQuery.length === 0 && recentSearches.length > 0 && (
        <View style={styles.recentContainer}>
          <Text style={[styles.recentTitle, { color: theme.textSecondary }]}>Recent Searches</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentSearches.map((word, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.recentChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setSearchQuery(word)}
              >
                <Text style={[styles.recentChipText, { color: theme.text }]}>{word}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Language Filter */}
      <View style={{ paddingHorizontal: SPACING.l, marginBottom: SPACING.s }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Languages</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: SPACING.l, gap: 10 }}
        >
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang}
              activeOpacity={0.7}
              style={[
                styles.filterBtn, 
                { 
                  backgroundColor: selectedLanguage === lang ? theme.primary : theme.surface,
                  borderColor: selectedLanguage === lang ? theme.primary : theme.border,
                  borderWidth: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  elevation: selectedLanguage === lang ? 4 : 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                }
              ]}
              onPress={() => setSelectedLanguage(lang)}
            >
              <Text style={[
                styles.filterText, 
                { 
                  color: selectedLanguage === lang ? '#FFFFFF' : theme.text,
                  fontWeight: selectedLanguage === lang ? '700' : '500', 
                  fontSize: 14,
                }
              ]}>
                {lang === 'all' ? 'All' : lang}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Category Filter */}
      <View style={{ paddingHorizontal: SPACING.l, marginBottom: SPACING.m }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: SPACING.l, gap: 10 }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.7}
              style={[
                styles.categoryBtn,
                { 
                  backgroundColor: selectedCategory === cat ? theme.primary : theme.surface,
                  borderColor: selectedCategory === cat ? theme.primary : theme.border,
                  borderWidth: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  elevation: selectedCategory === cat ? 4 : 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                }
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                styles.categoryText,
                { 
                  color: selectedCategory === cat ? '#FFFFFF' : theme.text,
                  fontWeight: selectedCategory === cat ? '700' : '500', 
                  fontSize: 14,
                }
              ]}>
                {cat === 'all' ? 'All' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={[styles.resultsBanner, { backgroundColor: theme.surfaceVariant }]}>
        <Text style={[styles.resultsText, { color: theme.textSecondary }]}>
          {sortedFilteredWords.length} word{sortedFilteredWords.length !== 1 ? 's' : ''} found (A-Z)
        </Text>
      </View>

      {/* Words List */}
      <FlatList
        data={sortedFilteredWords}
        renderItem={renderWordCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="book" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No words found</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Try adjusting your search or filters</Text>
          </View>
        }
      />

      {showDocumentationProject ? (
        <View style={styles.floatingFormWrap}>
          <View style={[styles.bottomFormCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <View style={styles.bottomFormHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.projectTitle, { color: theme.text }]}>Collaborative Dictionary Building</Text>
                <Text style={[styles.projectSubtitle, { color: theme.textSecondary }]}>Add words, meaning, usage and cultural context, then attach pronunciation by recording or uploading audio.</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDocumentationProject(false)}
                style={[styles.closeFormBtn, { borderColor: theme.border }]}
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.formSectionCard, { borderColor: theme.border, backgroundColor: theme.background }]}> 
              <Text style={[styles.formSectionTitle, { color: theme.text }]}>Word Information</Text>
              <Text style={[styles.formSectionHint, { color: theme.textSecondary }]}>Required fields are marked clearly so contributors can submit quickly.</Text>

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Word *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                placeholder="Enter the new word"
                placeholderTextColor={theme.textSecondary}
                value={newWord}
                onChangeText={setNewWord}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Language *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                placeholder="Example: Iban, Kadazan-Dusun"
                placeholderTextColor={theme.textSecondary}
                value={newLanguage}
                onChangeText={setNewLanguage}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Meaning and Usage *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface, minHeight: 88 }]}
                placeholder="Explain the meaning and how this word is used"
                placeholderTextColor={theme.textSecondary}
                value={newMeaningUsage}
                onChangeText={setNewMeaningUsage}
                multiline
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Cultural Context (optional)</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface, minHeight: 76 }]}
                placeholder="Add cultural story, tradition, or context"
                placeholderTextColor={theme.textSecondary}
                value={newCulturalContext}
                onChangeText={setNewCulturalContext}
                multiline
              />
            </View>

            <View style={[styles.formSectionCard, { borderColor: theme.border, backgroundColor: theme.background }]}> 
              <Text style={[styles.formSectionTitle, { color: theme.text }]}>Pronunciation Audio</Text>
              <Text style={[styles.formSectionHint, { color: theme.textSecondary }]}>Record correct pronunciation or upload an audio file from phone.</Text>

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Pronunciation Text (optional)</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                placeholder="Example: ko-to-bi-an"
                placeholderTextColor={theme.textSecondary}
                value={newPronunciation}
                onChangeText={setNewPronunciation}
              />

              <View style={styles.pronunciationActionRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryActionBtn,
                    styles.pronunciationActionBtn,
                    { borderColor: isRecordingPronunciation ? (theme.error || '#EF4444') : theme.border },
                  ]}
                  onPress={isRecordingPronunciation ? stopPronunciationRecording : startPronunciationRecording}
                >
                  <Ionicons
                    name={isRecordingPronunciation ? 'stop-circle' : 'mic-circle'}
                    size={18}
                    color={isRecordingPronunciation ? (theme.error || '#EF4444') : theme.primary}
                  />
                  <Text style={[styles.secondaryActionText, { color: theme.text }]}> 
                    {isRecordingPronunciation ? 'Stop Recording' : 'Record Pronunciation'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, styles.pronunciationActionBtn, { borderColor: theme.border }]}
                  onPress={pickPronunciationAudio}
                >
                  <Ionicons name="cloud-upload" size={18} color={theme.primary} />
                  <Text style={[styles.secondaryActionText, { color: theme.text }]}>Upload From Phone</Text>
                </TouchableOpacity>
              </View>
            </View>

            {uploadedPronunciation ? (
              <View style={[styles.selectedAudioCard, { borderColor: theme.border, backgroundColor: theme.background }]}> 
                <Ionicons name="musical-notes" size={16} color={theme.primary} />
                <Text style={[styles.uploadedFileText, { color: theme.textSecondary, flex: 1 }]}>Selected audio: {uploadedPronunciation.name}</Text>
                <TouchableOpacity onPress={() => setUploadedPronunciation(null)}>
                  <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              onPress={addCommunityEntry}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Add to Living Dictionary</Text>
            </TouchableOpacity>

            <Text style={[styles.moderationHint, { color: theme.textSecondary }]}>Moderation: language experts verify entries. Verified: {verifiedCount}. Pending: {communityEntries.length - verifiedCount}.</Text>
          </View>
        </View>
      ) : null}

      {!showDocumentationProject ? (
        <TouchableOpacity
          style={[styles.bottomAddIcon, { backgroundColor: theme.primary }]}
          onPress={() => setShowDocumentationProject(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.bottomAddIconText}>Living Dictionary</Text>
        </TouchableOpacity>
      ) : null}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  topPanels: {
    maxHeight: 56,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  featureChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectCard: {
    marginHorizontal: SPACING.l,
    marginTop: SPACING.s,
    padding: SPACING.m,
    borderRadius: 14,
    borderWidth: 1,
    gap: SPACING.s,
  },
  floatingFormWrap: {
    position: 'absolute',
    left: SPACING.l,
    right: SPACING.l,
    bottom: SPACING.l,
    zIndex: 20,
  },
  bottomFormCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: SPACING.m,
    gap: SPACING.s,
    maxHeight: 520,
  },
  bottomFormHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.s,
  },
  closeFormBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAddIcon: {
    position: 'absolute',
    right: SPACING.l,
    bottom: SPACING.l,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOWS.small,
  },
  bottomAddIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  projectSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  formSectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.s,
    gap: 8,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  formSectionHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  secondaryActionBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pronunciationActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pronunciationActionBtn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  selectedAudioCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  moderationHint: {
    fontSize: 12,
  },
  uploadedFileText: {
    fontSize: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  languagePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detectedWordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emptyDetectedText: {
    fontSize: 12,
  },
  wordPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  translationResultsWrap: {
    marginTop: 4,
  },
  translationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    paddingVertical: 7,
  },
  translationSource: {
    flex: 1,
    fontSize: 13,
  },
  translationTarget: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  verificationBadge: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.s,
    fontSize: 15,
    color: COLORS.text,
  },
  recentContainer: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
  },
  recentChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    marginRight: SPACING.s,
  },
  recentChipText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  filterContainer: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
    gap: SPACING.s,
  },
  filterBtn: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.surface,
  },
  categoryBtn: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  categoryBtnActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: COLORS.surface,
  },
  resultsBanner: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  wordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.s,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.small,
  },
  wordCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCardInfo: {
    flex: 1,
  },
  wordText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  translationText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  languageText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.m,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
    borderRadius: 16,
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
  },
  detailWord: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  detailTranslation: {
    fontSize: 20,
    color: COLORS.textSecondary,
    marginBottom: SPACING.l,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
    borderRadius: 16,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  pronunciationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.m,
  },
  pronunciationText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: COLORS.primary,
  },
  pronunciationHint: {
    marginTop: 4,
    fontSize: 12,
  },
  playBtn: {
    padding: SPACING.xs,
  },
  exampleCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.s,
  },
  exampleText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  relatedCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.s,
    marginBottom: SPACING.s,
  },
  relatedText: {
    fontSize: 14,
    color: COLORS.text,
  },
});

