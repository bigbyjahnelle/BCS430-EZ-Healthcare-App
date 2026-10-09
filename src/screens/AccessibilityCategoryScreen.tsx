import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccessibilityCategoryScreen() {
  const router = useRouter();
  const { title, description, icon } = useLocalSearchParams<{
    title: string;
    description: string;
    icon: string;
  }>();

  return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>

          <Pressable
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
          >
            <Ionicons
                name="arrow-back-outline"
                size={24}
                color="#17618E"
                accessible={false}
            />
          </Pressable>

          <View style={styles.body}>
            <View style={styles.iconCircle}>
              <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={44}
                  color="#17618E"
                  accessible={false}
              />
            </View>

            <Text style={styles.title}>{title}</Text>

            <Text style={styles.subtitle}>{description}</Text>

            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                This feature is not connected yet.
              </Text>
            </View>
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
    gap: 24,
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
  },

  body: {
    alignItems: 'center',
    gap: 10,
    marginTop: 30,
  },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    marginBottom: 8,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#0B2236',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: '#44525A',
    textAlign: 'center',
  },

  placeholder: {
    marginTop: 24,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },

  placeholderText: {
    fontSize: 16,
    color: '#44525A',
    textAlign: 'center',
  },
});