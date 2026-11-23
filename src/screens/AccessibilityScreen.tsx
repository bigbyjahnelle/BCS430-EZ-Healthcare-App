import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageBackground from '../components/PageBackground';

// Colors (taken from the EZ logo)
const BLUE = '#0B5394';
const GREEN = '#00906F';
const GOLD = '#B98A00';
const INK = '#0B2236';
const BORDER = '#A9C2D6';
const CARD_GRADIENT = ['#FFFFFF', '#F3F7F4'] as const;

// true = serif text like the design picture, false = normal app font
const USE_SERIF = true;
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const FONT = USE_SERIF ? SERIF : undefined;

// Same size as the Home screen corner buttons
const CORNER_CIRCLE = 72;

// Smallest height each card row can shrink to (the cards stretch bigger on tall phones)
const GRID_ROW_MIN = 222;
const LIST_ROW_MIN = 84;

type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'blue' | 'green' | 'yellow';

const TONES: Record<Tone, { fg: string; tint: string }> = {
  blue: { fg: BLUE, tint: '#DCEAF5' },
  green: { fg: GREEN, tint: '#D9F0E8' },
  yellow: { fg: GOLD, tint: '#FBF1C4' },
};

type Category = {
  key: string;
  title: string;
  description: string;
  icon: IconName;
  tone: Tone;
};

const CATEGORIES: Category[] = [
  {
    key: 'vision',
    title: 'Vision & Display',
    description: 'Text size, contrast, and colors',
    icon: 'eye-outline',
    tone: 'blue',
  },
  {
    key: 'hearing',
    title: 'Hearing & Alerts',
    description: 'Captions, sound, and notifications',
    icon: 'notifications-outline',
    tone: 'green',
  },
  {
    key: 'touch',
    title: 'Touch & Mobility',
    description: 'Controls, timing, and movement',
    icon: 'hand-left-outline',
    tone: 'yellow',
  },
  {
    key: 'reading',
    title: 'Reading & Understanding',
    description: 'Language, prompts, and guidance',
    icon: 'book-outline',
    tone: 'blue',
  },
  {
    key: 'voice',
    title: 'Voice & Communication',
    description: 'Speech, typing, and conversation',
    icon: 'mic-outline',
    tone: 'green',
  },
  {
    key: 'focus',
    title: 'Focus & Sensory',
    description: 'Motion, distractions, and comfort',
    icon: 'accessibility-outline',
    tone: 'yellow',
  },
];

// Splits the six categories into three rows of two
const ROWS: Category[][] = [
  CATEGORIES.slice(0, 2),
  CATEGORIES.slice(2, 4),
  CATEGORIES.slice(4, 6),
];

// Big round corner button with its label underneath (same as Home)
function CornerButton({
  label,
  icon,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
      <Pressable
          style={styles.cornerButton}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={onPress}
      >
        <LinearGradient colors={CARD_GRADIENT} style={styles.cornerCircle}>
          <Ionicons
              name={icon}
              size={36}
              color={BLUE}
              accessible={false}
          />
        </LinearGradient>
        <Text style={styles.cornerLabel}>{label}</Text>
      </Pressable>
  );
}

export default function AccessibilityScreen() {
  const router = useRouter();
  const [isGridLayout, setIsGridLayout] = useState(true);

  const openCategory = (category: Category) => {
    // Voice & Communication opens its own settings page instead of the general category page - RD
    if (category.key === 'voice') {
      router.push('/voice-settings');
      return;
    }
    router.push({
      pathname: '/accessibility/[category]',
      params: {
        category: category.key,
        title: category.title,
        description: category.description,
        icon: category.icon,
      },
    });
  };

  return (
      <PageBackground>
        <SafeAreaView style={styles.screen}>
          <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
          >

            {/* Top row: back button + title + layout toggle */}
            <View style={styles.topRow}>
              <CornerButton
                  label="Back"
                  icon="arrow-back-outline"
                  accessibilityLabel="Back to Home"
                  onPress={() => router.back()}
              />

              <Text
                  style={styles.topRowTitle}
                  accessibilityRole="header"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
              >
                Accessibility
              </Text>

              <CornerButton
                  label="Layout"
                  icon={isGridLayout ? 'grid-outline' : 'list-outline'}
                  accessibilityLabel="Toggle layout"
                  onPress={() => setIsGridLayout((prev) => !prev)}
              />
            </View>

            {isGridLayout ? (
                <View style={styles.grid}>
                  {ROWS.map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.gridRow}>
                        {row.map((category) => {
                          const tone = TONES[category.tone];
                          return (
                              <Pressable
                                  key={category.key}
                                  style={styles.gridCardShadow}
                                  accessibilityRole="button"
                                  accessibilityLabel={category.title}
                                  onPress={() => openCategory(category)}
                              >
                                <LinearGradient colors={CARD_GRADIENT} style={styles.gridCard}>
                                  <View style={[styles.gridCardIconCircle, { backgroundColor: tone.tint }]}>
                                    <Ionicons
                                        name={category.icon}
                                        size={40}
                                        color={tone.fg}
                                        accessible={false}
                                    />
                                  </View>

                                  <Text style={styles.gridCardTitle}>{category.title}</Text>

                                  <Text style={styles.gridCardDescription}>
                                    {category.description}
                                  </Text>

                                  <View style={styles.gridChevron}>
                                    <Ionicons
                                        name="chevron-forward-outline"
                                        size={22}
                                        color={INK}
                                        accessible={false}
                                    />
                                  </View>
                                </LinearGradient>
                              </Pressable>
                          );
                        })}
                      </View>
                  ))}
                </View>
            ) : (
                <View style={styles.list}>
                  {CATEGORIES.map((category) => {
                    const tone = TONES[category.tone];
                    return (
                        <Pressable
                            key={category.key}
                            style={styles.cardShadow}
                            accessibilityRole="button"
                            accessibilityLabel={category.title}
                            onPress={() => openCategory(category)}
                        >
                          <LinearGradient colors={CARD_GRADIENT} style={styles.card}>
                            <View style={[styles.cardIconCircle, { backgroundColor: tone.tint }]}>
                              <Ionicons
                                  name={category.icon}
                                  size={32}
                                  color={tone.fg}
                                  accessible={false}
                              />
                            </View>

                            <View style={styles.cardTextBlock}>
                              <Text style={styles.cardTitle}>{category.title}</Text>

                              <Text style={styles.cardDescription}>
                                {category.description}
                              </Text>
                            </View>

                            <Ionicons
                                name="chevron-forward-outline"
                                size={24}
                                color={INK}
                                accessible={false}
                            />
                          </LinearGradient>
                        </Pressable>
                    );
                  })}
                </View>
            )}

          </ScrollView>
        </SafeAreaView>
      </PageBackground>
  );
}

const shadow = {
  elevation: 3,
  shadowColor: '#0B2236',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingTop: 5,
    paddingBottom: 12,
    paddingLeft: 20,
    paddingRight: 20,
    gap: 18,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },

  // Corner buttons (same as Home)
  cornerButton: {
    minWidth: 80,
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },

  cornerCircle: {
    width: CORNER_CIRCLE,
    height: CORNER_CIRCLE,
    borderRadius: CORNER_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#C9D6DD',
    ...shadow,
  },

  cornerLabel: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: INK,
  },

  topRowTitle: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 30,
    fontWeight: '800',
    color: '#0B2236',
    textAlign: 'center',
  },

  // Grid layout styles (stretches to fill the screen)
  grid: {
    flex: 1,
    gap: 14,
  },

  gridRow: {
    flex: 1,
    minHeight: GRID_ROW_MIN,
    flexDirection: 'row',
    gap: 14,
  },

  gridCardShadow: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#F7F8F3',
    ...shadow,
  },

  gridCard: {
    flex: 1,
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  gridCardIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gridCardTitle: {
    fontFamily: FONT,
    fontSize: 19,
    fontWeight: '700',
    color: '#0B2236',
    textAlign: 'center',
  },

  gridCardDescription: {
    fontFamily: FONT,
    fontSize: 15,
    color: '#44525A',
    textAlign: 'center',
  },

  gridChevron: {
    position: 'absolute',
    right: 8,
    top: 46,
  },

  // Horizontal stacked layout styles (compact so all six fit)
  list: {
    flex: 1,
    gap: 14,
  },

  cardShadow: {
    flex: 1,
    minHeight: LIST_ROW_MIN,
    borderRadius: 24,
    backgroundColor: '#F7F8F3',
    ...shadow,
  },

  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  cardIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTextBlock: {
    flex: 1,
    gap: 2,
  },

  cardTitle: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '700',
    color: '#0B2236',
    textAlign: 'left',
  },

  cardDescription: {
    fontFamily: FONT,
    fontSize: 16,
    color: '#44525A',
    textAlign: 'left',
  },
});