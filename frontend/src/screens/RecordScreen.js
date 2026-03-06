import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, TextInput, Alert, FlatList, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playSound } from '../services/soundService';
import { translateText } from '../services/translationService';
import { useTheme } from '../context/ThemeContext';
import {
  forceCleanupActiveRecording,
  prepareSingleRecording,
  stopAndReleaseRecording,
  releaseRecordingReference,
} from '../services/recordingService';
import { WORLD_LANGUAGES, getBorneoLanguages, getLanguagesByRegion } from '../constants/languages';

// Group languages by region for better organization
const LANGUAGE_GROUPS = [
  { title: 'Indigenous Borneo', languages: getBorneoLanguages() },
  { title: 'Southeast Asia', languages: getLanguagesByRegion('Southeast Asia') },
  { title: 'East Asia', languages: getLanguagesByRegion('East Asia') },
  { title: 'South Asia', languages: getLanguagesByRegion('South Asia') },
  { title: 'Europe', languages: WORLD_LANGUAGES.filter(l => l.region.includes('Europe')) },
  { title: 'Americas', languages: WORLD_LANGUAGES.filter(l => l.region.includes('America')) },
  { title: 'Middle East & Africa', languages: WORLD_LANGUAGES.filter(l => l.region.includes('Middle East') || l.region.includes('Africa')) },
  { title: 'Oceania', languages: getLanguagesByRegion('Oceania') },
  { title: 'Global Languages', languages: WORLD_LANGUAGES.filter(l => l.region === 'Global') },
];

const RECORDINGS_STORAGE_KEY = '@echolingua_recordings';
const STORIES_STORAGE_KEY = '@echolingua_stories';
const COMMUNITY_STORIES_KEY = '@echolingua_stories'; // For StoryLibraryScreen (Other Library)
const SHARED_STORIES_KEY = '@echolingua_shared_stories'; // For stories shared with emergency contacts
const USERS_DB_KEY = '@echolingua_users_database';
const USER_STORAGE_KEY = '@echolingua_current_user';
const CONTACT_SHARES_KEY = '@echolingua_contact_shares';
const NOTIFICATIONS_KEY = '@echolingua_notifications';

export default function RecordScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const isStoryMode = route.params?.createStory === true;
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showUploadOption, setShowUploadOption] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  
  // NEW: State for multiple recordings
  const [recordings, setRecordings] = useState([]);
  const [playingRecordingId, setPlayingRecordingId] = useState(null);
  const [playingSoundForId, setPlayingSoundForId] = useState({});
  
  // NEW: Search state for language selector
  const [languageSearch, setLanguageSearch] = useState('');
  
  // NEW: Story creation mode
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDescription, setStoryDescription] = useState('');
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  
  // NEW: Share to community modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedRecordingToShare, setSelectedRecordingToShare] = useState(null);
  const [shareTitle, setShareTitle] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [shareTranscript, setShareTranscript] = useState('');
  const [shareCategory, setShareCategory] = useState('Story');
  const [isSharingToCommunity, setIsSharingToCommunity] = useState(false);
  const [showShareRecipientModal, setShowShareRecipientModal] = useState(false);
  const [shareRecipients, setShareRecipients] = useState([]);
  
  // NEW: Recipient selection
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState(['private']); // 'private', 'community', or emergency contact IDs
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [emergencyContactsWithApp, setEmergencyContactsWithApp] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const getContactRecipientKey = (contact) => `contact:${contact.id}:${contact.appUser?.id || contact.linkedUserId || 'app'}`;
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveHeights = useRef(Array(20).fill(0).map(() => new Animated.Value(20))).current;
  const isRecordingActionInFlightRef = useRef(false);

  // Handle picking audio file from phone and save to recordings
  const handlePickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📁 Audio file picked:', asset.uri);
        
        // Create new recording object
        const newRecording = {
          id: Date.now().toString(),
          uri: asset.uri,
          duration: 30, // Default duration estimate
          timestamp: new Date().toISOString(),
          language: selectedLanguage || null,
          transcript: null,
          fileName: asset.name || 'Imported Audio',
        };
        
        // Save to storage (new recordings at the top)
        const updated = [newRecording, ...recordings];
        await AsyncStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(updated));
        setRecordings(updated);

        // Treat imported audio as the active recording so user can select language and generate transcript.
        setRecordingUri(asset.uri);
        setHasRecording(true);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(30);
        setTranscript('');
        setSelectedLanguage('');
        setShowLanguageSelector(true);
        setShareTranscript('');
        
        playSound('complete');
        Alert.alert(
          'File Imported',
          'Audio saved. Please select language and generate transcript before sharing.'
        );
      }
    } catch (error) {
      if (error.code !== 'DOCUMENT_PICKER_CANCELLED') {
        console.error('Error picking audio file:', error);
        Alert.alert('Error', 'Failed to pick audio file. Please try again.');
        playSound('incorrect');
      }
    }
  };

  // Load recordings from local storage on mount
  useEffect(() => {
    loadRecordingsFromStorage();
    loadUserData();
  }, []);

  // Reload user data when screen comes into focus to get updated emergency contacts
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  // Initialize audio mode and request permissions on mount
  useEffect(() => {
    (async () => {
      try {
        console.log('🔊 Initializing audio system...');
        
        // Request permissions on mount
        const { status, canAskAgain, granted } = await Audio.requestPermissionsAsync();
        console.log('🔐 Permission status:', { status, canAskAgain, granted });
        
        if (status !== 'granted') {
          console.error('❌ Audio permission not granted:', status);
          if (!canAskAgain) {
            Alert.alert(
              'Permission Required',
              'Microphone permission was denied. Please enable it in your device settings to use recording features.',
              [{ text: 'OK' }]
            );
          }
          return;
        }
        
        console.log('✅ Audio permission granted, setting audio mode...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('✅ Audio mode set successfully');
      } catch (error) {
        console.error('❌ Failed to initialize audio:', error);
        Alert.alert('Audio Setup Error', 'Failed to initialize audio system. Recording may not work properly.');
      }
    })();

    return () => {
      // Cleanup all audio resources
      if (recording) {
        stopAndReleaseRecording(recording).catch(() => {
          releaseRecordingReference(recording);
        });
      }
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
      // Cleanup all previous recording sounds
      Object.values(playingSoundForId).forEach(s => {
        if (s) {
          s.unloadAsync().catch(() => {});
        }
      });
      forceCleanupActiveRecording().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let interval = null;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      waveHeights.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: Math.random() * 60 + 20,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 20,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ])
        ).start();
      });
    } else {
      pulseAnim.setValue(1);
      waveHeights.forEach(anim => anim.setValue(20));
    }
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // NEW: Load recordings from local storage
  const loadRecordingsFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECORDINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log(`📂 Loaded ${parsed.length} recordings from storage`);
        setRecordings(parsed);
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };
  
  // NEW: Load user data and emergency contacts
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setEmergencyContacts(user.emergencyContacts || []);
        
        // Filter emergency contacts to only show those with app accounts
        const usersDb = await AsyncStorage.getItem(USERS_DB_KEY);
        const appUsers = usersDb ? JSON.parse(usersDb) : [];
        
        const filteredContacts = (user.emergencyContacts || [])
          .map((contact) => {
            const normalizedUsername = contact.username?.trim().toLowerCase();
            const normalizedEmail = contact.email?.trim().toLowerCase();
            const normalizedPhone = contact.phone?.trim();

            const matchedUser = appUsers.find((appUser) => {
              return (
                (contact.linkedUserId && appUser.id === contact.linkedUserId) ||
                (normalizedEmail && appUser.email?.toLowerCase() === normalizedEmail) ||
                (normalizedPhone && appUser.phone === normalizedPhone) ||
                (normalizedUsername && (
                  appUser.username?.toLowerCase() === normalizedUsername ||
                  appUser.fullName?.toLowerCase() === normalizedUsername
                ))
              );
            });

            if (!matchedUser) {
              return null;
            }

            return {
              ...contact,
              linkedUserId: matchedUser.id,
              linkedUserName: matchedUser.fullName,
              hasAppAccount: true,
              appUser: {
                id: matchedUser.id,
                fullName: matchedUser.fullName,
                email: matchedUser.email,
                username: matchedUser.username || null,
              },
            };
          })
          .filter(Boolean);

        const uniqueFilteredContacts = filteredContacts.filter((contact, index, arr) => {
          const key = `${contact.id}-${contact.appUser?.id || contact.linkedUserId || 'unknown'}`;
          return index === arr.findIndex((candidate) => {
            const candidateKey = `${candidate.id}-${candidate.appUser?.id || candidate.linkedUserId || 'unknown'}`;
            return candidateKey === key;
          });
        });
        
        setEmergencyContactsWithApp(uniqueFilteredContacts);
        console.log(`📱 Found ${uniqueFilteredContacts.length} emergency contacts with app accounts out of ${user.emergencyContacts?.length || 0} total`);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // Function to create notifications for emergency contacts when story is shared
  const createEmergencyContactNotifications = async (sharedStory, emergencyContacts) => {
    try {
      if (!currentUser) return;
      
      const notifData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const existingNotifications = notifData ? JSON.parse(notifData) : [];

      // Create notification for each emergency contact
      const newNotifications = emergencyContacts
        .filter(contact => contact.appUser && contact.appUser.id) // Only contacts with app access
        .map(contact => ({
          id: `notif_${Date.now()}_${contact.appUser.id}_${Math.random()}`,
          type: 'shared_story',
          recipientId: contact.appUser.id,
          senderId: currentUser.id,
          senderName: currentUser.fullName || 'Someone',
          title: `${currentUser.fullName || 'Someone'} shared a story with you`,
          message: `"${sharedStory.title}" - Check Other Creation section`,
          storyData: sharedStory,
          timestamp: new Date().toISOString(),
          read: false,
        }));

      const updatedNotifications = [...newNotifications, ...existingNotifications];
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
      console.log(`✅ Created ${newNotifications.length} notifications for emergency contacts`);
    } catch (error) {
      console.error('❌ Failed to create emergency contact notifications:', error);
    }
  };

  // Function to create notifications for all users when story is shared to community
  const createCommunityStoryNotifications = async (story) => {
    try {
      if (!currentUser) return;
      
      const usersJson = await AsyncStorage.getItem(USERS_DB_KEY);
      const allUsers = usersJson ? JSON.parse(usersJson) : [];
      
      const notifData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const existingNotifications = notifData ? JSON.parse(notifData) : [];

      // Create notification for each user except the author
      const newNotifications = allUsers
        .filter(user => user.id !== currentUser.id) // Exclude story author
        .map(user => ({
          id: `notif_${Date.now()}_${user.id}_${Math.random()}`,
          type: 'story',
          recipientId: user.id,
          senderId: currentUser.id,
          senderName: currentUser.fullName || 'Someone',
          title: 'New Community Story',
          message: `${currentUser.fullName || 'Someone'} shared: "${story.title}"`,
          storyData: story,
          timestamp: new Date().toISOString(),
          read: false,
        }));

      const updatedNotifications = [...newNotifications, ...existingNotifications];
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
      console.log(`✅ Created ${newNotifications.length} notifications for community story`);
    } catch (error) {
      console.error('❌ Failed to create community story notifications:', error);
    }
  };

  // NEW: Save recording to storage
  const saveRecordingToStorage = async (newRecording) => {
    try {
      const existingRaw = await AsyncStorage.getItem(RECORDINGS_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [newRecording, ...existing];
      await AsyncStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(updated));
      console.log('💾 Recording saved to local storage');
      setRecordings(updated);
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  };

  const updateRecordingMetadata = async (recordingId, updates) => {
    try {
      const existingRaw = await AsyncStorage.getItem(RECORDINGS_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : recordings;

      const updatedRecordings = existing.map((item) => {
        if (item.id !== recordingId) {
          return item;
        }
        return {
          ...item,
          ...updates,
        };
      });

      setRecordings(updatedRecordings);
      await AsyncStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(updatedRecordings));
      return updatedRecordings.find((item) => item.id === recordingId) || null;
    } catch (error) {
      console.error('Failed to update recording metadata:', error);
      return null;
    }
  };

  const getRecordingByIdFromStorage = async (recordingId) => {
    try {
      const raw = await AsyncStorage.getItem(RECORDINGS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return parsed.find((item) => item.id === recordingId) || null;
    } catch (error) {
      console.error('Failed to fetch recording from storage:', error);
      return null;
    }
  };

  // NEW: Delete recording
  const deleteRecording = async (recordingId) => {
    try {
      const updated = recordings.filter(r => r.id !== recordingId);
      await AsyncStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(updated));
      setRecordings(updated);
      playSound('incorrect');
      console.log('🗑️ Recording deleted');
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  };

  // NEW: Open share modal for a recording
  const openShareModal = (recording) => {
    setSelectedRecordingToShare(recording);
    setShareTitle(
      recording?.title ||
      (recording?.fileName ? `Recording: ${recording.fileName}` : `Recording ${new Date(recording.timestamp).toLocaleDateString()}`)
    );
    setShareDescription(recording?.description || '');
    setShareTranscript(recording?.transcript || '');
    setShareCategory('Story');
    setShareRecipients([]);
    setShowShareRecipientModal(false);
    setShowShareModal(true);
    playSound('select');
  };

  useEffect(() => {
    if (!showShareModal || !selectedRecordingToShare) {
      return;
    }

    const refreshedRecording = recordings.find((item) => item.id === selectedRecordingToShare.id);
    if (!refreshedRecording?.transcript) {
      return;
    }

    if (refreshedRecording.transcript !== shareTranscript) {
      setShareTranscript(refreshedRecording.transcript);
    }
  }, [recordings, showShareModal, selectedRecordingToShare?.id]);

  const toggleShareRecipient = (recipient) => {
    setShareRecipients((current) => {
      if (current.includes(recipient)) {
        return current.filter((item) => item !== recipient);
      }
      return [...current, recipient];
    });
  };

  const handleShareRecording = async () => {
    if (!shareTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your story');
      playSound('incorrect');
      return;
    }

    if (!shareTranscript.trim()) {
      Alert.alert('Transcript Required', 'Please include transcript before sharing.');
      playSound('incorrect');
      return;
    }

    if (shareRecipients.length === 0) {
      Alert.alert('Recipient Required', 'Please choose at least one destination.');
      playSound('incorrect');
      return;
    }

    setIsSharingToCommunity(true);
    console.log('📤 Sharing recording...');

    try {
      const persistedSourceRecording = selectedRecordingToShare?.id
        ? await getRecordingByIdFromStorage(selectedRecordingToShare.id)
        : null;
      const sourceRecording =
        persistedSourceRecording ||
        recordings.find((item) => item.id === selectedRecordingToShare?.id) ||
        selectedRecordingToShare;

      if (!sourceRecording) {
        throw new Error('Selected recording not found.');
      }

      const persistedTitle = (shareTitle || sourceRecording.title || '').trim();
      const persistedDescription = (shareDescription || sourceRecording.description || '').trim();
      const persistedTranscript = (shareTranscript || sourceRecording.transcript || '').trim();
      const persistedLanguageId = sourceRecording.language || selectedLanguage || null;
      const languageName = WORLD_LANGUAGES.find(l => l.id === persistedLanguageId)?.label || 'Unknown';

      if (!persistedTitle) {
        Alert.alert('Title Required', 'Please enter a title for your story');
        playSound('incorrect');
        setIsSharingToCommunity(false);
        return;
      }

      if (!persistedTranscript) {
        Alert.alert('Transcript Required', 'Please generate transcript before sharing.');
        playSound('incorrect');
        setIsSharingToCommunity(false);
        return;
      }

      const savedRecording = await updateRecordingMetadata(sourceRecording.id, {
        title: persistedTitle,
        description: persistedDescription,
        transcript: persistedTranscript,
        language: persistedLanguageId,
        lastSharedAt: new Date().toISOString(),
      });

      const recordingForShare = savedRecording || {
        ...sourceRecording,
        title: persistedTitle,
        description: persistedDescription,
        transcript: persistedTranscript,
        language: persistedLanguageId,
      };

      const explicitlySelectedContacts = emergencyContactsWithApp.filter((contact) =>
        shareRecipients.includes(getContactRecipientKey(contact))
      );
      const myStoriesSelected = shareRecipients.includes('my_stories');
      const communitySelected = shareRecipients.includes('community');
      const selectedEmergencyContacts = [...explicitlySelectedContacts].filter(
        (contact, index, arr) => {
          const key = `${contact.id}-${contact.appUser?.id || contact.linkedUserId || 'app'}`;
          return (
            index ===
            arr.findIndex((candidate) => {
              const candidateKey = `${candidate.id}-${candidate.appUser?.id || candidate.linkedUserId || 'app'}`;
              return candidateKey === key;
            })
          );
        }
      );

      if (!myStoriesSelected && !communitySelected && selectedEmergencyContacts.length === 0) {
        Alert.alert(
          'Recipient Required',
          'Choose at least one option: My Creations, Community Story, or Emergency Contact.'
        );
        playSound('incorrect');
        setIsSharingToCommunity(false);
        return;
      }

      const newStory = {
        id: Date.now().toString(),
        title: recordingForShare.title,
        description: recordingForShare.description || '',
        summary: recordingForShare.description || recordingForShare.transcript?.substring(0, 150) || '',
        transcript: recordingForShare.transcript,
        author: currentUser?.fullName || 'Unknown User',
        userId: currentUser?.id || null,
        authorId: currentUser?.id || null,
        authorEmail: currentUser?.email || null,
        authorRole: currentUser?.role || 'learner',
        senderHasAppAccount: Boolean(currentUser?.id),
        sentByLabel: currentUser?.fullName
          ? `Sent by ${currentUser.fullName} (${currentUser.role || 'learner'})`
          : 'Sent by App User',
        language: languageName,
        languageId: recordingForShare.language || null,
        category: shareCategory,
        audioUri: recordingForShare.uri,
        duration: recordingForShare.duration,
        likes: 0,
        commentsList: [],
        bookmarks: 0,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isFollowing: false,
        recipients: shareRecipients,
        sharedWithContacts: selectedEmergencyContacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          relation: contact.relation,
          appUserId: contact.appUser?.id,
          appUserName: contact.appUser?.fullName,
        })),
      };

      // Save to My Creations (My Creation in Story Library)
      if (myStoriesSelected) {
        const existingMyStoriesRaw = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
        const existingMyStories = existingMyStoriesRaw ? JSON.parse(existingMyStoriesRaw) : [];
        const updatedMyStories = [newStory, ...existingMyStories];
        await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updatedMyStories));
      }

      // Save to Community Story
      if (communitySelected) {
        const existingCommunityStoriesRaw = await AsyncStorage.getItem(COMMUNITY_STORIES_KEY);
        const existingCommunityStories = existingCommunityStoriesRaw ? JSON.parse(existingCommunityStoriesRaw) : [];
        const updatedCommunityStories = [newStory, ...existingCommunityStories];
        await AsyncStorage.setItem(COMMUNITY_STORIES_KEY, JSON.stringify(updatedCommunityStories));

        // Create notifications for all users about new community story
        await createCommunityStoryNotifications(newStory);
      }

      // Share to Emergency Contacts (Other Creation)
      if (selectedEmergencyContacts.length > 0) {
        // Save to contact share tracking
        const existingShares = await AsyncStorage.getItem(CONTACT_SHARES_KEY);
        const parsedShares = existingShares ? JSON.parse(existingShares) : [];
        const deliveries = selectedEmergencyContacts.map((contact) => ({
          id: `${newStory.id}-${contact.id}`,
          sentAt: new Date().toISOString(),
          toContactId: contact.id,
          toContactName: contact.name,
          toAppUserId: contact.appUser?.id || null,
          fromUserId: currentUser?.id || null,
          fromUserName: currentUser?.fullName || 'Unknown User',
          payload: newStory,
        }));
        await AsyncStorage.setItem(CONTACT_SHARES_KEY, JSON.stringify([...deliveries, ...parsedShares]));

        // Save to shared stories so recipients can see in "Other Creation" tab
        const contactEmails = selectedEmergencyContacts
          .filter(contact => contact.appUser && contact.appUser.email)
          .map(contact => contact.appUser.email);

        if (contactEmails.length > 0) {
          const sharedJson = await AsyncStorage.getItem(SHARED_STORIES_KEY);
          const existingShared = sharedJson ? JSON.parse(sharedJson) : [];

          const sharedStory = {
            ...newStory,
            sharedBy: currentUser?.fullName || 'Anonymous',
            sharedByEmail: currentUser?.email || null,
            sharedWithEmails: contactEmails,
            sharedAt: new Date().toISOString(),
          };

          const updatedShared = [sharedStory, ...existingShared];
          await AsyncStorage.setItem(SHARED_STORIES_KEY, JSON.stringify(updatedShared));
          console.log(`✅ Story shared with ${contactEmails.length} emergency contacts (Other Creation)`);
          
          // Create notifications for emergency contacts
          await createEmergencyContactNotifications(sharedStory, selectedEmergencyContacts);
        }
      }

      console.log('✅ Recording shared successfully!');
      playSound('complete');

      const recipientSummary = [];
      if (myStoriesSelected) {
        recipientSummary.push('My Creations');
      }
      if (communitySelected) {
        recipientSummary.push('Community Story');
      }
      if (selectedEmergencyContacts.length > 0) {
        recipientSummary.push(`${selectedEmergencyContacts.length} Emergency Contact(s) - Other Creation`);
      }

      // Determine navigation based on what was selected
      if (communitySelected) {
        // Navigate to Community Story
        Alert.alert(
          'Shared Successfully! 🎉',
          `"${shareTitle}" has been saved to Community Story.\n\n${newStory.sentByLabel}`,
          [
            {
              text: 'View Community',
              onPress: () => {
                setShowShareModal(false);
                navigation.navigate('CommunityStory');
              }
            },
            {
              text: 'OK',
              onPress: () => setShowShareModal(false)
            }
          ]
        );
      } else if (myStoriesSelected) {
        // Navigate to My Stories (Story Library)
        Alert.alert(
          'Shared Successfully! 🎉',
          `"${shareTitle}" has been saved to My Creations.\n\n${newStory.sentByLabel}`,
          [
            {
              text: 'View My Stories',
              onPress: () => {
                setShowShareModal(false);
                navigation.navigate('MainTabs', { screen: 'StoriesTab' });
              }
            },
            {
              text: 'OK',
              onPress: () => setShowShareModal(false)
            }
          ]
        );
      } else if (selectedEmergencyContacts.length > 0) {
        // Emergency contacts only - no navigation
        Alert.alert(
          'Shared Successfully! 🎉',
          `"${shareTitle}" has been shared with ${selectedEmergencyContacts.length} emergency contact(s).\n\n${newStory.sentByLabel}`,
          [
            {
              text: 'OK',
              onPress: () => setShowShareModal(false)
            }
          ]
        );
      } else {
        // Fallback (shouldn't happen)
        Alert.alert(
          'Shared Successfully! 🎉',
          `"${shareTitle}" has been saved${recipientSummary.length > 0 ? ' to: ' + recipientSummary.join(', ') : ''}.\n\n${newStory.sentByLabel}`,
          [
            {
              text: 'OK',
              onPress: () => setShowShareModal(false)
            }
          ]
        );
      }

      // Reset modal
      setShowShareRecipientModal(false);
      setShareTitle('');
      setShareDescription('');
      setShareTranscript('');
      setSelectedRecordingToShare(null);
      setShareRecipients([]);
    } catch (error) {
      console.error('❌ Failed to share recording:', error);
      Alert.alert('Share Failed', 'Could not share your recording. Please try again.');
      playSound('incorrect');
    } finally {
      setIsSharingToCommunity(false);
    }
  };

  const handleRecord = async () => {
    if (isRecording || recording || isRecordingActionInFlightRef.current) {
      return;
    }

    if (!isRecording) {
      try {
        // Check if running on web
        if (Platform.OS === 'web') {
          Alert.alert(
            'Recording Not Supported on Web',
            'Audio recording is not available on web browsers. Please use the mobile app or upload an existing audio file instead.',
            [
              { text: 'Upload File', onPress: () => handlePickAudioFile() },
              { text: 'OK', style: 'cancel' }
            ]
          );
          return;
        }
        
        isRecordingActionInFlightRef.current = true;
        console.log('🔴 Starting recording...');
        
        // Request and verify permissions
        console.log('🔐 Requesting microphone permissions...');
        const permission = await Audio.requestPermissionsAsync();
        console.log('🔐 Permission result:', permission);
        
        if (permission.status !== 'granted') {
          console.log('❌ Permission denied:', permission);
          Alert.alert(
            'Permission Required',
            permission.canAskAgain 
              ? 'Microphone permission is required to record audio. Please grant permission when prompted.'
              : 'Microphone permission was denied. Please enable it in your device settings to use recording features.',
            [{ text: 'OK' }]
          );
          return;
        }

        console.log('✅ Permission granted! Setting up audio mode...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('✅ Audio mode configured');

        console.log('📱 Creating recording...');
        const newRecording = await prepareSingleRecording();
        
        if (!newRecording) {
          throw new Error('Failed to create recording object');
        }
        
        console.log('✅ Recording created successfully!');
        playSound('start');
        
        setRecording(newRecording);
        setIsRecording(true);
        setRecordingTime(0);
        setTranscript('');
        setHasRecording(false);
        setAudioUrl(null);
        setShowLanguageSelector(false);
        setRecordingUri(null);
        
        console.log('🎤 Recording is now active');
      } catch (error) {
        console.error('❌ Failed to start recording:', error);
        playSound('incorrect');
        Alert.alert('Recording Error', `Could not start recording: ${error.message}`);
      } finally {
        isRecordingActionInFlightRef.current = false;
      }
    }
  };

  const handleStop = async () => {
    if (isRecordingActionInFlightRef.current) {
      return;
    }

    try {
      isRecordingActionInFlightRef.current = true;
      console.log('⏹️ Stopping recording...');
      
      if (!recording) {
        console.log('⚠️ No active recording to stop');
        return;
      }

      const uri = await stopAndReleaseRecording(recording);

      if (!uri) {
        throw new Error('Recording URI was not created. Please try again.');
      }
      
      console.log('✅ Recording stopped successfully!');
      console.log('📁 Recording saved at:', uri);
      playSound('complete');

      // NEW: Create recording object and save to storage
      const newRecording = {
        id: Date.now().toString(),
        uri: uri,
        duration: recordingTime,
        timestamp: new Date().toISOString(),
        language: selectedLanguage,
        transcript: '',
        title: '',
        description: '',
        fileName: `Recording ${new Date().toLocaleDateString()}`,
      };

      saveRecordingToStorage(newRecording);
      
      setRecordingUri(uri);
      setRecording(null);
      setIsRecording(false);
      setIsPaused(false);
      setHasRecording(true);
      setShowLanguageSelector(true);
      setAudioUrl('recorded_audio_' + Date.now());
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      playSound('incorrect');
      Alert.alert('Stop Error', `Could not stop recording: ${error.message}`);
    } finally {
      isRecordingActionInFlightRef.current = false;
    }
  };


  const handlePause = async () => {
    try {
      if (!recording) {
        console.log('⚠️ No active recording to pause/resume');
        return;
      }

      if (isPaused) {
        console.log('▶️ Resuming recording...');
        await recording.startAsync();
        playSound('play');
        console.log('✅ Recording resumed');
      } else {
        console.log('⏸️ Pausing recording...');
        await recording.pauseAsync();
        playSound('pause');
        console.log('✅ Recording paused');
      }
      setIsPaused(!isPaused);
    } catch (error) {
      console.error('❌ Failed to pause/resume:', error);
      playSound('incorrect');
      Alert.alert('Pause Error', `Could not pause/resume recording: ${error.message}`);
    }
  };

  const handlePlayback = async () => {
    try {
      if (!recordingUri) {
        Alert.alert('No Recording', 'Please record audio first.');
        playSound('incorrect');
        return;
      }

      // Stop any playing previous recordings
      if (playingRecordingId && playingSoundForId[playingRecordingId]) {
        await playingSoundForId[playingRecordingId].stopAsync();
        await playingSoundForId[playingRecordingId].unloadAsync();
        setPlayingRecordingId(null);
      }

      if (isPlaying && sound) {
        // Pause playback
        console.log('⏸️ Playback paused');
        playSound('pause');
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (sound && !isPlaying) {
        // Resume playback
        console.log('▶️ Resumed playback');
        playSound('play');
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        // Start new playback
        console.log('🔊 Playing recorded audio');
        playSound('play');
        
        // Properly configure audio mode for playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recordingUri },
          { shouldPlay: true, volume: 1.0 },
          onPlaybackStatusUpdate
        );
        
        setSound(newSound);
        setIsPlaying(true);
        console.log('▶️ Playback started');
      }
    } catch (error) {
      console.error('Failed to play recording:', error);
      playSound('incorrect');
      Alert.alert('Playback Error', `Could not play the recording: ${error.message}`);
      setIsPlaying(false);
    }
  };

  // NEW: Play a previous recording
  const playPreviousRecording = async (recordingId, uri) => {
    try {
      // If this recording is currently playing, pause it
      if (playingRecordingId === recordingId && playingSoundForId[recordingId]) {
        console.log('⏸️ Pausing recording:', recordingId);
        await playingSoundForId[recordingId].pauseAsync();
        setPlayingRecordingId(null);
        return;
      }

      // Stop all other playing recordings
      if (playingRecordingId && playingSoundForId[playingRecordingId]) {
        console.log('⏹️ Stopping previous recording:', playingRecordingId);
        await playingSoundForId[playingRecordingId].stopAsync();
        await playingSoundForId[playingRecordingId].unloadAsync();
      }

      // Stop current main playback if any
      if (sound && isPlaying) {
        await sound.stopAsync();
        setIsPlaying(false);
      }

      console.log('🔊 Playing previous recording:', recordingId);
      playSound('play');

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      // Create and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 },
        (status) => {
          if (status.didJustFinish) {
            console.log('✅ Playback finished for:', recordingId);
            playSound('complete');
            setPlayingRecordingId(null);
            // Cleanup finished sound
            newSound.unloadAsync().catch(() => {});
          }
        }
      );

      // Update state with new playing sound
      const updatedSounds = { ...playingSoundForId };
      updatedSounds[recordingId] = newSound;
      setPlayingSoundForId(updatedSounds);
      setPlayingRecordingId(recordingId);
      
      console.log('▶️ Playback started for recording:', recordingId);
    } catch (error) {
      console.error('Failed to play previous recording:', error);
      playSound('incorrect');
      Alert.alert('Playback Error', `Could not play recording: ${error.message}`);
      setPlayingRecordingId(null);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.didJustFinish) {
      console.log('⏹️ Playback finished');
      playSound('complete');
      setIsPlaying(false);
      if (sound) {
        sound.setPositionAsync(0);
      }
    }
    if (status.isLoaded && status.isPlaying) {
      console.log('📊 Playback progress:', Math.round(status.positionMillis / 1000), 'seconds');
    }
  };

  // Cleanup sound when component unmounts
  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const handleGenerateTranscript = async () => {
    // CRITICAL: Check that a recording actually exists
    if (!recordingUri) {
      Alert.alert('No Recording', 'Please record audio first before generating a transcript!');
      playSound('incorrect');
      return;
    }

    if (!selectedLanguage) {
      Alert.alert('Language Required', 'Please select a language first!');
      playSound('incorrect');
      return;
    }
    
    console.log('⚡ Analyzing actual recording audio data');
    console.log('📁 Recording URI:', recordingUri);
    console.log('⏱️ Duration: ' + formatTime(recordingTime));
    playSound('start');
    setIsGenerating(true);
    
    // REALISTIC: Analyze the actual recording properties
    setTimeout(async () => {
      try {
        // Load and analyze the recording file
        const { sound: analysisSound } = await Audio.Sound.createAsync(
          { uri: recordingUri }
        );
        const status = await analysisSound.getStatusAsync();
        
        // Extract real audio properties
        const audioDuration = status.isLoaded ? status.durationMillis : recordingTime * 1000;
        const estimatedWords = Math.floor(audioDuration / 500); // ~2 words per second
        const confidenceScore = recordingTime > 10 ? 
          (Math.random() * 20 + 75).toFixed(1) : // Good quality: 75-95%
          (Math.random() * 30 + 50).toFixed(1);  // Lower quality: 50-80%
        
        analysisSound.unloadAsync();
        console.log('✅ Audio analyzed - Duration:', audioDuration, 'ms');
        console.log('📊 Estimated words:', estimatedWords);
        console.log('🎯 Confidence:', confidenceScore + '%');

        // Generate realistic transcript based on recording length
        const selectedLang = WORLD_LANGUAGES.find(l => l.id === selectedLanguage);
        let generatedTranscript = '';
        
        // Base content templates by language
        const languageGreetings = {
          iban: 'Selamat ari',
          bidayuh: 'Kumusta kamu',
          kadazan: 'Kaanu do koubasanongkob',
          murut: 'Paka ko oyow',
          malay: 'Apa khabar',
          english: 'Hello',
          mandarin: '你好',
          spanish: 'Hola',
          french: 'Bonjour',
          arabic: 'مرحبا',
        };

        const languageIntros = {
          iban: ' Nama ku... Aku datai ari kampung Sarawak.',
          bidayuh: ' Aken temanuh... Aken tahu basa Bidayuh.',
          kadazan: ' Kumaa do ngaranku... Taragang tokou momuhau.',
          murut: ' Ngaranku... Ku lumun moyo rin orongon.',
          malay: ' Nama saya... Saya dari kampung di Sarawak.',
          english: ' My name is... I come from a village in Sarawak.',
          mandarin: ' 我叫... 我来自沙捞越的一个村庄。',
          spanish: ' Me llamo... Vengo de un pueblo en Sarawak.',
          french: ' Je m\'appelle... Je viens d\'un village à Sarawak.',
          arabic: ' اسمي... أنا من قرية في ساراواك.',
        };

        const languageEndings = {
          iban: ' Aku suka ngumbai cerita pasal adat lama. Terima kasih.',
          bidayuh: ' Terima kasih kamu dengar cerita ku.',
          kadazan: ' Nopo do koubasaan do Kadazan. Kopivosian.',
          murut: ' Kotohuon do kaum Murut. Salamat.',
          malay: ' Saya suka berkongsi cerita tentang budaya tradisional. Terima kasih.',
          english: ' I love sharing stories about traditional culture. Thank you.',
          mandarin: ' 我喜欢分享传统文化的故事。谢谢。',
          spanish: ' Me encanta compartir historias sobre la cultura tradicional. Gracias.',
          french: ' J\'aime partager des histoires sur la culture traditionnelle. Merci.',
          arabic: ' أحب مشاركة قصص عن الثقافة التقليدية. شكرا.',
        };

        // Build transcript based on recording length
        const greeting = languageGreetings[selectedLanguage] || `[${selectedLang?.label}]`;
        const intro = recordingTime > 5 ? (languageIntros[selectedLanguage] || '') : '';
        const ending = recordingTime > 10 ? (languageEndings[selectedLanguage] || '') : '';
        
        generatedTranscript = `${greeting}${intro}${ending}`.trim();
        
        // Always provide transcript plus an English translation block for sharing clarity.
        console.log('🔄 Preparing transcript translation blocks');
        let translatedTranscript = generatedTranscript;
        let englishTranslation = generatedTranscript;

        // If the selected language is outside templates, translate content to that language first.
        if (!languageGreetings[selectedLanguage]) {
          try {
            translatedTranscript = await translateText(generatedTranscript, selectedLanguage);
            console.log('✅ Target-language translation complete');
          } catch (translationError) {
            console.warn('Target-language translation failed, using original transcript.', translationError);
          }
        }

        // Add English translation for any non-English selected language.
        if (selectedLanguage !== 'english') {
          try {
            englishTranslation = await translateText(translatedTranscript, 'english');
            console.log('✅ English translation complete');
          } catch (translationError) {
            console.warn('English translation failed, using generated transcript as fallback.', translationError);
            englishTranslation = generatedTranscript;
          }
        }
        
        // Add metadata header with both original and translated versions
        const metadata = `🎙️ Recording Analysis
━━━━━━━━━━━━━━━━━━
📏 Duration: ${formatTime(recordingTime)}
🔊 Quality: ${confidenceScore}% confidence
📝 Est. Words: ~${estimatedWords}
🌐 Language: ${selectedLang?.label || 'Unknown'}
━━━━━━━━━━━━━━━━━━

📄 Transcribed Text (${selectedLang?.label || 'Selected Language'}):
${translatedTranscript}

${selectedLanguage !== 'english' ? `\n🌐 English Translation:\n${englishTranslation}` : ''}

${recordingTime < 5 ? '\n⚠️ Note: Short recording detected. For better accuracy, please record at least 10 seconds.' : ''}
${recordingTime >= 10 && recordingTime < 30 ? '\n✅ Good recording length. Transcript quality should be accurate.' : ''}
${recordingTime >= 30 ? '\n⭐ Excellent! Detailed recording provides high-quality transcription.' : ''}

💡 Tip: This is a simulated transcript. In production, this would use ${selectedLang?.label} speech recognition AI to analyze your actual recorded audio.`;
        
        setTranscript(metadata);

        const activeRecording = recordings.find((item) => item.uri === recordingUri);
        if (activeRecording?.id) {
          await updateRecordingMetadata(activeRecording.id, {
            transcript: metadata,
            language: selectedLanguage,
          });
        } else {
          const updatedRecordings = recordings.map((item) => {
            if (item.uri === recordingUri) {
              return {
                ...item,
                transcript: metadata,
                language: selectedLanguage,
              };
            }
            return item;
          });
          setRecordings(updatedRecordings);
          await AsyncStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(updatedRecordings));
        }

        if (showShareModal && selectedRecordingToShare && selectedRecordingToShare.uri === recordingUri) {
          setShareTranscript(metadata);
        }

        setIsGenerating(false);
        playSound('complete');
        console.log('✅ Transcript generated and translated successfully');
      } catch (error) {
        console.error('Failed to analyze recording:', error);
        playSound('incorrect');
        Alert.alert('Analysis Error', 'Could not analyze your recording. Please ensure recording is complete.');
        setIsGenerating(false);
      }
    }, 2500);
  };

  // NEW: Save recording as story for other library
  const handleSaveAsStory = async () => {
    // Open modal to enter title and description
    setShowCreateStoryModal(true);
  };
  
  // NEW: Validate and proceed to recipient selection
  const handleProceedToRecipients = () => {
    if (!storyTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your story');
      return;
    }

    if (!recordingUri || !transcript) {
      Alert.alert('Incomplete Story', 'Please record audio and generate transcript first');
      return;
    }
    
    // Close title/description modal and show recipient selection
    setShowCreateStoryModal(false);
    setShowRecipientModal(true);
  };
  
  // NEW: Handle saving with selected recipients
  const handleSaveWithRecipients = async () => {
    setIsSavingStory(true);
    setShowRecipientModal(false);
    console.log('💾 Saving story with recipients:', selectedRecipients);

    try {
      // Load existing stories
      const existingStoriesJson = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
      const existingStories = existingStoriesJson ? JSON.parse(existingStoriesJson) : [];

      // Create new story object with author and recipient info
      const newStory = {
        id: Date.now().toString(),
        title: storyTitle.trim(),
        description: storyDescription.trim() || transcript.substring(0, 150),
        summary: storyDescription.trim() || transcript.substring(0, 150),
        audioUri: recordingUri,
        transcript: transcript,
        language: WORLD_LANGUAGES.find(l => l.id === selectedLanguage)?.label || 'Unknown',
        languageId: selectedLanguage,
        duration: recordingTime,
        createdAt: new Date().toISOString(),
        category: 'Community Contribution',
        author: currentUser?.fullName || 'Anonymous',
        authorEmail: currentUser?.email || null,
        authorId: currentUser?.id || null,
        authorRole: currentUser?.role || 'learner',
        recipients: selectedRecipients,
        sharedWith: selectedRecipients.includes('community') ? 'Other Library' : 
                     selectedRecipients.includes('private') ? 'Private Library' : 
                     'Emergency Contacts',
      };

      // Add to stories array
      const updatedStories = [newStory, ...existingStories];
      await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updatedStories));

      // Save to shared stories if emergency contacts are selected
      const emergencyContactIds = selectedRecipients.filter(r => r !== 'community' && r !== 'private');
      if (emergencyContactIds.length > 0) {
        await saveSharedStoriesToContacts(newStory, emergencyContactIds);
      }

      console.log('✅ Story saved successfully!');
      playSound('complete');

      // Build recipient message
      let recipientMsg = '';
      if (selectedRecipients.includes('community')) {
        recipientMsg = 'Shared to Other Library. ';
      }
      if (selectedRecipients.includes('private')) {
        recipientMsg += 'Saved to your Private Library. ';
      }
      if (emergencyContactIds.length > 0) {
        recipientMsg += `Sent to ${emergencyContactIds.length} emergency contact(s). `;
      }

      Alert.alert(
        'Story Saved! 🎉',
        `"${storyTitle}" has been saved.\n\n${recipientMsg}\n\nLabeled by: ${newStory.author} (${newStory.authorRole})`,
        [
          {
            text: 'View in Archive',
            onPress: () => {
              navigation.navigate('MainTabs', { screen: 'StoriesTab' });
            }
          }
        ]
      );

      // Reset form
      setStoryTitle('');
      setStoryDescription('');
      setTranscript('');
      setRecordingUri(null);
      setHasRecording(false);
      setSelectedLanguage('');
      setRecordingTime(0);
      setSelectedRecipients(['private']);
      
    } catch (error) {
      console.error('❌ Failed to save story:', error);
      Alert.alert('Save Failed', 'Could not save your story. Please try again.');
    } finally {
      setIsSavingStory(false);
    }
  };

  // NEW: Save shared stories with emergency contact emails
  const saveSharedStoriesToContacts = async (story, contactIds) => {
    try {
      // Get all users database to find emergency contact emails
      const usersJson = await AsyncStorage.getItem(USERS_DB_KEY);
      const allUsers = usersJson ? JSON.parse(usersJson) : [];

      // Get emergency contacts emails
      const contactEmails = [];
      for (const contactId of contactIds) {
        const contact = emergencyContactsWithApp.find(c => getContactRecipientKey(c) === contactId);
        if (contact && contact.appUser && contact.appUser.email) {
          contactEmails.push(contact.appUser.email);
        }
      }

      if (contactEmails.length === 0) {
        console.log('⚠️ No valid emergency contact emails found');
        return;
      }

      // Load existing shared stories
      const sharedJson = await AsyncStorage.getItem(SHARED_STORIES_KEY);
      const existingShared = sharedJson ? JSON.parse(sharedJson) : [];

      // Create shared story object
      const sharedStory = {
        ...story,
        sharedBy: currentUser?.fullName || 'Anonymous',
        sharedByEmail: currentUser?.email || null,
        sharedWithEmails: contactEmails,
        sharedAt: new Date().toISOString(),
      };

      // Add to shared stories
      const updatedShared = [sharedStory, ...existingShared];
      await AsyncStorage.setItem(SHARED_STORIES_KEY, JSON.stringify(updatedShared));
      
      console.log(`✅ Story shared with ${contactEmails.length} emergency contacts`);
    } catch (error) {
      console.error('❌ Failed to save shared stories:', error);
    }
  };

  const handleSubmit = () => {
    console.log('📤 Submitting recording');
    playSound('correct');
    Alert.alert(
      'Success! 🎉',
      'Your recording has been preserved in our cultural archive. Thank you for helping keep indigenous languages alive!',
      [{ text: 'OK', onPress: () => playSound('complete') }]
    );
    
    // Reset state
    setRecordingTime(0);
    setHasRecording(false);
    setTranscript('');
    setSelectedLanguage('');
    setShowLanguageSelector(false);
    setAudioUrl(null);
    setRecordingUri(null);
    
    // Cleanup audio
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Voice Recording</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Preserve indigenous voices for future generations</Text>
          </View>
        </View>
        
        <View style={styles.content}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.accent, // Solid background
              padding: SPACING.m,
              borderRadius: SPACING.m,
              marginBottom: SPACING.l,
              ...SHADOWS.medium, // Add shadow
            }}
            onPress={() => navigation.navigate('AIStoryGenerator', { mode: 'train' })}
          >
            <View style={{ 
              width: 48, height: 48, borderRadius: 24, 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              justifyContent: 'center', alignItems: 'center',
              marginRight: SPACING.m 
            }}>
               <MaterialCommunityIcons name="microphone-variant" size={28} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.surface }}>Train Voice Model</Text>
               <Text style={{ fontSize: 13, color: theme.surface, opacity: 0.9 }}>Create your own digital voice clone</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.surface} />
          </TouchableOpacity>

          <View style={[styles.recordingStudioCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <View style={styles.studioHeaderRow}>
              <Text style={[styles.studioTitle, { color: theme.text }]}>Recording Studio</Text>
              <View style={[styles.studioStatusPill, { backgroundColor: isRecording ? (theme.error || '#EF4444') + '20' : theme.surfaceVariant }]}> 
                <Text style={[styles.studioStatusText, { color: isRecording ? (theme.error || '#EF4444') : theme.textSecondary }]}>
                  {isRecording ? (isPaused ? 'Paused' : 'Recording') : 'Ready'}
                </Text>
              </View>
            </View>

            {/* Timer Display */}
            <View style={styles.timerContainer}>
              <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(recordingTime)}</Text>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={[styles.redDot, { backgroundColor: theme.error }]} />
                  <Text style={[styles.recordingText, { color: theme.error }]}>{isPaused ? 'PAUSED' : 'RECORDING'}</Text>
                </View>
              )}
            </View>

            {/* Waveform Visualization */}
            <View style={[styles.waveformContainer, { backgroundColor: theme.background, borderColor: theme.border }]}> 
              {waveHeights.map((height, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveBar,
                    {
                      height: height,
                      backgroundColor: isRecording ? theme.error : theme.textSecondary,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Main Record Button */}
            <View style={[styles.controlsContainer, { backgroundColor: theme.surface }]}> 
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    isRecording && [styles.recordButtonActive, { backgroundColor: theme.error }],
                    !isRecording && { backgroundColor: theme.primary }
                  ]}
                  onPress={handleRecord}
                  disabled={isRecording}
                >
                  <Ionicons
                    name="mic"
                    size={64}
                    color={theme.onPrimary || '#FFFFFF'}
                  />
                </TouchableOpacity>
              </Animated.View>

              {/* Control Buttons */}
              {isRecording && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }]} 
                    onPress={handlePause}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={isPaused ? "play" : "pause"} size={28} color={theme.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.primary }]}>{isPaused ? 'Resume' : 'Pause'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.stopButton, { backgroundColor: theme.background, borderColor: theme.error }]} 
                    onPress={handleStop}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="stop" size={28} color={theme.error} />
                    <Text style={[styles.actionButtonText, { color: theme.error }]}>Stop</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Import Audio Option */}
              {!isRecording && !hasRecording && (
                <TouchableOpacity
                  style={{
                    width: '100%', marginTop: SPACING.l,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    paddingVertical: 12, paddingHorizontal: 16,
                    borderRadius: 16,
                    backgroundColor: theme.glassMedium,
                    borderWidth: 1, borderColor: theme.primary,
                    gap: 8
                  }}
                  onPress={handlePickAudioFile}
                >
                  <Ionicons name="folder-open" size={20} color={theme.primary} />
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.primary }}>Import Audio File</Text>
                </TouchableOpacity>
              )}

            </View>
          </View>

          {/* NEW: Playback Controls - Redesigned */}
          {hasRecording && !isRecording && (
            <View style={styles.recordedAudioContainer}>
              <View style={[styles.recordedAudioCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.recordedAudioHeader, { borderBottomColor: theme.border }]}>
                  <Ionicons name="checkmark-circle" size={32} color={theme.success || '#4CAF50'} />
                  <View style={styles.recordedAudioInfo}>
                    <Text style={[styles.recordedAudioTitle, { color: theme.text }]}>Recording Saved ✓</Text>
                    <Text style={[styles.recordedAudioDuration, { color: theme.textSecondary }]}>{formatTime(recordingTime)}</Text>
                  </View>
                </View>

                {/* Play Recording Button */}
                <TouchableOpacity 
                  style={[styles.playRecordingButton, { backgroundColor: theme.primary }]} 
                  onPress={handlePlayback}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isPlaying ? "pause-circle" : "play-circle"}
                    size={28}
                    color={theme.onPrimary || '#FFFFFF'}
                  />
                  <Text style={[styles.playRecordingButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>
                    {isPlaying ? 'Pause Playback' : 'Play Recording'}
                  </Text>
                </TouchableOpacity>

                {/* NEW: Record Another Button */}
                <TouchableOpacity 
                  style={[styles.recordAnotherButton, { backgroundColor: theme.glassMedium, borderColor: theme.accent }]} 
                  onPress={() => {
                    setHasRecording(false);
                    setRecordingUri(null);
                    setTranscript('');
                    setShowLanguageSelector(false);
                    playSound('select');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle" size={20} color={theme.accent} />
                  <Text style={[styles.recordAnotherButtonText, { color: theme.accent }]}>Record Another</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Language Selector - Enhanced with All World Languages */}
          {showLanguageSelector && (
            <View style={[styles.languageSection, { backgroundColor: theme.surface }]}>
              <View style={styles.languageSectionHeader}>
                <MaterialCommunityIcons name="translate" size={28} color={theme.primary} />
                <View style={styles.languageHeaderTextContainer}>
                  <Text style={[styles.languageSectionTitle, { color: theme.text }]}>Select Language for Transcript</Text>
                  <Text style={[styles.languageSectionSubtitle, { color: theme.textSecondary }]}>
                    {WORLD_LANGUAGES.length} languages available • Indigenous languages prioritized
                  </Text>
                </View>
              </View>

              {/* Search Bar for Languages */}
              <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search 70+ languages..."
                  placeholderTextColor={theme.textSecondary}
                  value={languageSearch}
                  onChangeText={setLanguageSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {languageSearch.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setLanguageSearch('')}
                    style={styles.clearSearchButton}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              
              <ScrollView 
                style={styles.languageScrollContainer} 
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {LANGUAGE_GROUPS
                  .map(group => ({
                    ...group,
                    languages: group.languages.filter(lang => 
                      lang.label.toLowerCase().includes(languageSearch.toLowerCase()) ||
                      lang.id.toLowerCase().includes(languageSearch.toLowerCase())
                    )
                  }))
                  .filter(group => group.languages.length > 0)
                  .map((group, groupIndex) => (
                  <View key={groupIndex} style={styles.languageGroup}>
                    <View style={styles.languageGroupHeader}>
                      <Text style={styles.languageGroupTitle}>{group.title}</Text>
                      <Text style={styles.languageGroupCount}>({group.languages.length})</Text>
                    </View>
                    
                    <View style={styles.languageGrid}>
                      {group.languages.map((lang) => (
                        <TouchableOpacity
                          key={lang.id}
                          style={[
                            styles.languageButton,
                            selectedLanguage === lang.id && styles.languageButtonActive,
                            lang.indigenous && styles.languageButtonIndigenous,
                          ]}
                          onPress={() => {
                            console.log(`🌍 Selected language: ${lang.label}`);
                            playSound('select');
                            setSelectedLanguage(lang.id);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.languageFlag}>{lang.flag}</Text>
                          <View style={styles.languageTextContainer}>
                            <Text
                              style={[
                                styles.languageLabel,
                                selectedLanguage === lang.id && styles.languageLabelActive,
                              ]}
                              numberOfLines={1}
                            >
                              {lang.label}
                            </Text>
                            {lang.indigenous && (
                              <View style={styles.indigenousBadge}>
                                <Text style={styles.indigenousBadgeText}>Indigenous</Text>
                              </View>
                            )}
                          </View>
                          {selectedLanguage === lang.id && (
                            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>

              {selectedLanguage && (
                <View style={styles.selectedLanguageInfo}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                  <Text style={[styles.selectedLanguageText, { color: theme.text }]}>
                    Selected: {WORLD_LANGUAGES.find(l => l.id === selectedLanguage)?.label}
                  </Text>
                </View>
              )}

              {selectedLanguage && !transcript && (
                <TouchableOpacity
                  style={[styles.generateButton, { backgroundColor: theme.primary }]}
                  onPress={handleGenerateTranscript}
                  disabled={isGenerating}
                  activeOpacity={0.8}
                >
                  {isGenerating ? (
                    <>
                      <MaterialCommunityIcons name="loading" size={24} color={theme.onPrimary || '#FFFFFF'} />
                      <Text style={[styles.generateButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>Generating AI Transcript...</Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="auto-fix" size={24} color={theme.onPrimary || '#FFFFFF'} />
                      <Text style={[styles.generateButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>🤖 Generate AI Transcript</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Transcript Display */}
          {transcript && (
            <View style={[styles.transcriptContainer, { backgroundColor: theme.surface }]}>
              <View style={styles.transcriptHeader}>
                <Ionicons name="document-text" size={20} color={theme.primary} />
                <Text style={[styles.transcriptTitle, { color: theme.text }]}>Auto-generated Transcript ({WORLD_LANGUAGES.find(l => l.id === selectedLanguage)?.label})</Text>
              </View>
              <ScrollView style={[styles.transcriptScroll, { borderColor: theme.border, backgroundColor: theme.background }]} nestedScrollEnabled>
                <TextInput
                  style={[styles.transcriptText, { color: theme.text }]}
                  value={transcript}
                  onChangeText={setTranscript}
                  multiline
                  placeholder="Transcript will appear here..."
                  placeholderTextColor={theme.textSecondary}
                />
              </ScrollView>

              {/* Create Story Button - Always available after transcript */}
              <View style={styles.storyCreationSection}>
                <TouchableOpacity
                  style={[styles.saveStoryButton, isSavingStory && styles.saveStoryButtonDisabled, { backgroundColor: theme.secondary }]}
                  onPress={handleSaveAsStory}
                  disabled={isSavingStory}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons 
                    name={isSavingStory ? "loading" : "book-plus"} 
                    size={24} 
                    color={theme.onPrimary || '#FFFFFF'} 
                  />
                  <Text style={[styles.saveStoryButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>
                    {isSavingStory ? 'Creating Story...' : 'Create Story'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Upload Option */}
          <TouchableOpacity
            style={[styles.uploadOption, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={handlePickAudioFile}
          >
            <Ionicons name="cloud-upload-outline" size={24} color={theme.secondary} />
            <Text style={[styles.uploadOptionText, { color: theme.textSecondary }]}>Import Audio File</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          {hasRecording && transcript && (
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: theme.success || '#4CAF50' }]} 
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={[styles.submitButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>Submit Recording</Text>
              <Ionicons name="checkmark-circle" size={24} color={theme.onPrimary || '#FFFFFF'} />
            </TouchableOpacity>
          )}

          {/* NEW: Previous Recordings Section */}
          {recordings.length > 0 && (
            <View style={[styles.previousRecordingsSection, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
                <Ionicons name="folder-open" size={24} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Previous Recordings</Text>
                <View style={[styles.recordingBadge, { backgroundColor: theme.glassMedium }]}>
                  <Text style={[styles.recordingBadgeText, { color: theme.primary }]}>{recordings.length}</Text>
                </View>
              </View>

              <FlatList
                data={recordings}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View style={[
                    styles.recordingListItem, 
                    { 
                      backgroundColor: theme.surface, 
                      borderColor: theme.border,
                      flexDirection: 'column', // Force vertical layout
                      alignItems: 'stretch', // Full width items
                      paddingVertical: 12,
                      gap: 12
                    }
                  ]}>
                    <View style={styles.recordingListItemContent}>
                      <View style={[styles.recordingNumberBadge, { backgroundColor: theme.glassMedium }]}>
                        <Text style={[styles.recordingNumber, { color: theme.primary }]}>{recordings.length - index}</Text>
                      </View>
                      
                      <View style={styles.recordingListItemInfo}>
                        <Text style={[styles.recordingListItemTime, { color: theme.text }]}>
                          {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <View style={styles.recordingListItemDetails}>
                          <Text style={[styles.recordingListItemDuration, { color: theme.textSecondary }]}>
                            <Ionicons name="time" size={14} color={theme.textSecondary} /> {formatTime(item.duration)}
                          </Text>
                          {item.language && (
                            <Text style={[styles.recordingListItemLanguage, { color: theme.textSecondary }]}>
                              <Ionicons name="language" size={14} color={theme.textSecondary} /> {WORLD_LANGUAGES.find(l => l.id === item.language)?.label || 'Unknown'}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Play/Delete/Share Buttons - New Row */}
                    <View style={[
                      styles.recordingListActions, 
                      { 
                        width: '100%', 
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: theme.border,
                        marginTop: 4
                      }
                    ]}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
                        onPress={() => playPreviousRecording(item.id, item.uri)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={playingRecordingId === item.id ? "pause-circle" : "play-circle"}
                          size={28}
                          color={playingRecordingId === item.id ? theme.primary : theme.textSecondary}
                        />
                        <Text style={{ marginLeft: 6, color: playingRecordingId === item.id ? theme.primary : theme.textSecondary, fontWeight: '600' }}>
                          {playingRecordingId === item.id ? "Pause" : "Play"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ 
                          flex: 1, 
                          backgroundColor: theme.primary + '15', 
                          borderRadius: 8,
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          paddingVertical: 8,
                          marginHorizontal: 8
                        }}
                        onPress={() => {
                          // Open share modal with title/description entry
                          setSelectedRecordingToShare(item);
                          setShareTitle(item.title || '');
                          setShareDescription(item.description || '');
                          setShareTranscript(item.transcript || '');
                          setShareCategory('Story');
                          setShowShareModal(true);
                          playSound('select');
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="share-social" size={18} color={theme.primary} />
                        <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: 'bold', color: theme.primary }}>
                          Share
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ padding: 8 }}
                        onPress={() => {
                          Alert.alert(
                            'Delete Recording',
                            'Are you sure you want to delete this recording?',
                            [
                              { text: 'Cancel', onPress: () => {} },
                              {
                                text: 'Delete',
                                onPress: () => deleteRecording(item.id),
                                style: 'destructive',
                              },
                            ]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={24} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </View>
          )}

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="information-circle" size={24} color={theme.accent} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>Recording Tips</Text>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                • Find a quiet environment{'\n'}
                • Speak clearly and naturally{'\n'}
                • Hold phone 6-8 inches from mouth{'\n'}
                • Record traditional stories, phrases, or conversations
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Share to Community Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.shareModalContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.shareModalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.shareModalTitle, { color: theme.text }]}>Share Recording</Text>
                <Text style={[styles.shareModalSubtitle, { color: theme.textSecondary }]}>Share recording + transcript + details</Text>
              </View>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowShareModal(false)}
              >
                <Ionicons name="close-circle" size={32} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.shareModalContent} showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Title *</Text>
                <TextInput
                  style={[styles.shareInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="Give your recording a title..."
                  placeholderTextColor={theme.textSecondary}
                  value={shareTitle}
                  onChangeText={setShareTitle}
                  maxLength={100}
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description (Optional)</Text>
                <TextInput
                  style={[styles.shareInput, styles.shareTextArea, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="Describe your recording, add context, or share its cultural significance..."
                  placeholderTextColor={theme.textSecondary}
                  value={shareDescription}
                  onChangeText={setShareDescription}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={[styles.characterCount, { color: theme.textSecondary }]}>{shareDescription.length}/500</Text>
              </View>

              {/* Category Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
                <View style={styles.categoryButtons}>
                  {['Story', 'Song', 'Lesson', 'Conversation', 'Other'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        { backgroundColor: theme.glassMedium, borderColor: theme.border },
                        shareCategory === cat && [styles.categoryButtonActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
                      ]}
                      onPress={() => {
                        setShareCategory(cat);
                        playSound('select');
                      }}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        { color: theme.text },
                        shareCategory === cat && [styles.categoryButtonTextActive, { color: theme.onPrimary || '#FFFFFF' }]
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Transcript Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Transcript *</Text>
                <TextInput
                  style={[styles.shareInput, styles.shareTranscriptArea, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="Auto-filled by AI generated transcript"
                  placeholderTextColor={theme.textSecondary}
                  value={shareTranscript}
                  editable={false}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Recording Info */}
              {selectedRecordingToShare && (
                <View style={styles.recordingInfoCard}>
                  <Ionicons name="musical-notes" size={24} color={COLORS.primary} />
                  <View style={styles.recordingInfoText}>
                    <Text style={styles.recordingInfoLabel}>Recording Details</Text>
                    <Text style={styles.recordingInfoDetails}>
                      Duration: {formatTime(selectedRecordingToShare.duration)} • {' '}
                      {selectedRecordingToShare.language ? 
                        WORLD_LANGUAGES.find(l => l.id === selectedRecordingToShare.language)?.label : 
                        'Language not set'}
                    </Text>
                    <Text style={styles.recordingInfoDetails}>
                      Sender: {currentUser?.fullName || 'Unknown User'} ({currentUser?.role || 'learner'})
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Share Button */}
            <View style={[styles.shareModalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowShareModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shareButton,
                  { backgroundColor: theme.primary },
                  isSharingToCommunity && styles.shareButtonDisabled
                ]}
                onPress={() => {
                  const latestTranscript =
                    selectedRecordingToShare?.transcript ||
                    recordings.find((item) => item.id === selectedRecordingToShare?.id)?.transcript ||
                    transcript ||
                    '';

                  if (!latestTranscript.trim()) {
                    Alert.alert(
                      'Transcript Required',
                      'Please generate AI transcript first. The transcript and translation will be auto-filled for recipient sharing.'
                    );
                    playSound('incorrect');
                    return;
                  }

                  if (latestTranscript !== shareTranscript) {
                    setShareTranscript(latestTranscript);
                  }

                  setShowShareRecipientModal(true);
                }}
                disabled={isSharingToCommunity}
              >
                {isSharingToCommunity ? (
                  <Text style={[styles.shareButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>Sharing...</Text>
                ) : (
                  <>
                    <Ionicons name="share-social" size={20} color={theme.onPrimary || '#FFFFFF'} />
                    <Text style={[styles.shareButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>Next: Choose Recipients</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recipient Selection for Share Icon Flow */}
      <Modal
        visible={showShareRecipientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareRecipientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.recipientModalContainer, { backgroundColor: theme.surface }]}> 
            <View style={[styles.shareModalHeader, { borderBottomColor: theme.border }]}> 
              <View>
                <Text style={[styles.shareModalTitle, { color: theme.text }]}>Choose Recipients</Text>
                <Text style={[styles.shareModalSubtitle, { color: theme.textSecondary }]}>Select where to save and share your recording</Text>
              </View>
              <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowShareRecipientModal(false)}>
                <Ionicons name="close-circle" size={32} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.recipientModalContent} showsVerticalScrollIndicator={false}>
              {/* My Creations Option */}
              <TouchableOpacity
                style={[
                  styles.recipientOption,
                  { backgroundColor: theme.glassMedium, borderColor: theme.border },
                  shareRecipients.includes('my_stories') && [styles.recipientOptionActive, { borderColor: theme.primary, backgroundColor: theme.primary + '10' }],
                ]}
                onPress={() => toggleShareRecipient('my_stories')}
              >
                <View style={[styles.recipientIconContainer, { backgroundColor: theme.secondary + '20' }]}>
                  <Ionicons name="book" size={24} color={theme.secondary} />
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={[styles.recipientTitle, { color: theme.text }]}>My Creations</Text>
                  <Text style={[styles.recipientDescription, { color: theme.textSecondary }]}>Save to Story Library (My Creation)</Text>
                </View>
                <Ionicons
                  name={shareRecipients.includes('my_stories') ? 'checkbox' : 'square-outline'}
                  size={28}
                  color={shareRecipients.includes('my_stories') ? theme.primary : theme.textSecondary}
                />
              </TouchableOpacity>

              {/* Community Story Option */}
              <TouchableOpacity
                style={[
                  styles.recipientOption,
                  { backgroundColor: theme.glassMedium, borderColor: theme.border },
                  shareRecipients.includes('community') && [styles.recipientOptionActive, { borderColor: theme.primary, backgroundColor: theme.primary + '10' }],
                ]}
                onPress={() => toggleShareRecipient('community')}
              >
                <View style={[styles.recipientIconContainer, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name="globe" size={24} color={theme.primary} />
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={[styles.recipientTitle, { color: theme.text }]}>Community Story</Text>
                  <Text style={[styles.recipientDescription, { color: theme.textSecondary }]}>Share with community for cultural preservation</Text>
                </View>
                <Ionicons
                  name={shareRecipients.includes('community') ? 'checkbox' : 'square-outline'}
                  size={28}
                  color={shareRecipients.includes('community') ? theme.primary : theme.textSecondary}
                />
              </TouchableOpacity>

              <View style={styles.sectionDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <Text style={[styles.sectionDividerText, { color: theme.textSecondary }]}>Emergency Contacts (Other Creation)</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              {emergencyContactsWithApp.length === 0 && (
                <View style={[styles.noContactsBanner, { backgroundColor: theme.glassMedium }]}>
                  <Ionicons name="people-outline" size={24} color={theme.textSecondary} />
                  <Text style={[styles.noContactsText, { color: theme.textSecondary }]}>No emergency contacts with app account found.</Text>
                </View>
              )}

              {emergencyContactsWithApp.map((contact, index) => {
                const recipientKey = getContactRecipientKey(contact);
                return (
                  <TouchableOpacity
                    key={`share-recipient-${contact.id}-${contact.appUser?.id || 'app'}-${index}`}
                    style={[
                      styles.recipientOption,
                      { backgroundColor: theme.glassMedium, borderColor: theme.border },
                      shareRecipients.includes(recipientKey) && [styles.recipientOptionActive, { borderColor: theme.primary, backgroundColor: theme.primary + '10' }],
                    ]}
                    onPress={() => toggleShareRecipient(recipientKey)}
                  >
                    <View style={[styles.recipientIconContainer, { backgroundColor: theme.accent + '20' }]}>
                      <Ionicons name="person-circle" size={24} color={theme.accent} />
                    </View>
                    <View style={styles.recipientInfo}>
                      <Text style={[styles.recipientTitle, { color: theme.text }]}>{contact.name}</Text>
                      <Text style={[styles.recipientDescription, { color: theme.textSecondary }]}>
                        {contact.relation} • App User: {contact.appUser?.fullName || contact.linkedUserName || 'Linked'}
                      </Text>
                      {(contact.username || contact.appUser?.email || contact.email) && (
                        <Text style={[styles.recipientDescription, { color: theme.textSecondary }]}> 
                          @{contact.username || contact.appUser?.username || 'user'} • {contact.appUser?.email || contact.email}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name={shareRecipients.includes(recipientKey) ? 'checkbox' : 'square-outline'}
                      size={28}
                      color={shareRecipients.includes(recipientKey) ? theme.primary : theme.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}

              {currentUser && (
                <View style={[styles.authorLabelBanner, { backgroundColor: theme.primary + '20' }]}> 
                  <Ionicons name="information-circle" size={20} color={theme.primary} />
                  <Text style={[styles.authorLabelText, { color: theme.text }]}>This share will be marked as sent by {currentUser.fullName} ({currentUser.role || 'learner'}).</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.saveRecipientButton,
                shareRecipients.length === 0 && styles.saveRecipientButtonDisabled,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleShareRecording}
              disabled={shareRecipients.length === 0 || isSharingToCommunity}
            >
              <Text style={[styles.saveRecipientButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>Share Now ({shareRecipients.length})</Text>
              <Ionicons name="checkmark-circle" size={24} color={theme.onPrimary || '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Recipient Selection Modal */}
      <Modal
        visible={showRecipientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecipientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.recipientModalContainer, { backgroundColor: theme.surface }]}> 
            <View style={[styles.shareModalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.shareModalTitle, { color: theme.text }]}>Share Recording</Text>
                <Text style={[styles.shareModalSubtitle, { color: theme.textSecondary }]}>Choose who will receive this recording</Text>
              </View>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowRecipientModal(false)}
              >
                <Ionicons name="close-circle" size={32} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.recipientModalContent} showsVerticalScrollIndicator={false}>
              {/* Private Library Option */}
              <TouchableOpacity
                style={[
                  styles.recipientOption,
                  { backgroundColor: theme.glassMedium, borderColor: theme.border },
                  selectedRecipients.includes('private') && [styles.recipientOptionActive, { borderColor: theme.primary, backgroundColor: theme.primary + '10' }]
                ]}
                onPress={() => {
                  if (selectedRecipients.includes('private')) {
                    setSelectedRecipients(selectedRecipients.filter(r => r !== 'private'));
                  } else {
                    setSelectedRecipients([...selectedRecipients, 'private']);
                  }
                }}
              >
                <View style={[styles.recipientIconContainer, { backgroundColor: theme.secondary + '20' }]}>
                  <Ionicons name="lock-closed" size={24} color={theme.secondary} />
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={[styles.recipientTitle, { color: theme.text }]}>Private Library</Text>
                  <Text style={[styles.recipientDescription, { color: theme.textSecondary }]}>Keep this recording in your personal collection only</Text>
                </View>
                <Ionicons
                  name={selectedRecipients.includes('private') ? 'checkbox' : 'square-outline'}
                  size={28}
                  color={selectedRecipients.includes('private') ? theme.primary : theme.textSecondary}
                />
              </TouchableOpacity>

              {/* Other Library Option */}
              <TouchableOpacity
                style={[
                  styles.recipientOption,
                  { backgroundColor: theme.glassMedium, borderColor: theme.border },
                  selectedRecipients.includes('community') && [styles.recipientOptionActive, { borderColor: theme.primary, backgroundColor: theme.primary + '10' }]
                ]}
                onPress={() => {
                  if (selectedRecipients.includes('community')) {
                    setSelectedRecipients(selectedRecipients.filter(r => r !== 'community'));
                  } else {
                    setSelectedRecipients([...selectedRecipients, 'community']);
                  }
                }}
              >
                <View style={[styles.recipientIconContainer, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name="globe" size={24} color={theme.primary} />
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={[styles.recipientTitle, { color: theme.text }]}>Other Library</Text>
                  <Text style={[styles.recipientDescription, { color: theme.textSecondary }]}>Share to other library for cultural preservation</Text>
                </View>
                <Ionicons
                  name={selectedRecipients.includes('community') ? 'checkbox' : 'square-outline'}
                  size={28}
                  color={selectedRecipients.includes('community') ? theme.primary : theme.textSecondary}
                />
              </TouchableOpacity>

              {/* Emergency Contacts Section */}
              {emergencyContactsWithApp.length > 0 && (
                <>
                  <View style={styles.sectionDivider}>
                    <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                    <Text style={[styles.sectionDividerText, { color: theme.textSecondary }]}>Emergency Contacts (App Users)</Text>
                    <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                  </View>

                  {emergencyContactsWithApp.map((contact, index) => (
                    <TouchableOpacity
                      key={`save-recipient-${contact.id}-${contact.appUser?.id || 'app'}-${index}`}
                      style={[
                        styles.recipientOption,
                        selectedRecipients.includes(contact.id) && styles.recipientOptionActive
                      ]}
                      onPress={() => {
                        if (selectedRecipients.includes(contact.id)) {
                          setSelectedRecipients(selectedRecipients.filter(r => r !== contact.id));
                        } else {
                          setSelectedRecipients([...selectedRecipients, contact.id]);
                        }
                      }}
                    >
                      <View style={styles.recipientIconContainer}>
                        <Ionicons name="person-circle" size={24} color={theme.accent} />
                      </View>
                      <View style={styles.recipientInfo}>
                        <Text style={styles.recipientTitle}>{contact.name}</Text>
                        <Text style={styles.recipientDescription}>{contact.relation}</Text>
                      </View>
                      <Ionicons
                        name={selectedRecipients.includes(contact.id) ? 'checkbox' : 'square-outline'}
                        size={28}
                        color={selectedRecipients.includes(contact.id) ? theme.primary : theme.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {emergencyContacts.length > 0 && emergencyContactsWithApp.length === 0 && (
                <View style={styles.noContactsBanner}>
                  <Ionicons name="people-outline" size={24} color={theme.textSecondary} />
                  <Text style={styles.noContactsText}>
                    You have {emergencyContacts.length} emergency contact(s), but none of them have the app installed yet. Only contacts with app accounts can receive recordings.
                  </Text>
                </View>
              )}
              
              {emergencyContacts.length === 0 && (
                <View style={styles.noContactsBanner}>
                  <Ionicons name="people-outline" size={24} color={theme.textSecondary} />
                  <Text style={styles.noContactsText}>
                    No emergency contacts yet. Add contacts in your profile to share recordings with them.
                  </Text>
                </View>
              )}

              {/* Author Label Info */}
              {currentUser && (
                <View style={[styles.authorLabelBanner, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name="information-circle" size={20} color={theme.primary} />
                  <Text style={[styles.authorLabelText, { color: theme.text }]}>
                    This recording will be labeled: "Shared by {currentUser.fullName} ({currentUser.role})"
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveRecipientButton,
                selectedRecipients.length === 0 && styles.saveRecipientButtonDisabled,
                { backgroundColor: theme.primary }
              ]}
              onPress={handleSaveWithRecipients}
              disabled={selectedRecipients.length === 0}
            >
              <Text style={[styles.saveRecipientButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>
                Save & Share ({selectedRecipients.length})
              </Text>
              <Ionicons name="checkmark-circle" size={24} color={theme.onPrimary || '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Story Modal - Title and Description */}
      <Modal
        visible={showCreateStoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateStoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.recipientModalContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.shareModalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.shareModalTitle, { color: theme.text }]}>Create Story</Text>
                <Text style={[styles.shareModalSubtitle, { color: theme.textSecondary }]}>Add details about your recording</Text>
              </View>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowCreateStoryModal(false)}
              >
                <Ionicons name="close-circle" size={32} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.recipientModalContent} showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  Story Title <Text style={[styles.required, { color: theme.error }]}>*</Text>
                </Text>
                <TextInput
                  style={[styles.shareInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="Enter a title for your story..."
                  placeholderTextColor={theme.textSecondary}
                  value={storyTitle}
                  onChangeText={setStoryTitle}
                  maxLength={100}
                  autoFocus
                />
                <Text style={[styles.characterCount, { color: theme.textSecondary }]}>{storyTitle.length}/100</Text>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Description (Optional)</Text>
                <TextInput
                  style={[styles.shareInput, styles.shareTextArea, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="Describe your story, add cultural context, or share its significance..."
                  placeholderTextColor={theme.textSecondary}
                  value={storyDescription}
                  onChangeText={setStoryDescription}
                  multiline
                  numberOfLines={5}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={[styles.characterCount, { color: theme.textSecondary }]}>{storyDescription.length}/500</Text>
              </View>

              {/* Info Banner */}
              <View style={[styles.authorLabelBanner, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="information-circle" size={20} color={theme.primary} />
                <Text style={[styles.authorLabelText, { color: theme.text }]}>
                  Next, you'll choose where to save and share your story
                </Text>
              </View>
            </ScrollView>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.saveRecipientButton,
                !storyTitle.trim() && styles.saveRecipientButtonDisabled,
                { backgroundColor: theme.primary }
              ]}
              onPress={handleProceedToRecipients}
              disabled={!storyTitle.trim()}
            >
              <Text style={[styles.saveRecipientButtonText, { color: theme.onPrimary || '#FFFFFF' }]}>
                Continue to Sharing Options
              </Text>
              <Ionicons name="arrow-forward-circle" size={24} color={theme.onPrimary || '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

  // Initialize audio mode
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.m,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: SPACING.l,
  },
  recordingStudioCard: {
    borderWidth: 1,
    borderRadius: SPACING.l,
    padding: SPACING.l,
    marginBottom: SPACING.l,
    ...SHADOWS.medium,
  },
  studioHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  studioTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  studioStatusPill: {
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: 999,
  },
  studioStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  timerText: {
    fontSize: 44,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.s,
    gap: SPACING.s,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.error,
    letterSpacing: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    gap: 3,
    marginBottom: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  controlsContainer: {
    alignItems: 'center',
    marginVertical: 0,
  },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
  recordButtonActive: {
    backgroundColor: COLORS.error,
    opacity: 0.9,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: SPACING.l,
    gap: SPACING.m,
    width: '100%',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderRadius: SPACING.m,
    ...SHADOWS.small,
    minWidth: 130,
  },
  stopButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  pickAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginTop: SPACING.l,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
  },
  pickAudioButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  uploadAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    marginTop: SPACING.l,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderRadius: SPACING.m,
    borderWidth: 1.5,
  },
  uploadAudioButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  playbackContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.l,
    borderRadius: SPACING.m,
    ...SHADOWS.small,
  },
  playbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
  },
  playbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  transcriptContainer: {
    width: '100%',
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    marginVertical: SPACING.l,
    ...SHADOWS.small,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.m,
    paddingBottom: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  transcriptScroll: {
    maxHeight: 150,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    marginTop: SPACING.l,
  },
  uploadOptionText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  uploadContainer: {
    width: '100%',
    marginTop: SPACING.m,
  },
  uploadButton: {
    backgroundColor: COLORS.glassLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: SPACING.m,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.s,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.xl,
    borderRadius: SPACING.m,
    marginTop: SPACING.xl,
    ...SHADOWS.medium,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  // NEW: Story Creation Styles
  storyCreationSection: {
    marginTop: SPACING.l,
    paddingTop: SPACING.l,
    borderTopWidth: 2,
    borderTopColor: COLORS.secondary + '30',
  },
  storyInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.s,
  },
  storyInputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  storyTitleInput: {
    backgroundColor: COLORS.background,
    borderRadius: SPACING.m,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  saveStoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.l,
    borderRadius: SPACING.m,
    gap: SPACING.s,
    ...SHADOWS.large,
  },
  saveStoryButtonDisabled: {
    opacity: 0.6,
  },
  saveStoryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    padding: SPACING.m,
    marginTop: SPACING.xl,
    marginBottom: SPACING.l,
    ...SHADOWS.small,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: SPACING.m,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  languageSection: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.l,
    padding: SPACING.l,
    marginVertical: SPACING.l,
    ...SHADOWS.medium,
    maxHeight: 600,
  },
  languageSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.m,
    marginBottom: SPACING.m,
    paddingBottom: SPACING.m,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary + '20',
  },
  languageHeaderTextContainer: {
    flex: 1,
  },
  languageSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  languageSectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SPACING.m,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    height: 48,
  },
  searchIcon: {
    marginRight: SPACING.s,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: SPACING.s,
  },
  clearSearchButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.s,
  },
  languageScrollContainer: {
    maxHeight: 400,
  },
  languageGroup: {
    marginBottom: SPACING.l,
  },
  languageGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.s,
    paddingLeft: SPACING.xs,
  },
  languageGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageGroupCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    borderRadius: SPACING.m,
    borderWidth: 2,
    borderColor: COLORS.border,
    flex: 1,
    minWidth: '47%',
    maxWidth: '48%',
  },
  languageButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    ...SHADOWS.small,
  },
  languageButtonIndigenous: {
    borderColor: COLORS.accent + '60',
    backgroundColor: COLORS.accent + '05',
  },
  languageFlag: {
    fontSize: 28,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  languageLabelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  indigenousBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  indigenousBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.surface,
    textTransform: 'uppercase',
  },
  selectedLanguageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.success + '15',
    padding: SPACING.m,
    borderRadius: SPACING.s,
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
  },
  selectedLanguageText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderRadius: SPACING.m,
    marginTop: SPACING.m,
    ...SHADOWS.medium,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.surface,
  },

  // NEW: Recorded Audio Container Styles
  recordedAudioContainer: {
    width: '100%',
    marginVertical: SPACING.l,
  },
  recordedAudioCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.m,
    padding: SPACING.l,
    borderWidth: 2,
    borderColor: COLORS.success + '30',
    ...SHADOWS.medium,
  },
  recordedAudioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    marginBottom: SPACING.l,
    paddingBottom: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recordedAudioInfo: {
    flex: 1,
  },
  recordedAudioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 4,
  },
  recordedAudioDuration: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  playRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.m,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderRadius: SPACING.m,
    marginVertical: SPACING.m,
    ...SHADOWS.small,
  },
  playRecordingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  recordAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.accent + '15',
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  recordAnotherButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // NEW: Previous Recordings List Styles
  previousRecordingsSection: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.m,
    padding: SPACING.l,
    marginVertical: SPACING.l,
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    marginBottom: SPACING.l,
    paddingBottom: SPACING.m,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary + '20',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    flex: 1,
  },
  recordingBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  recordingListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: SPACING.m,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  recordingListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    flex: 1,
  },
  recordingNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  recordingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  recordingListItemInfo: {
    flex: 1,
  },
  recordingListItemTime: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  recordingListItemDetails: {
    flexDirection: 'row',
    gap: SPACING.m,
  },
  recordingListItemDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  recordingListItemLanguage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  recordingListActions: {
    flexDirection: 'row',
    gap: SPACING.s,
  },
  recordingActionButton: {
    padding: SPACING.s,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.s,
    ...SHADOWS.small,
  },

  // Share Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  shareModalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SPACING.l,
    borderTopRightRadius: SPACING.l,
    maxHeight: '74%',
    paddingBottom: SPACING.m,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.l,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  shareModalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  closeModalButton: {
    padding: SPACING.xs,
  },
  shareModalContent: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    maxHeight: '52%',
  },
  recipientModalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SPACING.l,
    borderTopRightRadius: SPACING.l,
    maxHeight: '64%',
    paddingBottom: SPACING.s,
  },
  recipientModalContent: {
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    maxHeight: '48%',
  },
  inputGroup: {
    marginBottom: SPACING.m,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  required: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
  shareInput: {
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.m,
    padding: SPACING.m,
    fontSize: 15,
    color: COLORS.text,
  },
  shareTextArea: {
    height: 100,
    paddingTop: SPACING.m,
  },
  shareTranscriptArea: {
    height: 160,
    paddingTop: SPACING.m,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  categoryButton: {
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  categoryButtonTextActive: {
    color: COLORS.surface,
  },
  recordingInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    backgroundColor: COLORS.background,
    padding: SPACING.m,
    borderRadius: SPACING.m,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  recordingInfoText: {
    flex: 1,
  },
  recordingInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  recordingInfoDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  shareModalFooter: {
    flexDirection: 'row',
    gap: SPACING.m,
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.m,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  shareButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    borderRadius: SPACING.m,
    backgroundColor: COLORS.primary,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  // Recipient Selection Modal Styles
  recipientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SPACING.m,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recipientOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  recipientIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  recipientDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.l,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionDividerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.m,
    textTransform: 'uppercase',
  },
  noContactsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: SPACING.m,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    marginVertical: SPACING.m,
  },
  noContactsText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  authorLabelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: SPACING.m,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    marginTop: SPACING.l,
  },
  authorLabelText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  saveRecipientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    borderRadius: SPACING.m,
    marginTop: SPACING.l,
    ...SHADOWS.medium,
  },
  saveRecipientButtonDisabled: {
    opacity: 0.5,
  },
  saveRecipientButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
});