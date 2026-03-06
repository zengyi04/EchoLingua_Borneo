import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { MaterialIcons, Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stories } from '../data/mockData';
import { COLORS, SPACING, SHADOWS, FONTS, GLASS_EFFECTS } from '../constants/theme';
import { playSound } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';

const ELDER_VOICES_STORAGE_KEY = '@echolingua_elder_voices';
const STORIES_STORAGE_KEY = '@echolingua_stories';

export default function StoryScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [showTranslation, setShowTranslation] = useState(false);
  const [isElderMode, setIsElderMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSound, setAudioSound] = useState(null);
  const [audioSource, setAudioSource] = useState(null); // 'recorded' or 'tts'

  // Voice Selection State
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null); // null = default TTS
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showShareOptionsModal, setShowShareOptionsModal] = useState(false); // Three-option share modal
  const [playbackStatus, setPlaybackStatus] = useState({ position: 0, duration: 1 });
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const ttsInterval = React.useRef(null);

  useEffect(() => {
    loadVoices();
    return () => clearInterval(ttsInterval.current);
  }, []);

  const loadVoices = async () => {
    try {
      const raw = await AsyncStorage.getItem(ELDER_VOICES_STORAGE_KEY);
      if (raw) {
        setAvailableVoices(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Failed to load voices', e);
    }
  };


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

  const handleShareToCommunity = async () => {
    // Navigate to CommunityStory with params to open upload modal
    navigation.navigate('CommunityStory', {
       audioUri: story.audioUri,
       fileName: story.fileName || (story.title ? `${story.title}.m4a` : 'story.m4a'),
       transcript: story.transcript || story.description,
       description: story.transcript || story.description,
       duration: story.duration
    });
  };

  // New handler: Share to Emergency Contact
  const handleShareToEmergencyContact = async () => {
    setShowShareOptionsModal(false);
    
    // Load current user
    try {
      const userJson = await AsyncStorage.getItem('@echolingua_current_user');
      const currentUser = userJson ? JSON.parse(userJson) : null;
      
      if (!currentUser?.emergencyContacts || currentUser.emergencyContacts.length === 0) {
        Alert.alert(
          'No Contacts Added',
          'You need to add emergency contacts first. Go to Profile > Emergency Contacts to add contacts.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Navigate to AIStoryGenerator with story data to share
      navigation.navigate('AIStoryGenerator', {
        storyToShare: {
          id: story.id,
          title: story.title,
          description: story.description || story.summary,
          text: story.transcript || buildReadableStoryText(),
          language: story.language || 'English',
          shareMode: 'emergency_contact'
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts: ' + error.message);
    }
  };

  // New handler: Save to My Creation 
  const handleSaveToMyCreation = async () => {
    setShowShareOptionsModal(false);
    
    try {
      const storyToSave = {
        id: story.id || Date.now().toString(),
        title: story.title,
        description: story.description || story.summary,
        summary: story.description || story.summary,
        text: story.transcript || buildReadableStoryText(),
        language: story.language || 'English',
        author: currentUser?.fullName || 'Guest',
        authorEmail: currentUser?.email,
        category: 'Saved',
        savedAt: new Date().toISOString()
      };

      // Load existing stories
      const storiesJson = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
      const existingStories = storiesJson ? JSON.parse(storiesJson) : [];

      // Check if story already exists
      const existingIndex = existingStories.findIndex(s => s.id === storyToSave.id);
      if (existingIndex >= 0) {
        Alert.alert('Already Saved', 'This story is already in your collection.');
        return;
      }

      // Add new story
      existingStories.push(storyToSave);
      await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(existingStories));

      Alert.alert(
        'Saved Successfully',
        'Story saved to My Creations!',
        [
          { text: 'Go to Library', onPress: () => navigation.navigate('StoryLibrary') },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save story: ' + error.message);
    }
  };

  const [currentUser, setCurrentUser] = useState(null);

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem('@echolingua_current_user');
        if (userJson) {
          setCurrentUser(JSON.parse(userJson));
        }
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  const handleDeleteStory = async () => {
    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
              if (stored) {
                const stories = JSON.parse(stored);
                const updatedStories = stories.filter(s => s.id !== story.id);
                await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updatedStories));
                Alert.alert('Deleted', 'Story removed from your library.');
                navigation.goBack();
              }
            } catch (error) {
              console.error('Failed to delete story', error);
              Alert.alert('Error', 'Could not delete story.');
            }
          }
        }
      ]
    );
  };

  const speakStoryFallback = async () => {
    const text = buildReadableStoryText();
    if (!text || text.trim().length === 0) {
      Alert.alert('Audio Unavailable', 'No readable story content found.');
      return;
    }

    if (selectedVoice) {
      // In a real app, we would send 'selectedVoice.id' to our backend TTS service
      // to generate the unique voice. For this demo, we acknowledge the selection.
      Alert.alert('Voice Activated', `Now narrating with the voice of ${selectedVoice.name} (Simulation)`);
    }

    // Estimate duration: assume ~150 words per minute * rate
    const wordCount = text.split(/\s+/).length;
    const rate = 0.9;
    const estimatedDurationMs = (wordCount / (150 * rate)) * 60 * 1000;
    
    setPlaybackStatus({ position: 0, duration: estimatedDurationMs });
    
    // Clear any existing interval
    if (ttsInterval.current) clearInterval(ttsInterval.current);
    
    const startTime = Date.now();
    
    ttsInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < estimatedDurationMs) {
         setPlaybackStatus(prev => ({ ...prev, position: elapsed }));
      } else {
         setPlaybackStatus({ position: estimatedDurationMs, duration: estimatedDurationMs });
         clearInterval(ttsInterval.current);
      }
    }, 100);

    setIsPlaying(true);
    setAudioSource('tts'); // Mark as TTS
    playSound('play');

    Speech.stop();
    Speech.speak(text, {
      language: getSpeechLanguageCode(),
      rate: rate,
      pitch: selectedVoice ? 0.8 : 1.0, // Slight pitch change for effect if custom voice
      onDone: () => {
        setIsPlaying(false);
        playSound('complete');
        clearInterval(ttsInterval.current);
        setPlaybackStatus({ position: 0, duration: 1 });
      },
      onStopped: () => {
        setIsPlaying(false);
        clearInterval(ttsInterval.current);
      },
      onError: () => {
        setIsPlaying(false);
        clearInterval(ttsInterval.current);
        Alert.alert('Audio Error', 'Text-to-speech failed for this story.');
      },
    });
  };

  const handleSeek = async (event) => {
    if (audioSource !== 'recorded' || !audioSound || progressBarWidth <= 0) return;
    
    try {
      const { locationX } = event.nativeEvent;
      const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
      const newPosition = Math.floor(percentage * playbackStatus.duration);
      
      await audioSound.setPositionAsync(newPosition);
      setPlaybackStatus(prevStatus => ({ 
        ...prevStatus, 
        position: newPosition 
      }));
    } catch (error) {
      console.log('Error seeking audio:', error);
    }
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
        if (ttsInterval.current) clearInterval(ttsInterval.current);
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
          if (ttsInterval.current) clearInterval(ttsInterval.current);
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
                if (status.isLoaded) {
                  setPlaybackStatus({
                    position: status.positionMillis,
                    duration: status.durationMillis || 1,
                  });
                }
                if (status.didJustFinish) {
                  console.log('✅ Story audio completed');
                  setIsPlaying(false);
                  setPlaybackStatus({ position: 0, duration: 1 });
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
      if (ttsInterval.current) clearInterval(ttsInterval.current);
    };
  }, [audioSound]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Back Button and Three Action Icons */}
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
         
         {/* More Options Menu - Only show for user's content (Community or AI Generated) */}
         {(isCommunityStory || story.isAiGenerated) && (
           <TouchableOpacity 
             onPress={() => setShowOptionsModal(true)}
             style={{ padding: 8 }}
           >
             <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
           </TouchableOpacity>
         )}
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

          {/* Voice Narrator Selection (Only for standard stories) */}
          {!isCommunityStory && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <TouchableOpacity style={styles.controlRow} onPress={() => setShowVoiceModal(true)}>
                <Text style={[styles.controlLabel, { color: theme.text }]}>Narrator Voice</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.primary, marginRight: 8, fontWeight: '600' }}>
                    {selectedVoice ? selectedVoice.name : 'Default AI'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            </>
          )}
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
             {isCommunityStory && story.sentByLabel && (
               <Text style={[styles.audioSubtitle, isCommunityStory && [styles.audioSubtitleDark, { color: theme.textSecondary }]]}>
                 {story.sentByLabel}
               </Text>
             )}
             {isCommunityStory && !!story.description && (
               <Text style={[styles.audioDescription, { color: theme.textSecondary }]}>
                 {story.description}
               </Text>
             )}
             {audioSource && isPlaying && (
               <Text style={[styles.audioSourceLabel, { color: isCommunityStory ? theme.text : (theme.onPrimary || '#FFFFFF') }]}>
                 🔊 {audioSource === 'recorded' ? '🎙️ Recorded Audio' : '🗣️ Voice Reading (TTS)'}
               </Text>
             )}
             
             {/* Audio Progress Bar */}
             {(audioSource === 'recorded' || audioSource === 'tts') && (isPlaying || playbackStatus.position > 0) && (
               <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                 <View 
                   style={{ flex: 1, height: 30, justifyContent: 'center', marginRight: 8 }}
                   onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
                   onResponderRelease={handleSeek}
                   onStartShouldSetResponder={() => isCommunityStory && audioSource === 'recorded'}
                 >
                   {/* Track Background */}
                   <View style={{ height: 4, backgroundColor: theme.textSecondary + '40', borderRadius: 2, width: '100%', position: 'absolute' }} />
                   
                   {/* Progress Fill */}
                   <View 
                     style={{ 
                       width: `${Math.min((playbackStatus.position / playbackStatus.duration) * 100, 100)}%`, 
                       height: 4, 
                       backgroundColor: isCommunityStory ? theme.primary : (theme.onPrimary || '#FFFFFF'), 
                       borderRadius: 2 
                     }} 
                   />

                   {/* Seek Thumb (Only for Recorded Audio) */}
                   {isCommunityStory && audioSource === 'recorded' && (
                     <View 
                       style={{
                         position: 'absolute',
                         left: `${Math.min((playbackStatus.position / playbackStatus.duration) * 100, 100)}%`,
                         width: 12,
                         height: 12,
                         borderRadius: 6,
                         backgroundColor: theme.primary,
                         marginLeft: -6,
                         elevation: 2,
                         shadowColor: "#000",
                         shadowOffset: { width: 0, height: 1 },
                         shadowOpacity: 0.2,
                         shadowRadius: 1.41,
                       }}
                     />
                   )}
                 </View>

                 <Text style={{ fontSize: 10, color: isCommunityStory ? theme.textSecondary : 'rgba(255,255,255,0.8)' }}>
                   {Math.floor(playbackStatus.position / 60000)}:{String(Math.floor((playbackStatus.position % 60000) / 1000)).padStart(2, '0')} / 
                   {Math.floor(playbackStatus.duration / 60000)}:{String(Math.floor((playbackStatus.duration % 60000) / 1000)).padStart(2, '0')}
                 </Text>
               </View>
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
                 {/* AI Illustration Placeholder */}
                 {page.imagePrompt && (
                   <View style={[styles.illustrationPlaceholder, { backgroundColor: theme.surfaceVariant }]}>
                      <MaterialIcons name="image" size={40} color={theme.textSecondary} />
                      <Text style={[styles.illustrationText, { color: theme.textSecondary }]}>
                        [AI Illustration would appear here based on: "{page.imagePrompt}"]
                      </Text>
                   </View>
                 )}

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
        
        {/* Story Actions: Create Your Own (Only shown for non-user content) */}
        {!(isCommunityStory || story.isAiGenerated) && (
          <TouchableOpacity 
            style={[styles.createStoryButton, { backgroundColor: theme.secondary, marginBottom: 20 }]} 
            onPress={() => navigation.navigate('AIStoryGenerator')}
          >
             <FontAwesome5 name="pencil-alt" size={20} color={theme.onPrimary || '#FFFFFF'} />
             <Text style={[styles.createStoryText, { color: theme.onPrimary || '#FFFFFF' }]}>Create Your Own AI Folktale</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Voice Selection Modal */}
      <Modal
        visible={showVoiceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <TouchableOpacity 
           style={styles.modalOverlay} 
           activeOpacity={1} 
           onPress={() => setShowVoiceModal(false)}
        >
           <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                 <Text style={[styles.modalTitle, { color: theme.text }]}>Choose a Narrator</Text>
                 <TouchableOpacity onPress={() => setShowVoiceModal(false)}>
                    <Ionicons name="close" size={24} color={theme.textSecondary} />
                 </TouchableOpacity>
              </View>
              
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Experience the story as told by our revered elders.
              </Text>

              <ScrollView style={{ maxHeight: 300 }}>
                 {/* Default Option */}
                 <TouchableOpacity 
                    style={[styles.voiceOption, !selectedVoice && { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
                    onPress={() => { setSelectedVoice(null); setShowVoiceModal(false); }}
                 >
                    <View style={[styles.voiceIcon, { backgroundColor: theme.primary }]}>
                       <MaterialIcons name="record-voice-over" size={24} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                       <Text style={[styles.voiceName, { color: theme.text }]}>Default AI Narrator</Text>
                       <Text style={[styles.voiceDesc, { color: theme.textSecondary }]}>Clear, standard pronunciation</Text>
                    </View>
                    {!selectedVoice && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
                 </TouchableOpacity>

                 {/* Saved Elder Voices */}
                 {availableVoices.map((voice) => (
                    <TouchableOpacity 
                       key={voice.id} 
                       style={[styles.voiceOption, selectedVoice?.id === voice.id && { backgroundColor: theme.secondary + '20', borderColor: theme.secondary }]}
                       onPress={() => { setSelectedVoice(voice); setShowVoiceModal(false); }}
                    >
                       <View style={[styles.voiceIcon, { backgroundColor: theme.secondary }]}>
                          <MaterialIcons name="mic" size={24} color="#FFF" />
                       </View>
                       <View style={{ flex: 1 }}>
                          <Text style={[styles.voiceName, { color: theme.text }]}>{voice.name}</Text>
                          <Text style={[styles.voiceDesc, { color: theme.textSecondary }]}>Preserved on {new Date(voice.dateCreated).toLocaleDateString()}</Text>
                       </View>
                       {selectedVoice?.id === voice.id && <Ionicons name="checkmark-circle" size={24} color={theme.secondary} />}
                    </TouchableOpacity>
                 ))}

                 {availableVoices.length === 0 && (
                    <View style={styles.emptyState}>
                       <Text style={{ color: theme.textSecondary, textAlign: 'center', margin: 20 }}>
                          No elder voices preserved yet. Create one in the Story Generator!
                       </Text>
                    </View>
                 )}
              </ScrollView>
           </View>
        </TouchableOpacity>
      </Modal>

      {/* Story Options Dropdown */}
      <Modal
         visible={showOptionsModal}
         transparent={true}
         animationType="fade"
         onRequestClose={() => setShowOptionsModal(false)}
      >
         <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowOptionsModal(false)}
         >
            <View style={{ 
               position: 'absolute', 
               top: 80, 
               right: 20, 
               width: 220,
               backgroundColor: theme.surface, 
               borderRadius: 12, 
               padding: 8,
               shadowColor: "#000",
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.25,
               shadowRadius: 3.84,
               elevation: 5,
               borderWidth: 1,
               borderColor: theme.border
            }}>
               {/* Share to Emergency Contact */}
               <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  onPress={() => {
                     setShowOptionsModal(false);
                     handleShareToEmergencyContact();
                  }}
               >
                  <Ionicons name="people" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                  <Text style={{ color: theme.text, fontSize: 14 }}>Share to Contact</Text>
               </TouchableOpacity>

               {/* Share to Community */}
               <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  onPress={() => {
                     setShowOptionsModal(false);
                     handleShareToCommunity();
                  }}
               >
                  <Ionicons name="share-social" size={20} color={theme.accent || theme.secondary} style={{ marginRight: 12 }} />
                  <Text style={{ color: theme.text, fontSize: 14 }}>Share to Community</Text>
               </TouchableOpacity>

               {/* Save to My Creation */}
               <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  onPress={() => {
                     setShowOptionsModal(false);
                     handleSaveToMyCreation();
                  }}
               >
                  <Ionicons name="bookmark" size={20} color={theme.secondary} style={{ marginRight: 12 }} />
                  <Text style={{ color: theme.text, fontSize: 14 }}>Save to My Creations</Text>
               </TouchableOpacity>

               {/* Delete Story */}
               <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
                  onPress={() => {
                     setShowOptionsModal(false);
                     setTimeout(() => handleDeleteStory(), 300);
                  }}
               >
                  <Ionicons name="trash-outline" size={20} color={theme.error} style={{ marginRight: 12 }} />
                  <Text style={{ color: theme.error, fontSize: 14 }}>Delete</Text>
               </TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... existing styles ...
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.l, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.s },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 14, marginBottom: SPACING.l },
  voiceOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: SPACING.m, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'transparent', 
    marginBottom: SPACING.s,
    backgroundColor: 'rgba(0,0,0,0.03)' 
  },
  voiceIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
  voiceName: { fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  voiceDesc: { fontSize: 12 },
  
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
  audioDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
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
  illustrationPlaceholder: {
    height: 200,
    borderRadius: SPACING.m,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
    padding: SPACING.m,
  },
  illustrationText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderRadius: 12,
    gap: 12,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  cancelButton: {
    padding: SPACING.m,
    borderRadius: 12,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: -10,
  },
});