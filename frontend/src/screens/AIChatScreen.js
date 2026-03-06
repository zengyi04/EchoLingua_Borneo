import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, Animated, Modal, ScrollView, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { prepareSingleRecording, stopAndReleaseRecording } from '../services/recordingService';
import { translateTextBetween } from '../services/translationService';
import { WORLD_LANGUAGES } from '../constants/languages';
import { useTheme } from '../context/ThemeContext';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
const CHAT_HISTORY_KEY = '@echolingua_ai_chat_history';
const USER_STORAGE_KEY = '@echolingua_current_user';
const ELDER_VOICES_STORAGE_KEY = '@echolingua_elder_voices'; // From AIStoryGenerator

const VOICE_PROFILES = [
  { id: 'default', name: 'EchoLingua (Standard)', gender: 'neutral', pitch: 1.0, rate: 0.95 },
  { id: 'elder_male', name: 'Elder (Deep)', gender: 'male', pitch: 0.8, rate: 0.85 },
  { id: 'elder_female', name: 'Elder (Soft)', gender: 'female', pitch: 1.2, rate: 0.9 },
  { id: 'energetic', name: 'Youth (Fast)', gender: 'neutral', pitch: 1.1, rate: 1.05 },
];

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
  // Fallbacks for indigenous languages often use Malay/Indonesian TTS if specific ones aren't available
  iban: 'ms-MY',
  kadazan: 'ms-MY',
  murut: 'ms-MY',
  bajau: 'ms-MY',
  bidayuh: 'ms-MY',
  melanau: 'ms-MY',
  penan: 'ms-MY',
};

const SYSTEM_CONTEXT = `You are EchoLingua, a friendly AI language partner for indigenous languages of Borneo (Kadazandusun, Iban, Bajau, Murut). 
YOUR CORE MISSION: Help users speak and learn naturally, like a friend.

KEY BEHAVIORS:
1. **Be Conversational**: Keep responses short, natural, and spoken-style (1-3 sentences preferably).
2. **Correct Gently**: If the user makes a grammar or pronunciation mistake, gently repeat the correct phrase in your reply (e.g., "Ah, you mean [correction]? Yes...").
3. **Teach Vocabulary**: If the user uses English because they don't know a word, supply the indigenous word in your reply naturally.
4. **Cultural Context**: Share brief cultural facts when relevant.
5. **Encourage Speaking**: Ask follow-up questions to keep the user talking.

If the user speaks a Borneo language, reply in that language (or Malay/English if appropriate for the context).
If the user speaks English, answer in English but teach them a phrase in the target language if known.`;

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

function assertGeminiConfig() {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in environment variables.');
  }
}

function resolveLanguageId(languageValue) {
  if (!languageValue || typeof languageValue !== 'string') {
    return null;
  }

  const normalized = languageValue.trim().toLowerCase();
  const byId = WORLD_LANGUAGES.find((lang) => lang.id.toLowerCase() === normalized);
  if (byId) {
    return byId.id;
  }

  const byLabel = WORLD_LANGUAGES.find((lang) => lang.label.toLowerCase() === normalized);
  if (byLabel) {
    return byLabel.id;
  }

  return null;
}

export default function AIChatScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { targetLanguage, speechCode, mode } = route.params || {};
  const [messages, setMessages] = useState([
    { id: 'seed', role: 'assistant', text: 'Hello! I\'m your EchoLingua AI assistant. Ask me anything about Borneo indigenous languages (Kadazandusun, Iban, Bajau, Murut), culture, stories, or pronunciation. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [preferredLanguageId, setPreferredLanguageId] = useState('english');

  // Call Mode State
  const [isCallMode, setIsCallMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState('Connected');
  
  // Voice Features
  const [selectedVoice, setSelectedVoice] = useState(VOICE_PROFILES[0]);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [trainedVoices, setTrainedVoices] = useState([]);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animLoop;
    
    // Pulse animation logic
    if (isCallMode && (isSpeaking || isRecording)) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true })
        ])
      );
      animLoop.start();
    } else {
      pulseAnim.setValue(1); 
    }

    return () => {
      if (animLoop) {
        animLoop.stop();
      }
    };
  }, [isCallMode, isSpeaking, isRecording]);

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const raw = await AsyncStorage.getItem(ELDER_VOICES_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Map stored voices to usable profiles (simulated characteristics)
          const mapped = parsed.map(v => ({
             id: v.id,
             name: v.name + ' (Trained)', // Mark as trained
             pitch: 0.9, // Simulate distinct quality
             rate: 0.85,
             isTrained: true
          }));
          setTrainedVoices(mapped);
        }
      } catch (e) { console.error(e); }
    };
    loadVoices();
  }, []);

  const startCall = () => {
    setIsCallMode(true);
    setCallStatus('Connected');
    Speech.speak("Hello! I'm listening.", { language: 'en-US' });
  };

  const endCall = () => {
    setIsCallMode(false);
    setCallStatus('Connected');
    Speech.stop();
    if (recording) {
      // Just stop recording but don't process if user cancelled
      recording.stopAndUnloadAsync().catch(() => {});
      setRecording(null);
      setIsRecording(false);
    }
  };

  const speakResponse = (text) => {
    const speechLang = speechCode || SPEECH_CODES[preferredLanguageId] || 'en-US';
    
    // Apply voice settings
    const options = {
      language: speechLang,
      pitch: selectedVoice.pitch || 1.0,
      rate: selectedVoice.rate || 0.96,
      onStart: () => {
        setIsSpeaking(true);
        setCallStatus('Speaking');
      },
      onDone: () => {
        setIsSpeaking(false);
        setCallStatus('Listening');
      },
      onStopped: () => {
        setIsSpeaking(false);
        setCallStatus('Connected');
      }
    };
    
    Speech.speak(text, options);
  };

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    const loadHistory = async () => {
      // If we are in Living Language Mode, start fresh without loading old chat history
      if (mode === 'living_language') {
        setMessages([{
          id: 'seed-living',
          role: 'assistant',
          text: `Welcome to ${targetLanguage} Living Language Mode! 🎙️\nI am here to practice speaking with you. I will correct your pronunciation and suggest words naturally.\n\nTap the microphone and say something in ${targetLanguage}!`
        }]);
        setHistoryLoaded(true);
        Speech.speak(`Welcome to ${targetLanguage} Living Language Mode! I am ready to talk.`, { language: 'en-US' });
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (!raw) {
          setHistoryLoaded(true);
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (error) {
        console.error('Failed to load AI chat history:', error);
      } finally {
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, []);

  useEffect(() => {
    const loadPreferredLanguage = async () => {
      try {
        const rawUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (!rawUser) {
          return;
        }

        const user = JSON.parse(rawUser);
        const languageCandidates = Array.isArray(user?.languages)
          ? user.languages
          : typeof user?.languages === 'string'
            ? user.languages.split(',').map((item) => item.trim()).filter(Boolean)
            : [];

        const firstLanguageId = resolveLanguageId(languageCandidates[0]);
        if (firstLanguageId) {
          setPreferredLanguageId(firstLanguageId);
        }
      } catch (error) {
        console.error('Failed to load preferred AI chat language:', error);
      }
    };

    loadPreferredLanguage();
  }, []);

  useEffect(() => {
    if (!historyLoaded || mode === 'living_language') {
      return;
    }

    const persistHistory = async () => {
      try {
        await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-80)));
      } catch (error) {
        console.error('Failed to persist AI chat history:', error);
      }
    };

    persistHistory();
  }, [messages, historyLoaded]);

  const requestGemini = async (parts, includeHistory = true) => {
    assertGeminiConfig();

    let finalSystemContext = SYSTEM_CONTEXT;
    const activeLanguage = targetLanguage || preferredLanguageId;

    if (activeLanguage && activeLanguage !== 'english') {
      finalSystemContext += `\n\nUSER CONTEXT: The user is learning or speaking ${activeLanguage}.
      - IMPORTANT: Reply primarily in ${activeLanguage} if the user initiates in it.
      - If the user speaks English, imply you are a ${activeLanguage} speaker teaching them.
      - Correct their ${activeLanguage} grammar naturally.
      - Be a patient, encouraging language partner.`;
    }

    if (mode === 'living_language' && targetLanguage) {
      finalSystemContext = `YOU ARE A NATIVE SPEAKER OF ${targetLanguage}.
      - MODE: LIVING LANGUAGE IMMERSION (Voice-First).
      - YOUR GOAL: Act as a friendly local who only speaks ${targetLanguage}. Help the user practice conversation.
      - CONVERSATION STYLE: Short, natural, spoken-style responses (1-3 sentences).
      - CORRECTION: If the user makes a mistake, gently repeat the correct phrase in your reply naturally (e.g., "Ah, you mean [correction]? Yes...").
      - TEACHING: If the user is stuck, suggest a word or phrase they might use.
      - DO NOT LECTURE. Just chat.
      - If the user speaks English, encourage them in ${targetLanguage} to try, or switch to English briefly to explain if they are very confused, then switch back.
      `;
    }

    // Build conversation history for context
    const conversationHistory = includeHistory
      ? messages.slice(-10).map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        }))
      : [];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: finalSystemContext }] },
          contents: [
            ...conversationHistory,
            { role: 'user', parts },
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 700,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response text from Gemini');
    }
    return text;
  };

  const sendText = async () => {
    if (!canSend) {
      return;
    }

    const prompt = input.trim();
    const userMessage = { id: `${Date.now()}-u`, role: 'user', text: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const answer = await requestGemini([{ text: prompt }]);
      const botMessage = { id: `${Date.now()}-a`, role: 'assistant', text: answer };
      setMessages((prev) => [...prev, botMessage]);
      speakResponse(answer);
    } catch (error) {
      Alert.alert('AI Error', 'Unable to get answer right now. Please try again.');
      console.error('Gemini text request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceRecording = async () => {
    if (isRecording || loading) {
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Needed', 'Microphone permission is required for voice questions.');
        return;
      }

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
      console.error('Voice recording start failed:', error);
      Alert.alert('Recording Error', `Could not start recording: ${error.message}`);
    }
  };

  const stopVoiceRecordingAndAsk = async () => {
    if (!recording) {
      return;
    }

    setLoading(true);
    try {
      const uri = await stopAndReleaseRecording(recording);
      setRecording(null);
      setIsRecording(false);

      if (!uri) {
        Alert.alert('Recording Error', 'No audio captured. Please try again.');
        setLoading(false);
        return;
      }

      // Convert audio to base64
      const audioResponse = await fetch(uri);
      const buffer = await audioResponse.arrayBuffer();
      const base64Audio = toBase64(new Uint8Array(buffer));

      // Use Gemini to transcribe audio to text
      console.log('🎤 Transcribing audio to text...');
      const transcriptionResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Please transcribe this audio to text. The user might be speaking in ${targetLanguage || preferredLanguageId || 'English'} or mixed languages. Only return the transcribed text with no explanations.`,
                  },
                  {
                    inline_data: {
                      mime_type: 'audio/mp4',
                      data: base64Audio,
                    },
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.7 },
          }),
        }
      );

      if (!transcriptionResponse.ok) {
        const errorData = await transcriptionResponse.json();
        console.error('Transcription error:', errorData);
        throw new Error('Failed to transcribe audio');
      }

      const transcriptionData = await transcriptionResponse.json();
      const transcribedText = transcriptionData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!transcribedText.trim()) {
        Alert.alert('Transcription Failed', 'Could not transcribe audio. Please try again.');
        setLoading(false);
        return;
      }

      console.log('✅ Transcribed text:', transcribedText);

      let finalInput = transcribedText.trim();
      // Only auto-translate if we are NOT in a specific language practice mode
      // Otherwise, trust the transcription matches the target language or English fallback
      if (!targetLanguage && preferredLanguageId && preferredLanguageId !== 'english') {
        try {
          const translated = await translateTextBetween(finalInput, 'english', preferredLanguageId);
          if (translated && translated.trim()) {
            finalInput = translated.trim();
          }
        } catch (translationError) {
          console.error('Voice text translation failed:', translationError);
        }
      }

      // Auto-send for conversational flow (Living Language Style)
      setInput(''); // Clear input as we are sending immediately
      
      // Add user message to UI immediately
      const userMessage = { id: `${Date.now()}-voice-u`, role: 'user', text: finalInput };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const answer = await requestGemini([{ text: finalInput }]);
        const botMessage = { id: `${Date.now()}-voice-a`, role: 'assistant', text: answer };
        setMessages((prev) => [...prev, botMessage]);
        
        speakResponse(answer);
      } catch (geminiError) {
        console.error('Gemini text request failed after voice:', geminiError);
        Alert.alert('AI Error', 'I heard you, but could not reply. Please try again.');
      }
    } catch (error) {
      console.error('Voice transcription failed:', error);
      Alert.alert(
        'Transcription Error',
        'Could not transcribe your voice. Please try again or type your question.'
      );
      setInput('');
      setIsRecording(false);
      setRecording(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendText = async (textToSend) => {
    const messageText = textToSend || input.trim();
    if (!messageText) {
      return;
    }

    setLoading(true);
    try {
      const userMessage = { id: `${Date.now()}-user`, role: 'user', text: messageText };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');

      const answer = await requestGemini([{ text: messageText }]);
      const botMessage = { id: `${Date.now()}-assistant`, role: 'assistant', text: answer };
      setMessages((prev) => [...prev, botMessage]);
      speakResponse(answer);
    } catch (error) {
      console.error('Gemini text request failed:', error);
      Alert.alert('AI Error', 'Could not get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isCallMode) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
           <View style={{ position: 'absolute', top: 60, width: '100%', alignItems: 'center' }}>
             <Text style={{ fontSize: 14, color: theme.textSecondary, letterSpacing: 1, marginBottom: 8 }}>ECHO LINGUA CALL</Text>
             <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }}>{selectedVoice.name}</Text>
             <Text style={{ fontSize: 16, color: theme.textSecondary, marginTop: 8 }}>{isSpeaking ? 'Speaking...' : (isRecording ? 'Listening...' : callStatus)}</Text>
           </View>
           
           <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -40 }}>
              {/* Animated Avatar Rings */}
              <Animated.View style={{
                 transform: [{ scale: pulseAnim }],
                 width: 280, height: 280, borderRadius: 140,
                 backgroundColor: theme.primary + '20',
                 justifyContent: 'center', alignItems: 'center',
                 position: 'absolute'
              }} />
              
              <Animated.View style={{
                 transform: [{ scale: isSpeaking ? pulseAnim : 1 }],
                 width: 220, height: 220, borderRadius: 110,
                 backgroundColor: isSpeaking ? theme.primary + '40' : theme.surface + '40',
                 justifyContent: 'center', alignItems: 'center'
              }}>
                 {/* Avatar Image or Icon */}
                 <View style={{ width: 140, height: 140, borderRadius: 70, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.border }}>
                    {selectedVoice.isTrained ? (
                       <Ionicons name="person" size={80} color={theme.text} />
                    ) : (
                       <Ionicons name="hardware-chip" size={80} color={theme.text} />
                    )}
                 </View>
              </Animated.View>
           </View>

           <View style={{ position: 'absolute', bottom: 60, width: '100%', alignItems: 'center', gap: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 40 }}>
                 
                 {/* Change Voice Button */}
                 <TouchableOpacity 
                    style={{ alignItems: 'center', gap: 8 }}
                    onPress={() => setShowVoiceModal(true)}
                 >
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }}>
                       <Ionicons name="options" size={24} color={theme.text} />
                    </View>
                    <Text style={{ color: theme.text, fontSize: 12 }}>Voice</Text>
                 </TouchableOpacity>

                 {/* End Call Button */}
                 <TouchableOpacity 
                   style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', ...SHADOWS.large }}
                   onPress={endCall}
                 >
                    <Ionicons name="call" size={36} color="#FFF" />
                 </TouchableOpacity>

                 {/* Mic Toggle / Status */}
                 <TouchableOpacity 
                    style={{ alignItems: 'center', gap: 8 }}
                    onPress={isRecording ? stopVoiceRecordingAndAsk : startVoiceRecording}
                 >
                    <View style={{ 
                       width: 56, height: 56, borderRadius: 28, 
                       backgroundColor: isRecording ? theme.text : theme.surface, 
                       justifyContent: 'center', alignItems: 'center' 
                    }}>
                       <Ionicons name={isRecording ? "mic" : "mic-off"} size={24} color={isRecording ? theme.background : theme.text} />
                    </View>
                    <Text style={{ color: theme.text, fontSize: 12 }}>{isRecording ? 'On' : 'Tap to speak'}</Text>
                 </TouchableOpacity>
              </View>
           </View>

        {/* Voice Selection Modal */}
        <Modal
           visible={showVoiceModal}
           transparent
           animationType="slide"
           onRequestClose={() => setShowVoiceModal(false)}
        >
           <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' }}>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Select Voice</Text>
                    <TouchableOpacity onPress={() => setShowVoiceModal(false)}>
                       <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>
                 </View>
                 
                 <ScrollView>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 12 }}>PRESET PERSONALITIES</Text>
                    {VOICE_PROFILES.map(voice => (
                       <TouchableOpacity 
                          key={voice.id}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                          onPress={() => {
                             setSelectedVoice(voice);
                             setShowVoiceModal(false);
                          }}
                       >
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.secondary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                             <Ionicons name="radio" size={20} color={theme.secondary} />
                          </View>
                          <Text style={{ fontSize: 16, color: theme.text, flex: 1 }}>{voice.name}</Text>
                          {selectedVoice.id === voice.id && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
                       </TouchableOpacity>
                    ))}

                    {trainedVoices.length > 0 && (
                       <>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginTop: 24, marginBottom: 12 }}>YOUR TRAINED VOICES</Text>
                          {trainedVoices.map((voice, idx) => (
                             <TouchableOpacity 
                                key={`trained-${idx}`}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                                onPress={() => {
                                   setSelectedVoice(voice);
                                   setShowVoiceModal(false);
                                }}
                             >
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.success + '20', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                                   <Ionicons name="person" size={20} color={theme.success} />
                                </View>
                                <Text style={{ fontSize: 16, color: theme.text, flex: 1 }}>{voice.name}</Text>
                                {selectedVoice.id === voice.id && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
                             </TouchableOpacity>
                          ))}
                       </>
                    )}
                 </ScrollView>
              </View>
           </View>
        </Modal>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>AI Chat</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Speak - translate - review - send</Text>
        </View>
        <TouchableOpacity onPress={startCall} style={{ padding: 8 }}>
           <Ionicons name="call-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContent}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble, 
            item.role === 'assistant' 
              ? [styles.aiBubble, { backgroundColor: theme.surface }] 
              : [styles.userBubble, { backgroundColor: theme.primary }]
          ]}>
            <Text style={[
              styles.messageText, 
              item.role === 'assistant' 
                ? [styles.aiText, { color: theme.text }] 
                : [styles.userText, { color: '#FFFFFF' }]
            ]}>
              {item.text}
            </Text>
          </View>
        )}
      />

      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.micButton, isRecording && [styles.micButtonActive, { backgroundColor: theme.error }]]}
          onPress={isRecording ? stopVoiceRecordingAndAsk : startVoiceRecording}
          disabled={loading}
        >
          <Ionicons name={isRecording ? 'stop' : 'mic'} size={20} color={theme.surface} />
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
          placeholder="Ask any question..."
          placeholderTextColor={theme.textSecondary}
          editable={!loading}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton, 
            !canSend && styles.sendDisabled, 
            { backgroundColor: canSend ? theme.primary : theme.disabled }
          ]} 
          onPress={() => handleSendText()} 
          disabled={!canSend}
        >
          <Ionicons name="send" size={18} color={theme.surface} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.glassMedium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    ...SHADOWS.small,
  },
  backButton: { padding: SPACING.xs, marginRight: SPACING.m },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  chatContent: { padding: SPACING.l, gap: SPACING.m, paddingBottom: SPACING.xxl },
  messageBubble: { 
    maxWidth: '82%', 
    padding: SPACING.m, 
    borderRadius: 16,
    ...SHADOWS.small,
  },
  aiBubble: { 
    alignSelf: 'flex-start', 
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  userBubble: { 
    alignSelf: 'flex-end', 
    backgroundColor: COLORS.primary,
    borderWidth: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  aiText: { color: COLORS.text },
  userText: { color: COLORS.surface },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    backgroundColor: 'transparent', // Let parent handle bg or use transparent
    gap: SPACING.s,
    marginBottom: SPACING.xs, // Slight lift
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium, // Increased shadow
  },
  micButtonActive: { backgroundColor: COLORS.error },
  input: {
    flex: 1,
    borderWidth: 0, // No border
    borderRadius: 24,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    color: COLORS.text,
    backgroundColor: COLORS.surface, // Solid background
    fontSize: 15,
    ...SHADOWS.medium, // Nice elevation
    elevation: 4,     // Android shadow
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  sendDisabled: { opacity: 0.4 },
  callContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 40 },
  callHeader: { position: 'absolute', top: 60, width: '100%', alignItems: 'center' },
  callStatus: { fontSize: 18, fontWeight: '600', letterSpacing: 1 },
  visualizerContainer: { alignItems: 'center', justifyContent: 'center' },
  avatarContainer: {
    width: 200, height: 200, borderRadius: 100, justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  avatarLabel: { fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  callControls: { flexDirection: 'row', alignItems: 'center', gap: 30, marginTop: 40 },
  callBtn: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.medium
  },
  endCallBtn: { width: 72, height: 72, borderRadius: 36 },
  callHint: { position: 'absolute', bottom: 40, fontSize: 14, opacity: 0.8 },
});