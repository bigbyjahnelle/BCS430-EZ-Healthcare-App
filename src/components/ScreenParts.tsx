import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

// Shared look for the inner pages (same colors, fonts and buttons as Home)

// Colors (taken from the EZ logo)
export const BLUE = '#0B5394';
export const GREEN = '#00906F';
export const GOLD = '#B98A00';
export const INK = '#0B2236';
export const BORDER = '#A9C2D6';
export const CARD_GRADIENT = ['#FFFFFF', '#F3F7F4'] as const;

// true = serif text like the design picture, false = normal app font
const USE_SERIF = true;
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
export const FONT = USE_SERIF ? SERIF : undefined;

// Same size as the Home screen corner buttons
const CORNER_CIRCLE = 72;

// Space to keep clear at the bottom so the floating Settings gear never covers content
export const GEAR_CLEARANCE = 110;

export const shadow = {
  elevation: 3,
  shadowColor: INK,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
} as const;

// Top row: big Back button on the left + page title centered on the button circle
export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
      <View style={styles.topRow}>
        <Pressable
            style={styles.cornerButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
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

        <View style={styles.titleWrap}>
          <Text
              style={styles.topRowTitle}
              accessibilityRole="header"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
          >
            {title}
          </Text>
        </View>

        <View style={styles.cornerSpacer} />
      </View>
  );
}

// White gradient card with the light blue border
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
      <View style={styles.cardShadow}>
        <LinearGradient colors={CARD_GRADIENT} style={[styles.card, style]}>
          {children}
        </LinearGradient>
      </View>
  );
}

// Big solid blue button
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
      <Pressable
          style={({ pressed }) => [
            styles.button,
            (pressed || disabled) && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
      >
        <Text style={styles.buttonText}>{label}</Text>
      </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
  },

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

  cornerSpacer: {
    minWidth: 80,
  },

  // Same height as the circle (+ its 4px padding) so the title lines up with the circle's center
  titleWrap: {
    flex: 1,
    height: CORNER_CIRCLE + 8,
    justifyContent: 'center',
  },

  topRowTitle: {
    fontFamily: FONT,
    fontSize: 30,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
  },

  cardShadow: {
    borderRadius: 24,
    backgroundColor: '#F7F8F3',
    ...shadow,
  },

  card: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  button: {
    minHeight: 60,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: BLUE,
    ...shadow,
    shadowOpacity: 0.3,
    elevation: 6,
  },

  buttonText: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});