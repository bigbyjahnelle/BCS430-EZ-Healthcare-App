import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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

  return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>

          {/* Header */}
          <View style={styles.header}>
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

                        <Text style={styles.title}>Accessibility & Personalization</Text>

                        <Text style={styles.subtitle}>Choose a category to adjust</Text>

            <Image
                source={require('../../assets/images/ez-logo.png')}
                style={styles.logo}
                resizeMode="contain"
                accessible={true}
                accessibilityLabel="EZ Healthcare"
            />

            <Text style={styles.brand}>EZ HEALTHCARE</Text>


          </View>

          {/* Category grid */}
          <View style={styles.grid}>
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
                        size={26}
                        color="#17618E"
                        accessible={false}
                    />
                  </View>

                  <Text style={styles.cardTitle}>{category.title}</Text>

                  <Text style={styles.cardDescription}>
                    {category.description}
                  </Text>
                </Pressable>
            ))}
          </View>

        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F3',
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    padding: 16,
    gap: 10,
  },

  header: {
    alignItems: 'center',
    gap: 3,
  },

  backButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    marginBottom: 4,
  },

  logo: {
    width: 160,
    height: 160,
  },

  brand: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#008060',
    textAlign: 'center',
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0B2236',
    textAlign: 'center',
    marginTop: 2,
  },

  subtitle: {
    fontSize: 15,
    color: '#44525A',
    textAlign: 'center',
  },

  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  card: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    elevation: 3,
    shadowColor: '#0B2236',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    minHeight: 170,
  },

  cardIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B2236',
    textAlign: 'center',
  },

  cardDescription: {
    fontSize: 12,
    color: '#44525A',
    textAlign: 'center',
  },
});