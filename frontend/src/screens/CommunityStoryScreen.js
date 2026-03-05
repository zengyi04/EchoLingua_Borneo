import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const SEEN_STORIES_KEY = '@echolingua_seen_stories';

export default function CommunityStoryScreen({ navigation }) {
  const { theme } = useTheme();
  const [stories, setStories] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // all, following, popular
  const [searchQuery, setSearchQuery] = useState('');

  // Upload form state
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDescription, setStoryDescription] = useState('');
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [storyLanguage, setStoryLanguage] = useState('Kadazandusun');
  const [storyCategory, setStoryCategory] = useState('Folklore');

  // Comment state
  const [newComment, setNewComment] = useState('');
  
  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [audioSound, setAudioSound] = useState(null);
  
  // Collection state
  const [likedStories, setLikedStories] = useState({});
  const [collectedStories, setCollectedStories] = useState({});

  useEffect(() => {
    loadStories();
    loadUserPreferences();
    markStoriesAsSeen();
    
    return () => {
      // Cleanup audio on unmount
      if (audioSound) {
        audioSound.unloadAsync().catch(() => {});
      }
    };
  }, []);
  
  const markStoriesAsSeen = async () => {
    try {
      const stored = await AsyncStorage.getItem('communityStories');
      if (stored) {
        const allStories = JSON.parse(stored);
        const storyIds = allStories.map(s => s.id);
        
        // Get existing seen stories
        const seenData = await AsyncStorage.getItem(SEEN_STORIES_KEY);
        const seenStories = seenData ? JSON.parse(seenData) : [];
        
        // Merge with new story IDs (remove duplicates)
        const updatedSeenStories = [...new Set([...seenStories, ...storyIds])];
        
        await AsyncStorage.setItem(SEEN_STORIES_KEY, JSON.stringify(updatedSeenStories));
      }
    } catch (error) {
      console.error('Error marking stories as seen:', error);
    }
  };
  
  const loadUserPreferences = async () => {
    try {
      const liked = await AsyncStorage.getItem('@user_liked_stories');
      const collected = await AsyncStorage.getItem('@user_collected_stories');
      if (liked) setLikedStories(JSON.parse(liked));
      if (collected) setCollectedStories(JSON.parse(collected));
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const loadStories = async () => {
    try {
      const stored = await AsyncStorage.getItem('communityStories');
      if (stored) {
        setStories(JSON.parse(stored));
      } else {
        // Sample stories
        const sampleStories = [
          {
            id: '1',
            title: 'The Legend of Mount Kinabalu',
            description: 'A traditional Kadazandusun story about the sacred mountain',
            author: 'Maria Linus',
            authorAvatar: '👤',
            language: 'Kadazandusun',
            category: 'Folklore',
            likes: 145,
            comments: 23,
            bookmarks: 67,
            audioUri: null,
            uploadedAt: new Date().toISOString(),
            isFollowing: false,
            commentsList: [
              { id: 'c1', author: 'John Doe', text: 'Beautiful story!', time: '2h ago' },
              { id: 'c2', author: 'Sarah Lee', text: 'This reminds me of my grandmother', time: '5h ago' },
            ],
          },
          {
            id: '2',
            title: 'Iban Harvest Song',
            description: 'Traditional song sung during rice harvest celebrations',
            author: 'Anding Langit',
            authorAvatar: '👤',
            language: 'Iban',
            category: 'Music & Songs',
            likes: 203,
            comments: 45,
            bookmarks: 89,
            audioUri: null,
            uploadedAt: new Date().toISOString(),
            isFollowing: true,
            commentsList: [],
          },
          {
            id: '3',
            title: 'Bajau Sea Stories',
            description: 'Tales from the sea nomads of Borneo',
            author: 'Zainal Omar',
            authorAvatar: '👤',
            language: 'Bajau',
            category: 'Cultural Heritage',
            likes: 178,
            comments: 31,
            bookmarks: 52,
            audioUri: null,
            uploadedAt: new Date().toISOString(),
            isFollowing: false,
            commentsList: [],
          },
        ];
        await AsyncStorage.setItem('communityStories', JSON.stringify(sampleStories));
        setStories(sampleStories);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const saveStories = async (updatedStories) => {
    try {
      await AsyncStorage.setItem('communityStories', JSON.stringify(updatedStories));
      setStories(updatedStories);
    } catch (error) {
      console.error('Error saving stories:', error);
    }
  };

  const handleLikeStory = async (storyId) => {
    const isLiked = likedStories[storyId];
    const updatedLiked = { ...likedStories };
    
    if (isLiked) {
      delete updatedLiked[storyId];
    } else {
      updatedLiked[storyId] = true;
    }
    
    setLikedStories(updatedLiked);
    await AsyncStorage.setItem('@user_liked_stories', JSON.stringify(updatedLiked));
    
    const updatedStories = stories.map((story) => {
      if (story.id === storyId) {
        return { ...story, likes: story.likes + (isLiked ? -1 : 1) };
      }
      return story;
    });
    saveStories(updatedStories);
  };

  const handleBookmarkStory = async (storyId) => {
    const isCollected = collectedStories[storyId];
    const updatedCollected = { ...collectedStories };
    
    if (isCollected) {
      delete updatedCollected[storyId];
      Alert.alert('Removed from Collection', 'Story removed from your collection');
    } else {
      updatedCollected[storyId] = true;
      Alert.alert('Added to Collection', 'Story saved to your collection!');
    }
    
    setCollectedStories(updatedCollected);
    await AsyncStorage.setItem('@user_collected_stories', JSON.stringify(updatedCollected));
    
    const updatedStories = stories.map((story) => {
      if (story.id === storyId) {
        return { ...story, bookmarks: story.bookmarks + (isCollected ? -1 : 1) };
      }
      return story;
    });
    saveStories(updatedStories);
  };

  const handleFollowAuthor = (storyId) => {
    const updatedStories = stories.map((story) => {
      if (story.id === storyId) {
        return { ...story, isFollowing: !story.isFollowing };
      }
      return story;
    });
    saveStories(updatedStories);
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/mp4'], // Include mp4 for compatibility
      });

      if (result.type === 'success' || result.assets) {
        const file = result.assets ? result.assets[0] : result;
        setSelectedAudio(file);
        Alert.alert('Audio Selected', file.name || 'Audio file selected');
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };
  
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
        Alert.alert('Image Selected', 'Image added to your story');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success' || result.assets) {
        const file = result.assets ? result.assets[0] : result;
        setSelectedFile(file);
        Alert.alert('File Selected', file.name || 'File selected');
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };
  
  const playAudio = async (audioUri, storyId) => {
    try {
      // Stop currently playing audio
      if (audioSound) {
        await audioSound.stopAsync();
        await audioSound.unloadAsync();
        setAudioSound(null);
      }
      
      if (playingAudioId === storyId) {
        setPlayingAudioId(null);
        return;
      }
      
      // Play new audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      setAudioSound(sound);
      setPlayingAudioId(storyId);
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudioId(null);
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const handleUploadStory = async () => {
    if (!storyTitle.trim()) {
      Alert.alert('Error', 'Please enter a story title');
      return;
    }

    if (!storyDescription.trim()) {
      Alert.alert('Error', 'Please enter a story description');
      return;
    }

    const newStory = {
      id: Date.now().toString(),
      title: storyTitle,
      description: storyDescription,
      author: 'You',
      authorAvatar: '👤',
      userId: 'current_user', // Placeholder for current user ID
      language: storyLanguage,
      category: storyCategory,
      likes: 0,
      comments: 0,
      bookmarks: 0,
      audioUri: selectedAudio?.uri || null,
      imageUri: selectedImage?.uri || null,
      fileUri: selectedFile?.uri || null,
      fileName: selectedFile?.name || null,
      uploadedAt: new Date().toISOString(),
      isFollowing: false,
      commentsList: [],
    };

    const updatedStories = [newStory, ...stories];
    await saveStories(updatedStories);

    // Reset form
    setStoryTitle('');
    setStoryDescription('');
    setSelectedAudio(null);
    setSelectedImage(null);
    setSelectedFile(null);
    setShowUploadModal(false);
    Alert.alert('Success', 'Your story has been uploaded!');
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedStory) return;

    const comment = {
      id: Date.now().toString(),
      author: 'You',
      text: newComment,
      time: 'Just now',
    };

    const updatedStories = stories.map((story) => {
      if (story.id === selectedStory.id) {
        return {
          ...story,
          comments: story.comments + 1,
          commentsList: [comment, ...story.commentsList],
        };
      }
      return story;
    });

    saveStories(updatedStories);
    setNewComment('');
    setShowCommentModal(false);
    Alert.alert('Success', 'Comment added!');
  };

  const openComments = (story) => {
    setSelectedStory(story);
    setShowCommentModal(true);
  };

  const filteredStories = stories.filter((story) => {
    // Filter by tab
    if (filterTab === 'following' && !story.isFollowing) return false;
    if (filterTab === 'popular' && story.likes < 100) return false;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        story.title.toLowerCase().includes(query) ||
        story.description.toLowerCase().includes(query) ||
        story.author.toLowerCase().includes(query) ||
        story.language.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const renderStoryCard = ({ item }) => {
    const isLiked = likedStories[item.id];
    const isCollected = collectedStories[item.id];
    
    return (
      <View 
        style={[
          styles.storyCard, 
          { 
            backgroundColor: theme.surface, 
            borderColor: 'transparent',
            borderWidth: 0,
            shadowColor: theme.shadow,
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
            marginHorizontal: 4, // Add a bit of side margin for shadow
            marginBottom: 16
          }
        ]}
      >
        {/* Author Header */}
        <View style={styles.authorHeader}>
          <TouchableOpacity 
            style={styles.authorInfo}
            onPress={() => navigation.navigate('UserProfile', { userId: item.userId, userName: item.author })}
          >
            <Text style={styles.authorAvatar}>{item.authorAvatar}</Text>
            <View>
              <Text style={[styles.authorName, { color: theme.text }]}>{item.author}</Text>
              <Text style={[styles.storyMeta, { color: theme.textSecondary }]}>
                {item.language} • {item.category}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.followBtn, 
              item.isFollowing ? styles.followingBtn : { backgroundColor: theme.primary },
              item.isFollowing && { backgroundColor: theme.surfaceVariant, borderColor: theme.border }
            ]}
            onPress={() => handleFollowAuthor(item.id)}
          >
            <Text style={[
              styles.followBtnText, 
              item.isFollowing ? styles.followingBtnText : { color: theme.onPrimary },
              item.isFollowing && { color: theme.textSecondary }
            ]}>
              {item.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Story Content */}
        <View style={styles.storyContent}>
          <Text style={[styles.storyTitle, { color: theme.text }]}>{item.title}</Text>
          <Text style={[styles.storyDescription, { color: theme.textSecondary }]}>{item.description}</Text>
          
          {/* Image */}
          {item.imageUri && (
            <Image source={{ uri: item.imageUri }} style={styles.storyImage} resizeMode="cover" />
          )}
          
          {/* Audio Player */}
          {item.audioUri && (
            <TouchableOpacity 
              style={[
                styles.audioPlayer, 
                { 
                  backgroundColor: theme.surfaceVariant,
                  borderColor: 'transparent' 
                }
              ]}
              onPress={() => playAudio(item.audioUri, item.id)}
            >
              <Ionicons 
                name={playingAudioId === item.id ? "pause-circle" : "play-circle"} 
                size={40} 
                color={theme.primary} 
              />
              <View style={styles.audioPlayerInfo}>
                <Text style={[styles.audioPlayerLabel, { color: theme.text }]}>
                  {playingAudioId === item.id ? 'Playing...' : 'Audio Recording'}
                </Text>
                <Text style={[styles.audioPlayerSubtext, { color: theme.textSecondary }]}>Tap to {playingAudioId === item.id ? 'pause' : 'play'}</Text>
              </View>
              <Ionicons name="musical-notes" size={24} color={theme.primary} />
            </TouchableOpacity>
          )}
          
          {/* File Attachment */}
          {item.fileUri && item.fileName && (
            <View style={[styles.fileAttachment, { backgroundColor: theme.surfaceVariant, borderColor: 'transparent' }]}>
              <Ionicons name="document-attach" size={20} color={theme.secondary} />
              <Text style={[styles.fileAttachmentText, { color: theme.textSecondary }]}>{item.fileName}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionBar, { borderTopColor: theme.border }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLikeStory(item.id)}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={22} 
              color={isLiked ? "#FF4458" : theme.textSecondary} 
            />
            <Text style={[styles.actionText, { color: isLiked ? "#FF4458" : theme.textSecondary }]}>{item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
            <Ionicons name="chatbubble-outline" size={22} color={theme.textSecondary} />
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>{item.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => handleBookmarkStory(item.id)}>
            <Ionicons 
              name={isCollected ? "bookmark" : "bookmark-outline"} 
              size={22} 
              color={isCollected ? theme.primary : theme.textSecondary} 
            />
            <Text style={[styles.actionText, { color: isCollected ? theme.primary : theme.textSecondary }]}>{item.bookmarks}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-outline" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'HomeTab' });
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Community Stories</Text>
        <TouchableOpacity onPress={() => setShowUploadModal(true)}>
          <Ionicons name="add-circle" size={28} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search stories, authors..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {['all', 'following', 'popular'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab, 
              { backgroundColor: theme.surface, borderColor: theme.border },
              filterTab === tab && [styles.activeTab, { backgroundColor: theme.primary, borderColor: theme.primary }]
            ]}
            onPress={() => setFilterTab(tab)}
          >
            <Text style={[
              styles.tabText, 
              { color: theme.textSecondary },
              filterTab === tab && [styles.activeTabText, { color: theme.onPrimary || '#FFFFFF' }]
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stories List */}
      <FlatList
        data={filteredStories}
        renderItem={renderStoryCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="book-open" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No stories found</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Be the first to share a story!</Text>
          </View>
        }
      />

      {/* Upload Story Modal */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Upload Story</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                placeholder="Enter story title"
                placeholderTextColor={theme.textSecondary}
                value={storyTitle}
                onChangeText={setStoryTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                placeholder="Describe your story..."
                placeholderTextColor={theme.textSecondary}
                value={storyDescription}
                onChangeText={setStoryDescription}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Language</Text>
              <View style={styles.pickerContainer}>
                {['Kadazandusun', 'Iban', 'Bajau', 'Murut'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.pickerOption, 
                      { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                      storyLanguage === lang && [styles.pickerOptionActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
                    ]}
                    onPress={() => setStoryLanguage(lang)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: theme.text },
                        storyLanguage === lang && [styles.pickerOptionTextActive, { color: theme.onPrimary }]
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <View style={styles.pickerContainer}>
                {['Folklore', 'Music & Songs', 'Cultural Heritage', 'Personal Story'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pickerOption, 
                      { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                      storyCategory === cat && [styles.pickerOptionActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
                    ]}
                    onPress={() => setStoryCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: theme.text },
                        storyCategory === cat && [styles.pickerOptionTextActive, { color: theme.onPrimary }]
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Media Attachments (Optional)</Text>
              
              {/* Audio Picker */}
              <TouchableOpacity style={[styles.audioPickerBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]} onPress={handlePickAudio}>
                <Ionicons name="mic" size={24} color={theme.primary} />
                <Text style={[styles.audioPickerText, { color: theme.text }]}>
                  {selectedAudio ? selectedAudio.name : 'Add Audio Recording'}
                </Text>
              </TouchableOpacity>
              
              {/* Image Picker */}
              <TouchableOpacity style={[styles.audioPickerBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]} onPress={handlePickImage}>
                <Ionicons name="image" size={24} color={theme.secondary} />
                <Text style={[styles.audioPickerText, { color: theme.text }]}>
                  {selectedImage ? 'Image Selected' : 'Add Image'}
                </Text>
              </TouchableOpacity>
              
              {/* File Picker */}
              <TouchableOpacity style={[styles.audioPickerBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]} onPress={handlePickFile}>
                <Ionicons name="document" size={24} color={theme.accent || COLORS.accent} />
                <Text style={[styles.audioPickerText, { color: theme.text }]}>
                  {selectedFile ? selectedFile.name : 'Add File'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: theme.primary }]} onPress={handleUploadStory}>
                <Text style={[styles.uploadBtnText, { color: theme.onPrimary }]}>Upload Story</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showCommentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Comments</Text>
              <TouchableOpacity onPress={() => setShowCommentModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.commentsScrollView}>
              {selectedStory?.commentsList.map((comment) => (
                <View key={comment.id} style={[styles.commentItem, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.commentAuthor, { color: theme.text }]}>{comment.author}</Text>
                  <Text style={[styles.commentText, { color: theme.textSecondary }]}>{comment.text}</Text>
                  <Text style={[styles.commentTime, { color: theme.textSecondary }]}>{comment.time}</Text>
                </View>
              ))}
              {selectedStory?.commentsList.length === 0 && (
                <Text style={[styles.noCommentsText, { color: theme.textSecondary }]}>No comments yet. Be the first!</Text>
              )}
            </ScrollView>

            <View style={[styles.commentInputContainer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
              <TextInput
                style={[styles.commentInput, { backgroundColor: theme.input, color: theme.text }]}
                placeholder="Write a comment..."
                placeholderTextColor={theme.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity style={styles.commentSendBtn} onPress={handleAddComment}>
                <Ionicons name="send" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.s,
    fontSize: 15,
    color: COLORS.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    gap: SPACING.s,
  },
  tab: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.surface,
  },
  listContent: {
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  storyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.m,
    marginVertical: SPACING.s,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.small,
  },
  authorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    fontSize: 32,
    marginRight: SPACING.s,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  storyMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  followingBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.surface,
  },
  followingBtnText: {
    color: COLORS.primary,
  },
  storyContent: {
    marginBottom: SPACING.m,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  storyDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.s,
  },
  storyImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: SPACING.m,
    backgroundColor: COLORS.surface,
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: SPACING.m,
    marginTop: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  audioPlayerInfo: {
    flex: 1,
    marginLeft: SPACING.m,
  },
  audioPlayerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  audioPlayerSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
    padding: SPACING.s,
    marginTop: SPACING.s,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  fileAttachmentText: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.s,
  },
  audioText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.m,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.l,
    paddingBottom: SPACING.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalScrollView: {
    marginBottom: SPACING.m,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.m,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.m,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  pickerOption: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  pickerOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pickerOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  pickerOptionTextActive: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  audioPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: SPACING.s,
  },
  audioPickerText: {
    fontSize: 15,
    color: COLORS.text,
  },
  uploadBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.m,
    alignItems: 'center',
    marginTop: SPACING.l,
    ...SHADOWS.small,
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  commentsScrollView: {
    maxHeight: 400,
    marginBottom: SPACING.m,
  },
  commentItem: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.s,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noCommentsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: SPACING.m,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  commentSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
});
