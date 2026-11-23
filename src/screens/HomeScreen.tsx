import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { ComponentProps, ComponentRef } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import PageBackground from '../components/PageBackground';
import { modeLabel, useDataMode } from '../services/dataMode';
import { logout } from '../services/logout';

// ---------- Colors (taken from the EZ logo) ----------
const BLUE = '#0B5394';
const GREEN = '#00906F';
const YELLOW = '#EFD93A';
const GOLD = '#B98A00';
const INK = '#0B2236';
const BORDER = '#A9C2D6';

// Gradients (top color first)
const CARD_GRADIENT = ['#FFFFFF', '#F3F7F4'] as const;
const SPHERE_GRADIENT = ['#5FBDEB', '#2F86C6', '#0B5394', '#073A6E'] as const;
const RING_GRADIENT = [BLUE, GREEN, YELLOW] as const; // the ring around the logo

// ---------- Fonts ----------
// true  = serif headings like the design picture
// false = normal app font
const USE_SERIF = true;
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const FONT = USE_SERIF ? SERIF : undefined;

// ---------- Sizes ----------
const CORNER_CIRCLE = 72;
const LOGO_SIZE = 120;
const TOP_BAR_HEIGHT = 112;
const BOTTOM_BAR_HEIGHT = 150; // dark wave at the bottom
const ICON_CIRCLE = 76;
const ICON_SIZE = 44;

// How long "Keep Scrolling" takes to fade out / back in (milliseconds)
const FADE_MS = 700;

// true  = Profile / Log Out stay at the top while you scroll
// false = they scroll away with the page (Settings / Help always stay at the bottom)
const STICKY_TOP_BUTTONS = true;

type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'blue' | 'green' | 'yellow';

const TONES: Record<Tone, { fg: string; tint: string }> = {
  blue: { fg: BLUE, tint: '#DCEAF5' },
  green: { fg: GREEN, tint: '#D9F0E8' },
  yellow: { fg: GOLD, tint: '#FBF1C4' },
};

type Service = {
  title: string;
  icon: IconName;
  tone: Tone;
  route?:
      | '/medications'
      | '/appointments'
      | '/my-providers'
      | '/my-health'
      | '/test-results'
      | '/reminders'
      | '/insurance'
      | '/messages'
      | '/share';
};

const MAIN_SERVICES: Service[] = [
  { title: 'Medications', icon: 'medkit-outline', tone: 'blue', route: '/medications' },
  { title: 'Appointments', icon: 'calendar-outline', tone: 'green', route: '/appointments' },
  { title: 'Messages', icon: 'mail-outline', tone: 'yellow', route: '/messages' },
  { title: 'Test Results', icon: 'document-text-outline', tone: 'blue', route: '/test-results' },
];

const MORE_SERVICES: Service[] = [
  { title: 'Insurance', icon: 'shield-checkmark-outline', tone: 'blue', route: '/insurance' },
  { title: 'Share', icon: 'share-social-outline', tone: 'yellow', route: '/share' },
  { title: 'My Providers', icon: 'location-outline', tone: 'green', route: '/my-providers' },
  { title: 'Reminders', icon: 'alarm-outline', tone: 'blue', route: '/reminders' },
];

function showMessage(feature: string) {
  Alert.alert(feature, 'This feature is not connected yet.');
}

// Dark wave behind Settings / Keep Scrolling / Help
function BottomWave() {
  return (
      <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 390 160"
          preserveAspectRatio="none"
          pointerEvents="none"
      >
        <Defs>
          <SvgGradient id="waveB" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0B4A8A" />
            <Stop offset="0.6" stopColor="#0A6E7E" />
            <Stop offset="1" stopColor={GREEN} />
          </SvgGradient>
        </Defs>
        <Path
            d="M0 64 C60 30 130 22 200 58 C270 94 330 74 390 34 V160 H0 Z"
            fill="url(#waveB)"
        />
        <Path
            d="M0 56 C60 22 130 14 200 50 C270 86 330 66 390 26"
            fill="none"
            stroke={YELLOW}
            strokeWidth={1.6}
            opacity={0.9}
        />
      </Svg>
  );
}

// Big round corner button with its label underneath
function CornerButton({
                        label,
                        icon,
                        onPress,
                        light = false,
                      }: {
  label: string;
  icon: IconName;
  onPress: () => void;
  light?: boolean;
}) {
  return (
      <Pressable
          style={styles.cornerButton}
          accessibilityRole="button"
          accessibilityLabel={label}
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
        <Text style={[styles.cornerLabel, light && styles.cornerLabelLight]}>{label}</Text>
      </Pressable>
  );
}

export default function HomeScreen() {
  const mode = useDataMode();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewHeight = useRef(0);
  const [viewH, setViewH] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  // "Keep Scrolling" fades out at the bottom and fades back in when you scroll up
  const hintOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fade = Animated.timing(hintOpacity, {
      toValue: atEnd ? 0 : 1,
      duration: FADE_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    fade.start();
    return () => fade.stop();
  }, [atEnd, hintOpacity]);

  // The first screen is one full screen tall, so "More Services" starts below the fold
  const topSpace = STICKY_TOP_BUTTONS ? insets.top + TOP_BAR_HEIGHT + 20 : insets.top + 8;
  const firstScreenHeight = Math.max(0, viewH - topSpace);
  const bottomBarTotal = BOTTOM_BAR_HEIGHT + insets.bottom;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setScrolled(contentOffset.y > 20);
    setAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height - 40);
  };

  const openService = (service: Service) => {
    if (service.route) {
      router.push(service.route);
    } else {
      showMessage(service.title);
    }
  };

  const renderServices = (services: Service[]) => (
      <View style={styles.grid}>
        {services.map((service) => {
          const tone = TONES[service.tone];
          return (
              <Pressable
                  key={service.title}
                  style={[styles.cardShadow, styles.gridItem]}
                  accessibilityRole="button"
                  accessibilityLabel={service.title}
                  onPress={() => openService(service)}
              >
                <LinearGradient colors={CARD_GRADIENT} style={styles.gridCard}>
                  <View style={[styles.iconCircle, { backgroundColor: tone.tint }]}>
                    <Ionicons
                        name={service.icon}
                        size={ICON_SIZE}
                        color={tone.fg}
                        accessible={false}
                    />
                  </View>

                  <Text style={styles.cardTitle}>{service.title}</Text>
                  <View style={[styles.cardLine, { backgroundColor: tone.fg }]} />

                  <View style={styles.chevron}>
                    <Ionicons
                        name="chevron-forward-outline"
                        size={24}
                        color={INK}
                        accessible={false}
                    />
                  </View>
                </LinearGradient>
              </Pressable>
          );
        })}
      </View>
  );

  const topRow = (
      <View style={styles.topRow}>
        <View style={styles.topCorner}>
          <CornerButton
              label="Profile"
              icon="person-outline"
              onPress={() => router.push('/profile')}
          />
        </View>

        <Image
            source={require('../../assets/images/ez-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="EZ Healthcare"
        />

        <View style={styles.topCorner}>
          <CornerButton
              label="Log Out"
              icon="log-out-outline"
              onPress={async () => {
                try {
                  await logout();
                } catch {
                  Alert.alert('Could not log out', 'Please try again.');
                }
              }}
          />
        </View>
      </View>
  );

  return (
      <PageBackground>
        <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: topSpace,
                paddingBottom: bottomBarTotal + 8,
              },
            ]}
            scrollEventThrottle={15}
            decelerationRate="normal"
            overScrollMode="never"
            onScroll={handleScroll}
            onLayout={(e) => {
              viewHeight.current = e.nativeEvent.layout.height;
              setViewH(e.nativeEvent.layout.height);
            }}
            onContentSizeChange={(_w, h) => {
              if (viewHeight.current > 0) {
                setAtEnd(h <= viewHeight.current + 40);
              }
            }}
        >
          {/* First screen */}
          <View style={[styles.firstScreen, { minHeight: Math.max(0, firstScreenHeight - 150) }]}>
            {!STICKY_TOP_BUTTONS ? topRow : null}

            {/* Ask EZ */}
            <Pressable
                style={styles.cardShadow}
                accessibilityRole="button"
                accessibilityLabel="Ask EZ. Tap to speak."
                onPress={() => showMessage('Ask EZ')}
            >
              <LinearGradient colors={CARD_GRADIENT} style={styles.askCard}>
                <Text style={styles.heading}>
                  ASK <Text style={styles.greenText}>EZ</Text>
                </Text>
                <View style={styles.goldLine} />
                <Text style={styles.speakText}>Tap to Speak</Text>

                {/* ASK EZ Sphere with the logo ring around it */}
                <LinearGradient
                    colors={RING_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sphereRing}
                >
                  <View style={styles.sphereWhite}>
                    <LinearGradient
                        colors={SPHERE_GRADIENT}
                        locations={[0, 0.34, 0.62, 1]}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.voiceCircle}
                    >
                      <Svg
                          style={StyleSheet.absoluteFill}
                          viewBox="0 0 76 76"
                          pointerEvents="none"
                      >
                        <Defs>
                          <RadialGradient id="spot" cx="0.5" cy="0.5" r="0.5">
                            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
                            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.3" />
                            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                          </RadialGradient>
                        </Defs>
                        <Ellipse
                            cx="18"
                            cy="18"
                            rx="14"
                            ry="7"
                            fill="url(#spot)"
                            transform="rotate(-45 18 18)"
                        />
                      </Svg>

                      <Ionicons
                          name="mic-outline"
                          size={40}
                          color="#FFFFFF"
                          accessible={false}
                      />
                    </LinearGradient>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </Pressable>

            {/* Sample Data / API mode (opens the Welcome screen) */}
            <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/welcome')}
                style={styles.modeLink}
            >
              <Text style={styles.modeLinkText}>{modeLabel(mode)} · Change</Text>
            </Pressable>

            {/* Main services */}
            {mode === 'api' ? <Pressable accessibilityRole="button" onPress={() => router.push('/connect-epic')}
                                         style={{ minHeight: 56, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14 }}>
              <Text style={{ color: BLUE, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>Connect / Manage Epic</Text>
            </Pressable> : null}
            {renderServices(MAIN_SERVICES)}


          </View>

          {/* More services */}
          <View style={styles.sectionHeader}>
            <LinearGradient
                colors={RING_GRADIENT}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.sectionDash}
            />
            <Text style={styles.sectionTitle} accessibilityRole="header">
              <Text style={styles.sectionBlue}>More </Text>
              <Text style={styles.greenText}>Services</Text>
            </Text>
          </View>

          {renderServices(MORE_SERVICES)}
        </ScrollView>

        {/* Top bar (stays in place) */}
        {STICKY_TOP_BUTTONS ? (
            <View
                style={[
                  styles.topBar,
                  {
                    paddingTop: insets.top,
                    backgroundColor: scrolled ? '#FBF9F2' : 'transparent',
                    borderBottomWidth: scrolled ? 1 : 0,
                  },
                ]}
            >
              {topRow}
            </View>
        ) : null}

        {/* Bottom bar (always stays in place) */}
        <View style={[styles.bottomBar, { height: bottomBarTotal }]} pointerEvents="box-none">
          <BottomWave />

          <View style={[styles.bottomRow, { height: 118 + insets.bottom, paddingBottom: insets.bottom }]}>
            <CornerButton
                label="Settings"
                icon="settings-outline"
                light
                onPress={() => router.push('/accessibility')}
            />

            {/* Keep Scrolling: always here, just fades out at the bottom and back in */}
            <Animated.View
                style={[styles.scrollHint, { opacity: hintOpacity }]}
                pointerEvents={atEnd ? 'none' : 'auto'}
            >
              <Pressable
                  style={styles.scrollHintPress}
                  accessibilityRole="button"
                  accessibilityLabel="Keep scrolling. Tap to scroll down."
                  accessibilityElementsHidden={atEnd}
                  importantForAccessibility={atEnd ? 'no-hide-descendants' : 'auto'}
                  onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
              >
                <View style={styles.chevrons}>
                  <Ionicons
                      name="chevron-down"
                      size={30}
                      color="#FFFFFF"
                      accessible={false}
                  />
                  <View style={styles.secondChevron}>
                    <Ionicons
                        name="chevron-down"
                        size={30}
                        color="#FFFFFF"
                        accessible={false}
                    />
                  </View>
                </View>
                <Text style={styles.scrollText}>Keep Scrolling</Text>
              </Pressable>
            </Animated.View>

            <CornerButton
                label="Help"
                icon="help-circle-outline"
                light
                onPress={() => router.push('/help')}
            />
          </View>
        </View>
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
  content: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    gap: 18,
  },

  firstScreen: {
    gap: 18,
  },

  // Top and bottom bars
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomColor: '#FBF9F2',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },

  topRow: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    height: TOP_BAR_HEIGHT,
    paddingHorizontal: 20,
    paddingBottom: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topCorner: {
    top: 16,
  },

  bottomRow: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginTop: 15,
  },

  // Corner buttons
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

  cornerLabelLight: {
    color: '#FFFFFF',
  },

  // Keep Scrolling hint
  scrollHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollHintPress: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  chevrons: {
    height: 40,
    alignItems: 'center',
  },

  secondChevron: {
    marginTop: -16,
  },

  scrollText: {
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Cards
  cardShadow: {
    borderRadius: 24,
    backgroundColor: '#F7F8F3',
    ...shadow,
  },

  askCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  heading: {
    fontFamily: FONT,
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    color: INK,
  },

  greenText: {
    color: GREEN,
  },

  goldLine: {
    width: 44,
    height: 2,
    borderRadius: 1,
    backgroundColor: YELLOW,
  },

  speakText: {
    fontFamily: FONT,
    fontSize: 20,
    textAlign: 'center',
    color: INK,
  },

  // Sphere with the logo ring
  sphereRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: BLUE,
    elevation: 6,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },

  sphereWhite: {
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  voiceCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // Sample Data / API mode link
  modeLink: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  modeLinkText: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
    color: BLUE,
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  gridItem: {
    flexBasis: '47%',
    flexGrow: 1,
  },

  gridCard: {
    flex: 1,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
  },

  cardLine: {
    width: 30,
    height: 3,
    borderRadius: 2,
  },

  chevron: {
    position: 'absolute',
    right: 8,
    top: 36,
  },

  // "More Services" heading
  sectionHeader: {
    gap: 8,
    marginTop: 14,
  },

  sectionDash: {
    width: 64,
    height: 5,
    borderRadius: 3,
  },

  sectionTitle: {
    fontFamily: FONT,
    fontSize: 32,
    fontWeight: '800',
  },

  sectionBlue: {
    color: BLUE,
  },
});