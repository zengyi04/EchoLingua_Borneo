import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const KNOWLEDGE_CATEGORIES = [
  {
    id: '1',
    title: 'Traditional Medicine',
    icon: '🌿',
    color: '#4ECDC4',
    articles: [
      {
        id: 'm1',
        title: 'Herbal Remedies of the Kadazandusun',
        language: 'Kadazandusun',
        content: 'Traditional healers (Bobohizan) use various plants for healing. Misilis (ginger) is used for colds and fever. Tongkob (tamarind leaves) helps with digestion. Sulug (turmeric) is an anti-inflammatory...',
        tags: ['Health', 'Plants', 'Healing'],
      },
      {
        id: 'm2',
        title: 'Iban Traditional Healing Practices',
        language: 'Iban',
        content: 'The Manang (traditional healer) uses medicinal plants from the rainforest. Akar kunyit (wild turmeric root) treats skin ailments. Daun segerum helps with respiratory issues...',
        tags: ['Health', 'Healing', 'Rainforest'],
      },
      {
        id: 'm3',
        title: 'Bajau Sea Medicine',
        language: 'Bajau',
        content: 'Sea-based remedies include seaweed for wound healing, sea cucumber extracts for immunity, and coral reef plants for pain relief...',
        tags: ['Maritime', 'Health', 'Sea Resources'],
      },
    ],
  },
  {
    id: '2',
    title: 'Farming & Agriculture',
    icon: '🌾',
    color: '#FFD93D',
    articles: [
      {
        id: 'f1',
        title: 'Hill Rice Cultivation',
        language: 'Kadazandusun',
        content: 'Traditional hill rice farming (tagal) follows lunar cycles. Land is prepared through slash-and-burn (rogon). Seeds are planted during specific moon phases. Harvest is celebrated with Kaamatan festival...',
        tags: ['Agriculture', 'Rice', 'Sustainability'],
      },
      {
        id: 'f2',
        title: 'Iban Padi Farming Methods',
        language: 'Iban',
        content: 'Padi pun (hill rice) cultivation uses traditional knowledge passed through generations. Land rotation prevents soil exhaustion. Bird scarers (panyalahan) protect crops. Harvesting involves community cooperation...',
        tags: ['Agriculture', 'Community', 'Tradition'],
      },
      {
        id: 'f3',
        title: 'Murut Shifting Cultivation',
        language: 'Murut',
        content: 'Sustainable rotational farming preserves forest biodiversity. Mixed cropping includes padi, corn, vegetables. Fallow periods restore soil fertility. Traditional markers indicate land boundaries...',
        tags: ['Agriculture', 'Sustainability', 'Forest'],
      },
    ],
  },
  {
    id: '3',
    title: 'Cultural Practices',
    icon: '🎭',
    color: '#FF6B6B',
    articles: [
      {
        id: 'c1',
        title: 'Kadazandusun Bobohizan Rituals',
        language: 'Kadazandusun',
        content: 'Bobohizan (female high priestess) performs sacred ceremonies. Monogit (offerings to spirits) ensure good harvest. Moginakan (asking permission from spirits) before major activities. Ancient chants preserve ancestral wisdom...',
        tags: ['Spirituality', 'Rituals', 'Tradition'],
      },
      {
        id: 'c2',
        title: 'Iban Longhouse Customs',
        language: 'Iban',
        content: 'Ruai (communal gallery) serves as social center. Strict etiquette includes removing shoes, proper greetings. Tuak (rice wine) sharing symbolizes unity. Storytelling (ensera) passes down history...',
        tags: ['Community', 'Social Customs', 'Architecture'],
      },
      {
        id: 'c3',
        title: 'Bajau Boat-Building Traditions',
        language: 'Bajau',
        content: 'Lepa boats crafted using ancestral techniques. No nails used, only wooden pegs. Decoration patterns have spiritual meaning. Launch ceremonies invoke sea spirits for protection...',
        tags: ['Maritime', 'Craftsmanship', 'Spirituality'],
      },
    ],
  },
  {
    id: '4',
    title: 'Crafts & Arts',
    icon: '🎨',
    color: '#A8DADC',
    articles: [
      {
        id: 'a1',
        title: 'Pua Kumbu Weaving',
        language: 'Iban',
        content: 'Sacred cloth weaving requires months of work. Natural dyes from plants and minerals. Patterns (tabau) tell stories. Weavers must follow pantang (taboos) during creation...',
        tags: ['Textiles', 'Art', 'Tradition'],
      },
      {
        id: 'a2',
        title: 'Kadazandusun Beadwork',
        language: 'Kadazandusun',
        content: 'Intricate beadwork (manik) creates jewelry, headpieces, belts. Each color symbolizes different meanings. Black and white represent balance. Red signifies courage. Patterns identify clan origins...',
        tags: ['Jewelry', 'Identity', 'Symbolism'],
      },
      {
        id: 'a3',
        title: 'Murut Bamboo Crafts',
        language: 'Murut',
        content: 'Bamboo used for musical instruments (sompoton, turali), containers, tools. Specific bamboo types chosen by sound quality. Crafting techniques passed father to son...',
        tags: ['Music', 'Craftsmanship', 'Natural Materials'],
      },
    ],
  },
  {
    id: '5',
    title: 'Hunting & Fishing',
    icon: '🎣',
    color: '#F4A261',
    articles: [
      {
        id: 'h1',
        title: 'Bajau Fishing Techniques',
        language: 'Bajau',
        content: 'Traditional fishing uses natural materials: rattan fish traps (bubu), handwoven nets, wooden spears. Tide and moon knowledge crucial. Sustainable practices ensure resource continuation. Children learn by observation...',
        tags: ['Maritime', 'Sustainability', 'Food'],
      },
      {
        id: 'h2',
        title: 'Iban Hunting Traditions',
        language: 'Iban',
        content: 'Blowpipe (sumpit) hunting uses poisoned darts. Animal tracking requires forest knowledge. Hunting taboos protect sacred animals. Meat distribution follows social hierarchy...',
        tags: ['Hunting', 'Forest', 'Social Systems'],
      },
      {
        id: 'h3',
        title: 'Traditional Fishing Methods',
        language: 'Kadazandusun',
        content: 'River fishing uses tajau (bamboo traps), tuba root (fish poison). Communal fishing strengthens bonds. Sharing catch ensures community food security...',
        tags: ['Community', 'Food Security', 'Traditional Knowledge'],
      },
    ],
  },
  {
    id: '6',
    title: 'Food & Cuisine',
    icon: '🍲',
    color: '#6366F1',
    articles: [
      {
        id: 'fd1',
        title: 'Traditional Kadazandusun Dishes',
        language: 'Kadazandusun',
        content: 'Hinava (raw fish marinated with lime, ginger, chili) is signature dish. Bosou (pickled fish/meat) preserves protein. Pinasakan (fish braised with bambangan) combines flavors. Tuhau (wild ginger) adds unique taste...',
        tags: ['Food', 'Culture', 'Preservation'],
      },
      {
        id: 'fd2',
        title: 'Iban Culinary Heritage',
        language: 'Iban',
        content: 'Pansoh (meat cooked in bamboo) retains flavors. Terung asam (sour brinjal) balances rich foods. Kasam (preserved fish) provides year-round protein. Tuak (rice wine) accompanies celebrations...',
        tags: ['Food', 'Fermentation', 'Celebration'],
      },
      {
        id: 'fd3',
        title: 'Bajau Seafood Traditions',
        language: 'Bajau',
        content: 'Fresh seafood is lifestyle. Ambulong (sea cucumber), tehe-tehe (sea urchin), tahung (shellfish) prepared simply. Salt and lime preserve catch. Smoking techniques extend shelf life...',
        tags: ['Seafood', 'Maritime', 'Preservation'],
      },
    ],
  },
];

export default function CulturalKnowledgeScreen({ navigation }) {
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [filterLanguage, setFilterLanguage] = useState('all');

  const renderCategoryCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { borderColor: item.color, backgroundColor: theme.surface }]}
      onPress={() => setSelectedCategory(item)}
      activeOpacity={0.8}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[styles.categoryTitle, { color: theme.text }]}>{item.title}</Text>
      <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>{item.articles.length} articles</Text>
      <View style={[styles.categoryAccent, { backgroundColor: item.color }]} />
    </TouchableOpacity>
  );

  const renderArticleList = () => {
    if (!selectedCategory) return null;

    const filteredArticles =
      filterLanguage === 'all'
        ? selectedCategory.articles
        : selectedCategory.articles.filter((a) => a.language === filterLanguage);

    return (
      <View style={styles.articleListContainer}>
        <View style={styles.articleHeader}>
          <TouchableOpacity onPress={() => setSelectedCategory(null)}>
            <Ionicons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.articleHeaderTitle, { color: theme.text }]}>{selectedCategory.title}</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Language Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          <View style={styles.filterContainer}>
            {['all', 'Kadazandusun', 'Iban', 'Bajau', 'Murut'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                    styles.filterBtn, 
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    filterLanguage === lang && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setFilterLanguage(lang)}
              >
                <Text style={[
                    styles.filterText, 
                    { color: theme.textSecondary },
                    filterLanguage === lang && { color: theme.onPrimary || '#FFFFFF' }
                ]}>
                  {lang === 'all' ? 'All' : lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.articlesContent}>
          {filteredArticles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={[styles.articleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setSelectedArticle(article)}
            >
              <Text style={[styles.articleTitle, { color: theme.text }]}>{article.title}</Text>
              <Text style={[styles.articleLanguage, { color: theme.primary }]}>{article.language}</Text>
              <Text style={[styles.articlePreview, { color: theme.textSecondary }]} numberOfLines={3}>
                {article.content}
              </Text>
              <View style={styles.tagsContainer}>
                {article.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.tagText, { color: theme.primary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderArticleDetail = () => {
    if (!selectedArticle) return null;

    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedArticle(null)}>
            <Ionicons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity>
            <Ionicons name="bookmark-outline" size={28} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: SPACING.m }}>
            <Ionicons name="share-outline" size={28} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
          <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedArticle.title}</Text>
          <Text style={[styles.detailLanguage, { color: theme.primary }]}>{selectedArticle.language}</Text>

          <View style={styles.detailTagsContainer}>
            {selectedArticle.tags.map((tag, index) => (
              <View key={index} style={[styles.detailTag, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.detailTagText, { color: theme.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.detailText, { color: theme.text }]}>{selectedArticle.content}</Text>

          <View style={[styles.contributionNote, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
            <Text style={[styles.contributionNoteText, { color: theme.textSecondary }]}>
              This knowledge is preserved through oral tradition and community contributions.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  if (selectedArticle) {
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>{renderArticleDetail()}</SafeAreaView>;
  }

  if (selectedCategory) {
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>{renderArticleList()}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Cultural Knowledge</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: theme.primary + '20' }]}>
        <MaterialCommunityIcons name="library" size={24} color={theme.primary} />
        <Text style={[styles.infoBannerText, { color: theme.text }]}>
          Preserving indigenous knowledge and cultural heritage of Borneo
        </Text>
      </View>

      {/* Categories Grid */}
      <FlatList
        data={KNOWLEDGE_CATEGORIES}
        renderItem={renderCategoryCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      />
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
    marginBottom: SPACING.m,
    borderRadius: 12,
    gap: SPACING.s,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  gridContent: {
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.m,
    margin: SPACING.s,
    minHeight: 140,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.small,
  },
  categoryIcon: {
    fontSize: 36,
    marginBottom: SPACING.s,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  categoryCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoryAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  articleListContainer: {
    flex: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  articleHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  filterScrollView: {
    maxHeight: 60,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    gap: SPACING.s,
  },
  filterBtn: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.surface,
  },
  articlesContent: {
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  articleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.small,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  articleLanguage: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.s,
  },
  articlePreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.s,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  detailContent: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.l,
    paddingBottom: SPACING.xxl,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  detailLanguage: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.m,
  },
  detailTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.l,
  },
  detailTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
  },
  detailTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  detailText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.l,
  },
  contributionNote: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: SPACING.m,
    borderRadius: 12,
    gap: SPACING.s,
  },
  contributionNoteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
});
