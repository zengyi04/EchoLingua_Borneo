import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useNavigation, useRoute } from '@react-navigation/native';
import { translateText } from '../services/translationService';
import { WORLD_LANGUAGES } from '../constants/languages';
import {
  prepareSingleRecording,
  stopAndReleaseRecording,
  releaseRecordingReference,
} from '../services/recordingService';
import { analyzeRecording, saveScenarioResult } from '../services/scoringService';

const ROLEPLAY_RECORDS_KEY = '@echolingua_roleplay_records';

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
};

const LANGUAGE_CHOICES = WORLD_LANGUAGES.map((language) => ({
  id: language.id,
  label: `${language.flag} ${language.label}`,
  plainLabel: language.label,
  speechCode: SPEECH_CODES[language.id] || 'en-US',
}));

const BASE_SCENARIOS = [
  {
    id: 'home',
    title: 'At Home',
    icon: 'home',
    color: '#4CAF50',
    cases: [
      {
        id: 'morning-routine',
        title: 'Morning Routine',
        conversations: [
          { id: '1', indigenous: 'Selamat pagi! Suka ka nginum kopi?', translation: 'Good morning! Would you like some coffee?', speaker: 'elder' },
          { id: '2', indigenous: 'Iya, terima kasih banyak.', translation: 'Yes, thank you very much.', speaker: 'user' },
          { id: '3', indigenous: 'Apa khabar keluarga nuan?', translation: 'How is your family?', speaker: 'elder' },
          { id: '4', indigenous: 'Semua sihat, terima kasih.', translation: 'Everyone is healthy, thank you.', speaker: 'user' },
        ],
      },
      {
        id: 'meal-time',
        title: 'Meal Time',
        conversations: [
          { id: '1', indigenous: 'Kita makai tengah hari sama-sama.', translation: 'Let us have lunch together.', speaker: 'elder' },
          { id: '2', indigenous: 'Baik, saya tolong susun pinggan.', translation: 'Okay, I will help arrange the plates.', speaker: 'user' },
          { id: '3', indigenous: 'Ambik nasi, sayur, enggau ikan.', translation: 'Take rice, vegetables, and fish.', speaker: 'elder' },
          { id: '4', indigenous: 'Sedap amat masakan tok.', translation: 'This food is very delicious.', speaker: 'user' },
        ],
      },
    ],
  },
  {
    id: 'market',
    title: 'At Market',
    icon: 'basket',
    color: '#FF9800',
    cases: [
      {
        id: 'buy-vegetables',
        title: 'Buy Vegetables',
        conversations: [
          { id: '1', indigenous: 'Berapa ringgit sayur tu?', translation: 'How much are these vegetables?', speaker: 'user' },
          { id: '2', indigenous: 'Tiga ringgit sekilo.', translation: 'Three ringgit per kilo.', speaker: 'elder' },
          { id: '3', indigenous: 'Boleh kurang sikit?', translation: 'Can you reduce the price a bit?', speaker: 'user' },
          { id: '4', indigenous: 'Boleh, dua ringgit lima puluh.', translation: 'Okay, two ringgit fifty.', speaker: 'elder' },
        ],
      },
      {
        id: 'buy-fish',
        title: 'Buy Fish',
        conversations: [
          { id: '1', indigenous: 'Ikan tok segar ka?', translation: 'Is this fish fresh?', speaker: 'user' },
          { id: '2', indigenous: 'Sangat segar, ditangkap pagi tok.', translation: 'Very fresh, caught this morning.', speaker: 'elder' },
          { id: '3', indigenous: 'Aku ambik dua kilo.', translation: 'I will take two kilos.', speaker: 'user' },
          { id: '4', indigenous: 'Terima kasih, sila datang agi.', translation: 'Thank you, please come again.', speaker: 'elder' },
        ],
      },
    ],
  },
  {
    id: 'elders',
    title: 'Greeting Elders',
    icon: 'people',
    color: '#9C27B0',
    cases: [
      {
        id: 'visit-grandparents',
        title: 'Visit Grandparents',
        conversations: [
          { id: '1', indigenous: 'Selamat datai, lama kitak sik datai.', translation: 'Welcome, it has been a long time since you visited.', speaker: 'elder' },
          { id: '2', indigenous: 'Terima kasih. Apa khabar aki ngan ini?', translation: 'Thank you. How are grandpa and grandma?', speaker: 'user' },
          { id: '3', indigenous: 'Kami sihat, syukur.', translation: 'We are healthy, grateful.', speaker: 'elder' },
          { id: '4', indigenous: 'Bagus, saya gaga datai nuan hari tok.', translation: 'Great, I am happy to visit you today.', speaker: 'user' },
        ],
      },
      {
        id: 'ask-blessing',
        title: 'Ask for Blessing',
        conversations: [
          { id: '1', indigenous: 'Pak, minta doa sebelum aku berangkat.', translation: 'Sir, I ask for your prayer before I leave.', speaker: 'user' },
          { id: '2', indigenous: 'Semoga nuan selamat di perjalanan.', translation: 'May you be safe on your journey.', speaker: 'elder' },
          { id: '3', indigenous: 'Terima kasih atas nasihat nuan.', translation: 'Thank you for your advice.', speaker: 'user' },
          { id: '4', indigenous: 'Ingat adat enggau hormat selalu.', translation: 'Always remember tradition and respect.', speaker: 'elder' },
        ],
      },
    ],
  },
  {
    id: 'school',
    title: 'At School',
    icon: 'school',
    color: '#3F51B5',
    cases: [
      {
        id: 'introduce-yourself',
        title: 'Introduce Yourself',
        conversations: [
          { id: '1', indigenous: 'Nama aku Daniel. Nama nuan sapa?', translation: 'My name is Daniel. What is your name?', speaker: 'user' },
          { id: '2', indigenous: 'Nama aku Lina. Aku ari kampung seberang.', translation: 'My name is Lina. I am from the village across the river.', speaker: 'elder' },
          { id: '3', indigenous: 'Kelas kitak mulai pukul berapa?', translation: 'What time does your class begin?', speaker: 'user' },
          { id: '4', indigenous: 'Pukul lapan pagi, jangan lambat.', translation: 'At eight in the morning, do not be late.', speaker: 'elder' },
        ],
      },
      {
        id: 'ask-teacher-help',
        title: 'Ask Teacher Help',
        conversations: [
          { id: '1', indigenous: 'Cikgu, aku sik faham latihan tok.', translation: 'Teacher, I do not understand this exercise.', speaker: 'user' },
          { id: '2', indigenous: 'Baik, kita belajar langkah demi langkah.', translation: 'Okay, we will learn step by step.', speaker: 'elder' },
          { id: '3', indigenous: 'Terima kasih cikgu, aku cuba agi.', translation: 'Thank you teacher, I will try again.', speaker: 'user' },
          { id: '4', indigenous: 'Bagus, teruskan usaha nuan.', translation: 'Good, keep up your effort.', speaker: 'elder' },
        ],
      },
    ],
  },
  {
    id: 'clinic',
    title: 'At Clinic',
    icon: 'medkit',
    color: '#F44336',
    cases: [
      {
        id: 'register-counter',
        title: 'Register Counter',
        conversations: [
          { id: '1', indigenous: 'Aku datang berubat, di sini ka daftar?', translation: 'I came for treatment, do I register here?', speaker: 'user' },
          { id: '2', indigenous: 'Iya, sila isi borang tok.', translation: 'Yes, please fill this form.', speaker: 'elder' },
          { id: '3', indigenous: 'Bilik doktor nombor berapa?', translation: 'What is the doctor room number?', speaker: 'user' },
          { id: '4', indigenous: 'Nombor tiga, tunggu giliran.', translation: 'Number three, wait for your turn.', speaker: 'elder' },
        ],
      },
      {
        id: 'describe-symptom',
        title: 'Describe Symptom',
        conversations: [
          { id: '1', indigenous: 'Sejak semalam aku demam enggau batuk.', translation: 'Since yesterday I have fever and cough.', speaker: 'user' },
          { id: '2', indigenous: 'Baik, aku periksa suhu nuan dulu.', translation: 'Okay, I will check your temperature first.', speaker: 'elder' },
          { id: '3', indigenous: 'Perlu ubat berapa kali sehari?', translation: 'How many times per day should I take medicine?', speaker: 'user' },
          { id: '4', indigenous: 'Tiga kali selepas makan.', translation: 'Three times after meals.', speaker: 'elder' },
        ],
      },
    ],
  },
  {
    id: 'festival',
    title: 'Festival',
    icon: 'musical-notes',
    color: '#E91E63',
    cases: [
      {
        id: 'festival-prep',
        title: 'Festival Preparation',
        conversations: [
          { id: '1', indigenous: 'Gawai Dayak sudah dekat.', translation: 'Gawai Dayak is near.', speaker: 'elder' },
          { id: '2', indigenous: 'Mari kita siap rumah panjang.', translation: 'Let us prepare the longhouse.', speaker: 'user' },
          { id: '3', indigenous: 'Jangan lupa penganan tradisional.', translation: 'Do not forget traditional delicacies.', speaker: 'elder' },
          { id: '4', indigenous: 'Baik, aku bawa kuih dari rumah.', translation: 'Okay, I will bring cakes from home.', speaker: 'user' },
        ],
      },
      {
        id: 'festival-greeting',
        title: 'Festival Greeting',
        conversations: [
          { id: '1', indigenous: 'Selamat Gawai, gayu guru gerai nyamai.', translation: 'Happy Gawai, long life and prosperity.', speaker: 'elder' },
          { id: '2', indigenous: 'Selamat Gawai! Semoga tahun tok lebih manah.', translation: 'Happy Gawai! May this year be better.', speaker: 'user' },
          { id: '3', indigenous: 'Mari kita menari bersama.', translation: 'Let us dance together.', speaker: 'elder' },
          { id: '4', indigenous: 'Iya, aku ikut menari.', translation: 'Yes, I will join the dance.', speaker: 'user' },
        ],
      },
    ],
  },
];

const EXTRA_CASES = {
  home: [
    { id: 'cleaning-home', title: 'Clean Home Conversation', conversations: [
      { id: '1', indigenous: 'Kita sapu ruang tamu dulu.', translation: 'Let us sweep the living room first.', speaker: 'elder' },
      { id: '2', indigenous: 'Baik, saya lap meja sekarang.', translation: 'Okay, I will wipe the table now.', speaker: 'user' },
      { id: '3', indigenous: 'Selepas itu, susun buku di rak.', translation: 'After that, arrange the books on the shelf.', speaker: 'elder' },
      { id: '4', indigenous: 'Siap, rumah nampak kemas.', translation: 'Done, the house looks tidy.', speaker: 'user' },
    ] },
    { id: 'family-talk', title: 'Talk to Family', conversations: [
      { id: '1', indigenous: 'Adik, kerja sekolah sudah siap?', translation: 'Younger sibling, is your homework done?', speaker: 'elder' },
      { id: '2', indigenous: 'Belum lagi, saya buat selepas makan.', translation: 'Not yet, I will do it after eating.', speaker: 'user' },
      { id: '3', indigenous: 'Bagus, jangan lupa rehat juga.', translation: 'Good, do not forget to rest as well.', speaker: 'elder' },
      { id: '4', indigenous: 'Terima kasih kerana ingatkan.', translation: 'Thank you for reminding me.', speaker: 'user' },
    ] },
  ],
  market: [
    { id: 'buy-fruit', title: 'Buy Fruits', conversations: [
      { id: '1', indigenous: 'Mangga ini manis ka?', translation: 'Are these mangoes sweet?', speaker: 'user' },
      { id: '2', indigenous: 'Manis, baru sampai pagi tadi.', translation: 'Sweet, newly arrived this morning.', speaker: 'elder' },
      { id: '3', indigenous: 'Boleh cuba satu?', translation: 'Can I try one?', speaker: 'user' },
      { id: '4', indigenous: 'Boleh, silakan.', translation: 'Sure, please go ahead.', speaker: 'elder' },
    ] },
  ],
  elders: [
    { id: 'receive-advice', title: 'Receive Advice', conversations: [
      { id: '1', indigenous: 'Ingat, bercakap lembut dengan semua orang.', translation: 'Remember to speak gently with everyone.', speaker: 'elder' },
      { id: '2', indigenous: 'Baik, saya akan jaga tutur kata.', translation: 'Okay, I will mind my words.', speaker: 'user' },
      { id: '3', indigenous: 'Hormat orang tua bawa berkat.', translation: 'Respecting elders brings blessings.', speaker: 'elder' },
      { id: '4', indigenous: 'Saya faham, terima kasih.', translation: 'I understand, thank you.', speaker: 'user' },
    ] },
  ],
  school: [
    { id: 'group-work', title: 'Group Work', conversations: [
      { id: '1', indigenous: 'Kita bahagikan tugas projek ini.', translation: 'Let us divide this project work.', speaker: 'elder' },
      { id: '2', indigenous: 'Saya buat bahagian pembentangan.', translation: 'I will do the presentation section.', speaker: 'user' },
      { id: '3', indigenous: 'Bagus, saya siapkan laporan.', translation: 'Good, I will prepare the report.', speaker: 'elder' },
      { id: '4', indigenous: 'Kita semak bersama petang nanti.', translation: 'Let us review together this evening.', speaker: 'user' },
    ] },
  ],
  clinic: [
    { id: 'pharmacy', title: 'At Pharmacy', conversations: [
      { id: '1', indigenous: 'Ubat ini perlu makan sebelum makan?', translation: 'Should this medicine be taken before food?', speaker: 'user' },
      { id: '2', indigenous: 'Tidak, ambil selepas makan.', translation: 'No, take it after meals.', speaker: 'elder' },
      { id: '3', indigenous: 'Ada kesan sampingan ka?', translation: 'Are there side effects?', speaker: 'user' },
      { id: '4', indigenous: 'Jika pening, datang semula ke klinik.', translation: 'If dizzy, return to the clinic.', speaker: 'elder' },
    ] },
  ],
  festival: [
    { id: 'dance-practice', title: 'Dance Practice', conversations: [
      { id: '1', indigenous: 'Langkah kaki ikut rentak gong.', translation: 'Foot steps follow the gong rhythm.', speaker: 'elder' },
      { id: '2', indigenous: 'Macam ini ka, cikgu?', translation: 'Like this, teacher?', speaker: 'user' },
      { id: '3', indigenous: 'Ya, bagus, teruskan.', translation: 'Yes, good, continue.', speaker: 'elder' },
      { id: '4', indigenous: 'Seronok belajar tarian tradisi.', translation: 'It is fun learning traditional dance.', speaker: 'user' },
    ] },
  ],
};

const SCENARIOS = BASE_SCENARIOS.map((item) => ({
  ...item,
  cases: [...item.cases, ...(EXTRA_CASES[item.id] || [])],
}));

export default function LivingLanguageScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playingAudioKey, setPlayingAudioKey] = useState(null);
  const defaultFromLanguage = LANGUAGE_CHOICES.find((item) => item.id === 'malay') || LANGUAGE_CHOICES[0];
  const defaultToLanguage = LANGUAGE_CHOICES.find((item) => item.id === 'english') || LANGUAGE_CHOICES[1] || LANGUAGE_CHOICES[0];
  const [fromLanguage, setFromLanguage] = useState(defaultFromLanguage);
  const [toLanguage, setToLanguage] = useState(defaultToLanguage);
  const [activeLanguagePicker, setActiveLanguagePicker] = useState(null);
  const [adaptedConversations, setAdaptedConversations] = useState([]);
  const [loadingLanguage, setLoadingLanguage] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [records, setRecords] = useState([]);
  const [viewAllScenarios, setViewAllScenarios] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState(null);

  useEffect(() => {
    loadRecords();
    const setup = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
      });
    };
    setup();
    return () => {
      Speech.stop();
      if (recording) {
        releaseRecordingReference(recording);
      }
    };
  }, []);

  useEffect(() => {
    const routeKey = route.params?.scenario;
    if (!routeKey) {
      return;
    }
    const normalized = routeKey === 'tamu' ? 'market' : routeKey;
    const found = SCENARIOS.find((item) => item.id === normalized);
    if (found) {
      setSelectedScenario(found);
      setSelectedCase(found.cases[0]);
    }
  }, [route.params]);

  useEffect(() => {
    const localizeConversation = async () => {
      const source = selectedCase?.conversations || [];
      if (!source.length) {
        setAdaptedConversations([]);
        return;
      }

      try {
        setLoadingLanguage(true);
        const localized = await Promise.all(
          source.map(async (line) => ({
            ...line,
            indigenous: fromLanguage.id === 'malay' ? line.indigenous : await translateText(line.indigenous, fromLanguage.id),
            translation: toLanguage.id === 'english' ? line.translation : await translateText(line.translation, toLanguage.id),
          }))
        );
        setAdaptedConversations(localized);
      } catch (error) {
        console.error('Conversation localization failed:', error);
        setAdaptedConversations(source);
      } finally {
        setLoadingLanguage(false);
      }
    };

    localizeConversation();
  }, [selectedCase, fromLanguage, toLanguage]);

  const activeConversations = useMemo(() => adaptedConversations, [adaptedConversations]);

  const loadRecords = async () => {
    try {
      const raw = await AsyncStorage.getItem(ROLEPLAY_RECORDS_KEY);
      if (raw) {
        setRecords(JSON.parse(raw));
      }
    } catch (error) {
      console.error('Failed to load role-play records:', error);
    }
  };

  const saveRecord = async (entry) => {
    try {
      const updated = [entry, ...records].slice(0, 50);
      setRecords(updated);
      await AsyncStorage.setItem(ROLEPLAY_RECORDS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save role-play record:', error);
    }
  };

  const startRecord = async () => {
    if (isRecording) return;
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const activeRecording = await prepareSingleRecording();
      setRecording(activeRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Recording Error', `Could not start recording: ${error.message}`);
    }
  };

  const stopRecord = async () => {
    try {
      if (!recording || !selectedScenario || !selectedCase) {
        return;
      }
      const uri = await stopAndReleaseRecording(recording);
      setRecording(null);
      setIsRecording(false);
      if (!uri) {
        Alert.alert('Recording Failed', 'No recording file was produced.');
        return;
      }

      // Generate simulated user response based on case conversations
      const mockResponses = [
        activeConversations.find(c => c.speaker === 'user')?.indigenous || 'Hello, how are you?',
        'I am doing well, thank you for asking.',
        'That sounds interesting and I would like to learn more.',
        'Can you explain that again please?',
        'I understand, thank you for your help.',
      ];
      const simulatedUserResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      
      // Get expected response from scenario
      const expectedResponse = activeConversations.find(c => c.speaker === 'user')?.indigenous || '';
      
      // Use real scoring analysis
      const scores = analyzeRecording(simulatedUserResponse, expectedResponse, fromLanguage.id);
      
      const recordEntry = {
        id: Date.now().toString(),
        scenarioId: selectedScenario.id,
        scenarioTitle: selectedScenario.title,
        caseId: selectedCase.id,
        caseTitle: selectedCase.title,
        fromLanguage: fromLanguage.label,
        toLanguage: toLanguage.label,
        uri,
        scores,
        grammar: scores.grammar,
        pronunciation: scores.pronunciation,
        vocabulary: scores.vocabulary,
        overall: scores.overall,
        createdAt: new Date().toISOString(),
      };

      // Save to local records
      await saveRecord(recordEntry);
      
      // Save to scoring service for user profile
      await saveScenarioResult(recordEntry);
      
      playSound('complete');
      Alert.alert(
        'Analysis Complete',
        `Grammar: ${scores.grammar}%\nPronunciation: ${scores.pronunciation}%\nVocabulary: ${scores.vocabulary}%\nOverall: ${scores.overall}%`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Recording Error', 'Could not stop and score recording.');
      setIsRecording(false);
    }
  };

  const playLine = (lineId, text, speechCode = 'en-US', channel = 'source') => {
    if (!text) return;
    const audioKey = `${lineId}-${channel}`;

    if (playingAudioKey === audioKey) {
      Speech.stop();
      setPlayingAudioKey(null);
      return;
    }

    setPlayingAudioKey(audioKey);
    Speech.stop();
    Speech.speak(text, {
      language: speechCode,
      rate: 0.9,
      onDone: () => setPlayingAudioKey(null),
      onStopped: () => setPlayingAudioKey(null),
      onError: () => setPlayingAudioKey(null),
    });
  };

  const selectLanguage = (type, language) => {
    if (type === 'from') {
      setFromLanguage(language);
    } else {
      setToLanguage(language);
    }
    setActiveLanguagePicker(null);
  };

  const toggleLanguagePicker = (type) => {
    setActiveLanguagePicker((current) => (current === type ? null : type));
  };

  const handleBackFromPage = () => {
    if (selectedScenario) {
      setSelectedScenario(null);
      setSelectedCase(null);
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('HomeTab');
  };

  const filteredRecords = records.filter(
    (item) => item.scenarioId === selectedScenario?.id && item.caseId === selectedCase?.id
  );

  const renderScenarioCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.scenarioCard, 
        { 
          backgroundColor: theme.surface, 
          borderLeftColor: item.color,
          borderColor: 'transparent',
          shadowColor: theme.shadow,
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }
      ]}
      onPress={() => {
        setViewAllScenarios(false);
        setSelectedScenario(item);
        setSelectedCase(item.cases[0]);
      }}
    >
      <View style={[styles.scenarioIconContainer, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.scenarioTextContainer}>
        <Text style={[styles.scenarioTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.scenarioSubtitle, { color: theme.textSecondary }]}>{item.cases.length} cases</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  const renderCaseCardGridView = ({ item: scenario }) => (
    <View style={styles.scenarioGridSection} key={scenario.id}>
      <View 
        style={[
          styles.scenarioGridHeader, 
          { 
            borderLeftColor: scenario.color, 
            backgroundColor: theme.surface, 
            borderColor: 'transparent',
            shadowColor: theme.shadow,
            elevation: 2
          }
        ]}
      >
        <View style={[styles.scenarioGridIconContainer, { backgroundColor: scenario.color + '15' }]}>
          <Ionicons name={scenario.icon} size={20} color={scenario.color} />
        </View>
        <Text style={[styles.scenarioGridTitle, { color: theme.text }]}>{scenario.title}</Text>
      </View>
      <View style={styles.casesGridContainer}>
        {scenario.cases.map((caseItem) => (
          <TouchableOpacity
            key={caseItem.id}
            style={[
              styles.caseCardGrid, 
              { 
                borderTopColor: scenario.color, 
                backgroundColor: theme.surface, 
                borderColor: 'transparent',
                shadowColor: theme.shadow,
                elevation: 3
              }
            ]}
            onPress={() => {
              setSelectedScenario(scenario);
              setSelectedCase(caseItem);
              setViewAllScenarios(false);
            }}
          >
            <Text style={[styles.caseCardGridTitle, { color: theme.text }]} numberOfLines={2}>{caseItem.title}</Text>
            <View style={[styles.caseCardGridMetaRow, { borderColor: theme.border }]}>
              <Ionicons name="chatbubbles-outline" size={12} color={theme.textSecondary} />
              <Text style={[styles.caseCardGridMeta, { color: theme.textSecondary }]}>{caseItem.conversations.length} lines</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBackFromPage} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>{selectedScenario ? selectedScenario.title : 'Living Language'}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Choose language pair and practice real cases</Text>
        </View>
        {!selectedScenario && (
          <TouchableOpacity
            onPress={() => setViewAllScenarios(!viewAllScenarios)}
            style={styles.viewToggleButton}
          >
            <Ionicons name={viewAllScenarios ? 'grid' : 'list'} size={22} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.languageBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.languageChip,
            { backgroundColor: theme.primary + '12', borderColor: theme.primary + '55' },
            activeLanguagePicker === 'from' && { borderColor: theme.primary },
          ]}
          onPress={() => toggleLanguagePicker('from')}
        >
          <Text style={[styles.languageChipLabel, { color: theme.textSecondary }]}>From</Text>
          <Text style={[styles.languageChipValue, { color: theme.text }]}>{fromLanguage.label}</Text>
        </TouchableOpacity>
        <Ionicons name="arrow-forward" size={20} color={theme.textSecondary} />
        <TouchableOpacity
          style={[
            styles.languageChip,
            { backgroundColor: theme.primary + '12', borderColor: theme.primary + '55' },
            activeLanguagePicker === 'to' && { borderColor: theme.primary },
          ]}
          onPress={() => toggleLanguagePicker('to')}
        >
          <Text style={[styles.languageChipLabel, { color: theme.textSecondary }]}>To</Text>
          <Text style={[styles.languageChipValue, { color: theme.text }]}>{toLanguage.label}</Text>
        </TouchableOpacity>
      </View>

      {activeLanguagePicker && (
        <View style={[styles.languagePickerPanel, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.languagePickerTitle, { color: theme.text }]}>
            Select {activeLanguagePicker === 'from' ? 'From' : 'To'} Language
          </Text>
          <ScrollView style={styles.languageOptionsScroll} contentContainerStyle={styles.languageOptionsRow} showsVerticalScrollIndicator={false}>
            {LANGUAGE_CHOICES.map((language) => {
              const isSelected =
                activeLanguagePicker === 'from'
                  ? fromLanguage.id === language.id
                  : toLanguage.id === language.id;

              return (
                <TouchableOpacity
                  key={`${activeLanguagePicker}-${language.id}`}
                  style={[
                    styles.languageOption,
                    {
                      backgroundColor: isSelected ? theme.primary + '20' : theme.background,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => selectLanguage(activeLanguagePicker, language)}
                >
                  <Text style={[styles.languageOptionText, { color: isSelected ? theme.primary : theme.text }]}>
                    {language.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {!selectedScenario && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: theme.secondary }]}>
            <MaterialCommunityIcons name="information" size={20} color={theme.secondary} />
            <Text style={[styles.infoText, { color: theme.text }]}>{viewAllScenarios ? 'Browse all scenarios and cases. Tap any case to start practicing!' : 'Each scenario includes multiple case conversations. Tap a scenario to begin.'}</Text>
          </View>

          {!viewAllScenarios ? (
            <FlatList data={SCENARIOS} renderItem={renderScenarioCard} keyExtractor={(item) => item.id} scrollEnabled={false} contentContainerStyle={styles.scenarioList} />
          ) : (
            <View style={styles.scenariosGridView}>
              {SCENARIOS.map((scenario) => renderCaseCardGridView({ item: scenario }))}
            </View>
          )}
        </ScrollView>
      )}

      {selectedScenario && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.caseSelectorContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]} contentContainerStyle={styles.caseSelectorContent}>
            {(selectedScenario.cases || []).map((caseItem) => (
              <TouchableOpacity
                key={caseItem.id}
                style={[styles.caseButton, { backgroundColor: theme.background, borderColor: theme.border }, selectedCase?.id === caseItem.id && { borderColor: theme.primary, backgroundColor: theme.primary + '18' }]}
                onPress={() => setSelectedCase(caseItem)}
              >
                <Text style={[styles.caseText, { color: theme.textSecondary }, selectedCase?.id === caseItem.id && { color: theme.primary }]} numberOfLines={1}>{caseItem.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingLanguage && <Text style={[styles.loadingLang, { color: theme.textSecondary }]}>Updating conversations for selected languages...</Text>}

          <ScrollView style={styles.content}>
            <View style={styles.conversationList}>
              {activeConversations.map((line) => (
                <View key={line.id} style={[styles.lineCard, { borderColor: theme.border }, line.speaker === 'elder' ? [styles.elderCard, { backgroundColor: theme.surface, borderLeftColor: theme.primary }] : [styles.userCard, { backgroundColor: theme.surfaceVariant, borderRightColor: theme.secondary }]]}>
                  <View style={[styles.lineHeader, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.speakerTag, { color: theme.textSecondary }]}>{line.speaker === 'elder' ? 'Elder' : 'You'}</Text>
                    <TouchableOpacity onPress={() => playLine(line.id, line.indigenous, fromLanguage.speechCode || 'en-US', 'source')}>
                      <Ionicons name={playingAudioKey === `${line.id}-source` ? 'pause-circle' : 'play-circle'} size={22} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.lineText, { color: theme.text }]}>{line.indigenous}</Text>
                  {showTranslation && (
                    <View style={styles.translationRow}>
                      <Text style={[styles.translationText, { color: theme.textSecondary }]}>{line.translation}</Text>
                      <TouchableOpacity
                        style={[styles.translationPlayButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                        onPress={() => playLine(line.id, line.translation, toLanguage.speechCode || 'en-US', 'translation')}
                      >
                        <Ionicons
                          name={playingAudioKey === `${line.id}-translation` ? 'pause-circle' : 'volume-high'}
                          size={18}
                          color={theme.primary}
                        />
                        <Text style={[styles.translationPlayText, { color: theme.primary }]}>Play Translation</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={[styles.practiceSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.practiceHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.practiceTitle, { color: theme.text }]}>Record Response</Text>
                <TouchableOpacity onPress={() => setShowTranslation((prev) => !prev)}>
                  <Ionicons name={showTranslation ? 'eye-outline' : 'eye-off-outline'} size={22} color={theme.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                onPress={isRecording ? stopRecord : startRecord}
              >
                <Ionicons name={isRecording ? 'stop-circle' : 'mic'} size={22} color={theme.card} />
                <Text style={[styles.recordButtonText, { color: theme.card }]}>{isRecording ? 'Stop & Score' : 'Start Recording'}</Text>
              </TouchableOpacity>

              <Text style={[styles.recordsTitle, { color: theme.text }]}>Saved Results for This Case</Text>
              {filteredRecords.length === 0 && (
                <Text style={[styles.emptyRecordsText, { color: theme.textSecondary }]}>No records yet. Record a response to see accuracy, grammar, and vocabulary scores.</Text>
              )}
              {filteredRecords.map((entry) => (
                <View key={entry.id} style={[styles.recordItem, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, borderLeftColor: theme.success }]}>
                  <Text style={[styles.recordCase, { color: theme.text }]}>{entry.caseTitle}</Text>
                  <Text style={[styles.recordMeta, { color: theme.textSecondary }]}>{entry.fromLanguage} to {entry.toLanguage}</Text>
                  <Text style={[styles.recordScores, { color: theme.primary }]}>
                    Accuracy {entry.scores.accuracy}% | Grammar {entry.scores.grammar}% | Vocabulary {entry.scores.vocabulary}% | Overall {entry.scores.overall}%
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    ...SHADOWS.small,
  },
  backButton: { padding: SPACING.xs },
  headerCenter: { flex: 1, marginLeft: SPACING.s },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    padding: SPACING.s,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  languageChip: {
    borderWidth: 1.5,
    borderColor: COLORS.primary + '55',
    borderRadius: SPACING.s,
    backgroundColor: COLORS.primary + '12',
    paddingVertical: 6,
    paddingHorizontal: SPACING.m,
    minWidth: 120,
  },
  languageChipLabel: { fontSize: 11, color: COLORS.textSecondary },
  languageChipValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  languagePickerPanel: {
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
    paddingBottom: SPACING.m,
    borderBottomWidth: 1,
  },
  languagePickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: SPACING.s,
  },
  languageOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  languageOptionsScroll: {
    maxHeight: 220,
  },
  languageOption: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: SPACING.m,
    paddingVertical: 8,
  },
  languageOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: { flex: 1 },
  infoCard: {
    flexDirection: 'row',
    gap: SPACING.s,
    margin: SPACING.m,
    padding: SPACING.m,
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    ...SHADOWS.small,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.text },
  scenarioList: { paddingHorizontal: SPACING.m, paddingBottom: SPACING.l },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.l,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: SPACING.m,
    padding: SPACING.l,
    ...SHADOWS.medium,
  },
  scenarioIconContainer: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: SPACING.m,
    ...SHADOWS.small,
  },
  scenarioTextContainer: { flex: 1 },
  scenarioTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  scenarioSubtitle: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  caseSelectorContainer: { 
    backgroundColor: COLORS.glassLight, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    maxHeight: 60, // Limit container height
  },
  caseSelectorContent: { 
    paddingHorizontal: SPACING.m, 
    paddingVertical: 10, // Fixed vertical padding 
    gap: SPACING.s,
    alignItems: 'center', // Center items vertically
  },
  caseButton: { 
    backgroundColor: COLORS.background, 
    borderRadius: 20, // Pill shape for formal/modern look
    paddingHorizontal: 16, 
    paddingVertical: 6, // Reduced height 
    borderWidth: 1, 
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    height: 32, // Fixed height for "normal" look
  },
  caseButtonActive: { 
    borderColor: COLORS.primary, 
    backgroundColor: COLORS.primary + '18' 
  },
  caseText: { 
    fontSize: 13, // Slightly larger for readability
    color: COLORS.textSecondary, 
    fontWeight: '500', 
    maxWidth: 160 
  },
  caseTextActive: { color: COLORS.primary, fontWeight: '700' },
  loadingLang: { fontSize: 12, color: COLORS.textSecondary, paddingHorizontal: SPACING.m, paddingTop: SPACING.s },
  conversationList: { padding: SPACING.m, gap: SPACING.m },
  lineCard: { 
    borderRadius: SPACING.l, 
    padding: SPACING.l, 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.medium,
  },
  elderCard: { 
    backgroundColor: COLORS.glassLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  userCard: { 
    backgroundColor: COLORS.glassMedium,
    borderRightWidth: 4,
    borderRightColor: COLORS.secondary,
  },
  lineHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: SPACING.s,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  speakerTag: { 
    fontSize: 11, 
    color: COLORS.textSecondary, 
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lineText: { 
    fontSize: 16, 
    color: COLORS.text, 
    fontWeight: '600',
    lineHeight: 24,
  },
  translationText: { 
    marginTop: SPACING.s, 
    fontSize: 14, 
    color: COLORS.textSecondary, 
    fontStyle: 'italic',
    lineHeight: 20,
  },
  translationRow: {
    marginTop: SPACING.s,
    gap: SPACING.s,
  },
  translationPlayButton: {
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderRadius: SPACING.s,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
  },
  translationPlayText: {
    fontSize: 12,
    fontWeight: '700',
  },
  practiceSection: { 
    margin: SPACING.m, 
    marginTop: 0, 
    backgroundColor: COLORS.glassLight, 
    borderRadius: SPACING.l, 
    borderWidth: 2, 
    borderColor: 'rgba(255, 255, 255, 0.5)', 
    padding: SPACING.l, 
    ...SHADOWS.large,
  },
  practiceHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: SPACING.m,
    paddingBottom: SPACING.s,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  practiceTitle: { fontSize: 18, color: COLORS.text, fontWeight: '800' },
  recordButton: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: SPACING.s, 
    backgroundColor: COLORS.error, 
    borderRadius: SPACING.m, 
    paddingVertical: SPACING.m,
    ...SHADOWS.medium,
  },
  recordButtonActive: { backgroundColor: '#B71C1C' },
  recordButtonText: { color: COLORS.surface, fontWeight: '700' },
  recordsTitle: { 
    marginTop: SPACING.l, 
    marginBottom: SPACING.m, 
    fontSize: 15, 
    fontWeight: '800', 
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyRecordsText: { 
    fontSize: 13, 
    color: COLORS.textSecondary, 
    lineHeight: 20,
    fontStyle: 'italic',
  },
  recordItem: { 
    backgroundColor: COLORS.glassMedium, 
    borderRadius: SPACING.m, 
    padding: SPACING.m, 
    marginBottom: SPACING.m, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    ...SHADOWS.small,
  },
  recordCase: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  recordMeta: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  recordScores: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  viewToggleButton: { padding: SPACING.s, marginRight: SPACING.xs },
  scenariosGridView: { paddingHorizontal: SPACING.m, paddingBottom: SPACING.l },
  scenarioGridSection: { marginBottom: SPACING.l },
  scenarioGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  scenarioGridIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.s,
  },
  scenarioGridTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  casesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
    justifyContent: 'space-between',
  },
  caseCardGrid: {
    width: '48%',
    backgroundColor: COLORS.glassLight,
    borderTopWidth: 4,
    borderRadius: SPACING.l,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    padding: SPACING.l,
    ...SHADOWS.medium,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  caseCardGridTitle: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: COLORS.text, 
    marginBottom: SPACING.m,
    lineHeight: 22,
    flex: 1,
  },
  caseCardGridMetaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.xs,
    paddingTop: SPACING.s,
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  caseCardGridMeta: { 
    fontSize: 12, 
    color: COLORS.textSecondary, 
    fontWeight: '600' 
  },
  aiChatCard: {
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    padding: SPACING.m,
    borderRadius: SPACING.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    borderWidth: 1,
  },
  aiChatIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiChatContent: {
    flex: 1,
  },
  aiChatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiChatSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
});
