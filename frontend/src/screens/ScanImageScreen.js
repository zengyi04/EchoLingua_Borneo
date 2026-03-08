import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { WORLD_LANGUAGES } from '../constants/languages';
import { extractTextFromImage as extractTextFromImageService } from '../services/ocrService';
import { translateTextBetween } from '../services/translationService';

const TRANSLATION_LANGUAGE_OPTIONS = WORLD_LANGUAGES.map((language) => ({
  id: language.id,
  label: language.label,
}));

const parseWordsFromText = (text) => {
  if (!text) return [];
  const parsed = text
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .map((word) => word.toLowerCase());

  // Keep unique words for a cleaner list and stable translation output.
  return [...new Set(parsed)];
};

const ScanImageScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [scanImageUri, setScanImageUri] = useState(null);
  const [scanText, setScanText] = useState('');
  const [scannedWords, setScannedWords] = useState([]);
  const [translatedWords, setTranslatedWords] = useState([]);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLanguageId, setSourceLanguageId] = useState('english');
  const [targetLanguageId, setTargetLanguageId] = useState('malay');
  const [ocrProvider, setOcrProvider] = useState('none');

  const processImageForWords = async (imageUri) => {
    setIsExtractingText(true);
    setScanImageUri(imageUri);
    setScanText('');
    setScannedWords([]);
    setTranslatedWords([]);

    try {
      const result = await extractTextFromImageService(imageUri);
      const extracted = result?.text || '';
      setOcrProvider(result?.provider || 'none');
      if (!extracted) {
        Alert.alert(
          'No Text Detected',
          'Unable to detect text from this image. You can still type text manually below.'
        );
      }
      setScanText(extracted);
      setScannedWords(parseWordsFromText(extracted));
    } catch (error) {
      console.error('Process image error:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsExtractingText(false);
    }
  };

  const takePhotoToScan = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is needed to scan from a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.length > 0) {
        await processImageForWords(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Take photo error:', error);
      Alert.alert('Camera Error', 'Unable to open camera.');
    }
  };

  const uploadImageToScan = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.length > 0) {
        await processImageForWords(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Upload image error:', error);
      Alert.alert('Upload Error', 'Unable to open image gallery.');
    }
  };

  const extractWordsFromTypedText = () => {
    const words = parseWordsFromText(scanText);
    setScannedWords(words);
    setTranslatedWords([]);
  };

  const translateScannedWords = async () => {
    if (scannedWords.length === 0) {
      Alert.alert('No Words', 'Please extract words from text first.');
      return;
    }

    if (sourceLanguageId === targetLanguageId) {
      setTranslatedWords(scannedWords.map((word) => ({ original: word, translated: word })));
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await Promise.all(
        scannedWords.map(async (word) => {
          const output = await translateTextBetween(word, sourceLanguageId, targetLanguageId);
          return { original: word, translated: output };
        })
      );
      setTranslatedWords(translated);
    } catch (error) {
      console.error('Translate error:', error);
      Alert.alert('Translation Error', 'Unable to translate words. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const getLanguageLabelById = (id) => {
    const lang = TRANSLATION_LANGUAGE_OPTIONS.find((l) => l.id === id);
    return lang?.label || id;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Scan Text</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        {/* Initial Action Buttons */}
        {!scanImageUri && !scanText && (
          <View style={[styles.initialCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Scan from Image</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Take a photo or upload an image to extract text</Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.largeActionBtn, { backgroundColor: theme.primary }]} 
                onPress={takePhotoToScan}
              >
                <Ionicons name="camera" size={24} color="#FFFFFF" />
                <Text style={styles.largeActionBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.largeActionBtn, { backgroundColor: theme.primary }]} 
                onPress={uploadImageToScan}
              >
                <Ionicons name="images" size={24} color="#FFFFFF" />
                <Text style={styles.largeActionBtnText}>Upload Image</Text>
              </TouchableOpacity>
            </View>

            {ocrProvider !== 'none' && (
              <View style={[styles.ocrBadge, { backgroundColor: theme.background }]}>
                <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                <Text style={[styles.ocrBadgeText, { color: theme.textSecondary }]}>
                  {ocrProvider === 'google-vision' ? 'Google Vision OCR' : 'OCR.Space'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Image Preview */}
        {scanImageUri && (
          <View style={[styles.previewSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.previewHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Image Preview</Text>
              <TouchableOpacity 
                onPress={() => {
                  setScanImageUri(null);
                  setScanText('');
                  setScannedWords([]);
                  setTranslatedWords([]);
                  setOcrProvider('none');
                }}
              >
                <Ionicons name="refresh" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: scanImageUri }} style={styles.previewImage} />
          </View>
        )}

        {/* Processing State */}
        {isExtractingText && (
          <View style={[styles.processingCard, { backgroundColor: theme.background }]}>
            <Ionicons name="time" size={24} color={theme.primary} />
            <Text style={[styles.processingText, { color: theme.textSecondary }]}>
              Extracting text with {ocrProvider === 'google-vision' ? 'Google Vision' : 'OCR'}...
            </Text>
          </View>
        )}

        {/* Extracted Text */}
        {scanImageUri && (
          <View style={[styles.extractedSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Extracted Text</Text>
            <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>You can edit OCR text or type your own text manually.</Text>
            <TextInput
              style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="Text will appear here. You can also type manually."
              placeholderTextColor={theme.textSecondary}
              value={scanText}
              onChangeText={(text) => {
                setScanText(text);
                setTranslatedWords([]);
              }}
              multiline
            />
            <TouchableOpacity 
              style={[styles.extractBtn, { backgroundColor: theme.primary }]} 
              onPress={extractWordsFromTypedText}
            >
              <Ionicons name="list" size={18} color="#FFFFFF" />
              <Text style={styles.extractBtnText}>Extract Words</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Detected Words */}
        {scanImageUri && (
          <View style={[styles.detectedSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Detected Words ({scannedWords.length})</Text>
            {scannedWords.length > 0 ? (
              <View style={styles.wordsGrid}>
                {scannedWords.map((word, index) => (
                  <View key={`word-${word}-${index}`} style={[styles.wordPill, { backgroundColor: theme.primary }]}> 
                    <Text style={styles.wordPillText}>{word}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyWordsText, { color: theme.textSecondary }]}>No words yet. Tap "Extract Words" after adding text above.</Text>
            )}
          </View>
        )}

        {/* Language Selection */}
        {scanImageUri && (
          <View style={styles.translationOptions}>
            <View style={styles.languageGroup}>
              <Text style={[styles.languageLabel, { color: theme.text }]}>From Language</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageRow}>
                {TRANSLATION_LANGUAGE_OPTIONS.map((lang) => (
                  <TouchableOpacity
                    key={`from-${lang.id}`}
                    style={[
                      styles.languagePill,
                      {
                        borderColor: sourceLanguageId === lang.id ? theme.primary : theme.border,
                        backgroundColor: sourceLanguageId === lang.id ? theme.primary : theme.background,
                      },
                    ]}
                    onPress={() => setSourceLanguageId(lang.id)}
                  >
                    <Text style={{ color: sourceLanguageId === lang.id ? '#FFFFFF' : theme.text, fontSize: 12, fontWeight: '600' }}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.languageGroup}>
              <Text style={[styles.languageLabel, { color: theme.text }]}>To Language</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageRow}>
                {TRANSLATION_LANGUAGE_OPTIONS.map((lang) => (
                  <TouchableOpacity
                    key={`to-${lang.id}`}
                    style={[
                      styles.languagePill,
                      {
                        borderColor: targetLanguageId === lang.id ? theme.primary : theme.border,
                        backgroundColor: targetLanguageId === lang.id ? theme.primary : theme.background,
                      },
                    ]}
                    onPress={() => setTargetLanguageId(lang.id)}
                  >
                    <Text style={{ color: targetLanguageId === lang.id ? '#FFFFFF' : theme.text, fontSize: 12, fontWeight: '600' }}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.translateBtn, { backgroundColor: theme.primary, opacity: isTranslating || scannedWords.length === 0 ? 0.6 : 1 }]}
              onPress={translateScannedWords}
              disabled={isTranslating || scannedWords.length === 0}
            >
              <Ionicons name={isTranslating ? 'hourglass' : 'language'} size={20} color="#FFFFFF" />
              <Text style={styles.translateBtnText}>{isTranslating ? 'Translating...' : 'Translate Words'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Translation Results */}
        {translatedWords.length > 0 && (
          <View style={[styles.resultsSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Translations</Text>
            <Text style={[styles.resultsSubtitle, { color: theme.textSecondary }]}>
              {getLanguageLabelById(sourceLanguageId)} → {getLanguageLabelById(targetLanguageId)}
            </Text>
            <View style={styles.resultsList}>
              {translatedWords.map((item, index) => (
                <View key={`result-${index}`} style={[styles.resultItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultSource, { color: theme.text }]}>{item.original}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={theme.primary} style={{ marginHorizontal: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultTarget, { color: theme.primary }]}>{item.translated}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
  },
  initialCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: SPACING.m,
    gap: SPACING.m,
    ...SHADOWS.medium,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtons: {
    gap: SPACING.s,
  },
  largeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    borderRadius: 12,
  },
  largeActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ocrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  ocrBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  previewSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    gap: SPACING.s,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    padding: SPACING.m,
    borderRadius: 12,
    marginBottom: SPACING.m,
  },
  processingText: {
    fontSize: 13,
    flex: 1,
  },
  extractedSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    gap: SPACING.s,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.s,
    minHeight: 120,
    fontSize: 13,
  },
  extractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.s,
    borderRadius: 10,
  },
  extractBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  detectedSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    gap: SPACING.s,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  wordPill: {
    borderRadius: 999,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
  },
  wordPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWordsText: {
    fontSize: 12,
    lineHeight: 18,
  },
  translationOptions: {
    gap: SPACING.m,
    marginBottom: SPACING.m,
  },
  languageGroup: {
    gap: SPACING.s,
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  languageRow: {
    gap: SPACING.xs,
    paddingBottom: SPACING.s,
  },
  languagePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
  },
  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.m,
    borderRadius: 10,
  },
  translateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resultsSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: SPACING.m,
    gap: SPACING.s,
  },
  resultsSubtitle: {
    fontSize: 12,
  },
  resultsList: {
    gap: SPACING.s,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.s,
    gap: SPACING.s,
  },
  resultSource: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultTarget: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});

export default ScanImageScreen;
