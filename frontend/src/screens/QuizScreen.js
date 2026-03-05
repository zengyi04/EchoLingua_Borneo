import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { quizzesByLanguageAndDifficulty } from '../data/mockData';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { playSound } from '../services/soundService';
import { translateText } from '../services/translationService';
import { saveQuizResult as saveQuizScoreService } from '../services/scoringService';

const QUIZ_STATE_STORAGE_KEY = '@echolingua_quiz_state';
const QUIZ_HISTORY_STORAGE_KEY = '@echolingua_quiz_history';

const LANGUAGES = [
  // Borneo Indigenous Languages
  { id: 'iban', label: 'Iban', flag: '🇲🇾', region: 'Borneo' },
  { id: 'bidayuh', label: 'Bidayuh', flag: '🇲🇾', region: 'Borneo' },
  { id: 'kadazan', label: 'Kadazan-Dusun', flag: '🇲🇾', region: 'Borneo' },
  { id: 'murut', label: 'Murut', flag: '🇲🇾', region: 'Borneo' },
  { id: 'malay', label: 'Malay', flag: '🇲🇾', region: 'Southeast Asia' },
  
  // Major World Languages
  { id: 'english', label: 'English', flag: '🇬🇧', region: 'Global' },
  { id: 'spanish', label: 'Spanish', flag: '🇪🇸', region: 'Europe/Americas' },
  { id: 'french', label: 'French', flag: '🇫🇷', region: 'Europe/Africa' },
  { id: 'mandarin', label: 'Mandarin Chinese', flag: '🇨🇳', region: 'Asia' },
  { id: 'arabic', label: 'Arabic', flag: '🇸🇦', region: 'Middle East' },
  { id: 'hindi', label: 'Hindi', flag: '🇮🇳', region: 'South Asia' },
  { id: 'portuguese', label: 'Portuguese', flag: '🇵🇹', region: 'Europe/Americas' },
  { id: 'bengali', label: 'Bengali', flag: '🇧🇩', region: 'South Asia' },
  { id: 'russian', label: 'Russian', flag: '🇷🇺', region: 'Eastern Europe' },
  { id: 'japanese', label: 'Japanese', flag: '🇯🇵', region: 'East Asia' },
  { id: 'german', label: 'German', flag: '🇩🇪', region: 'Central Europe' },
  { id: 'korean', label: 'Korean', flag: '🇰🇷', region: 'East Asia' },
  { id: 'vietnamese', label: 'Vietnamese', flag: '🇻🇳', region: 'Southeast Asia' },
  { id: 'thai', label: 'Thai', flag: '🇹🇭', region: 'Southeast Asia' },
  { id: 'indonesian', label: 'Indonesian', flag: '🇮🇩', region: 'Southeast Asia' },
  { id: 'tagalog', label: 'Tagalog', flag: '🇵🇭', region: 'Southeast Asia' },
  { id: 'italian', label: 'Italian', flag: '🇮🇹', region: 'Southern Europe' },
  { id: 'turkish', label: 'Turkish', flag: '🇹🇷', region: 'Middle East' },
  { id: 'polish', label: 'Polish', flag: '🇵🇱', region: 'Central Europe' },
  { id: 'dutch', label: 'Dutch', flag: '🇳🇱', region: 'Western Europe' },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', emoji: '🌱', color: '#4CAF50' },
  { id: 'medium', label: 'Medium', emoji: '🌿', color: '#FF9800' },
  { id: 'hard', label: 'Hard', emoji: '🌳', color: '#E53935' },
];

export default function QuizScreen({ navigation }) {
  const { theme } = useTheme();
  // Selection states
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  
  // Quiz states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [localizedQuestion, setLocalizedQuestion] = useState(null);
  const [isLocalizingQuestion, setIsLocalizingQuestion] = useState(false);

  const persistQuizState = async (overrides = {}) => {
    try {
      const statePayload = {
        selectedLanguageId: selectedLanguage?.id || null,
        selectedDifficultyId: selectedDifficulty?.id || null,
        selectedQuiz,
        currentQuestionIndex,
        score,
        quizFinished,
        updatedAt: new Date().toISOString(),
        ...overrides,
      };
      await AsyncStorage.setItem(QUIZ_STATE_STORAGE_KEY, JSON.stringify(statePayload));
    } catch (error) {
      console.error('Failed to persist quiz state:', error);
    }
  };

  const saveQuizResult = async (result) => {
    try {
      const existing = await AsyncStorage.getItem(QUIZ_HISTORY_STORAGE_KEY);
      const history = existing ? JSON.parse(existing) : [];
      const updatedHistory = [result, ...history].slice(0, 100);
      await AsyncStorage.setItem(QUIZ_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save quiz result:', error);
    }
  };

  useEffect(() => {
    const loadPersistedQuizState = async () => {
      try {
        const rawState = await AsyncStorage.getItem(QUIZ_STATE_STORAGE_KEY);
        if (!rawState) {
          return;
        }

        const parsed = JSON.parse(rawState);
        const restoredLanguage = LANGUAGES.find((lang) => lang.id === parsed.selectedLanguageId) || null;
        const restoredDifficulty = DIFFICULTIES.find((level) => level.id === parsed.selectedDifficultyId) || null;

        if (restoredLanguage) {
          setSelectedLanguage(restoredLanguage);
        }
        if (restoredDifficulty) {
          setSelectedDifficulty(restoredDifficulty);
        }

        if (restoredLanguage && restoredDifficulty && parsed.selectedQuiz) {
          const quizData = quizzesByLanguageAndDifficulty?.[restoredLanguage.id]?.[restoredDifficulty.id]?.[`quiz${parsed.selectedQuiz}`];
          if (Array.isArray(quizData) && quizData.length > 0) {
            setSelectedQuiz(parsed.selectedQuiz);
            setQuizQuestions(quizData);
            setCurrentQuestionIndex(Math.min(parsed.currentQuestionIndex || 0, quizData.length - 1));
            setScore(parsed.score || 0);
            setQuizFinished(Boolean(parsed.quizFinished));
          }
        }
      } catch (error) {
        console.error('Failed to restore quiz state:', error);
      }
    };

    loadPersistedQuizState();
  }, []);

  useEffect(() => {
    if (!selectedLanguage && !selectedDifficulty && !selectedQuiz && quizQuestions.length === 0) {
      return;
    }
    persistQuizState();
  }, [selectedLanguage, selectedDifficulty, selectedQuiz, currentQuestionIndex, score, quizFinished, quizQuestions.length]);

  useEffect(() => {
    if (!quizFinished || !selectedLanguage || !selectedDifficulty || !selectedQuiz) {
      return;
    }

    const total = quizQuestions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    
    // Save using the scoring service for proper user profile updates
    saveQuizScoreService({
      language: selectedLanguage.label,
      difficulty: selectedDifficulty.id,
      score: score,
      totalQuestions: total,
      quizNumber: selectedQuiz,
    }).then(() => {
      console.log('Quiz result saved to scoring service');
    });

    // Also save to local history for backward compatibility
    saveQuizResult({
      id: Date.now().toString(),
      languageId: selectedLanguage.id,
      languageLabel: selectedLanguage.label,
      difficultyId: selectedDifficulty.id,
      difficultyLabel: selectedDifficulty.label,
      quizNumber: selectedQuiz,
      score,
      total,
      percentage,
      completedAt: new Date().toISOString(),
    });
  }, [quizFinished]);

  useEffect(() => {
    const localizeCurrentQuestion = async () => {
      const currentQuestion = quizQuestions[currentQuestionIndex];
      if (!currentQuestion || !selectedLanguage) {
        setLocalizedQuestion(null);
        return;
      }

      // Keep native language content untouched when English is selected.
      if (selectedLanguage.id === 'english') {
        setLocalizedQuestion(currentQuestion);
        return;
      }

      try {
        setIsLocalizingQuestion(true);
        const localizedText = await translateText(currentQuestion.question, selectedLanguage.id);
        const localizedOptions = await Promise.all(
          currentQuestion.options.map((option) => translateText(option, selectedLanguage.id))
        );
        const correctAnswerIndex = currentQuestion.options.findIndex(
          (option) => option === currentQuestion.correctAnswer
        );
        setLocalizedQuestion({
          ...currentQuestion,
          question: localizedText,
          options: localizedOptions,
          correctAnswer: localizedOptions[correctAnswerIndex] || localizedOptions[0],
          originalQuestion: currentQuestion.question,
        });
      } catch (error) {
        console.error('Failed to localize quiz content:', error);
        setLocalizedQuestion(currentQuestion);
      } finally {
        setIsLocalizingQuestion(false);
      }
    };

    localizeCurrentQuestion();
  }, [quizQuestions, currentQuestionIndex, selectedLanguage]);

  const handleLanguageSelect = (language) => {
    console.log(`🌍 Selected language: ${language.label}`);
    playSound('select');
    setSelectedLanguage(language);
    setSelectedDifficulty(null);
    setSelectedQuiz(null);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedOption(null);
  };

  const handleDifficultySelect = (difficulty) => {
    console.log(`📊 Selected difficulty: ${difficulty.label}`);
    playSound('select');
    setSelectedDifficulty(difficulty);
    setSelectedQuiz(null);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedOption(null);
  };

  const handleQuizSelect = (quizNumber) => {
    console.log(`📝 Starting Quiz ${quizNumber}`);
    playSound('start');
    
    // Check if quiz data exists for this language/difficulty combination
    const languageData = quizzesByLanguageAndDifficulty[selectedLanguage.id];
    if (!languageData) {
      Alert.alert(
        'Content Coming Soon',
        `Quiz content for ${selectedLanguage.label} is currently being developed. Please check back soon or try one of our fully supported languages: Iban, Bidayuh, Kadazan-Dusun, Murut, Malay, English, Spanish, French, Mandarin, or Arabic.`
      );
      playSound('back');
      return;
    }
    
    const difficultyData = languageData[selectedDifficulty.id];
    if (!difficultyData) {
      Alert.alert(
        'Content Coming Soon',
        `${selectedDifficulty.label} level content for ${selectedLanguage.label} is being developed.`
      );
      playSound('back');
      return;
    }
    
    const quizData = difficultyData[`quiz${quizNumber}`];
    if (!quizData || quizData.length === 0) {
      Alert.alert(
        'Content Coming Soon',
        `Quiz ${quizNumber} for ${selectedLanguage.label} (${selectedDifficulty.label}) is being developed.`
      );
      playSound('back');
      return;
    }
    
    setSelectedQuiz(quizNumber);
    
    // Get questions for this language, difficulty, and quiz
    const questions = quizData;
    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedOption(null);

    persistQuizState({
      selectedLanguageId: selectedLanguage.id,
      selectedDifficultyId: selectedDifficulty.id,
      selectedQuiz: quizNumber,
      currentQuestionIndex: 0,
      score: 0,
      quizFinished: false,
    });
  };

  const handleAnswer = (option) => {
    setSelectedOption(option);
    playSound('select');
    
    setTimeout(() => {
      const currentQuestion = quizQuestions[currentQuestionIndex];
      const isCorrect = option === currentQuestion.correctAnswer;
      
      if (isCorrect) {
        setScore(prev => prev + 1);
        playSound('correct');
        console.log('✅ Correct answer');
      } else {
        playSound('incorrect');
        console.log(`❌ Wrong - Correct: ${currentQuestion.correctAnswer}`);
        Alert.alert('Incorrect', `Correct answer: ${currentQuestion.correctAnswer}`);
      }

      const nextQuestion = currentQuestionIndex + 1;
      if (nextQuestion < quizQuestions.length) {
        setCurrentQuestionIndex(nextQuestion);
        setSelectedOption(null);
      } else {
        setQuizFinished(true);
        playSound('complete');
      }
    }, 500);
  };

  const restartQuiz = () => {
    console.log('🔄 Restarting quiz');
    playSound('reset');
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedOption(null);
    persistQuizState({ currentQuestionIndex: 0, score: 0, quizFinished: false });
  };

  const goBack = (level) => {
    playSound('back');
    if (level === 'quiz') {
      setSelectedQuiz(null);
      setQuizQuestions([]);
      setCurrentQuestionIndex(0);
      setScore(0);
      setQuizFinished(false);
      setSelectedOption(null);
    } else if (level === 'difficulty') {
      setSelectedDifficulty(null);
      setSelectedQuiz(null);
      setQuizQuestions([]);
      setCurrentQuestionIndex(0);
      setScore(0);
      setQuizFinished(false);
      setSelectedOption(null);
    } else if (level === 'language') {
      setSelectedLanguage(null);
      setSelectedDifficulty(null);
      setSelectedQuiz(null);
      setQuizQuestions([]);
      setCurrentQuestionIndex(0);
      setScore(0);
      setQuizFinished(false);
      setSelectedOption(null);
    }
  };

  // Language Selection Screen
  if (!selectedLanguage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
          style={styles.backButtonTop}
        >
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
          <Text style={[styles.backButtonText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Choose Language</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Select a language to practice</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.id}
              style={[styles.selectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => handleLanguageSelect(language)}
            >
              <Text style={styles.flagEmoji}>{language.flag}</Text>
              <View style={styles.selectionCardContent}>
                <Text style={[styles.selectionCardLabel, { color: theme.text }]}>{language.label}</Text>
                <Text style={[styles.selectionCardSubtitle, { color: theme.textSecondary }]}>{language.region}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.primary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Difficulty Selection Screen
  if (!selectedDifficulty) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => goBack('language')} style={styles.backButtonTop}>
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
          <Text style={[styles.backButtonText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Choose Difficulty</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{selectedLanguage.label}</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {DIFFICULTIES.map((difficulty) => (
            <TouchableOpacity
              key={difficulty.id}
              style={[styles.selectionCard, { borderLeftColor: difficulty.color, borderLeftWidth: 4, backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => handleDifficultySelect(difficulty)}
            >
              <Text style={styles.difficultyEmoji}>{difficulty.emoji}</Text>
              <View style={styles.selectionCardContent}>
                <Text style={[styles.selectionCardLabel, { color: theme.text }]}>{difficulty.label}</Text>
                <Text style={[styles.selectionCardSubtitle, { color: theme.textSecondary }]}>5 quizzes available</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={difficulty.color} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Quiz Selection Screen
  if (!selectedQuiz) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => goBack('difficulty')} style={styles.backButtonTop}>
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
          <Text style={[styles.backButtonText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Choose Quiz</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {selectedLanguage.label} - {selectedDifficulty.label}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.quizGrid}>
            {[1, 2, 3, 4, 5].map((quizNum) => (
              <TouchableOpacity
                key={quizNum}
                style={[styles.quizCard, { backgroundColor: selectedDifficulty.color + '20', borderColor: selectedDifficulty.color }]}
                onPress={() => handleQuizSelect(quizNum)}
              >
                <View style={[styles.quizNumberCircle, { backgroundColor: selectedDifficulty.color }]}>
                  <Text style={[styles.quizNumber, { color: theme.surface }]}>{quizNum}</Text>
                </View>
                <Text style={[styles.quizLabel, { color: theme.text }]}>Quiz {quizNum}</Text>
                <Text style={[styles.quizSubtitle, { color: theme.textSecondary }]}>5 questions</Text>
                <Ionicons name="arrow-forward" size={20} color={selectedDifficulty.color} style={{ marginTop: 8 }} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Quiz Active Screen
  if (quizFinished) {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    const perfection = percentage === 100;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.resultCard}>
          <Ionicons name={perfection ? 'trophy' : 'checkmark-circle'} size={80} color={theme.secondary} />
          <Text style={[styles.finishTitle, { color: theme.text }]}>Quiz Complete!</Text>
          <Text style={[styles.finalScore, { color: theme.primary }]}>{score} / {quizQuestions.length}</Text>
          <Text style={[styles.percentage, { color: theme.secondary }]}>{percentage}%</Text>
          <Text style={[styles.feedbackText, { color: theme.textSecondary }]}>
            {percentage === 100
              ? "Perfect Score! You're a master! 🎉"
              : percentage >= 80
              ? 'Excellent work! Keep it up!'
              : percentage >= 60
              ? 'Good effort! Practice more!'
              : 'Keep learning! Try again!'}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={restartQuiz}>
              <Ionicons name="refresh" size={20} color={theme.background} />
              <Text style={[styles.primaryButtonText, { color: theme.background }]}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: SPACING.m, backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => goBack('quiz')}
            >
              <Ionicons name="arrow-back" size={20} color={theme.primary} />
              <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Choose Another Quiz</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tertiaryButton, { marginTop: SPACING.m, backgroundColor: theme.secondary }]}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('MainTabs', { screen: 'HomeTab' });
                }
              }}
            >
              <Ionicons name="home" size={20} color={theme.background} />
              <Text style={[styles.tertiaryButtonText, { color: theme.background }]}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Active Quiz Screen
  const currentQuestion = localizedQuestion || quizQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.quizHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => goBack('quiz')} style={styles.backButtonSmall}>
          <Ionicons name="close" size={24} color={theme.error} />
        </TouchableOpacity>
        <View style={styles.quizInfo}>
          <Text style={[styles.quizLanguage, { color: theme.textSecondary }]}>{selectedLanguage.label}</Text>
          <Text style={[styles.quizDifficulty, { color: theme.text }]}>Quiz {selectedQuiz}</Text>
        </View>
        <View style={[styles.scoreDisplay, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.scoreLabel, { color: theme.primary }]}>Score</Text>
          <Text style={[styles.scoreValue, { color: theme.primary }]}>{score}/{quizQuestions.length}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.progressBarBg, { backgroundColor: theme.surfaceVariant }]}>
          <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>Question {currentQuestionIndex + 1}/{quizQuestions.length}</Text>
      </View>

      {/* Question */}
      <ScrollView style={styles.quizContent} showsVerticalScrollIndicator={false}>
        <View style={styles.questionContainer}>
          <Text style={[styles.questionNumber, { color: theme.primary }]}>Question {currentQuestionIndex + 1}</Text>
          {isLocalizingQuestion && (
            <Text style={[styles.localizingLabel, { color: theme.textSecondary }]}>Translating to {selectedLanguage.label}...</Text>
          )}
          <Text style={[styles.questionText, { color: theme.text }]}>{currentQuestion.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === currentQuestion.correctAnswer;
            const showResult = selectedOption !== null;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  
                  isSelected && (isCorrect ? { borderColor: theme.success, backgroundColor: theme.success + '20' } : { borderColor: theme.error, backgroundColor: theme.error + '20' }),
                  showResult && isCorrect && { borderColor: theme.success, backgroundColor: theme.success + '20' },
                ]}
                onPress={() => !selectedOption && handleAnswer(option)}
                disabled={selectedOption !== null}
              >
                <View style={styles.optionIndicator}>
                  {!showResult && <View style={[styles.optionCircle, { borderColor: theme.primary }]} />}
                  {showResult && (
                    <Ionicons
                      name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={24}
                      color={isCorrect ? theme.success : theme.error}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.text },
                    isSelected && { color: isCorrect ? theme.success : theme.error }, // Wait, if selected, text color depends
                    showResult && isCorrect && { color: theme.success, fontWeight: 'bold' },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
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
  header: {
    padding: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    ...SHADOWS.small,
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
    flex: 1,
    padding: SPACING.l,
  },
  backButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
    paddingBottom: SPACING.s,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...SHADOWS.small,
    gap: SPACING.m,
  },
  flagEmoji: {
    fontSize: 40,
  },
  difficultyEmoji: {
    fontSize: 48,
  },
  selectionCardContent: {
    flex: 1,
  },
  selectionCardLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  selectionCardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quizGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.m,
    justifyContent: 'space-between',
  },
  quizCard: {
    width: '48%',
    paddingVertical: SPACING.l,
    paddingHorizontal: SPACING.m,
    borderRadius: SPACING.m,
    alignItems: 'center',
    borderWidth: 2,
    ...SHADOWS.small,
  },
  quizNumberCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  quizNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  quizLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  quizSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    ...SHADOWS.small,
  },
  backButtonSmall: {
    padding: SPACING.s,
  },
  quizInfo: {
    flex: 1,
    marginLeft: SPACING.m,
  },
  quizLanguage: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  quizDifficulty: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreDisplay: {
    backgroundColor: COLORS.primary + '20',
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SPACING.s,
  },
  scoreLabel: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBarContainer: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: SPACING.s,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  quizContent: {
    flex: 1,
    padding: SPACING.l,
  },
  questionContainer: {
    marginBottom: SPACING.xl,
  },
  questionNumber: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.s,
  },
  localizingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
    fontStyle: 'italic',
  },
  questionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 32,
  },
  optionsContainer: {
    gap: SPACING.m,
  },
  optionButton: {
    backgroundColor: COLORS.glassLight,
    padding: SPACING.m,
    borderRadius: SPACING.m,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  optionIndicator: {
    marginRight: SPACING.m,
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionTextSelected: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  optionCorrect: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  optionTextCorrect: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  optionIncorrect: {
    backgroundColor: COLORS.error + '20',
    borderColor: COLORS.error,
  },
  resultCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  finishTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.l,
  },
  finalScore: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: SPACING.m,
  },
  percentage: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.accent,
    marginTop: SPACING.s,
  },
  feedbackText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.l,
    lineHeight: 24,
  },
  actionButtons: {
    width: '100%',
    marginTop: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderRadius: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    ...SHADOWS.small,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  secondaryButton: {
    backgroundColor: COLORS.glassLight,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderRadius: SPACING.m,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tertiaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderRadius: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    ...SHADOWS.small,
  },
  tertiaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
});