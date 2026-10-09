import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Category = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORIES: Category[] = [
  {
    key: 'vision',
    title: 'Vision & Display',
    description: 'Text size, contrast, and colors',
    icon: 'eye-outline',
  },
  {
    key: 'hearing',
    title: 'Hearing & Alerts',
    description: 'Captions, sound, and notifications',
    icon: 'notifications-outline',
  },
  {
    key: 'touch',
    title: 'Touch & Mobility',
    description: 'Controls, timing, and movement',
    icon: 'hand-left-outline',
  },
  {
    key: 'reading',
    title: 'Reading & Understanding',
    description: 'Language, prompts, and guidance',
    icon: 'book-outline',
  },
  {
    key: 'voice',
    title: 'Voice & Communication',
    description: 'Speech, typing, and conversation',
    icon: 'mic-outline',
  },
  {
    key: 'focus',
    title: 'Focus & Sensory',
    description: 'Motion, distractions, and comfort',
    icon: 'accessibility-outline',
  },
];

export default function AccessibilityScreen() {
  const router = useRouter();
  const [isGridLayout, setIsGridLayout] = useState(true);

  return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>

          {/* Top row: back button + title + layout toggle, same line */}
          <View style={styles.topRow}>
            <Pressable
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Back to Home"
                onPress={() => router.back()}
            >
              <Ionicons
                  name="arrow-back-outline"
                  size={24}
                  color="#17618E"
                  accessible={false}
              />
            </Pressable>

            <Text style={styles.topRowTitle}>Accessibility</Text>

            <Pressable
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Toggle layout"
                onPress={() => setIsGridLayout((prev) => !prev)}
            >
              <Ionicons
                  name={isGridLayout ? 'grid-outline' : 'list-outline'}
                  size={22}
                  color="#17618E"
                  accessible={false}
              />
            </Pressable>
          </View>

          {/* Brand + subtitle, centered below */}
          <View style={styles.header}>
            <Text style={styles.brand}>EZ HEALTHCARE</Text>

            <Text style={styles.subtitle}>Choose a category to adjust</Text>
          </View>

          {isGridLayout ? (
              <View style={styles.grid}>
                {CATEGORIES.map((category) => (
                    <Pressable
                        key={category.key}
                        style={styles.gridCard}
                        accessibilityRole="button"
                        accessibilityLabel={category.title}
                        onPress={() => router.push({
                          pathname: '/accessibility/[category]',
                          params: {
                            category: category.key,
                            title: category.title,
                            description: category.description,
                            icon: category.icon,
                          },
                        })}
                    >
                      <View style={styles.gridCardIconCircle}>
                        <Ionicons
                            name={category.icon}
                            size={40}
                            color="#17618E"
                            accessible={false}
                        />
                      </View>

                      <Text style={styles.gridCardTitle}>{category.title}</Text>

                      <Text style={styles.gridCardDescription}>
                        {category.description}
                      </Text>
                    </Pressable>
                ))}
              </View>
          ) : (
              <View style={styles.list}>
                {CATEGORIES.map((category) => (
                    <Pressable
                        key={category.key}
                        style={styles.card}
                        accessibilityRole="button"
                        accessibilityLabel={category.title}
                        onPress={() => router.push({
                          pathname: '/accessibility/[category]',
                          params: {
                            category: category.key,
                            title: category.title,
                            description: category.description,
                            icon: category.icon,
                          },
                        })}
                    >
                      <View style={styles.cardIconCircle}>
                        <Ionicons
                            name={category.icon}
                            size={40}
                            color="#17618E"
                            accessible={false}
                        />
                      </View>

                      <View style={styles.cardTextBlock}>
                        <Text style={styles.cardTitle}>{category.title}</Text>

                        <Text style={styles.cardDescription}>
                          {category.description}
                        </Text>
                      </View>
                    </Pressable>
                ))}
              </View>
          )}

        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F3',
  },

  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingTop: 5,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
    gap: 18,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 0,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },

  topRowTitle: {
    flex: 1,
    fontSize: 34,
    fontWeight: '800',
    color: '#0B2236',
    textAlign: 'center',
  },

  header: {
    alignItems: 'center',
    gap: 4,
  },

  brand: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: '#008060',
    textAlign: 'center',
    marginTop: -5,
  },

  subtitle: {
    fontSize: 18,
    color: '#44525A',
    textAlign: 'center',
  },

  // Grid layout styles
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  gridCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    elevation: 3,
    shadowColor: '#0B2236',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },

  gridCardIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },

  gridCardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0B2236',
    textAlign: 'center',
  },

  gridCardDescription: {
    fontSize: 15,
    color: '#44525A',
    textAlign: 'center',
  },

  // Horizontal stacked layout styles
  list: {
    gap: 14,
  },

  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    elevation: 3,
    shadowColor: '#0B2236',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },

  cardIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },

  cardTextBlock: {
    flex: 1,
    gap: 4,
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0B2236',
    textAlign: 'left',
  },

  cardDescription: {
    fontSize: 19,
    color: '#44525A',
    textAlign: 'left',
  },
});