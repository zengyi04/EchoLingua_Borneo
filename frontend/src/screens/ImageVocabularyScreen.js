import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const MOCK_DETECTED_OBJECTS = [
  {
    id: '1',
    name: 'Pineapple',
    indigenous: 'Nanas',
    pronunciation: 'na-nas',
    translation: 'Pineapple',
    description: 'A tropical fruit commonly found in Borneo',
    confidence: 95,
  },
  {
    id: '2',
    name: 'Banana',
    indigenous: 'Pisang',
    pronunciation: 'pi-sang',
    translation: 'Banana',
    description: 'Common fruit in local markets',
    confidence: 92,
  },
  {
    id: '3',
    name: 'Leaf',
    indigenous: 'Daun',
    pronunciation: 'da-un',
    translation: 'Leaf',
    description: 'Plant foliage',
    confidence: 88,
  },
];

export default function ImageVocabularyScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [uploadedImage, setUploadedImage] = useState(null);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = () => {
    console.log('📸 Image uploaded - Sound: camera shutter');
    // Simulate image upload
    setIsProcessing(true);
    setUploadedImage('https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Tropical+Fruits');
    
    setTimeout(() => {
      console.log('✅ Image processed - Sound: success');
      setDetectedObjects(MOCK_DETECTED_OBJECTS);
      setIsProcessing(false);
      setSelectedObject(MOCK_DETECTED_OBJECTS[0]);
    }, 2000);
  };

  const handlePlayAudio = (objectId) => {
    console.log('🔊 Playing pronunciation - Sound: word audio');
    setPlayingAudio(objectId);
    setTimeout(() => {
      setPlayingAudio(null);
      console.log('✅ Pronunciation finished');
    }, 1500);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setDetectedObjects([]);
    setSelectedObject(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.surfaceVariant, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Image to Vocabulary</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Upload images to discover indigenous words
          </Text>
        </View>

        <View style={styles.content}>
          {/* Image Upload Area */}
          {!uploadedImage ? (
            <TouchableOpacity
              style={[
                styles.uploadArea,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isDragging && { borderColor: theme.primary, backgroundColor: theme.surfaceVariant }
              ]}
              onPress={handleImageUpload}
              activeOpacity={0.7}
            >
              <View style={[styles.uploadIconContainer, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="cloud-upload-outline" size={64} color={theme.primary} />
              </View>
              <Text style={[styles.uploadTitle, { color: theme.text }]}>Drag & Drop Image Here</Text>
              <Text style={[styles.uploadSubtitle, { color: theme.textSecondary }]}>or tap to select from device</Text>
              <View style={[styles.supportedFormats, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.formatText, { color: theme.textSecondary }]}>Supported: JPG, PNG, WEBP</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePreviewContainer}>
              <View style={styles.imageHeader}>
                <Text style={[styles.imageHeaderTitle, { color: theme.text }]}>Uploaded Image</Text>
                <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                  <Ionicons name="close-circle" size={24} color={theme.error || '#EF4444'} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: uploadedImage }}
                  style={[styles.uploadedImage, { borderColor: theme.border, borderWidth: 1 }]}
                  resizeMode="cover"
                />
                {isProcessing && (
                  <View style={[styles.processingOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.processingCard, { backgroundColor: theme.surface }]}>
                      <MaterialCommunityIcons
                        name="robot"
                        size={48}
                        color={theme.primary}
                      />
                      <Text style={[styles.processingText, { color: theme.text }]}>Analyzing image...</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Detected Objects */}
          {detectedObjects.length > 0 && (
            <View style={styles.detectedSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="eye-check" size={24} color={theme.success || '#10B981'} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Detected Objects ({detectedObjects.length})
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.objectChipsContainer}
              >
                {detectedObjects.map((obj) => (
                  <TouchableOpacity
                    key={obj.id}
                    style={[
                      styles.objectChip,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      selectedObject?.id === obj.id && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                    onPress={() => setSelectedObject(obj)}
                  >
                    <Text
                      style={[
                        styles.objectChipText,
                        { color: theme.text },
                        selectedObject?.id === obj.id && { color: theme.surface },
                      ]}
                    >
                      {obj.name}
                    </Text>
                    <View style={[styles.confidenceBadge, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={[styles.confidenceText, { color: theme.textSecondary }]}>{obj.confidence}%</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Selected Object Details */}
          {selectedObject && (
            <View style={[styles.vocabularyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                <View style={styles.languageLabel}>
                  <MaterialCommunityIcons name="earth" size={20} color={theme.primary} />
                  <Text style={[styles.languageLabelText, { color: theme.textSecondary }]}>Indigenous Borneo</Text>
                </View>
                <TouchableOpacity
                  style={[styles.playButton, { backgroundColor: theme.surfaceVariant }]}
                  onPress={() => handlePlayAudio(selectedObject.id)}
                >
                  <Ionicons
                    name={playingAudio === selectedObject.id ? "pause-circle" : "volume-high"}
                    size={32}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.wordContainer}>
                <Text style={[styles.indigenousWord, { color: theme.primary }]}>{selectedObject.indigenous}</Text>
                <View style={[styles.pronunciationContainer, { backgroundColor: theme.surfaceVariant }]}>
                  <Ionicons name="mic-outline" size={16} color={theme.secondary} />
                  <Text style={[styles.pronunciation, { color: theme.textSecondary }]}>/{selectedObject.pronunciation}/</Text>
                </View>
              </View>

              <View style={styles.translationContainer}>
                <View style={styles.translationHeader}>
                  <MaterialCommunityIcons name="translate" size={18} color={theme.textSecondary} />
                  <Text style={[styles.translationLabel, { color: theme.textSecondary }]}>English Translation</Text>
                </View>
                <Text style={[styles.translationText, { color: theme.text }]}>{selectedObject.translation}</Text>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={[styles.descriptionTitle, { color: theme.text }]}>About this word:</Text>
                <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{selectedObject.description}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="bookmark-outline" size={20} color={theme.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.text }]}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="share-social-outline" size={20} color={theme.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.text }]}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialCommunityIcons name="cards" size={20} color={theme.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.text }]}>Add to Deck</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Beginner Tips */}
          {!uploadedImage && (
            <View style={[styles.tipsCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb" size={24} color={theme.accent} />
                <Text style={[styles.tipsTitle, { color: theme.text }]}>Tips for Beginners</Text>
              </View>
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <View style={[styles.tipBullet, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                    Take clear photos of objects in good lighting
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={[styles.tipBullet, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                    Start with common household items or food
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={[styles.tipBullet, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                    The AI identifies objects and teaches indigenous words
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={[styles.tipBullet, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                    Practice pronunciation by listening to audio
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Example Images */}
          {!uploadedImage && (
            <View style={styles.examplesSection}>
              <Text style={[styles.examplesTitle, { color: theme.text }]}>Try these examples:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity style={[styles.exampleCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handleImageUpload}>
                  <View style={[styles.exampleImage, { backgroundColor: theme.surfaceVariant }]}>
                    <MaterialCommunityIcons name="fruit-pineapple" size={48} color={theme.accent} />
                  </View>
                  <Text style={[styles.exampleText, { color: theme.text }]}>Fruits</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.exampleCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handleImageUpload}>
                  <View style={[styles.exampleImage, { backgroundColor: theme.surfaceVariant }]}>
                    <MaterialCommunityIcons name="food-variant" size={48} color={theme.secondary} />
                  </View>
                  <Text style={[styles.exampleText, { color: theme.text }]}>Foods</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.exampleCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handleImageUpload}>
                  <View style={[styles.exampleImage, { backgroundColor: theme.surfaceVariant }]}>
                    <MaterialCommunityIcons name="tree" size={48} color={theme.success || '#10B981'} />
                  </View>
                  <Text style={[styles.exampleText, { color: theme.text }]}>Nature</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.exampleCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handleImageUpload}>
                  <View style={[styles.exampleImage, { backgroundColor: theme.surfaceVariant }]}>
                    <MaterialCommunityIcons name="home" size={48} color={theme.primary} />
                  </View>
                  <Text style={[styles.exampleText, { color: theme.text }]}>Home</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    ...SHADOWS.small,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  content: {
    padding: SPACING.l,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: SPACING.l,
    padding: SPACING.xxl,
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    ...SHADOWS.small,
  },
  uploadAreaDragging: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.success,
  },
  uploadIconContainer: {
    marginBottom: SPACING.m,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.l,
  },
  supportedFormats: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: SPACING.s,
  },
  formatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  imagePreviewContainer: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  imageHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  resetButton: {
    padding: 4,
  },
  imageWrapper: {
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: 250,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: COLORS.glassLight,
    padding: SPACING.l,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.s,
  },
  detectedSection: {
    marginTop: SPACING.l,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  objectChipsContainer: {
    gap: SPACING.s,
  },
  objectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    gap: SPACING.s,
    ...SHADOWS.small,
  },
  objectChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  objectChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  objectChipTextSelected: {
    color: COLORS.primary,
  },
  confidenceBadge: {
    backgroundColor: COLORS.success + '30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  vocabularyCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.l,
    marginTop: SPACING.l,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  languageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: SPACING.s,
  },
  languageLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  playButton: {
    padding: 4,
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: SPACING.l,
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  indigenousWord: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.s,
  },
  pronunciationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  pronunciation: {
    fontSize: 16,
    color: COLORS.secondary,
    fontStyle: 'italic',
  },
  translationContainer: {
    marginBottom: SPACING.l,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.s,
  },
  translationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  translationText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  descriptionContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.m,
    borderRadius: SPACING.s,
    marginBottom: SPACING.l,
  },
  descriptionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.s,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.m,
    borderRadius: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tipsCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: SPACING.m,
    padding: SPACING.l,
    marginTop: SPACING.l,
    ...SHADOWS.small,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tipsList: {
    gap: SPACING.s,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.s,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  examplesSection: {
    marginTop: SPACING.l,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  exampleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.m,
    padding: SPACING.l,
    marginRight: SPACING.m,
    alignItems: 'center',
    width: 120,
    ...SHADOWS.small,
  },
  exampleImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  exampleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});
