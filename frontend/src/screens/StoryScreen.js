import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { MaterialIcons, Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { stories } from '../data/mockData';
import { COLORS, SPACING, SHADOWS, FONTS, GLASS_EFFECTS } from '../constants/theme';
import { playSound } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';

export default function StoryScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [showTranslation, setShowTranslation] = useState(false);
  const [isElderMode, setIsElderMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSound, setAudioSound] = useState(null);
  const [audioSource, setAudioSource] = useState(null); // 'recorded' or 'tts'

  const route = useRoute();
  const { storyId, story: passedStory } = route.params || {};
  const story = passedStory || stories.find(s => s.id === storyId) || stories[0]; 
  
  // Check if this is a community story (has audioUri) or default story (has pages)
  const isCommunityStory = !!story.audioUri; 

  const buildReadableStoryText = () => {
    if (isCommunityStory) {
      return story.transcript || 'No transcript available for this story yet.';
    }

    if (Array.isArray(story.pages) && story.pages.length > 0) {
      return story.pages.map((page) => page.text).join(' ');
    }

    return story.title || 'Story content unavailable.';
  };

  const getSpeechLanguageCode = () => {
    const langId = story.languageId || '';
    const map = {
      english: 'en-US',
      malay: 'ms-MY',
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

    return map[langId] || 'en-US';
  };

  const speakStoryFallback = async () => {
    const text = buildReadableStoryText();
    if (!text || text.trim().length === 0) {
      Alert.alert('Audio Unavailable', 'No readable story content found.');
      return;
    }

    setIsPlaying(true);
    setAudioSource('tts'); // Mark as TTS
    playSound('play');

    Speech.stop();
    Speech.speak(text, {
      language: getSpeechLanguageCode(),
      rate: 0.9,
      pitch: 1.0,
      onDone: () => {
        setIsPlaying(false);
        playSound('complete');
      },
      onStopped: () => {
        setIsPlaying(false);
      },
      onError: () => {
        setIsPlaying(false);
        Alert.alert('Audio Error', 'Text-to-speech failed for this story.');
      },
    });
  };

  const toggleAudio = async () => {
    try {
      // If playing, pause
      if (isPlaying && audioSound) {
        console.log('⏸️ Pausing story audio');
        await audioSound.pauseAsync();
        playSound('pause');
        setIsPlaying(false);
      }
      // If paused, resume
      else if (isPlaying && !audioSound && audioSource === 'tts') {
        // TTS is being paused via Speech API
        Speech.stop();
        setIsPlaying(false);
      }
      // If already has sound but not playing, resume
      else if (audioSound && !isPlaying) {
        console.log('▶️ Resuming story audio');
        await audioSound.playAsync();
        playSound('play');
        setIsPlaying(true);
      }
      // Otherwise start fresh playback
      else {
        console.log('▶️ Loading and playing story audio');

        // Stop any TTS that might be playing
        if (audioSource === 'tts') {
          Speech.stop();
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });
        
        // Check if story has audio URI
        if (story.audioUri) {
          // Load and play actual audio file
          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri: story.audioUri },
              { shouldPlay: true, volume: 1.0 },
              (status) => {
                if (status.didJustFinish) {
                  console.log('✅ Story audio completed');
                  setIsPlaying(false);
                  playSound('complete');
                }
              }
            );
            setAudioSound(sound);
            setAudioSource('recorded'); // Mark as recorded audio
            setIsPlaying(true);
            playSound('play');
          } catch (audioError) {
            console.log('⚠️ Could not play recorded audio, falling back to TTS');
            await speakStoryFallback();
          }
        } else {
          // Fallback for stories without recorded audio: read the story via TTS.
          console.log('ℹ️ No story audio file - using TTS fallback');
          await speakStoryFallback();
        }
      }
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      // Final fallback path for playback failures.
      try {
        await speakStoryFallback();
      } catch (_) {
        Alert.alert('Audio Error', 'Could not play story audio: ' + error.message);
        setIsPlaying(false);
      }
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioSound) {
        console.log('🧹 Cleaning up audio sound');
        audioSound.unloadAsync();
      }
      Speech.stop();
    };
  }, [audioSound]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Back Button */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
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
         <View style={{ flex: 1 }}>
            <Text style={[styles.category, { color: theme.secondary }]}>FOLKLORE</Text>
            <Text style={[styles.title, { color: theme.text }]}>{story.title}</Text>
            <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={16} color={theme.textSecondary} /> 
                <Text style={[styles.metaText, { color: theme.textSecondary }]}> 5 min read</Text>
                <Text style={[styles.metaDivider, { color: theme.textSecondary }]}>•</Text>
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>Intermediate</Text>
            </View>
         </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Controls */}
        <View style={[
          styles.controlsCard, 
          { 
            backgroundColor: theme.surface, 
            borderWidth: 0, // Removed border
            elevation: 2,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 4, 
          }
        ]}>
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: theme.text }]}>Show Translation</Text>
            <Switch 
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={showTranslation ? theme.surface : theme.textSecondary}
              value={showTranslation} 
              onValueChange={setShowTranslation} 
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: theme.text }]}>Elder Mode (Larger Text)</Text>
            <Switch 
              trackColor={{ false: theme.border, true: theme.secondary }}
              thumbColor={isElderMode ? theme.surface : theme.textSecondary}
              value={isElderMode} 
              onValueChange={setIsElderMode} 
            />
          </View>
        </View>

        {/* Audio Player */}
        <TouchableOpacity style={[styles.audioPlayer, isCommunityStory && [styles.audioPlayerDark, { backgroundColor: theme.surface }], !isCommunityStory && { backgroundColor: theme.primary }]} onPress={toggleAudio} activeOpacity={0.9}>
           <View style={[styles.playButton, isCommunityStory && [styles.playButtonDark, { backgroundColor: theme.primary }], !isCommunityStory && { backgroundColor: theme.surface }]}>
             <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={32} color={isCommunityStory ? theme.surface : theme.primary} />
           </View>
           <View style={styles.audioInfo}>
             <Text style={[styles.audioTitle, isCommunityStory && [styles.audioTitleDark, { color: theme.text }], !isCommunityStory && { color: theme.onPrimary || '#FFFFFF' }]}>
               {isCommunityStory ? 'Listen to Recording' : 'Listen to Legend'}
             </Text>
             <Text style={[styles.audioSubtitle, isCommunityStory && [styles.audioSubtitleDark, { color: theme.textSecondary }], !isCommunityStory && { color: 'rgba(255,255,255,0.8)' }]}>
               {isCommunityStory ? `Community Story • ${story.language}` : 'Narrated by Elder Kambera'}
             </Text>
             {audioSource && isPlaying && (
               <Text style={[styles.audioSourceLabel, { color: isCommunityStory ? theme.text : (theme.onPrimary || '#FFFFFF') }]}>
                 🔊 {audioSource === 'recorded' ? '🎙️ Recorded Audio' : '🗣️ Voice Reading (TTS)'}
               </Text>
             )}
           </View>
           <Feather name="headphones" size={24} color={isCommunityStory ? theme.primary : (theme.onPrimary || '#FFFFFF')} style={{ opacity: 0.5 }} />
        </TouchableOpacity>

        {/* Story Content */}
        <View style={[
          styles.contentCard, 
          { 
            backgroundColor: theme.surface, 
            borderWidth: 0,
            elevation: 3,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 8,
          }
        ]}>
          {isCommunityStory ? (
            // Community story: Show transcript
            <View style={styles.pageContainer}>
               <Text style={[
                 styles.storyText, 
                 { color: theme.text },
                 isElderMode && styles.elderText
               ]}>
                  {story.transcript || 'No transcript available.'}
               </Text>
               
               {showTranslation && (
                 <View style={[styles.translationBox, { backgroundColor: theme.glassMedium, borderLeftColor: theme.secondary }]}>
                   <Text style={[styles.translationLabel, { color: theme.secondary }]}>Translation:</Text>
                   <Text style={[styles.translationText, { color: theme.textSecondary }]}>
                     Translation feature coming soon...
                     {/* TODO: Implement dynamic translation based on user language preference */}
                   </Text>
                 </View>
               )}
            </View>
          ) : (
            // Default story: Show pages
            story.pages?.map((page, index) => (
              <View key={index} style={styles.pageContainer}>
                 <Text style={[
                   styles.storyText, 
                   { color: theme.text },
                   isElderMode && styles.elderText
                 ]}>
                    {page.text}
                 </Text>
                 
                 {showTranslation && (
                   <View style={[styles.translationBox, { backgroundColor: theme.glassMedium, borderLeftColor: theme.secondary }]}>
                     <Text style={[styles.translationLabel, { color: theme.secondary }]}>Translation:</Text>
                     <Text style={[styles.translationText, { color: theme.textSecondary }]}>
                       {page.translation}
                       {/* TODO: Implement dynamic translation based on user language preference */}
                     </Text>
                   </View>
                 )}
              </View>
            ))
          )}
        </View>
        
        {/* Create Your Own Story CTA */}
        <TouchableOpacity 
          style={[styles.createStoryButton, { backgroundColor: theme.secondary }]} 
          onPress={() => navigation.navigate('Record', { createStory: true })}
        >
           <FontAwesome5 name="pencil-alt" size={20} color={theme.onPrimary || '#FFFFFF'} />
           <Text style={[styles.createStoryText, { color: theme.onPrimary || '#FFFFFF' }]}>Create Your Own Folktale</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.l,
    paddingBottom: SPACING.xxl,
  },
  header: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
    paddingBottom: SPACING.m,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  backButton: {
    marginRight: SPACING.m,
    marginTop: 4, // Align with text
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 1.5,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 24, // Slightly smaller to fit with back button
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.s,
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  metaDivider: {
    marginHorizontal: SPACING.s,
    color: COLORS.textSecondary,
  },
  controlsCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    marginBottom: SPACING.l,
    ...SHADOWS.small,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  controlLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: SPACING.s,
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9', // Light green background
    padding: SPACING.m,
    borderRadius: SPACING.l,
    marginBottom: SPACING.l,
    borderWidth: 0, // No border
    // borderColor: COLORS.primary + '20', // transparent primary
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  audioPlayerDark: {
    backgroundColor: COLORS.glassLight,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  playButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  playButtonDark: {
    backgroundColor: COLORS.secondary,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    fontWeight: '700',
    color: COLORS.text,
    fontSize: 16,
  },
  audioTitleDark: {
    color: COLORS.text,
  },
  audioSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  audioSubtitleDark: {
    color: COLORS.textSecondary,
  },
  audioSourceLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  contentCard: {
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.l,
    borderRadius: SPACING.m,
    ...SHADOWS.small,
    minHeight: 300,
  },
  pageContainer: {
    marginBottom: SPACING.l,
    paddingBottom: SPACING.l,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  storyText: {
    fontSize: 20,
    lineHeight: 32,
    color: COLORS.text,
    fontFamily: FONTS.medium, // In real app, use a serif font here
  },
  elderText: {
    fontSize: 26,
    lineHeight: 38,
    fontWeight: '600',
    color: '#2C3E50',
  },
  translationBox: {
    marginTop: SPACING.m,
    padding: SPACING.m,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: SPACING.s,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  translationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  translationText: {
    fontSize: 16,
    color: '#555',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  createStoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    padding: SPACING.l,
    borderRadius: SPACING.l,
    marginTop: SPACING.xl,
    ...SHADOWS.large,
  },
  createStoryText: {
    color: COLORS.surface,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: SPACING.s,
  },
});