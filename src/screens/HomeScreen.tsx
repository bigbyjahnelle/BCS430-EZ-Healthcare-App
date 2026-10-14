import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE = '#17618E';
const GREEN = '#008060';

// Sizes
const CORNER_CIRCLE = 72;
const LOGO_SIZE = 120;
const TOP_BAR_HEIGHT = 124;
const BOTTOM_BAR_HEIGHT = 112;

// true  = Profile / Log Out stay at the top while you scroll
// false = they scroll away with the page (Settings / Help always stay at the bottom)
const STICKY_TOP_BUTTONS = true;

type IconName = keyof typeof Ionicons.glyphMap;

type Service = {
  title: string;
  icon: IconName;
  route?: '/medications';
};

const MAIN_SERVICES: Service[] = [
  { title: 'Medications', icon: 'medkit-outline', route: '/medications' },
  { title: 'Appointments', icon: 'calendar-outline' },
  { title: 'Messages', icon: 'mail-outline' },
  { title: 'Test Results', icon: 'document-text-outline' },
];

const MORE_SERVICES: Service[] = [
  { title: 'My Health', icon: 'heart-outline' },
  { title: 'Insurance', icon: 'shield-checkmark-outline' },
  { title: 'Share', icon: 'share-social-outline' },
  { title: 'Find Care', icon: 'location-outline' },
];

function showMessage(feature: string) {
  Alert.alert(feature, 'This feature is not connected yet.');
}

// Big round corner button with its label underneath
function CornerButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
      <Pressable
          style={styles.cornerButton}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
      >
        <View style={styles.cornerCircle}>
          <Ionicons
              name={icon}
              size={34}
              color={BLUE}
              accessible={false}
          />
        </View>
        <Text style={styles.cornerLabel}>{label}</Text>
      </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const viewHeight = useRef(0);
  const [viewH, setViewH] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  // The first screen is exactly one screen tall, so "More Services" starts below the fold
  const topSpace = STICKY_TOP_BUTTONS ? insets.top + TOP_BAR_HEIGHT + 8 : insets.top + 8;
  const firstScreenHeight = Math.max(0, viewH - topSpace - BOTTOM_BAR_HEIGHT - insets.bottom);

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
        {services.map((service) => (
            <Pressable
                key={service.title}
                style={[styles.cardShadow, styles.gridItem]}
                accessibilityRole="button"
                accessibilityLabel={service.title}
                onPress={() => openService(service)}
            >
              <View style={styles.gridCard}>
                <View style={styles.iconCircle}>
                  <Ionicons
                      name={service.icon}
                      size={36}
                      color={BLUE}
                      accessible={false}
                  />
                </View>

                <Text style={styles.cardTitle}>{service.title}</Text>
              </View>
            </Pressable>
        ))}
      </View>
  );

  const topRow = (
      <View style={styles.topRow}>
        <CornerButton
            label="Profile"
            icon="person-outline"
            onPress={() => showMessage('Profile')}
        />

        {/* The logo hides once you scroll down */}
        {scrolled && STICKY_TOP_BUTTONS ? (
            <View style={styles.logo} />
        ) : (
            <Image
                source={require('../../assets/images/ez-logo.png')}
                style={styles.logo}
                resizeMode="contain"
                accessible={true}
                accessibilityLabel="EZ Healthcare"
            />
        )}

        <CornerButton
            label="Log Out"
            icon="log-out-outline"
            onPress={() => router.push('/login')}
        />
      </View>
  );

  return (
      <View style={styles.screen}>
        <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: topSpace,
                paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 24,
              },
            ]}
            scrollEventThrottle={16}
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
          <View style={[styles.firstScreen, { minHeight: firstScreenHeight }]}>
            {/* Top buttons scroll with the page when they are not sticky */}
            {!STICKY_TOP_BUTTONS ? topRow : null}

            {/* Ask EZ */}
            <Pressable
                style={styles.cardShadow}
                accessibilityRole="button"
                accessibilityLabel="Ask EZ. Tap to speak."
                onPress={() => showMessage('Ask EZ')}
            >
              <View style={styles.askCard}>
                <Text style={styles.heading}>
                  ASK <Text style={styles.greenText}>EZ</Text>
                </Text>

                <View style={styles.voiceCircle}>
                  <Ionicons
                      name="mic-outline"
                      size={40}
                      color="#FFFFFF"
                      accessible={false}
                  />
                </View>

                <Text style={styles.speakText}>Tap to Speak</Text>
              </View>
            </Pressable>

            {/* Main services */}
            {renderServices(MAIN_SERVICES)}
          </View>

          {/* More services */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDash} />
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
                  { paddingTop: insets.top, borderBottomWidth: scrolled ? 1 : 0 },
                ]}
            >
              {topRow}
            </View>
        ) : null}

        {/* Bottom bar (always stays in place) */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
          <View style={styles.bottomRow}>
            <CornerButton
                label="Settings"
                icon="settings-outline"
                onPress={() => router.push('/accessibility')}
            />

            {atEnd ? (
                <View style={styles.scrollHint} />
            ) : (
                <Pressable
                    style={styles.scrollHint}
                    accessibilityRole="button"
                    accessibilityLabel="Keep scrolling. Tap to scroll down."
                    onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
                >
                  <View style={styles.chevrons}>
                    <Ionicons
                        name="chevron-down"
                        size={30}
                        color={GREEN}
                        accessible={false}
                    />
                    <View style={styles.secondChevron}>
                      <Ionicons
                          name="chevron-down"
                          size={30}
                          color={GREEN}
                          accessible={false}
                      />
                    </View>
                  </View>
                  <Text style={styles.scrollText}>Keep Scrolling</Text>
                </Pressable>
            )}

            <CornerButton
                label="Help"
                icon="help-circle-outline"
                onPress={() => showMessage('Help')}
            />
          </View>
        </View>
      </View>
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
    backgroundColor: '#F7F8F3',
  },

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
    backgroundColor: '#F7F8F3',
    borderBottomColor: '#DDE4E2',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F7F8F3',
    borderTopWidth: 1,
    borderTopColor: '#DDE4E2',
  },

  topRow: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    height: TOP_BAR_HEIGHT,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  bottomRow: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    height: BOTTOM_BAR_HEIGHT,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
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
    borderColor: '#DDE4E2',
    ...shadow,
  },

  cornerLabel: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#0B2236',
  },

  // Keep Scrolling hint
  scrollHint: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#44525A',
    textAlign: 'center',
  },

  // Cards (same look as the Accessibility cards)
  cardShadow: {
    borderRadius: 24,
    backgroundColor: '#F7F8F3',
    ...shadow,
  },

  askCard: {
    alignItems: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    overflow: 'hidden',
  },

  heading: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    color: BLUE,
  },

  greenText: {
    color: GREEN,
  },

  voiceCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0072AA',
  },

  speakText: {
    fontSize: 20,
    textAlign: 'center',
    color: '#0B2236',
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
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    overflow: 'hidden',
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0B2236',
    textAlign: 'center',
  },

  // "More Services" heading
  sectionHeader: {
    gap: 8,
    marginTop: 14,
  },

  sectionDash: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: GREEN,
  },

  sectionTitle: {
    fontSize: 30,
    fontWeight: '800',
  },

  sectionBlue: {
    color: BLUE,
  },
});