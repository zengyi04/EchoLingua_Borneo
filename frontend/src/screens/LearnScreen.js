import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import {
  batchDownload,
  formatBytes,
  getOfflineContentByType,
  getOfflineContentSize,
  getOfflineLastSyncAt,
  getQueuedOfflineProgress,
  queueOfflineProgress,
  syncOfflineProgress,
  clearAllOfflineContent,
  deleteOfflineContent,
  getOfflineContent,
} from '../services/offlineLearningService';

const VOCABULARY_OFFLINE_PACK = [
  {
    id: 'offline-vocab-greetings',
    type: 'vocabulary',
    title: 'Vocabulary Set: Greetings',
    data: {
      words: ['Kotobian', 'Gawai', 'Belian'],
    },
  },
  {
    id: 'offline-vocab-family',
    type: 'vocabulary',
    title: 'Vocabulary Set: Family',
    data: {
      words: ['Family', 'Learn', 'Thank you'],
    },
  },
];

const STORIES_OFFLINE_PACK = [
  {
    id: 'offline-story-heritage-river',
    type: 'story',
    title: 'Story: River Heritage',
    data: {
      pages: 6,
      language: 'Kadazan-Dusun',
    },
  },
  {
    id: 'offline-story-mountain-echo',
    type: 'story',
    title: 'Story: Mountain Echo',
    data: {
      pages: 5,
      language: 'Iban',
    },
  },
];

const AUDIO_OFFLINE_PACK = [
  {
    id: 'offline-audio-greetings-lesson',
    type: 'audio',
    title: 'Audio Lesson: Daily Greetings',
    data: {
      lessonId: 'greetings-a1',
      originalText: 'Kotobian amai! Nama ku Bilal. Kumusta ka na?',
      languageLabel: 'Kadazan-Dusun',
    },
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'offline-audio-family-lesson',
    type: 'audio',
    title: 'Audio Lesson: Family Conversations',
    data: {
      lessonId: 'family-a1',
      originalText: 'Aku have family nu timpai. Sida kami happy tulus.',
      languageLabel: 'Iban',
    },
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
];

const TRANSLATION_LANGUAGES = [
  { id: 'english', label: 'English' },
  { id: 'malay', label: 'Malay' },
  { id: 'spanish', label: 'Spanish' },
];

const getLanguageCodeForSpeech = (langId) => {
  const map = {
    'english': 'en',
    'malay': 'ms',
    'spanish': 'es',
    'chinese': 'zh-CN',
  };
  return map[langId] || 'en';
};

export default function LearnScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [offlineSummary, setOfflineSummary] = useState({
    vocabulary: 0,
    stories: 0,
    audio: 0,
    storageLabel: '0 Bytes',
    pendingSync: 0,
    lastSyncAt: null,
  });
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [showOfflineList, setShowOfflineList] = useState(false);
  const [offlineContentList, setOfflineContentList] = useState([]);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [playingTranslationId, setPlayingTranslationId] = useState(null);
  const [selectedTranslationLang, setSelectedTranslationLang] = useState('english');
  const [audioSound, setAudioSound] = useState(null);
  const audioSoundRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      loadOfflineSummary();
    }, [])
  );

  useEffect(() => {
    loadOfflineSummary();
    return () => {
      if (audioSoundRef.current) {
        audioSoundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadOfflineSummary = async () => {
    try {
      const [vocabulary, stories, audio, bytes, queuedProgress, lastSyncAt, allContent] = await Promise.all([
        getOfflineContentByType('vocabulary'),
        getOfflineContentByType('story'),
        getOfflineContentByType('audio'),
        getOfflineContentSize(),
        getQueuedOfflineProgress(),
        getOfflineLastSyncAt(),
        getOfflineContent(),
      ]);

      setOfflineContentList(allContent);
      setOfflineSummary({
        vocabulary: vocabulary.length,
        stories: stories.length,
        audio: audio.length,
        storageLabel: formatBytes(bytes),
        pendingSync: queuedProgress.length,
        lastSyncAt,
      });
    } catch (error) {
      console.error('Load offline summary error:', error);
    }
  };

  const handleClearAllOffline = () => {
    Alert.alert(
      'Clear All Offline Content?',
      `This will delete ${offlineContentList.length} items and free ${offlineSummary.storageLabel} of storage. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          onPress: async () => {
            setOfflineBusy(true);
            try {
              await clearAllOfflineContent();
              await loadOfflineSummary();
              setShowOfflineList(false);
              Alert.alert('Cleared', 'All offline content has been deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear offline content.');
            } finally {
              setOfflineBusy(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleDeleteOfflineItem = (id, title) => {
    Alert.alert(
      'Delete This Content?',
      `Remove "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            setOfflineBusy(true);
            try {
              await deleteOfflineContent(id);
              await loadOfflineSummary();
              Alert.alert('Deleted', `"${title}" has been removed.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete content.');
            } finally {
              setOfflineBusy(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getContentTypeBadgeColor = (type) => {
    switch (type) {
      case 'vocabulary': return theme.success || '#10b981';
      case 'story': return theme.secondary || '#8b5cf6';
      case 'audio': return theme.primary || '#3b82f6';
      default: return theme.textSecondary;
    }
  };

  const downloadOfflinePack = async (packType) => {
    setOfflineBusy(true);
    try {
      let list = [];
      if (packType === 'vocabulary') {
        list = VOCABULARY_OFFLINE_PACK;
      }
      if (packType === 'stories') {
        list = STORIES_OFFLINE_PACK;
      }
      if (packType === 'audio') {
        list = AUDIO_OFFLINE_PACK;
      }

      const result = await batchDownload(list);
      await loadOfflineSummary();

      if (result.success) {
        Alert.alert('Offline Ready', `${packType} downloaded for offline learning.`);
      } else {
        Alert.alert('Download Finished', `${result.successful}/${result.total} items downloaded.`);
      }
    } catch (error) {
      console.error('Download offline pack error:', error);
      Alert.alert('Download Error', 'Failed to download offline pack.');
    } finally {
      setOfflineBusy(false);
    }
  };

  const handleLearnOffline = async () => {
    setOfflineBusy(true);
    try {
      const result = await queueOfflineProgress({
        type: 'lesson',
        title: 'Offline lesson completed',
        durationMinutes: 15,
        score: 1,
      });

      await loadOfflineSummary();

      if (result.success) {
        Alert.alert('Progress Saved Offline', 'Your learning progress is stored locally and will sync later.');
      }
    } catch (error) {
      console.error('Queue offline learning progress error:', error);
      Alert.alert('Offline Save Error', 'Unable to store offline progress.');
    } finally {
      setOfflineBusy(false);
    }
  };

  const handleSyncOfflineProgress = async () => {
    setOfflineBusy(true);
    try {
      const result = await syncOfflineProgress();
      await loadOfflineSummary();

      Alert.alert('Sync Complete', result.message || 'Offline progress synced.');
    } catch (error) {
      console.error('Sync offline progress error:', error);
      Alert.alert('Sync Error', 'Failed to sync offline progress.');
    } finally {
      setOfflineBusy(false);
    }
  };

  const playAudioLesson = async (lesson) => {
    try {
      if (playingAudioId === lesson.id) {
        // Toggle pause/play if already playing
        if (audioSoundRef.current) {
          const status = await audioSoundRef.current.getStatusAsync();
          if (status.isPlaying) {
            await audioSoundRef.current.pauseAsync();
            setPlayingAudioId(null);
          } else {
            await audioSoundRef.current.playAsync();
            setPlayingAudioId(lesson.id);
          }
        }
        return;
      }

      if (audioSoundRef.current) {
        await audioSoundRef.current.pauseAsync();
        await audioSoundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: lesson.audioUrl },
        { shouldPlay: true },
        (status) => {
          if (!status.isPlaying && status.didJustFinish) {
            setPlayingAudioId(null);
          }
        }
      );
      audioSoundRef.current = sound;
      setPlayingAudioId(lesson.id);
    } catch (error) {
      console.error('Play audio lesson error:', error);
      Alert.alert('Audio Error', 'Unable to play audio lesson.');
    }
  };

  const playTranslation = async (text, languageId) => {
    try {
      const languageCode = getLanguageCodeForSpeech(languageId);
      setPlayingTranslationId(languageId);
      
      await Speech.speak(text, {
        language: languageCode,
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setPlayingTranslationId(null),
        onError: (error) => {
          console.error('Speech error:', error);
          setPlayingTranslationId(null);
        },
      });
    } catch (error) {
      console.error('Play translation error:', error);
      setPlayingTranslationId(null);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Structured Lessons</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Master the basics step-by-step</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.offlineCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <View style={styles.offlineHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.offlineTitle, { color: theme.text }]}>📡 Offline Learning Mode</Text>
              <Text style={[styles.offlineSubtitle, { color: theme.textSecondary }]}>Download content to learn anytime, anywhere. Perfect for communities with limited internet.</Text>
            </View>
            {offlineBusy ? <ActivityIndicator color={theme.primary} /> : null}
          </View>

          <View style={[styles.offlineStatsGrid, { borderColor: theme.border }]}>
            <View style={styles.offlineStatBox}>
              <Ionicons name="book" size={20} color={theme.success || '#10b981'} />
              <Text style={[styles.offlineStatValue, { color: theme.text }]}>{offlineSummary.vocabulary}</Text>
              <Text style={[styles.offlineStatLabel, { color: theme.textSecondary }]}>Vocabulary</Text>
            </View>
            <View style={styles.offlineStatBox}>
              <Ionicons name="library" size={20} color={theme.secondary || '#8b5cf6'} />
              <Text style={[styles.offlineStatValue, { color: theme.text }]}>{offlineSummary.stories}</Text>
              <Text style={[styles.offlineStatLabel, { color: theme.textSecondary }]}>Stories</Text>
            </View>
            <View style={styles.offlineStatBox}>
              <Ionicons name="volume-high" size={20} color={theme.primary || '#3b82f6'} />
              <Text style={[styles.offlineStatValue, { color: theme.text }]}>{offlineSummary.audio}</Text>
              <Text style={[styles.offlineStatLabel, { color: theme.textSecondary }]}>Audio</Text>
            </View>
          </View>

          <View style={[styles.offineMetaSection, { backgroundColor: theme.background }]}>
            <View style={styles.offlineMetaRow}>
              <Ionicons name="hard-disk" size={16} color={theme.textSecondary} />
              <Text style={[styles.offlineMetaText, { color: theme.textSecondary }]}>Storage: {offlineSummary.storageLabel}</Text>
            </View>
            <View style={styles.offlineMetaRow}>
              <Ionicons name="sync" size={16} color={theme.textSecondary} />
              <Text style={[styles.offlineMetaText, { color: theme.textSecondary }]}>Pending sync: {offlineSummary.pendingSync} events</Text>
            </View>
            <View style={styles.offlineMetaRow}>
              <Ionicons name="time" size={16} color={theme.textSecondary} />
              <Text style={[styles.offlineMetaText, { color: theme.textSecondary }]}>
                Last sync: {offlineSummary.lastSyncAt ? new Date(offlineSummary.lastSyncAt).toLocaleDateString() : 'Not synced yet'}
              </Text>
            </View>
          </View>

          <View style={[styles.downloadPacksSection]}>
            <Text style={[styles.downloadPacksTitle, { color: theme.text }]}>Download Packs</Text>
            
            <TouchableOpacity 
              style={[styles.downloadPackBtn, { borderColor: theme.border, backgroundColor: theme.background }]} 
              onPress={() => downloadOfflinePack('vocabulary')} 
              disabled={offlineBusy}
            >
              <View style={styles.downloadPackIcon}>
                <Ionicons name="book" size={18} color={theme.success || '#10b981'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.downloadPackTitle, { color: theme.text }]}>Vocabulary Sets</Text>
                <Text style={[styles.downloadPackDesc, { color: theme.textSecondary }]}>Greetings, Family, Daily Words • ~2.5 MB</Text>
              </View>
              <Ionicons name="download" size={18} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.downloadPackBtn, { borderColor: theme.border, backgroundColor: theme.background }]} 
              onPress={() => downloadOfflinePack('stories')} 
              disabled={offlineBusy}
            >
              <View style={styles.downloadPackIcon}>
                <Ionicons name="library" size={18} color={theme.secondary || '#8b5cf6'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.downloadPackTitle, { color: theme.text }]}>Stories & Tales</Text>
                <Text style={[styles.downloadPackDesc, { color: theme.textSecondary }]}>Cultural stories (11 pages total) • ~3.8 MB</Text>
              </View>
              <Ionicons name="download" size={18} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.downloadPackBtn, { borderColor: theme.border, backgroundColor: theme.background }]} 
              onPress={() => downloadOfflinePack('audio')} 
              disabled={offlineBusy}
            >
              <View style={styles.downloadPackIcon}>
                <Ionicons name="volume-high" size={18} color={theme.primary || '#3b82f6'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.downloadPackTitle, { color: theme.text }]}>Audio Lessons</Text>
                <Text style={[styles.downloadPackDesc, { color: theme.textSecondary }]}>Pronunciation guides & conversations • ~12 MB</Text>
              </View>
              <Ionicons name="download" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.offlineActionRow}>
            <TouchableOpacity 
              style={[styles.offlineActionBtn, { backgroundColor: theme.primary, flex: 1 }]} 
              onPress={handleSyncOfflineProgress} 
              disabled={offlineBusy}
            >
              <Ionicons name="sync" size={16} color="#FFFFFF" />
              <Text style={styles.offlineActionBtnText}>Sync Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.offlineActionBtn, { borderWidth: 1, borderColor: theme.border, flex: 1, marginLeft: SPACING.s }]} 
              onPress={() => setShowOfflineList(!showOfflineList)} 
              disabled={offlineBusy}
            >
              <Ionicons name={showOfflineList ? 'chevron-up' : 'chevron-down'} size={16} color={theme.primary} />
              <Text style={[styles.offlineActionBtnText, { color: theme.primary }]}>View Files</Text>
            </TouchableOpacity>
          </View>

          {/* Offline Content List */}
          {showOfflineList && offlineContentList.length > 0 && (
            <View style={[styles.offlineList, { borderTopColor: theme.border }]}>
              <Text style={[styles.offlineListTitle, { color: theme.text }]}>Downloaded Content ({offlineContentList.length})</Text>
              {offlineContentList.map((item) => (
                <View key={item.id} style={[styles.offlineListItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View style={[styles.typeIndicator, { backgroundColor: getContentTypeBadgeColor(item.type) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.offlineListItemTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.offlineListItemDate, { color: theme.textSecondary }]}>
                      Downloaded {new Date(item.downloadedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteOfflineItem(item.id, item.title)}>
                    <Ionicons name="trash" size={18} color={theme.error || '#ef4444'} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity 
                style={[styles.clearAllBtn, { borderColor: theme.error || '#ef4444' }]}
                onPress={handleClearAllOffline}
              >
                <Ionicons name="trash-bin" size={16} color={theme.error || '#ef4444'} />
                <Text style={[styles.clearAllBtnText, { color: theme.error || '#ef4444' }]}>Clear All Content</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Audio Lessons with Translation */}
        <View style={styles.lessonSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🔊 Audio Lessons</Text>
          
          {AUDIO_OFFLINE_PACK.map((lesson) => (
            <View key={lesson.id} style={[styles.audioLessonCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {/* Lesson Title */}
              <View style={styles.audioLessonHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.audioLessonTitle, { color: theme.text }]}>{lesson.data.languageLabel}</Text>
                  <Text style={[styles.audioLessonSubtitle, { color: theme.textSecondary }]}>{lesson.title}</Text>
                </View>
                <View style={[styles.languageBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.languageBadgeText}>{lesson.data.languageLabel.substring(0, 2).toUpperCase()}</Text>
                </View>
              </View>

              {/* Original Text */}
              <View style={[styles.originalTextBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.originalTextLabel, { color: theme.textSecondary }]}>Original Text:</Text>
                <Text style={[styles.originalText, { color: theme.text }]}>{lesson.data.originalText}</Text>
              </View>

              {/* Play Original Audio */}
              <TouchableOpacity
                style={[styles.playAudioBtn, { backgroundColor: theme.primary, opacity: playingAudioId === lesson.id ? 0.7 : 1 }]}
                onPress={() => playAudioLesson(lesson)}
              >
                <Ionicons 
                  name={playingAudioId === lesson.id ? 'pause-circle' : 'play-circle'} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.playAudioBtnText}>
                  {playingAudioId === lesson.id ? 'Pause' : 'Play'} Original Audio
                </Text>
              </TouchableOpacity>

              {/* Translation Section */}
              <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SPACING.s, marginTop: SPACING.s }}>
                <Text style={[styles.translationTitle, { color: theme.text }]}>🌐 Translate to:</Text>
                
                <View style={styles.translationLangRow}>
                  {TRANSLATION_LANGUAGES.map((lang) => (
                    <TouchableOpacity
                      key={lang.id}
                      style={[
                        styles.translationLangPill,
                        {
                          backgroundColor: selectedTranslationLang === lang.id ? theme.primary : theme.background,
                          borderColor: selectedTranslationLang === lang.id ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedTranslationLang(lang.id)}
                    >
                      <Text style={[
                        styles.translationLangText,
                        { color: selectedTranslationLang === lang.id ? '#FFFFFF' : theme.text },
                      ]}>
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Play Translation */}
                <TouchableOpacity
                  style={[styles.playTranslationBtn, { borderColor: theme.primary, opacity: playingTranslationId === selectedTranslationLang ? 0.6 : 1 }]}
                  onPress={() => playTranslation(lesson.data.originalText, selectedTranslationLang)}
                  disabled={playingTranslationId === selectedTranslationLang}
                >
                  <Ionicons 
                    name={playingTranslationId === selectedTranslationLang ? 'hourglass' : 'volume-high'} 
                    size={18} 
                    color={theme.primary} 
                  />
                  <Text style={[styles.playTranslationBtnText, { color: theme.primary }]}>
                    {playingTranslationId === selectedTranslationLang ? 'Speaking...' : `Play in ${TRANSLATION_LANGUAGES.find(l => l.id === selectedTranslationLang)?.label}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Progress Overview */}
        <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>Course Progress</Text>
          <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
             <View style={[styles.progressBarFill, { width: '35%', backgroundColor: theme.secondary }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>Unit 1: Greetings • 4/12 Lessons</Text>
        </View>

        {/* Lesson List */}
        <View style={styles.lessonSection}>
           <Text style={[styles.sectionTitle, { color: theme.text }]}>Living Language Scenarios</Text>
           
           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card || theme.surface, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'home' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: theme.success }]}>
                <Ionicons name="home" size={20} color={theme.onPrimary || '#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>At Home (Di Rumah)</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Family conversations & daily routines</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'tamu' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: theme.secondary }]}>
                <Ionicons name="basket" size={20} color={theme.onPrimary || '#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>At the Tamu (Market)</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Bargaining & buying produce</Text>
              </View>
              <Ionicons name="play-circle" size={24} color={theme.primary} />
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'elders' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: theme.accent || COLORS.accent }]}>
                <Ionicons name="people" size={20} color={theme.onPrimary || '#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>Greeting Elders</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Respectful terms & gestures</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: theme.surfaceVariant }]}><Text style={[styles.tagText, { color: theme.accent || COLORS.accent }]}>CULTURE</Text></View>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'festival' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: '#E91E63' }]}> 
                <Ionicons name="musical-notes" size={20} color={'#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>Harvest Festival</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Songs & specialized vocabulary</Text>
              </View>
              <Ionicons name="play-circle" size={24} color={theme.primary} />
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'school' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: '#3F51B5' }]}> 
                <Ionicons name="school" size={20} color={'#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>At School</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Classroom phrases and introductions</Text>
              </View>
              <Ionicons name="play-circle" size={24} color={theme.primary} />
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'clinic' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: '#F44336' }]}> 
                <Ionicons name="medkit" size={20} color={'#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>At Clinic</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Health and help-seeking conversations</Text>
              </View>
              <Ionicons name="play-circle" size={24} color={theme.primary} />
           </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  content: {
    padding: SPACING.l,
  },
  progressCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    marginBottom: SPACING.l,
    ...SHADOWS.small,
  },
  offlineCard: {
    borderRadius: SPACING.m,
    borderWidth: 1,
    padding: SPACING.m,
    marginBottom: SPACING.l,
    ...SHADOWS.small,
  },
  offlineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.s,
    gap: SPACING.s,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  offlineSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  offlineStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.s,
    marginBottom: SPACING.s,
    paddingVertical: SPACING.s,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  offlineStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  offlineStatValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  offlineStatLabel: {
    fontSize: 11,
    marginTop: SPACING.xs,
  },
  offineMetaSection: {
    borderRadius: SPACING.xs,
    padding: SPACING.s,
    marginBottom: SPACING.s,
  },
  offlineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  offlineMetaText: {
    fontSize: 12,
  },
  downloadPacksSection: {
    marginBottom: SPACING.s,
  },
  downloadPacksTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: SPACING.s,
  },
  downloadPackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.s,
    marginBottom: SPACING.xs,
    gap: SPACING.s,
  },
  downloadPackIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  downloadPackTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  downloadPackDesc: {
    fontSize: 11,
    marginTop: SPACING.xs,
  },
  offlineActionRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    marginBottom: SPACING.s,
  },
  offlineActionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: SPACING.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  offlineActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  offlineList: {
    marginTop: SPACING.s,
    paddingTop: SPACING.s,
    borderTopWidth: 1,
  },
  offlineListTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: SPACING.s,
  },
  offlineListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.s,
    marginBottom: SPACING.xs,
    gap: SPACING.s,
  },
  typeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  offlineListItemTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  offlineListItemDate: {
    fontSize: 11,
    marginTop: SPACING.xs,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: SPACING.s,
    marginTop: SPACING.s,
    gap: SPACING.xs,
  },
  clearAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  offlineActionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  syncBtn: {
    marginTop: SPACING.s,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  lessonSection: {
    marginBottom: SPACING.l,
  },
  audioLessonCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    gap: SPACING.s,
    ...SHADOWS.small,
  },
  audioLessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.s,
  },
  audioLessonTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  audioLessonSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  languageBadge: {
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  languageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  originalTextBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.s,
    gap: SPACING.xs,
  },
  originalTextLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  originalText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  playAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.m,
    borderRadius: 10,
  },
  playAudioBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  translationTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: SPACING.s,
  },
  translationLangRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.s,
  },
  translationLangPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
  },
  translationLangText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playTranslationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: SPACING.m,
  },
  playTranslationBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    borderRadius: SPACING.m,
    marginBottom: SPACING.s,
    ...SHADOWS.small,
  },
  lessonLocked: {
    opacity: 0.6,
    backgroundColor: '#f9f9f9',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  lessonDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});