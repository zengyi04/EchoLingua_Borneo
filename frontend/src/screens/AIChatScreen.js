import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { prepareSingleRecording, stopAndReleaseRecording } from '../services/recordingService';
import { useTheme } from '../context/ThemeContext';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
const CHAT_HISTORY_KEY = '@echolingua_ai_chat_history';

const SYSTEM_CONTEXT = `You are an AI assistant for EchoLingua, a language learning app focused on indigenous languages of Borneo (Kadazandusun, Iban, Bajau, Murut). Help users with:
- Language learning tips and pronunciation
- Cultural information about Borneo indigenous communities
- Story meanings and translations
- Grammar and vocabulary questions
- Practice scenarios and conversations
Be friendly, concise, and educational. Answer in simple, clear language.`;

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

export default function AIChatScreen({ navigation }) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([
    { id: 'seed', role: 'assistant', text: 'Hello! I\'m your EchoLingua AI assistant. Ask me anything about Borneo indigenous languages (Kadazandusun, Iban, Bajau, Murut), culture, stories, or pronunciation. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    const loadHistory = async () => {
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
    if (!historyLoaded) {
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
          systemInstruction: { parts: [{ text: SYSTEM_CONTEXT }] },
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
      Speech.speak(answer, { language: 'en-US', rate: 0.96 });
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
        shouldDuckAndroid: false,
      });

      const active = await prepareSingleRecording();
      setRecording(active);
      setIsRecording(true);
    } catch (error) {
      console.error('Voice recording start failed:', error);
      Alert.alert('Recording Error', 'Could not start recording.');
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
                    text: 'Please transcribe this audio to text. Only return the transcribed text with no explanations.',
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

      // Set the transcribed text in the input field for user review
      setInput(transcribedText);
      Alert.alert('Audio Transcribed', `"${transcribedText}" - Edit or click Send to ask`, [
        {
          text: 'Send Now',
          onPress: async () => {
            // Send the transcribed text directly
            await handleSendText(transcribedText);
          },
        },
        {
          text: 'Edit First',
          style: 'cancel',
        },
      ]);
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
      Speech.speak(answer, { language: 'en-US', rate: 0.96 });
    } catch (error) {
      console.error('Gemini text request failed:', error);
      Alert.alert('AI Error', 'Could not get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>AI Chat</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Ask by typing or speaking</Text>
        </View>
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
});