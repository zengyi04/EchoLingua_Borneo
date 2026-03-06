import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity,  ScrollView, TextInput, Alert, ActivityIndicator, Image, FlatList, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Octicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS, FONTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { prepareSingleRecording, stopAndReleaseRecording } from '../services/recordingService';
import { translateText } from '../services/translationService';
import { WORLD_LANGUAGES, getBorneoLanguages } from '../constants/languages';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
const STORIES_STORAGE_KEY = '@echolingua_stories';
const RECORDINGS_STORAGE_KEY = '@echolingua_recordings';
const ELDER_VOICES_STORAGE_KEY = '@echolingua_elder_voices';
const AI_TEXT_DRAFTS_KEY = '@echolingua_ai_text_drafts';

export default function AIStoryGeneratorScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute(); // Access route params

  // Mode: 'input' | 'processing' | 'preview'
  const [mode, setMode] = useState('input');
  
  // Input State
  const [inputType, setInputType] = useState('voice'); // 'voice' | 'text' | 'file'
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  
  // Elder Voice State
  // Check if opened in 'train' mode
  const initialTrainMode = route.params?.mode === 'train';
  const [isVoicePreservationMode, setIsVoicePreservationMode] = useState(initialTrainMode);
  const [voiceName, setVoiceName] = useState('');
  const [showVoiceNameModal, setShowVoiceNameModal] = useState(false);
  const [pendingVoiceUri, setPendingVoiceUri] = useState(null);

  // Result State
  const [generatedStory, setGeneratedStory] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Audio playback state
  const [playingRecordingId, setPlayingRecordingId] = useState(null);
  const [sound, setSound] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState({ position: 0, duration: 1 });
  
  // Action Sheet State
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  
  // Rename State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState('');

  // Create Story Modal State
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDescription, setStoryDescription] = useState('');
  const [isSavingStory, setIsSavingStory] = useState(false);
  
  // Recipient Selection State
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]); // 'my_stories', 'community', or emergency contact IDs
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [emergencyContactsWithApp, setEmergencyContactsWithApp] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Translation State
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Load recordings on mount
  useEffect(() => {
    loadRecordings();
    loadUserAndContacts();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Reload user and emergency contacts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserAndContacts();
    }, [])
  );

  // Handle updates to route params (e.g. from Library "Train Voice" button)
  useEffect(() => {
    if (route.params?.mode === 'train') {
      setIsVoicePreservationMode(true);
      // Reset other states if needed
      setMode('input');
      setGeneratedStory(null);
    } else {
      setIsVoicePreservationMode(false);
    }
  }, [route.params?.mode]);

  const loadRecordings = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECORDINGS_STORAGE_KEY);
      if (raw) {
        setRecordings(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Failed to load recordings', e);
    }
  };

  // Load current user and emergency contacts
  const loadUserAndContacts = async () => {
    try {
      // Load current user
      const userJson = await AsyncStorage.getItem('@echolingua_current_user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setCurrentUser(user);

        // Load emergency contacts from user profile
        const userContacts = user.emergencyContacts || [];
        setEmergencyContacts(userContacts);

        // Load users database to match contacts with app users
        const usersJson = await AsyncStorage.getItem('@echolingua_users_database');
        const allUsers = usersJson ? JSON.parse(usersJson) : [];

        // Match emergency contacts with app users using multiple identifiers
        const contactsWithApp = userContacts.map((contact) => {
          const normalizedEmail = contact.email?.trim().toLowerCase();
          const normalizedPhone = contact.phone?.trim();
          const normalizedUsername = contact.username?.trim().toLowerCase();
          const normalizedLinkedName = contact.linkedUserName?.trim().toLowerCase();

          const appUser = allUsers.find((u) => {
            const userEmail = u.email?.trim().toLowerCase();
            const userPhone = u.phone?.trim();
            const userUsername = u.username?.trim().toLowerCase();
            const userFullName = u.fullName?.trim().toLowerCase();

            return (
              (contact.linkedUserId && u.id === contact.linkedUserId) ||
              (normalizedEmail && userEmail && userEmail === normalizedEmail) ||
              (normalizedPhone && userPhone && userPhone === normalizedPhone) ||
              (normalizedUsername && (userUsername === normalizedUsername || userFullName === normalizedUsername)) ||
              (normalizedLinkedName && userFullName === normalizedLinkedName)
            );
          });

          // Keep all profile contacts visible in share modal, with appUser attached when matched
          return {
            ...contact,
            appUser: appUser || null,
          };
        });

        setEmergencyContactsWithApp(contactsWithApp);
      } else {
        setCurrentUser(null);
        setEmergencyContacts([]);
        setEmergencyContactsWithApp([]);
      }
    } catch (e) {
      console.error('Failed to load user and contacts', e);
    }
  };

  useEffect(() => {
    loadUserAndContacts();
  }, []);

  // Force reload when share modal opens
  useEffect(() => {
    if (mode === 'share') {
      loadUserAndContacts();
    }
  }, [mode]);

  const startRecording = async () => {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
        return;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const active = await prepareSingleRecording();
      setRecording(active);
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Error', `Could not start recording: ${error.message}`);
    }
  };

  const stopRecordingAndGenerate = async () => {
    if (!recording) return;

    setMode('processing');
    setLoadingMessage('Listening to your story fragment...');
    
    try {
      const uri = await stopAndReleaseRecording(recording);
      setIsRecording(false);
      setRecording(null);

      if (!uri) {
        setMode('input');
        return;
      }
      
      // Save this new recording to history
      const newRec = {
        id: Date.now().toString(),
        uri: uri,
        timestamp: new Date().toISOString(),
        fileName: isVoicePreservationMode ? `Voice Reading - ${new Date().toLocaleTimeString()}` : `Story Fragment ${new Date().toLocaleTimeString()}`
      };
      
      const updatedRecs = [newRec, ...recordings];
      setRecordings(updatedRecs);
      await AsyncStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(updatedRecs));

      // After recording, open the action sheet to let user decide
      setMode('input'); // Reset mode to ensure modal is visible
      setSelectedRecording(newRec);
      setShowActionModal(true);

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate story. Please try again.');
      setMode('input');
    }
  };

  const saveVoiceModel = async () => {
    if (!voiceName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for this voice.');
      return;
    }

    try {
      const newVoice = {
        id: Date.now().toString(),
        name: voiceName,
        uri: pendingVoiceUri,
        dateCreated: new Date().toISOString()
      };

      const existingRaw = await AsyncStorage.getItem(ELDER_VOICES_STORAGE_KEY) || '[]';
      const existingVoices = JSON.parse(existingRaw);
      const updatedVoices = [newVoice, ...existingVoices];

      await AsyncStorage.setItem(ELDER_VOICES_STORAGE_KEY, JSON.stringify(updatedVoices));

      setShowVoiceNameModal(false);
      setVoiceName('');
      setPendingVoiceUri(null);
      
      Alert.alert('Voice Preserved', `${voiceName}'s voice has been archived and is now available for storytelling.`);
      setIsVoicePreservationMode(false); // Reset mode

    } catch (e) {
      console.error('Failed to save voice', e);
      Alert.alert('Error', 'Could not save voice profile.');
    }
  };

  const handleRenameRecording = async () => {
    if (!newName.trim() || !selectedRecording) return;
    
    try {
      const updatedRecs = recordings.map(rec => 
        rec.id === selectedRecording.id ? { ...rec, fileName: newName } : rec
      );
      setRecordings(updatedRecs);
      await AsyncStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(updatedRecs));
      
      setShowRenameModal(false);
      setNewName('');
      setSelectedRecording(null);
    } catch (e) {
      Alert.alert('Error', 'Could not rename recording.');
    }
  };

  const handlePickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Create a new recording entry for this file
        const newRec = {
           id: Date.now().toString(),
           uri: asset.uri,
           timestamp: new Date().toISOString(),
           fileName: asset.name || `Imported Audio ${new Date().toLocaleTimeString()}`,
           duration: 0 // Duration might not be available immediately
        };

        const updatedRecs = [newRec, ...recordings];
        setRecordings(updatedRecs);
        await AsyncStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(updatedRecs));

        // Open the action sheet to let user decide what to do with the imported file
        setMode('input');
        setSelectedRecording(newRec);
        setShowActionModal(true);
      }
    } catch (error) {
       console.error(error);
       Alert.alert('Error', 'Could not pick file.');
    }
  };

  const playRecording = async (id, uri) => {
    try {
      if (playingRecordingId === id) {
        // Stop current
        await sound.unloadAsync();
        setSound(null);
        setPlayingRecordingId(null);
        setPlaybackStatus({ position: 0, duration: 1 });
      } else {
        // Stop previous if any
        if (sound) {
          await sound.unloadAsync();
        }
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true }
        );
        setSound(newSound);
        setPlayingRecordingId(id);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
             setPlaybackStatus({
                position: status.positionMillis,
                duration: status.durationMillis || 1,
             });
          }
          if (status.didJustFinish) {
            setPlayingRecordingId(null);
            newSound.unloadAsync();
            setSound(null);
            setPlaybackStatus({ position: 0, duration: 1 });
          }
        });
      }
    } catch (error) {
      console.error('Failed to play sound', error);
      Alert.alert('Error', 'Could not play recording.');
    }
  };

  const deleteRecording = async (id) => {
    try {
      const updatedRecs = recordings.filter(r => r.id !== id);
      setRecordings(updatedRecs);
      await AsyncStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(updatedRecs));
    } catch (error) {
      console.error('Failed to delete recording', error);
    }
  };

  const shareRecording = (item) => {
    navigation.navigate('CommunityStory', { 
       audioUri: item.uri, 
       duration: item.duration, // Note: duration might not be in all legacy records
       transcript: item.transcript,
       fileName: item.fileName || `Recording ${new Date(item.timestamp).toLocaleDateString()}`
    });
  };

  const handleSelectPriorRecording = async (rec, modeAction = 'story') => {
    // modeAction: 'story' | 'voice'
    if (modeAction === 'voice') {
      setPendingVoiceUri(rec.uri);
      setMode('input');
      setShowVoiceNameModal(true);
      return;
    }

    setMode('processing');
    setLoadingMessage('Analyzing existing recording...');
    await processAudioFile(rec.uri);
  };

  const processAudioFile = async (uri) => {
      // 1. Transcribe
      setLoadingMessage('Transcribing audio...');
      const audioResponse = await fetch(uri);
      const buffer = await audioResponse.arrayBuffer();
      const base64Audio = toBase64(new Uint8Array(buffer));

      const transcriptionText = await transcribeAudio(base64Audio);
      
      if (!transcriptionText) {
        throw new Error('Transcription failed');
      }

      // 2. Generate Story
      setLoadingMessage('Weaving the story magic...');
      await generateStoryFromText(transcriptionText);
  };

  const handleTextGenerate = async () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Input', 'Please type a story fragment first.');
      return;
    }
    
    // Show language selection modal first
    setShowLanguageModal(true);
  };

  const handleTranslateAndGenerate = async () => {
    setShowLanguageModal(false);
    
    if (!targetLanguage) {
      // No translation, generate directly
      setMode('processing');
      setLoadingMessage('Dreaming up the story...');
      await generateStoryFromText(inputText);
      return;
    }

    // Translate first, then generate
    setMode('processing');
    setLoadingMessage('Translating text...');
    setIsTranslating(true);
    
    try {
      const translated = await translateText(inputText, targetLanguage.code);
      setTranslatedText(translated);
      setIsTranslating(false);
      
      setLoadingMessage('Dreaming up the story...');
      await generateStoryFromText(translated);
    } catch (error) {
      setIsTranslating(false);
      Alert.alert('Translation Error', 'Failed to translate text. Generating with original text.');
      setLoadingMessage('Dreaming up the story...');
      await generateStoryFromText(inputText);
    }
  };

  const transcribeAudio = async (base64Audio) => {
    // MOCK MODE: If backend is unavailable or fails, use this mock
    const useMock = true; 
    
    try {
      if (useMock || !GEMINI_API_KEY) {
        throw new Error('Using Mock Transcription');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: 'Transcribe this audio exactly. Return only the text. If it is already text, fix grammar.' },
                { inline_data: { mime_type: 'audio/mp4', data: base64Audio } }
              ]
            }]
          })
        }
      );
      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) {
      // API Transcription unavailable, using mock data
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return "Long ago, in the deep forests of Borneo, there lived a small mouse deer named Sang Kancil. He was small but very clever, always outsmarting the bigger animals like the crocodile and the tiger.";
    }
  };

  const generateStoryFromText = async (seedText) => {
    // MOCK MODE: If backend is unavailable or fails, use this mock
    const useMock = true;

    try {
      setLoadingMessage('Illustrating and expanding...');
      
      if (useMock || !GEMINI_API_KEY) {
        throw new Error('Using Mock Generation');
      }

      const prompt = `
        You are an expert indigenous storyteller.
        Take this fragment: "${seedText}"
        
        Create a full children's story based on it.
        Return a JSON object with this EXACT structure (no markdown formatting, just raw JSON):
        {
          "title": "Story Title",
          "summary": "Short summary",
          "language": "English (but use indigenous names/concepts)",
          "pages": [
            { "text": "Paragraph 1...", "imagePrompt": "Description of image for page 1" },
            { "text": "Paragraph 2...", "imagePrompt": "Description of image for page 2" },
            { "text": "Paragraph 3...", "imagePrompt": "Description of image for page 3" }
          ]
        }
        Keep it to 3-5 pages.
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          })
        }
      );
      
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const storyObj = JSON.parse(cleanJson);
      
      finishGeneration(storyObj, seedText);

    } catch (e) {
      // API Generation unavailable, using mock data
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockStory = {
        title: "Sang Kancil and the River",
        summary: "A clever mouse deer tricks the crocodiles to cross the river.",
        language: "English / Malay Folklore",
        pages: [
          { 
            text: "One hot afternoon, Sang Kancil the mouse deer wanted to cross the river to eat the delicious fruits on the other side. But the river was full of hungry crocodiles.", 
            imagePrompt: "A small mouse deer standing by a river bank looking at floating crocodiles" 
          },
          { 
            text: "Sang Kancil called out to the King of Crocodiles, 'The King has ordered me to count all the crocodiles in the river for a feast! Line up so I can count you!'", 
            imagePrompt: "Crocodiles lining up across the river forming a bridge" 
          },
          { 
            text: "The foolish crocodiles lined up from one bank to the other. Sang Kancil jumped on their backs, 'One! Two! Three!' he counted as he hopped across.", 
            imagePrompt: "Mouse deer jumping on the backs of crocodiles" 
          },
          { 
            text: "When he reached the other side, he laughed, 'Thank you for the bridge!' and ran off to enjoy the fruits, leaving the angry crocodiles behind.", 
            imagePrompt: "Mouse deer eating fruits on the river bank, crocodiles looking angry in the water" 
          }
        ]
      };
      
      finishGeneration(mockStory, seedText);
    }
  };

  const finishGeneration = async (storyObj, sourceText = '') => {
      const newStory = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        isAiGenerated: true,
        sourceText: sourceText || inputText.trim(),
        ...storyObj
      };
      
      setGeneratedStory(newStory);
      setMode('input');
      setLoadingMessage('');
      
      // Show modal to enter title and description
      setStoryTitle(newStory.title || '');
      setStoryDescription(newStory.summary || '');
      setShowCreateStoryModal(true);
  };

  // Helper function to get unique key for contact
  const getContactRecipientKey = (contact) => {
    return `${contact.id}-${contact.appUser?.id || contact.linkedUserId || 'app'}`;
  };

  // Toggle recipient selection
  const toggleRecipient = (recipientId) => {
    if (selectedRecipients.includes(recipientId)) {
      setSelectedRecipients(selectedRecipients.filter(r => r !== recipientId));
    } else {
      setSelectedRecipients([...selectedRecipients, recipientId]);
    }
  };

  // Proceed from title/description to recipient selection
  const handleProceedToRecipients = () => {
    if (!storyTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your story');
      return;
    }

    setShowCreateStoryModal(false);
    setShowRecipientModal(true);
  };

  // Save shared stories to emergency contacts
  const saveSharedStoriesToContacts = async (story, contactIds) => {
    try {
      const contactEmails = [];
      const sharedWithUserIds = [];
      for (const contactId of contactIds) {
        const contact = emergencyContactsWithApp.find(c => getContactRecipientKey(c) === contactId);
        if (contact) {
          const recipientEmail = contact.appUser?.email || contact.email;
          const recipientUserId = contact.appUser?.id || contact.linkedUserId || null;

          if (recipientEmail) {
            contactEmails.push(recipientEmail);
          }

          if (recipientUserId) {
            sharedWithUserIds.push(recipientUserId);
          }
        }
      }

      if (contactEmails.length === 0 && sharedWithUserIds.length === 0) {
        return;
      }

      const sharedJson = await AsyncStorage.getItem('@echolingua_shared_stories');
      const existingShared = sharedJson ? JSON.parse(sharedJson) : [];

      const sharedStory = {
        ...story,
        sharedBy: currentUser?.fullName || 'Anonymous',
        sharedByEmail: currentUser?.email || null,
        sharedWithEmails: contactEmails,
        sharedWithUserIds,
        sharedAt: new Date().toISOString(),
      };

      const updatedShared = [sharedStory, ...existingShared];
      await AsyncStorage.setItem('@echolingua_shared_stories', JSON.stringify(updatedShared));
      
      // Create notifications for emergency contacts
      await createEmergencyContactNotifications(sharedStory, contactIds);
    } catch (error) {
      console.error('Failed to save shared stories:', error);
    }
  };

  // Create notifications for emergency contacts when story is shared
  const createEmergencyContactNotifications = async (sharedStory, contactIds) => {
    try {
      if (!currentUser) return;

      const NOTIFICATIONS_KEY = '@echolingua_notifications';
      const notifData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const existingNotifications = notifData ? JSON.parse(notifData) : [];

      // Create notification for each emergency contact
      const newNotifications = [];
      for (const contactId of contactIds) {
        const contact = emergencyContactsWithApp.find(c => getContactRecipientKey(c) === contactId);
        const recipientId = contact?.appUser?.id || contact?.linkedUserId;
        if (contact && recipientId) {
          newNotifications.push({
            id: `notif_${Date.now()}_${recipientId}_${Math.random()}`,
            type: 'shared_story',
            recipientId,
            senderId: currentUser.id,
            senderName: currentUser.fullName || 'Someone',
            title: `${currentUser.fullName || 'Someone'} shared a story with you`,
            message: `"${sharedStory.title}" - Check Other Creation section`,
            storyData: sharedStory,
            timestamp: new Date().toISOString(),
            read: false,
          });
        }
      }

      const updatedNotifications = [...newNotifications, ...existingNotifications];
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
      console.log(`✅ Created ${newNotifications.length} notifications for emergency contacts`);
    } catch (error) {
      console.error('❌ Failed to create emergency contact notifications:', error);
    }
  };

  // Create notifications for all users when a new community story is shared
  const createCommunityStoryNotifications = async (story) => {
    try {
      const USERS_DB_KEY = '@echolingua_users_database';
      const NOTIFICATIONS_KEY = '@echolingua_notifications';
      
      // Get all users
      const usersData = await AsyncStorage.getItem(USERS_DB_KEY);
      if (!usersData) return;
      
      const allUsers = JSON.parse(usersData);
      const notifData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const allNotifications = notifData ? JSON.parse(notifData) : [];

      // Create notification for each user except the author
      for (const user of allUsers) {
        if (user.id !== currentUser?.id) {
          const notification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${user.id}`,
            type: 'story',
            recipientId: user.id,
            senderId: currentUser?.id || 'unknown',
            senderName: currentUser?.fullName || currentUser?.name || 'Someone',
            senderAvatar: currentUser?.profileImage || null,
            title: 'New Community Story',
            message: `${currentUser?.fullName || 'Someone'} shared a new story: "${story.title}"`,
            storyData: story,
            timestamp: new Date().toISOString(),
            read: false,
          };
          allNotifications.push(notification);
        }
      }

      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(allNotifications));
    } catch (error) {
      console.error('Failed to create community story notifications:', error);
    }
  };

  const saveStoryToLibrary = async () => {
    if (!storyTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your story');
      return;
    }

    if (selectedRecipients.length === 0) {
      Alert.alert('Recipient Required', 'Please select at least one destination.');
      return;
    }

    setIsSavingStory(true);
    setShowRecipientModal(false);

    try {
      const myStoriesSelected = selectedRecipients.includes('my_stories');
      const communitySelected = selectedRecipients.includes('community');
      const emergencyContactIds = selectedRecipients.filter(r => r !== 'my_stories' && r !== 'community');

      const normalizedTitle = storyTitle.trim();
      const normalizedDescription = storyDescription.trim() || generatedStory?.summary || '';
      const normalizedText = (
        translatedText ||
        inputText ||
        generatedStory?.sourceText ||
        generatedStory?.summary ||
        ''
      ).trim();

      // Always store typed text locally first (draft history)
      const existingDraftsRaw = await AsyncStorage.getItem(AI_TEXT_DRAFTS_KEY);
      const existingDrafts = existingDraftsRaw ? JSON.parse(existingDraftsRaw) : [];
      const localDraft = {
        id: Date.now().toString(),
        title: normalizedTitle,
        description: normalizedDescription,
        text: normalizedText,
        authorId: currentUser?.id || null,
        authorName: currentUser?.fullName || currentUser?.name || 'Anonymous',
        createdAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(AI_TEXT_DRAFTS_KEY, JSON.stringify([localDraft, ...existingDrafts]));

      // Build clean payload (no demo pages) for all share destinations
      const updatedStory = {
        id: generatedStory?.id || Date.now().toString(),
        createdAt: generatedStory?.createdAt || new Date().toISOString(),
        isAiGenerated: true,
        title: normalizedTitle,
        description: normalizedDescription,
        summary: normalizedDescription,
        text: normalizedText,
        sourceText: normalizedText,
        author: currentUser?.fullName || 'AI Generator',
        authorEmail: currentUser?.email || null,
        authorId: currentUser?.id || null,
        authorRole: currentUser?.role || 'learner',
        category: 'AI Generated',
        recipients: selectedRecipients,
      };

      // Save to My Creations (My Creation in Story Library)
      if (myStoriesSelected) {
        const existingRaw = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify([updatedStory, ...existing]));
      }

      // Save to Community Story
      if (communitySelected) {
        const existingRaw = await AsyncStorage.getItem('@echolingua_stories');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        await AsyncStorage.setItem('@echolingua_stories', JSON.stringify([updatedStory, ...existing]));
        
        // Create notifications for all users about new community story
        await createCommunityStoryNotifications(updatedStory);
      }

      // Share to Emergency Contacts (Other Creation)
      if (emergencyContactIds.length > 0) {
        await saveSharedStoriesToContacts(updatedStory, emergencyContactIds);
      }
      
      setIsSavingStory(false);
      
      const destinations = [];
      if (myStoriesSelected) destinations.push('My Creations');
      if (communitySelected) destinations.push('Community Story');
      if (emergencyContactIds.length > 0) destinations.push(`${emergencyContactIds.length} Emergency Contact(s) - Other Creation`);

      // Navigate based on selection
      if (communitySelected) {
        Alert.alert(
          'Story Saved! 🎉', 
          `"${storyTitle}" has been saved to Community Story.`,
          [
            {
              text: 'View Community',
              onPress: () => navigation.navigate('CommunityStory')
            },
            { text: 'OK' }
          ]
        );
      } else if (myStoriesSelected) {
        Alert.alert(
          'Story Saved! 🎉', 
          `"${storyTitle}" has been saved to My Creations.`,
          [
            {
              text: 'View My Stories',
              onPress: () => navigation.navigate('MainTabs', { screen: 'StoriesTab' })
            },
            { text: 'OK' }
          ]
        );
      } else if (emergencyContactIds.length > 0) {
        Alert.alert(
          'Story Saved! 🎉', 
          `"${storyTitle}" has been shared with ${emergencyContactIds.length} emergency contact(s).`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Story Saved! 🎉', 
          `"${storyTitle}" has been saved.`,
          [{ text: 'OK' }]
        );
      }

      // Reset form
      setStoryTitle('');
      setStoryDescription('');
      setGeneratedStory(null);
      setSelectedRecipients([]);
    } catch (e) {
      setIsSavingStory(false);
      Alert.alert('Error', 'Failed to save story. Please try again.');
    }
  };

  const saveStory = async () => {
    try {
      const normalizedTitle = generatedStory?.title?.trim() || 'Untitled Story';
      const normalizedDescription = generatedStory?.summary?.trim() || generatedStory?.description?.trim() || '';
      const normalizedText = (
        translatedText ||
        inputText ||
        generatedStory?.sourceText ||
        generatedStory?.summary ||
        ''
      ).trim();

      const cleanStory = {
        id: generatedStory?.id || Date.now().toString(),
        createdAt: generatedStory?.createdAt || new Date().toISOString(),
        isAiGenerated: true,
        title: normalizedTitle,
        description: normalizedDescription,
        summary: normalizedDescription,
        text: normalizedText,
        sourceText: normalizedText,
        author: currentUser?.fullName || 'AI Generator',
        authorEmail: currentUser?.email || null,
        authorId: currentUser?.id || null,
        authorRole: currentUser?.role || 'learner',
        category: 'AI Generated',
      };

      const existingRaw = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const newStories = [cleanStory, ...existing];
      await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(newStories));
      
      Alert.alert('Success', 'Story saved to library!');
      navigation.replace('Story', { story: cleanStory });
    } catch (e) {
      Alert.alert('Error', 'Failed to save story.');
    }
  };

  const loadRecordingsFromStorage = async () => {
      try {
        const raw = await AsyncStorage.getItem(RECORDINGS_STORAGE_KEY);
        if (raw) setRecordings(JSON.parse(raw));
      } catch (e) {}
  };

  useEffect(() => {
    loadRecordingsFromStorage();
  }, []);

  // Helper
  function toBase64(bytes) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    while (i < bytes.length) {
      const a = bytes[i++];
      const b = i < bytes.length ? bytes[i++] : undefined;
      const c = i < bytes.length ? bytes[i++] : undefined;
      const triplet = (a << 16) | ((b || 0) << 8) | (c || 0);
      result += chars[(triplet >> 18) & 63];
      result += chars[(triplet >> 12) & 63];
      result += b === undefined ? '=' : chars[(triplet >> 6) & 63];
      result += c === undefined ? '=' : chars[triplet & 63];
    }
    return result;
  }

  // --- RENDER ---
  
  if (mode === 'processing') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>{loadingMessage}</Text>
      </View>
    );
  }

  if (mode === 'preview' && generatedStory) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.previewTitle, { color: theme.primary }]}>✨ Story Revived!</Text>
          
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.storyTitle, { color: theme.text }]}>{generatedStory.title}</Text>
            <Text style={[styles.storySummary, { color: theme.textSecondary }]}>{generatedStory.summary}</Text>
            
            <View style={styles.divider} />
            
            {generatedStory.pages.map((page, index) => (
              <View key={index} style={styles.pagePreview}>
                 <View style={[styles.imagePlaceholder, { backgroundColor: theme.secondary + '20' }]}>
                    <MaterialCommunityIcons name="image-outline" size={30} color={theme.secondary} />
                    <Text style={[styles.promptText, { color: theme.textSecondary }]}>Image: {page.imagePrompt}</Text>
                 </View>
                 <Text style={[styles.pageText, { color: theme.text }]}>{page.text}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryBtn, { borderColor: theme.border }]} 
              onPress={() => setMode('input')}
            >
              <Text style={[styles.btnText, { color: theme.text }]}>Discard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.primaryBtn, { backgroundColor: theme.primary }]} 
              onPress={saveStory}
            >
               <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={[styles.btnText, { color: '#FFF' }]}>Save to Library</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
       <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
             {isVoicePreservationMode ? 'Train Elder Voice' : 'AI Story Revival'}
          </Text>
       </View>

       <View style={styles.content}>
          <View style={styles.tabs}>
             <TouchableOpacity 
               style={[styles.tab, inputType === 'voice' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
               onPress={() => {
                  setInputType('voice');
                  setIsVoicePreservationMode(false); // Default to story when switching back
               }}
             >
               <Ionicons name="mic" size={20} color={inputType === 'voice' ? theme.primary : theme.textSecondary} />
               <Text style={[styles.tabText, { color: inputType === 'voice' ? theme.primary : theme.textSecondary }]}>Voice</Text>
             </TouchableOpacity>

             <TouchableOpacity 
               style={[styles.tab, inputType === 'text' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
               onPress={() => setInputType('text')}
             >
                <Ionicons name="text" size={20} color={inputType === 'text' ? theme.primary : theme.textSecondary} />
               <Text style={[styles.tabText, { color: inputType === 'text' ? theme.primary : theme.textSecondary }]}>Text</Text>
             </TouchableOpacity>


             <TouchableOpacity 
               style={[styles.tab, inputType === 'file' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
               onPress={() => setInputType('file')}
             >
                <Ionicons name="folder-open" size={20} color={inputType === 'file' ? theme.primary : theme.textSecondary} />
               <Text style={[styles.tabText, { color: inputType === 'file' ? theme.primary : theme.textSecondary }]}>
                 History
               </Text>
             </TouchableOpacity>
          </View>

          {inputType === 'voice' && (
             <View style={styles.voiceContainer}>
                
                {/* Voice Training Prompts */}
                {/* Removed logic based prompts, kept simple instructions if needed, or remove completely */}
                 <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                     Share a short memory, introduce yourself, or tell a story.
                 </Text>

                <TouchableOpacity 
                  style={[
                    styles.recordBtn, 
                    { backgroundColor: isRecording ? COLORS.error : theme.primary }
                  ]}
                  onPress={isRecording ? stopRecordingAndGenerate : startRecording}
                >
                   <Ionicons name={isRecording ? "stop" : "mic-outline"} size={40} color="#FFF" />
                </TouchableOpacity>
                
                <Text style={[styles.recordLabel, { color: theme.text, marginBottom: 20 }]}>
                  {isRecording ? "Recording in progress..." : "Tap to Record"}
                </Text>

                {/* Quick Mode Switch for Recording */}
                {!isRecording && (
                     <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                        onPress={handlePickAudioFile}
                     >
                        <Ionicons name="folder-open-outline" size={18} color={theme.primary} style={{ marginRight: 6 }} />
                        <Text style={{ color: theme.primary, fontWeight: '600' }}>Select Audio File</Text>
                     </TouchableOpacity>
                )}
             </View>
          )}

          {inputType === 'text' && (
            <View style={styles.textContainer}>
               <TextInput
                 style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                 multiline
                 placeholder="Once upon a time, the spirit of the mountain..."
                 placeholderTextColor={theme.textSecondary}
                 value={inputText}
                 onChangeText={setInputText}
               />
               <TouchableOpacity 
                  style={[styles.generateBtn, { backgroundColor: theme.primary }]}
                  onPress={handleTextGenerate}
               >
                 <MaterialCommunityIcons name="auto-fix" size={20} color="#FFF" style={{ marginRight: 8 }} />
                 <Text style={styles.generateBtnText}>Generate Story</Text>
               </TouchableOpacity>
            </View>
          )}

          {inputType === 'file' && (
             <View style={styles.fileContainer}>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                   <Text style={[styles.historyTitle, { color: theme.text, marginBottom: 0, flex: 1 }]}>Recent Recordings</Text>
                   <MaterialCommunityIcons name="history" size={16} color={theme.textSecondary} />
                </View>
                
                <FlatList
                   data={recordings}
                   keyExtractor={(item) => item.id}
                   renderItem={({item}) => (
                      <TouchableOpacity 
                        style={[styles.histItem, { backgroundColor: theme.surface, borderColor: theme.border, padding: 8, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }]}
                        activeOpacity={0.7}
                        onPress={() => {
                           setSelectedRecording(item);
                           setShowActionModal(true);
                        }}
                      >
                         {/* Play/Pause Button - Separate Hit Area */}
                         <TouchableOpacity 
                            onPress={() => playRecording(item.id, item.uri)}
                            style={{ padding: 6 }}
                         >
                            <Ionicons 
                              name={playingRecordingId === item.id ? "pause-circle" : "play-circle"} 
                              size={44} 
                              color={playingRecordingId === item.id ? theme.primary : theme.secondary} 
                            />
                         </TouchableOpacity>

                         {/* File Info */}
                         <View style={{ flex: 1, marginHorizontal: 12 }}>
                            <Text style={[styles.histName, { color: theme.text, fontSize: 16, marginBottom: 4 }]} numberOfLines={1}>
                              {item.fileName || 'Untitled Recording'}
                            </Text>
                            
                            {playingRecordingId === item.id ? (
                               <View style={{ marginTop: 4 }}>
                                  <View style={{ height: 4, backgroundColor: theme.textSecondary + '40', borderRadius: 2 }}>
                                    <View 
                                      style={{ 
                                        width: `${(playbackStatus.position / playbackStatus.duration) * 100}%`, 
                                        height: '100%', 
                                        backgroundColor: theme.primary, 
                                        borderRadius: 2 
                                      }} 
                                    />
                                  </View>
                                  <Text style={{ fontSize: 10, color: theme.primary, marginTop: 2 }}>
                                    {Math.floor(playbackStatus.position / 60000)}:{String(Math.floor((playbackStatus.position % 60000) / 1000)).padStart(2, '0')}
                                  </Text>
                               </View>
                            ) : (
                               <Text style={[styles.histDate, { color: theme.textSecondary, fontSize: 12 }]}>
                                 {new Date(item.timestamp).toLocaleDateString()}
                                 {item.duration ? ` • ${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}` : ''}
                               </Text>
                            )}
                         </View>

                         {/* More Options Indicator */}
                         <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} style={{ padding: 6 }} />

                      </TouchableOpacity>
                   )}
                   ListEmptyComponent={
                     <Text style={{color: theme.textSecondary, textAlign: 'center', marginTop: 20}}>No recordings yet.</Text>
                   }
                />
             </View>
          )}
       </View>

       {/* Recording Action Sheet */}
       <Modal
          visible={showActionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowActionModal(false)}
       >
          <TouchableOpacity 
             style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0 }]} 
             activeOpacity={1} 
             onPress={() => setShowActionModal(false)}
          >
             <View style={[styles.actionSheet, { width: '100%', backgroundColor: theme.surface, paddingBottom: 40, paddingTop: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
                
                <View style={{ gap: 4 }}>
                   <TouchableOpacity 
                      style={[styles.simpleActionRow, { backgroundColor: theme.background }]}
                      onPress={() => {
                         setShowActionModal(false);
                         if (selectedRecording) handleSelectPriorRecording(selectedRecording, 'story');
                      }}
                   >
                      <MaterialCommunityIcons name="auto-fix" size={20} color={theme.primary} />
                      <Text style={[styles.simpleActionText, { color: theme.text }]}>Create Story</Text>
                   </TouchableOpacity>

                   <TouchableOpacity 
                      style={[styles.simpleActionRow, { backgroundColor: theme.background }]}
                      onPress={() => {
                         setShowActionModal(false);
                         if (selectedRecording) {
                             // Show create story modal instead of navigating
                             const mockStory = {
                               id: Date.now().toString(),
                               title: selectedRecording.fileName || 'Recording Story',
                               summary: selectedRecording.transcript || 'A story from recording',
                               audioUri: selectedRecording.uri,
                               duration: selectedRecording.duration,
                               transcript: selectedRecording.transcript,
                               createdAt: new Date().toISOString(),
                               isAiGenerated: false,
                             };
                             setGeneratedStory(mockStory);
                             setStoryTitle(selectedRecording.fileName || '');
                             setStoryDescription(selectedRecording.transcript || '');
                             setShowCreateStoryModal(true);
                         }
                      }}
                   >
                      <Ionicons name="share-social-outline" size={20} color={theme.text} />
                      <Text style={[styles.simpleActionText, { color: theme.text }]}>Share</Text>
                   </TouchableOpacity>

                   <TouchableOpacity 
                      style={[styles.simpleActionRow, { backgroundColor: theme.background }]}
                      onPress={() => {
                         setShowActionModal(false);
                         if (selectedRecording) {
                             setNewName(selectedRecording.fileName);
                             setShowRenameModal(true);
                         }
                      }}
                   >
                      <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.textSecondary} />
                      <Text style={[styles.simpleActionText, { color: theme.text }]}>Rename</Text>
                   </TouchableOpacity>

                   <TouchableOpacity 
                      style={[styles.simpleActionRow, { backgroundColor: theme.background }]}
                      onPress={() => {
                         const recToDelete = selectedRecording;
                         setShowActionModal(false);
                         setTimeout(() => {
                            Alert.alert('Delete', 'Delete this recording permanently?', [
                              { text: 'Cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => recToDelete && deleteRecording(recToDelete.id) }
                            ]);
                         }, 300);
                      }}
                   >
                      <Ionicons name="trash-outline" size={20} color={theme.error} />
                      <Text style={[styles.simpleActionText, { color: theme.error }]}>Delete</Text>
                   </TouchableOpacity>
                   
                   {/* Less common options */}
                   <TouchableOpacity 
                      style={[styles.simpleActionRow, { backgroundColor: theme.background, opacity: 0.8 }]}
                      onPress={() => {
                         setShowActionModal(false);
                         if (selectedRecording) handleSelectPriorRecording(selectedRecording, 'voice');
                      }}
                   >
                      <MaterialCommunityIcons name="account-voice" size={20} color={theme.textSecondary} />
                      <Text style={[styles.simpleActionText, { color: theme.textSecondary }]}>Train Voice Model</Text>
                   </TouchableOpacity>

                </View>
             </View>
          </TouchableOpacity>
       </Modal>

       {/* Elder Voice Naming Modal */}
       <Modal
          visible={showVoiceNameModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVoiceNameModal(false)}
       >
         <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
           <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
             <Text style={[styles.modalTitle, { color: theme.text }]}>Preserve Elder Voice</Text>
             <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>Enter the name of the elder to identify this voice model:</Text>
             
             <TextInput
               style={[styles.inputField, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
               placeholder="e.g. Elder Kambera"
               placeholderTextColor={theme.textSecondary}
               value={voiceName}
               onChangeText={setVoiceName}
               autoFocus
             />

             <View style={styles.modalActions}>
               <TouchableOpacity onPress={() => setShowVoiceNameModal(false)} style={[styles.modalBtn]}>
                 <Text style={{ color: theme.error }}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={saveVoiceModel} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
                 <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Archive Voice</Text>
               </TouchableOpacity>
             </View>
           </View>
         </View>
       </Modal>

       {/* Create Story Modal - Title and Description */}
       <Modal
          visible={showCreateStoryModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCreateStoryModal(false)}
       >
         <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
           <View style={[styles.modalContent, { backgroundColor: theme.surface, width: '90%', maxHeight: '70%' }]}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m }}>
               <Text style={[styles.modalTitle, { color: theme.text }]}>Save Story to Library</Text>
               <TouchableOpacity onPress={() => setShowCreateStoryModal(false)}>
                 <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
               </TouchableOpacity>
             </View>

             <ScrollView showsVerticalScrollIndicator={false}>
               {/* Title Input */}
               <View style={{ marginBottom: SPACING.m }}>
                 <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 6 }]}>
                   Story Title <Text style={{ color: theme.error }}>*</Text>
                 </Text>
                 <TextInput
                   style={[styles.inputField, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                   value={storyTitle}
                   onChangeText={setStoryTitle}
                   placeholder="Enter a title for your story..."
                   placeholderTextColor={theme.textSecondary}
                   maxLength={100}
                   autoFocus
                 />
                 <Text style={[styles.characterCount, { color: theme.textSecondary }]}>{storyTitle.length}/100</Text>
               </View>

               {/* Description Input */}
               <View style={{ marginBottom: SPACING.m }}>
                 <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 6 }]}>
                   Description (Optional)
                 </Text>
                 <TextInput
                   style={[styles.inputField, { 
                     color: theme.text, 
                     borderColor: theme.border, 
                     backgroundColor: theme.background,
                     height: 100,
                     textAlignVertical: 'top'
                   }]}
                   value={storyDescription}
                   onChangeText={setStoryDescription}
                   placeholder="Describe your story, add cultural context..."
                   placeholderTextColor={theme.textSecondary}
                   maxLength={500}
                   multiline
                   numberOfLines={4}
                 />
                 <Text style={[styles.characterCount, { color: theme.textSecondary }]}>{storyDescription.length}/500</Text>
               </View>

               {/* Info Banner */}
               <View style={{ 
                 flexDirection: 'row', 
                 alignItems: 'center', 
                 backgroundColor: theme.primary + '20', 
                 padding: SPACING.m, 
                 borderRadius: 8,
                 marginBottom: SPACING.m 
               }}>
                 <Ionicons name="information-circle" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                 <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                   Next, you'll choose where to save and share your story
                 </Text>
               </View>
             </ScrollView>

             {/* Continue Button */}
             <View style={styles.modalActions}>
               <TouchableOpacity 
                 onPress={() => setShowCreateStoryModal(false)} 
                 style={[styles.modalBtn, { borderWidth: 1, borderColor: theme.border }]}
               >
                 <Text style={{ color: theme.text }}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 onPress={handleProceedToRecipients} 
                 style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                 disabled={!storyTitle.trim()}
               >
                 <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Continue to Sharing Options</Text>
               </TouchableOpacity>
             </View>
           </View>
         </View>
       </Modal>

       {/* Rename Modal */}
       <Modal
          visible={showRenameModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRenameModal(false)}
       >
         <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
           <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
             <Text style={[styles.modalTitle, { color: theme.text }]}>Rename Recording</Text>
             
             <TextInput
               style={[styles.inputField, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
               value={newName}
               onChangeText={setNewName}
               autoFocus
               placeholder="Enter new name"
               placeholderTextColor={theme.textSecondary}
             />

             <View style={styles.modalActions}>
               <TouchableOpacity onPress={() => setShowRenameModal(false)} style={[styles.modalBtn]}>
                 <Text style={{ color: theme.error }}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={handleRenameRecording} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
                 <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save</Text>
               </TouchableOpacity>
             </View>
           </View>
         </View>
       </Modal>

       {/* Recipient Selection Modal */}
       <Modal
          visible={showRecipientModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRecipientModal(false)}
       >
         <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
           <View style={[styles.modalContent, { backgroundColor: theme.surface, width: '90%', maxHeight: '80%' }]}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m }}>
               <Text style={[styles.modalTitle, { color: theme.text }]}>Share Story</Text>
               <TouchableOpacity onPress={() => setShowRecipientModal(false)}>
                 <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
               </TouchableOpacity>
             </View>

             <ScrollView showsVerticalScrollIndicator={false}>
               {/* My Creations Option */}
               <TouchableOpacity
                 style={[
                   styles.destinationOption,
                   { 
                     backgroundColor: theme.glassMedium, 
                     borderColor: selectedRecipients.includes('my_stories') ? theme.primary : theme.border,
                     borderWidth: 2,
                     marginBottom: 8
                   }
                 ]}
                 onPress={() => toggleRecipient('my_stories')}
               >
                 <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                   <View style={[styles.destinationIcon, { backgroundColor: theme.secondary + '20' }]}>
                     <Ionicons name="book" size={20} color={theme.secondary} />
                   </View>
                   <View style={{ flex: 1 }}>
                     <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>My Creations</Text>
                     <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Save to Story Library (My Creation)</Text>
                   </View>
                 </View>
                 <Ionicons
                   name={selectedRecipients.includes('my_stories') ? 'checkbox' : 'square-outline'}
                   size={28}
                   color={selectedRecipients.includes('my_stories') ? theme.primary : theme.textSecondary}
                 />
               </TouchableOpacity>

               {/* Community Story Option */}
               <TouchableOpacity
                 style={[
                   styles.destinationOption,
                   { 
                     backgroundColor: theme.glassMedium, 
                     borderColor: selectedRecipients.includes('community') ? theme.primary : theme.border,
                     borderWidth: 2,
                     marginBottom: 8
                   }
                 ]}
                 onPress={() => toggleRecipient('community')}
               >
                 <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                   <View style={[styles.destinationIcon, { backgroundColor: theme.primary + '20' }]}>
                     <Ionicons name="globe" size={20} color={theme.primary} />
                   </View>
                   <View style={{ flex: 1 }}>
                     <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>Community Story</Text>
                     <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Share with the community</Text>
                   </View>
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
                   <View style={{ marginVertical: SPACING.m, flexDirection: 'row', alignItems: 'center' }}>
                     <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                     <Text style={{ marginHorizontal: SPACING.m, color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>
                       Emergency Contacts (Other Creation)
                     </Text>
                     <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                   </View>

                   {emergencyContactsWithApp.map((contact, index) => {
                     const recipientKey = getContactRecipientKey(contact);
                     return (
                       <TouchableOpacity
                         key={`contact-${recipientKey}-${index}`}
                         style={[
                           styles.destinationOption,
                           { 
                             backgroundColor: theme.glassMedium, 
                             borderColor: selectedRecipients.includes(recipientKey) ? theme.primary : theme.border,
                             borderWidth: 2,
                             marginBottom: 8
                           }
                         ]}
                         onPress={() => toggleRecipient(recipientKey)}
                       >
                         <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                           <View style={[styles.destinationIcon, { backgroundColor: theme.accent + '20' }]}>
                             <Ionicons name="person-circle" size={20} color={theme.accent} />
                           </View>
                           <View style={{ flex: 1 }}>
                             <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>{contact.name}</Text>
                             <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                               {contact.relation} • {contact.appUser?.fullName || contact.linkedUserName || contact.email || contact.phone || 'Profile Contact'}
                             </Text>
                           </View>
                         </View>
                         <Ionicons
                           name={selectedRecipients.includes(recipientKey) ? 'checkbox' : 'square-outline'}
                           size={28}
                           color={selectedRecipients.includes(recipientKey) ? theme.primary : theme.textSecondary}
                         />
                       </TouchableOpacity>
                     );
                   })}
                 </>
               )}

               {emergencyContactsWithApp.length === 0 && (
                 <View style={{ 
                   padding: SPACING.m, 
                   backgroundColor: theme.background, 
                   borderRadius: 8, 
                   alignItems: 'center',
                   marginTop: SPACING.m 
                 }}>
                   <Ionicons name="people-outline" size={32} color={theme.textSecondary} />
                   <Text style={{ color: theme.textSecondary, marginTop: SPACING.s, textAlign: 'center' }}>
                     No emergency contacts found in your profile. Add contacts in Profile > Emergency Contacts.
                   </Text>
                 </View>
               )}

               {currentUser && (
                 <View style={{ 
                   flexDirection: 'row', 
                   alignItems: 'center', 
                   backgroundColor: theme.primary + '20', 
                   padding: SPACING.m, 
                   borderRadius: 8,
                   marginTop: SPACING.m 
                 }}>
                   <Ionicons name="information-circle" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                   <Text style={{ color: theme.text, fontSize: 12, flex: 1 }}>
                     Story will be labeled as sent by {currentUser.fullName} ({currentUser.role || 'learner'})
                   </Text>
                 </View>
               )}
             </ScrollView>

             {/* Save Button */}
             <View style={styles.modalActions}>
               <TouchableOpacity 
                 onPress={() => setShowRecipientModal(false)} 
                 style={[styles.modalBtn, { borderWidth: 1, borderColor: theme.border }]}
               >
                 <Text style={{ color: theme.text }}>Back</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 onPress={saveStoryToLibrary} 
                 style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                 disabled={selectedRecipients.length === 0 || isSavingStory}
               >
                 {isSavingStory ? (
                   <ActivityIndicator size="small" color="#FFF" />
                 ) : (
                   <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Share Now ({selectedRecipients.length})</Text>
                 )}
               </TouchableOpacity>
             </View>
           </View>
         </View>
       </Modal>

       {/* Language Selection Modal for Translation */}
       <Modal
          visible={showLanguageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
       >
          <TouchableOpacity 
             style={styles.modalOverlay} 
             activeOpacity={1} 
             onPress={() => setShowLanguageModal(false)}
          >
             <TouchableOpacity 
                activeOpacity={1}
                style={[styles.modalContent, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
             >
                <Text style={[styles.modalTitle, { color: theme.text }]}>Translate Before Generating?</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary, marginBottom: SPACING.m }]}>
                   Select a language to translate your text, or skip to generate with original text.
                </Text>

                {/* Borneo Languages */}
                <Text style={[{ color: theme.primary, fontSize: 14, fontWeight: 'bold', marginBottom: SPACING.s }]}>Indigenous Borneo</Text>
                <ScrollView style={{ maxHeight: 250 }}>
                   {getBorneoLanguages().slice(0, 5).map((lang) => (
                      <TouchableOpacity 
                         key={lang.id} 
                         style={[
                            { 
                              flexDirection: 'row', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              paddingVertical: SPACING.m,
                              borderBottomWidth: 1,
                              borderBottomColor: theme.border
                            },
                            targetLanguage?.id === lang.id && { backgroundColor: theme.primary + '20' }
                         ]}
                         onPress={() => setTargetLanguage(lang)}
                      >
                         <Text style={[{ color: theme.text, fontSize: 16 }]}>
                            {lang.label}
                         </Text>
                         {targetLanguage?.id === lang.id && (
                            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                         )}
                      </TouchableOpacity>
                   ))}
                </ScrollView>

                <View style={[styles.modalActions, { marginTop: SPACING.l }]}>
                   <TouchableOpacity 
                      style={[styles.modalBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
                      onPress={() => {
                         setTargetLanguage(null);
                         handleTranslateAndGenerate();
                      }}
                   >
                      <Text style={[{ color: theme.text }]}>Skip Translation</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                      style={[styles.modalBtn, { backgroundColor: theme.primary, opacity: !targetLanguage ? 0.5 : 1 }]}
                      onPress={handleTranslateAndGenerate}
                      disabled={!targetLanguage}
                   >
                      <Text style={[{ color: '#FFFFFF' }]}>
                         Translate & Generate
                      </Text>
                   </TouchableOpacity>
                </View>
             </TouchableOpacity>
          </TouchableOpacity>
       </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: SPACING.m },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: FONTS.secondary,
  },
  content: { padding: SPACING.m, flex: 1 },
  instructions: { fontSize: 16, marginBottom: SPACING.l, lineHeight: 24, textAlign: 'center' },
  tabs: { flexDirection: 'row', marginBottom: SPACING.l },
  tab: { flex: 1, alignItems: 'center', paddingVertical: SPACING.s, gap: 4 },
  tabText: { fontSize: 14, fontWeight: '600' },
  
  voiceContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxl },
  preservationToggle: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.l, gap: 10 },
  toggleLabel: { fontWeight: '600' },
  
  // Custom Action Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  sheetSubtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 10 },
  actionOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, gap: 15 },
  actionIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cancelBtn: { marginTop: 10, paddingVertical: 15, borderRadius: 12, alignItems: 'center', width: '100%' },
  readingCard: { padding: SPACING.m, borderRadius: 12, marginBottom: SPACING.l, alignItems: 'center' },
  readingTitle: { fontWeight: '700', marginBottom: 8 },
  readingText: { fontStyle: 'italic', textAlign: 'center', fontSize: 16 },

  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
    ...SHADOWS.medium,
  },
  recordLabel: { fontSize: 16 },

  textContainer: { flex: 1 },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.m,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: SPACING.m,
  },
  generateBtn: {
    padding: SPACING.m,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  fileContainer: { flex: 1 },
  uploadBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.l
  },
  uploadText: { fontWeight: '600' },
  historyTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: SPACING.m },
  histItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.s,
    // Removed gap: 12 to handle spacing manually for layout control
  },
  fileIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  histName: { fontWeight: '600', fontSize: 14 },
  histDate: { fontSize: 12 },

  loadingText: { marginTop: SPACING.m, fontSize: 16 },

  scrollContent: { padding: SPACING.m },
  previewTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: SPACING.m, textAlign: 'center' },
  card: { borderRadius: 16, padding: SPACING.m, marginBottom: SPACING.m, ...SHADOWS.small },
  storyTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: SPACING.s },
  storySummary: { fontSize: 14, fontStyle: 'italic', marginBottom: SPACING.m },
  divider: { height: 1, backgroundColor: '#DDD', marginBottom: SPACING.m },
  pagePreview: { marginBottom: SPACING.l },
  imagePlaceholder: { 
    height: 150, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: SPACING.s,
    padding: SPACING.s
  },
  promptText: { fontSize: 12, textAlign: 'center' },
  pageText: { fontSize: 16, lineHeight: 24 },
  
  actionRow: { flexDirection: 'row', gap: SPACING.m },
  button: { flex: 1, padding: SPACING.m, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  secondaryBtn: { borderWidth: 1, backgroundColor: 'transparent' },
  primaryBtn: {},
  btnText: { fontWeight: 'bold', fontSize: 16 },

  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.l },
  modalContent: { width: '100%', borderRadius: 16, padding: SPACING.l, alignItems: 'stretch' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.s, textAlign: 'center' },
  modalDesc: { fontSize: 14, marginBottom: SPACING.m, textAlign: 'center' },
  inputField: { borderWidth: 1, borderRadius: 8, padding: SPACING.m, marginBottom: SPACING.l },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  characterCount: { fontSize: 12, textAlign: 'right', marginTop: 4, marginBottom: SPACING.m },
  destinationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderRadius: 12,
  },
  destinationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.m },
  modalBtn: { paddingVertical: SPACING.s, paddingHorizontal: SPACING.m, borderRadius: 8 },

  // Simple Action Sheet Styles
  simpleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 4,
  },
  simpleActionText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});
