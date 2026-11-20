import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageBackground from '../components/PageBackground';

// Colors (taken from the EZ logo)
const BLUE = '#0B5394';
const INK = '#0B2236';
const BORDER = '#A9C2D6';
const CARD_GRADIENT = ['#FFFFFF', '#F3F7F4'] as const;

// true = serif text like the design picture, false = normal app font
const USE_SERIF = true;
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const FONT = USE_SERIF ? SERIF : undefined;

// Same size as the Home screen corner buttons
const CORNER_CIRCLE = 72;

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function AccessibilityCategoryScreen() {
  const router = useRouter();
  const { title, description, icon } = useLocalSearchParams<{
    title: string;
    description: string;
    icon: string;
  }>();

  return (
      <PageBackground>
        <SafeAreaView style={styles.screen}>
          <View style={styles.content}>

            <Pressable
                style={styles.cornerButton}
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => router.back()}
            >
              <LinearGradient colors={CARD_GRADIENT} style={styles.cornerCircle}>
                <Ionicons
                    name="arrow-back-outline"
                    size={36}
                    color={BLUE}
                    accessible={false}
                />
              </LinearGradient>
              <Text style={styles.cornerLabel}>Back</Text>
            </Pressable>

            <View style={styles.body}>
              <View style={styles.iconCircle}>
                <Ionicons
                    name={(icon || 'accessibility-outline') as IconName}
                    size={44}
                    color={BLUE}
                    accessible={false}
                />
              </View>

              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>

              <Text style={styles.subtitle}>{description}</Text>

              <LinearGradient colors={CARD_GRADIENT} style={styles.placeholder}>
                <Text style={styles.placeholderText}>
                  This feature is not connected yet.
                </Text>
              </LinearGradient>
            </View>

          </View>
        </SafeAreaView>
      </PageBackground>
  );
}

const shadow = {
  elevation: 3,
  shadowColor: INK,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingTop: 5,
    paddingHorizontal: 20,
    gap: 24,
  },

  // Corner button (same as Home)
  cornerButton: {
    alignSelf: 'flex-start',
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

  body: {
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCEAF5',
    marginBottom: 8,
  },

  title: {
    fontFamily: FONT,
    fontSize: 25,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
  },

  subtitle: {
    fontFamily: FONT,
    fontSize: 16,
    color: '#44525A',
    textAlign: 'center',
  },

  placeholder: {
    marginTop: 24,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  placeholderText: {
    fontFamily: FONT,
    fontSize: 16,
    color: '#44525A',
    textAlign: 'center',
  },
});