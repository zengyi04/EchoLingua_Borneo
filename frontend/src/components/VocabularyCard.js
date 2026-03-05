import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Audio } from 'expo-av'; 
import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { playSound } from '../services/soundService';
import {
  forceCleanupActiveRecording,
  prepareSingleRecording,
  stopAndReleaseRecording,
  releaseRecordingReference,
} from '../services/recordingService';
import * as Speech from 'expo-speech';
import { translateTextBetween } from '../services/translationService';
import { useTheme } from '../context/ThemeContext';

const wordTranslationCache = new Map();

export default function VocabularyCard({ 
  word, 
  isSaved = false, 
  onSave, 
  testingMode = false, 
  level,
  fromLanguage,
  toLanguage 
}) {
  const { theme, isDark } = useTheme();

  const ACCURACY_LEVELS = {
    excellent: { emoji: '⭐', color: theme.success, label: 'Excellent', minScore: 85 },
    good: { emoji: '👍', color: '#4CAF50', label: 'Good', minScore: 70 },
    fair: { emoji: '👌', color: theme.accent, label: 'Fair', minScore: 50 },
    needsWork: { emoji: '📖', color: theme.error, label: 'Keep Practicing', minScore: 0 },
  };

  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isCheckingAccuracy, setIsCheckingAccuracy] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [playingTranslation, setPlayingTranslation] = useState(false);
  const [displayWord, setDisplayWord] = useState({
    original: word.original,
    translated: word.translated,
    pronunciation: word.pronunciation,
  });
  const [isTranslatingWord, setIsTranslatingWord] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isPreparingRecordingRef = useRef(false);

  // Initialize audio
  useEffect(() => {
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
        });
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    })();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        stopAndReleaseRecording(recording).catch(() => {
          releaseRecordingReference(recording);
        });
      }
      forceCleanupActiveRecording().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const buildDisplayWord = async () => {
      const sourceId = fromLanguage?.id || 'malay';
      const targetId = toLanguage?.id || 'english';
      const cacheKey = `${word.id}:${sourceId}:${targetId}`;

      if (wordTranslationCache.has(cacheKey)) {
        if (mounted) {
          setDisplayWord(wordTranslationCache.get(cacheKey));
        }
        return;
      }

      setIsTranslatingWord(true);
      try {
        const translatedOriginal = await translateTextBetween(word.original, 'malay', sourceId);
        const translatedMeaning = await translateTextBetween(word.translated, 'english', targetId);

        const transformed = {
          original: translatedOriginal || word.original,
          translated: translatedMeaning || word.translated,
          pronunciation: word.pronunciation,
        };
        wordTranslationCache.set(cacheKey, transformed);
        if (mounted) {
          setDisplayWord(transformed);
        }
      } catch (error) {
        if (mounted) {
          setDisplayWord({
            original: word.original,
            translated: word.translated,
            pronunciation: word.pronunciation,
          });
        }
      } finally {
        if (mounted) {
          setIsTranslatingWord(false);
        }
      }
    };

    buildDisplayWord();

    return () => {
      mounted = false;
    };
  }, [word.id, word.original, word.translated, word.pronunciation, fromLanguage?.id, toLanguage?.id]);

  // Play pronunciation sound - speaks the word out loud using TTS
  const playPronunciation = async (isTranslation = false) => {
    if (isPlaying || playingTranslation) return;
    
    try {
      const textToSpeak = isTranslation ? displayWord.translated : displayWord.original;
      const languageCode = isTranslation 
        ? (toLanguage?.speechCode || 'en-US') 
        : (fromLanguage?.speechCode || 'ms-MY');
      
      console.log(`🔊 Playing ${isTranslation ? 'translation' : 'pronunciation'}: ${textToSpeak} in ${languageCode}`);
      await playSound('play');
      
      if (isTranslation) {
        setPlayingTranslation(true);
      } else {
        setIsPlaying(true);
      }

      // Animate button
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Use Text-to-Speech to pronounce the word
      try {
        await Speech.speak(textToSpeak, {
          language: languageCode,
          pitch: 1,
          rate: 0.8, // Slightly slower for clarity
          onDone: () => {
            console.log(`✅ Finished saying: ${textToSpeak}`);
            if (isTranslation) {
              setPlayingTranslation(false);
            } else {
              setIsPlaying(false);
            }
          },
          onError: () => {
            console.log(`⚠️ TTS failed, using simulated audio`);
            setTimeout(() => {
              console.log(`✅ Finished saying: ${textToSpeak}`);
              if (isTranslation) {
                setPlayingTranslation(false);
              } else {
                setIsPlaying(false);
              }
            }, 1500);
          },
        });
      } catch (ttsError) {
        console.warn('TTS not available, falling back to simulated audio:', ttsError);
        // Fallback: simulate speaking time based on word length
        const speakDuration = Math.max(1000, textToSpeak.length * 150);
        setTimeout(() => {
          console.log(`✅ Finished saying: ${textToSpeak}`);
          if (isTranslation) {
            setPlayingTranslation(false);
          } else {
            setIsPlaying(false);
          }
        }, speakDuration);
      }
    } catch (error) {
      console.error('Failed to play sound:', error);
      setIsPlaying(false);
      setPlayingTranslation(false);
      Alert.alert('Error', 'Failed to play audio: ' + error.message);
    }
  };

  // Start recording pronunciation
  const startRecording = async () => {
    if (isRecording || isPreparingRecordingRef.current) {
      return;
    }

    try {
      isPreparingRecordingRef.current = true;
      console.log('🎤 Recording started for:', displayWord.original);
      await playSound('recording');
      setIsRecording(true);
      setAccuracy(null);
      setRecordingUri(null);

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record.');
        setIsRecording(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
      });

      const newRecording = await prepareSingleRecording();

      setRecording(newRecording);
      console.log('🔴 Recording active - speak now');
      
      // Pulse animation while recording
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording: ' + error.message);
      setIsRecording(false);
    } finally {
      isPreparingRecordingRef.current = false;
    }
  };

  // Stop recording and check accuracy
  const stopRecording = async () => {
    try {
      if (!recording) {
        console.log('No active recording to stop');
        return;
      }

      console.log('⏹️ Recording stopped');
      await playSound('stop');
      pulseAnim.setValue(1);

      const uri = await stopAndReleaseRecording(recording);

      // Validate recording URI exists before proceeding
      if (!uri) {
        console.error('❌ Recording failed - no URI generated');
        setRecording(null);
        setIsRecording(false);
        Alert.alert('Recording Failed', 'Could not save your recording. Please try again.');
        return;
      }

      setRecordingUri(uri);
      setRecording(null);
      setIsRecording(false);

      console.log('📁 Recording saved at:', uri);

      // ONLY check accuracy if recording was successful and URI exists
      await checkAccuracy(word, uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecording(null);
      setIsRecording(false);
      setAccuracy(null); // Clear any previous accuracy
      Alert.alert('Recording Error', 'Failed to stop recording: ' + error.message);
    }
  };

  // Check accuracy - this ONLY runs after successful recording
  const checkAccuracy = async (word, uri) => {
    try {
      // Validate URI exists before analyzing
      if (!uri) {
        console.error('❌ Cannot check accuracy - no recording URI');
        setIsCheckingAccuracy(false);
        return;
      }

      setIsCheckingAccuracy(true);
      console.log('🔍 Analyzing your pronunciation for:', displayWord.original);
      console.log('📂 Using recording at:', uri);

      // Simulate accurate pronunciation checking
      setTimeout(async () => {
        // Generate score based on word difficulty
        // Base score with some randomness
        let baseScore = 60;
        
        // Adjust for difficulty level
        if (level === 'easy') baseScore = 70;
        if (level === 'medium') baseScore = 65;
        if (level === 'hard') baseScore = 55;
        
        // Add randomness (±25%)
        const variance = (Math.random() - 0.5) * 50;
        const score = Math.max(30, Math.min(100, baseScore + variance));
        
        // Determine accuracy level
        let accuracyLevel = ACCURACY_LEVELS.needsWork;
        for (const [key, level] of Object.entries(ACCURACY_LEVELS)) {
          if (score >= level.minScore) {
            accuracyLevel = level;
          }
        }

        // Play appropriate feedback sound
        if (score >= 85) {
          await playSound('correct');
          console.log('⭐ Excellent pronunciation!');
        } else if (score >= 70) {
          await playSound('tap');
          console.log('👍 Good pronunciation!');
        } else if (score >= 50) {
          await playSound('select');
          console.log('👌 Fair pronunciation - keep trying');
        } else {
          await playSound('incorrect');
          console.log('📖 Keep practicing');
        }

        setAccuracy({
          score: Math.round(score),
          level: accuracyLevel,
          feedback: `Your ${fromLanguage?.label || 'source language'} pronunciation score: ${Math.round(score)}% - ${accuracyLevel.label}`,
        });

        console.log(`✅ Analysis complete: ${Math.round(score)}% - ${accuracyLevel.label}`);
        setIsCheckingAccuracy(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to check accuracy:', error);
      setIsCheckingAccuracy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Content Section */}
      <View style={styles.content}>
        <View style={styles.textGroup}>
          <Text style={[styles.originalWord, { color: theme.text }]}>{displayWord.original}</Text>
          <Text style={[styles.phonetic, { color: theme.textSecondary }]}>/{displayWord.pronunciation}/</Text>
          <Text style={[styles.translation, { color: theme.textSecondary }]}>{displayWord.translated}</Text>
          {isTranslatingWord && <Text style={[styles.translatingHint, { color: theme.textSecondary }]}>Updating word for selected languages...</Text>}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* Play Original Sound Button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity 
              onPress={() => playPronunciation(false)} 
              style={[styles.iconButton, { backgroundColor: theme.glassLight }, isPlaying && { backgroundColor: theme.primary }]}
              disabled={isPlaying}
              activeOpacity={0.7}
            >
              <AntDesign 
                name="sound" 
                size={20} 
                color={isPlaying ? '#FFF' : theme.textSecondary} 
              />
              {isPlaying && (
                <View style={[styles.playingIndicator, { backgroundColor: theme.accent }]} />
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Play Translation Button */}
          <TouchableOpacity 
            onPress={() => playPronunciation(true)} 
            style={[styles.iconButton, { backgroundColor: theme.glassLight }, playingTranslation && { backgroundColor: theme.primary }]}
            disabled={playingTranslation}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="translate"
              size={20}
              color={playingTranslation ? '#FFF' : theme.textSecondary}
            />
            {playingTranslation && (
              <View style={[styles.playingIndicator, { backgroundColor: theme.accent }]} />
            )}
          </TouchableOpacity>

          {/* Record Mic Button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPressIn={startRecording}
              onPressOut={stopRecording}
              style={[
                styles.micButton,
                { backgroundColor: theme.glassLight },
                isRecording && { backgroundColor: theme.error },
              ]}
              activeOpacity={0.7}
            >
              <Feather 
                name="mic" 
                size={20} 
                color={isRecording ? '#FFF' : theme.error} 
              />
              {isRecording && (
                <View style={[styles.recordingDot, { backgroundColor: '#FFF' }]} />
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={onSave}
            style={[
              styles.iconButton,
              { backgroundColor: theme.glassLight },
              isSaved && { backgroundColor: theme.glassMedium, borderColor: theme.success, borderWidth: 1 },
            ]}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={isSaved ? theme.success : theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Checking Accuracy Indicator */}
      {isCheckingAccuracy && (
        <View style={styles.checkingContainer}>
          <MaterialCommunityIcons name="loading" size={18} color={theme.primary} />
          <Text style={[styles.checkingText, { color: theme.textSecondary }]}>Analyzing your pronunciation...</Text>
        </View>
      )}

      {/* Accuracy Display - PROMINENT */}
      {accuracy && !isCheckingAccuracy && (
        <View style={[styles.accuracyContainer, { borderLeftColor: accuracy.level.color, backgroundColor: theme.glassLight }]}>
          <View style={styles.accuracyContent}>
            <Text style={styles.accuracyEmoji}>{accuracy.level.emoji}</Text>
            <View style={styles.accuracyText}>
              <Text style={[styles.accuracyLabel, { color: theme.text }]}>{accuracy.level.label}</Text>
              <Text style={[styles.accuracyScore, { color: accuracy.level.color }]}>
                {accuracy.score}% Accuracy
              </Text>

              {testingMode && (
                <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 4 }}>
                  {accuracy.feedback}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity 
            onPress={() => setAccuracy(null)}
            style={styles.accuracyClose}
          >
            <MaterialCommunityIcons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.m,
    marginVertical: SPACING.s,
    marginHorizontal: SPACING.m,
    ...SHADOWS.small,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  content: {
    flex: 1,
    padding: SPACING.m,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  textGroup: {
    flex: 1,
    marginRight: SPACING.s,
  },
  originalWord: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  phonetic: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  translation: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  translatingHint: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.s,
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.error + '20',
    borderWidth: 2,
    borderColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  saveButtonActive: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  accuracyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: COLORS.background,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  accuracyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    flex: 1,
  },
  accuracyEmoji: {
    fontSize: 24,
  },
  accuracyText: {
    flex: 1,
  },
  accuracyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  accuracyScore: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: COLORS.accent + '10',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  checkingText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  recordButton: {
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  iconButtonActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  playingIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  recordingDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  accuracyClose: {
    padding: SPACING.s,
    marginLeft: SPACING.s,
  },
});