import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS, useTheme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LearnScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Structured Lessons</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Master the basics step-by-step</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress Overview */}
        <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>Course Progress</Text>
          <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
             <View style={[styles.progressBarFill, { width: '35%', backgroundColor: theme.secondary }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>Unit 1: Greetings • 4/12 Lessons</Text>
        </View>

        {/* Lesson List */}
        <View style={styles.lessonSection}>
           <Text style={[styles.sectionTitle, { color: theme.text }]}>Living Language Scenarios</Text>
           
           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card || theme.surface, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'home' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: theme.success }]}>
                <Ionicons name="home" size={20} color={theme.onPrimary || '#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>At Home (Di Rumah)</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Family conversations & daily routines</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'tamu' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: theme.secondary }]}>
                <Ionicons name="basket" size={20} color={theme.onPrimary || '#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>At the Tamu (Market)</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Bargaining & buying produce</Text>
              </View>
              <Ionicons name="play-circle" size={24} color={theme.primary} />
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'elders' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: theme.accent || COLORS.accent }]}>
                <Ionicons name="people" size={20} color={theme.onPrimary || '#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>Greeting Elders</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Respectful terms & gestures</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: theme.surfaceVariant }]}><Text style={[styles.tagText, { color: theme.accent || COLORS.accent }]}>CULTURE</Text></View>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'festival' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: '#E91E63' }]}> 
                <Ionicons name="musical-notes" size={20} color={'#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>Harvest Festival</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Songs & specialized vocabulary</Text>
              </View>
              <Ionicons name="play-circle" size={24} color={theme.primary} />
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'school' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: '#3F51B5' }]}> 
                <Ionicons name="school" size={20} color={'#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>At School</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Classroom phrases and introductions</Text>
              </View>
              <Ionicons name="play-circle" size={24} color={theme.primary} />
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.lessonItem, { backgroundColor: theme.card, borderColor: theme.border }]}
             onPress={() => navigation.navigate('LivingLanguage', { scenario: 'clinic' })}
             activeOpacity={0.7}
           >
              <View style={[styles.iconBox, { backgroundColor: '#F44336' }]}> 
                <Ionicons name="medkit" size={20} color={'#FFFFFF'} />
              </View>
              <View style={styles.lessonInfo}>
                 <Text style={[styles.lessonTitle, { color: theme.text }]}>At Clinic</Text>
                 <Text style={[styles.lessonDesc, { color: theme.textSecondary }]}>Health and help-seeking conversations</Text>
              </View>
              <Ionicons name="play-circle" size={24} color={theme.primary} />
           </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: 24,
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
  progressCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    marginBottom: SPACING.l,
    ...SHADOWS.small,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    borderRadius: SPACING.m,
    marginBottom: SPACING.s,
    ...SHADOWS.small,
  },
  lessonLocked: {
    opacity: 0.6,
    backgroundColor: '#f9f9f9',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  lessonDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});