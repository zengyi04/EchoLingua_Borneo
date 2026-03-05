import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const FESTIVALS = [
  {
    id: '1',
    name: 'Pesta Kaamatan',
    language: 'Kadazandusun',
    date: 'May 30-31',
    description: 'Harvest festival celebrating the end of the rice planting season',
    icon: '🌾',
    traditions: ['Unduk Ngadau (beauty pageant)', 'Sumazau dance', 'Traditional sports', 'Rice wine drinking ceremony'],
    vocabulary: [
      { word: 'Kaamatan', meaning: 'Harvest', pronunciation: 'kah-ah-mah-tahn' },
      { word: 'Hinava', meaning: 'Traditional raw fish dish', pronunciation: 'hee-nah-vah' },
      { word: 'Sumazau', meaning: 'Traditional dance', pronunciation: 'soo-mah-zow' },
      { word: 'Tapai', meaning: 'Rice wine', pronunciation: 'tah-pie' },
    ],
    greetings: [
      { phrase: 'Kopivosian do Kaamatan', meaning: 'Happy Harvest Festival', pronunciation: 'koh-pee-voh-see-ahn doh kah-ah-mah-tahn' },
    ],
    activities: ['Learn the Sumazau dance', 'Try traditional Kadazandusun dishes', 'Visit Hongkod Koisaan cultural village'],
  },
  {
    id: '2',
    name: 'Gawai Dayak',
    language: 'Iban',
    date: 'June 1-2',
    description: 'Thanksgiving festival of the Iban people celebrating rice harvest',
    icon: '🎉',
    traditions: ['Miring ceremony (offering ritual)', 'Ngajat dance', 'Longhouse celebrations', 'Tuak drinking tradition'],
    vocabulary: [
      { word: 'Gawai', meaning: 'Festival', pronunciation: 'gah-why' },
      { word: 'Ngajat', meaning: 'Warrior dance', pronunciation: 'ngah-jaht' },
      { word: 'Tuak', meaning: 'Rice wine', pronunciation: 'too-ahk' },
      { word: 'Pua Kumbu', meaning: 'Traditional woven cloth', pronunciation: 'poo-ah koom-boo' },
    ],
    greetings: [
      { phrase: 'Gayu Guru Gerai Nyamai', meaning: 'Wishing you good health, long life, and prosperity', pronunciation: 'gah-yoo goo-roo geh-rye nyah-my' },
    ],
    activities: ['Experience Ngajat dance', 'Visit Iban longhouse', 'Learn about Pua Kumbu weaving'],
  },
  {
    id: '3',
    name: 'Regatta Lepa',
    language: 'Bajau',
    date: 'April (varies)',
    description: 'Sea festival featuring decorated boat competitions',
    icon: '⛵',
    traditions: ['Decorated lepa boats parade', 'Traditional sailing competitions', 'Sea-themed performances', 'Seafood feasts'],
    vocabulary: [
      { word: 'Lepa', meaning: 'Traditional boat', pronunciation: 'leh-pah' },
      { word: 'Sama', meaning: 'Sea people/Bajau people', pronunciation: 'sah-mah' },
      { word: 'Igal', meaning: 'Traditional dance', pronunciation: 'ee-gahl' },
      { word: 'Pangalay', meaning: 'Fingernail dance', pronunciation: 'pahn-gah-lie' },
    ],
    greetings: [
      { phrase: 'Salam Sejahtera', meaning: 'Peace be upon you', pronunciation: 'sah-lahm seh-jah-teh-rah' },
    ],
    activities: ['Watch decorated lepa boats', 'Learn Igal dance', 'Explore Bajau maritime culture'],
  },
  {
    id: '4',
    name: 'Pesta Kalimaran',
    language: 'Murut',
    date: 'May (varies)',
    description: 'Cultural festival celebrating Murut heritage and traditions',
    icon: '🏔️',
    traditions: ['Lansaran (traditional trampoline jumping)', 'Magunatip (warrior dance)', 'Bamboo musical performances', 'Traditional games'],
    vocabulary: [
      { word: 'Kalimaran', meaning: 'Celebration', pronunciation: 'kah-lee-mah-rahn' },
      { word: 'Lansaran', meaning: 'Spring board jumping', pronunciation: 'lahn-sah-rahn' },
      { word: 'Tagol', meaning: 'Traditional costume', pronunciation: 'tah-gohl' },
      { word: 'Sompoton', meaning: 'Bamboo mouth organ', pronunciation: 'sohm-poh-tohn' },
    ],
    greetings: [
      { phrase: 'Kopio Pizau', meaning: 'Good wishes', pronunciation: 'koh-pee-oh pee-zow' },
    ],
    activities: ['Try Lansaran jumping', 'Learn Magunatip dance', 'Listen to Sompoton music'],
  },
  {
    id: '5',
    name: 'Hari Gawai',
    language: 'Bidayuh',
    date: 'June 1',
    description: 'Thanksgiving and celebration of unity among Bidayuh people',
    icon: '🎊',
    traditions: ['Traditional bamboo dance', 'Gong performances', 'Community feasts', 'Blessing ceremonies'],
    vocabulary: [
      { word: 'Bidayuh', meaning: 'Land people', pronunciation: 'bee-dah-yoo' },
      { word: 'Tapai', meaning: 'Rice wine', pronunciation: 'tah-pie' },
      { word: 'Bario', meaning: 'Village', pronunciation: 'bah-ree-oh' },
      { word: 'Tanju', meaning: 'Communal drying platform', pronunciation: 'tahn-joo' },
    ],
    greetings: [
      { phrase: 'Selamat Hari Gawai', meaning: 'Happy Gawai Day', pronunciation: 'seh-lah-maht hah-ree gah-why' },
    ],
    activities: ['Join bamboo dance', 'Participate in gong performance', 'Visit Bidayuh village'],
  },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CulturalEventsScreen({ navigation }) {
  const { theme } = useTheme();
  const [selectedFestival, setSelectedFestival] = useState(null);
  const [filterLanguage, setFilterLanguage] = useState('all'); // all, Kadazandusun, Iban, Bajau, Murut
  const [playingSound, setPlayingSound] = useState(null);

  const filteredFestivals = filterLanguage === 'all'
    ? FESTIVALS
    : FESTIVALS.filter(f => f.language === filterLanguage);

  // Play word using Text-to-Speech
  const playWord = async (text, type, id) => {
    const soundId = `${type}-${id}`;
    
    // Stop any currently playing speech
    if (playingSound === soundId) {
      await Speech.stop();
      setPlayingSound(null);
      return;
    }

    // Stop previous sound and play new one
    await Speech.stop();
    setPlayingSound(soundId);

    Speech.speak(text, {
      language: 'ms-MY', // Malay
      pitch: 1.0,
      rate: 0.8, // Slightly slower for learning
      onDone: () => setPlayingSound(null),
      onStopped: () => setPlayingSound(null),
      onError: () => setPlayingSound(null),
    });
  };

  const renderFestivalCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.festivalCard, 
        { 
          backgroundColor: theme.surface, 
          // Removed border
          borderWidth: 0,
          elevation: 4, // Android shadow
          shadowColor: '#000', // iOS shadow
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          marginBottom: SPACING.m
        }
      ]}
      onPress={() => setSelectedFestival(item)}
      activeOpacity={0.8}
    >
      <View style={styles.festivalCardHeader}>
        <Text style={styles.festivalIcon}>{item.icon}</Text>
        <View style={styles.festivalCardInfo}>
          <Text style={[styles.festivalName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.festivalLanguage, { color: theme.textSecondary }]}>{item.language}</Text>
          <Text style={[styles.festivalDate, { color: theme.textSecondary }]}>{item.date}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={theme.primary} />
      </View>
      <Text style={[styles.festivalDescription, { color: theme.textSecondary }]} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  const renderFestivalDetail = () => {
    if (!selectedFestival) return null;

    return (
      <View style={[styles.detailContainer, { backgroundColor: theme.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.detailHeader, { backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={() => setSelectedFestival(null)}>
              <Ionicons name="arrow-back" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedFestival.name}</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Icon & Info */}
          <View style={[
            styles.detailHero, 
            { 
              backgroundColor: theme.surface, 
              borderColor: 'transparent',
              borderWidth: 0,
              elevation: 4,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 8
            }
          ]}>
            <Text style={styles.detailIcon}>{selectedFestival.icon}</Text>
            <Text style={[styles.detailLanguage, { color: theme.primary }]}>{selectedFestival.language}</Text>
            <Text style={[styles.detailDate, { color: theme.textSecondary }]}>{selectedFestival.date}</Text>
            <Text style={[styles.detailDescription, { color: theme.text }]}>{selectedFestival.description}</Text>
          </View>

          {/* Traditions */}
          <View style={[
            styles.detailSection, 
            { 
              backgroundColor: theme.surface, 
              borderColor: 'transparent', 
              borderWidth: 0,
              elevation: 2,
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 4,
              marginTop: SPACING.l // More spacing
            }
          ]}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="star" size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Traditions</Text>
            </View>
            {selectedFestival.traditions.map((tradition, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.bullet, { color: theme.primary }]}>•</Text>
                <Text style={[styles.listText, { color: theme.text }]}>{tradition}</Text>
              </View>
            ))}
          </View>

          {/* Vocabulary */}
          <View style={styles.detailSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book" size={20} color={theme.secondary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Festival Vocabulary</Text>
            </View>
            {selectedFestival.vocabulary.map((item, index) => (
              <View key={index} style={[styles.vocabularyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.vocabularyHeader}>
                  <Text style={[styles.vocabularyWord, { color: theme.text }]}>{item.word}</Text>
                  <TouchableOpacity 
                    style={[styles.soundBtn, { backgroundColor: theme.surfaceVariant }, playingSound === `vocab-${index}` && styles.soundBtnActive]}
                    onPress={() => playWord(item.word, 'vocab', index)}
                  >
                    <Ionicons 
                      name={playingSound === `vocab-${index}` ? "pause" : "volume-medium"} 
                      size={20} 
                      color={playingSound === `vocab-${index}` ? COLORS.surface : theme.primary} 
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.vocabularyMeaning, { color: theme.textSecondary }]}>{item.meaning}</Text>
                <Text style={[styles.vocabularyPronunciation, { color: theme.textSecondary }]}>📢 {item.pronunciation}</Text>
              </View>
            ))}
          </View>

          {/* Greetings */}
          <View style={styles.detailSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles" size={20} color="#FF6B6B" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Traditional Greetings</Text>
            </View>
            {selectedFestival.greetings.map((greeting, index) => (
              <View key={index} style={[styles.greetingCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <View style={styles.vocabularyHeader}>
                  <Text style={[styles.greetingPhrase, { color: theme.text }]}>{greeting.phrase}</Text>
                  <TouchableOpacity 
                    style={[styles.soundBtn, { backgroundColor: theme.card }, playingSound === `greeting-${index}` && styles.soundBtnActive]}
                    onPress={() => playWord(greeting.phrase, 'greeting', index)}
                  >
                    <Ionicons 
                      name={playingSound === `greeting-${index}` ? "pause" : "volume-medium"} 
                      size={20} 
                      color={playingSound === `greeting-${index}` ? COLORS.surface : theme.primary} 
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.greetingMeaning, { color: theme.textSecondary }]}>{greeting.meaning}</Text>
                <Text style={[styles.greetingPronunciation, { color: theme.textSecondary }]}>📢 {greeting.pronunciation}</Text>
              </View>
            ))}
          </View>

          {/* Activities */}
          <View style={styles.detailSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="tasks" size={20} color="#4ECDC4" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>What You Can Do</Text>
            </View>
            {selectedFestival.activities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[styles.activityNumber, { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={[styles.activityNumberText, { color: theme.primary }]}>{index + 1}</Text>
                </View>
                <Text style={[styles.activityText, { color: theme.text }]}>{activity}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </View>
    );
  };

  if (selectedFestival) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {renderFestivalDetail()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Cultural Events</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Language Filter */}
      <View style={{ paddingHorizontal: SPACING.l, paddingVertical: SPACING.s }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Filter by Culture</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: SPACING.l }}
        >
          {['all', 'Kadazandusun', 'Iban', 'Bajau', 'Murut'].map((lang) => (
            <TouchableOpacity
              key={lang}
              activeOpacity={0.7}
              style={[
                styles.filterBtn, 
                { 
                  backgroundColor: filterLanguage === lang ? theme.primary : theme.surface,
                  borderColor: filterLanguage === lang ? theme.primary : theme.border,
                  borderWidth: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  elevation: filterLanguage === lang ? 4 : 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                }
              ]}
              onPress={() => setFilterLanguage(lang)}
            >
              <Text style={[
                styles.filterText, 
                { 
                  color: filterLanguage === lang ? '#FFFFFF' : theme.text,
                  fontWeight: filterLanguage === lang ? '700' : '500',
                  fontSize: 14 
                }
              ]}>
                {lang === 'all' ? 'All' : lang}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: theme.surfaceVariant }]}>
        <FontAwesome5 name="info-circle" size={20} color={theme.primary} />
        <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
          Learn about indigenous festivals and their traditional vocabulary
        </Text>
      </View>

      {/* Festivals List */}
      <FlatList
        data={filteredFestivals}
        renderItem={renderFestivalCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="calendar" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No festivals found</Text>
          </View>
        }
      />
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
  filterContainer: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    gap: SPACING.s,
  },
  filterBtn: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
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
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.surface,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    marginHorizontal: SPACING.l,
    marginBottom: SPACING.m,
    borderRadius: 12,
    gap: SPACING.s,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  festivalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.small,
  },
  festivalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  festivalIcon: {
    fontSize: 40,
    marginRight: SPACING.m,
  },
  festivalCardInfo: {
    flex: 1,
  },
  festivalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  festivalLanguage: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  festivalDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  festivalDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.m,
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
  detailHero: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  detailIcon: {
    fontSize: 64,
    marginBottom: SPACING.m,
  },
  detailLanguage: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  detailDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  detailDescription: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  detailSection: {
    // backgroundColor: 'rgba(255, 255, 255, 0.1)', // Removed hardcoded
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
    borderRadius: 16,
    padding: SPACING.m,
    borderWidth: 0, // Removed border
    // borderColor: 'rgba(0,0,0,0.06)',
    elevation: 2, // Added shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF', // Default (will be overridden by theme if applied, but safe fallback)
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
    gap: SPACING.s,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: SPACING.s,
  },
  bullet: {
    fontSize: 16,
    color: COLORS.primary,
    marginRight: SPACING.s,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  vocabularyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.s,
  },
  vocabularyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  vocabularyWord: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  soundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundBtnActive: {
    backgroundColor: COLORS.primary,
  },
  vocabularyMeaning: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  vocabularyPronunciation: {
    fontSize: 13,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  greetingCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.s,
  },
  greetingPhrase: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  greetingMeaning: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  greetingPronunciation: {
    fontSize: 13,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  activityNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.s,
  },
  activityNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});
