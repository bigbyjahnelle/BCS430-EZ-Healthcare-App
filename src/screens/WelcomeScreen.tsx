import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PageBackground from '../components/PageBackground';
import {
  BLUE,
  BORDER,
  CARD_GRADIENT,
  Card,
  FONT,
  GREEN,
  INK,
  shadow,
} from '../components/ScreenParts';
import { DataMode, getDataMode, selectDataMode } from '../services/dataMode';

const SELECTED_GRADIENT = ['#E4F4EE', '#D9F0E8'] as const;

export default function WelcomeScreen() {
    const router = useRouter();
    const [choice, setChoice] = useState<DataMode>(getDataMode());

    return (
        <PageBackground>
            <SafeAreaView style={styles.screen}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <Image
                        source={require('../../assets/images/ez-logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                        accessibilityLabel="EZ Healthcare"
                    />

                    <Card style={styles.introCard}>
                        <Text style={styles.title} accessibilityRole="header">
                            Welcome to EZ Healthcare
                        </Text>
                        <Text style={styles.body}>
                            Choose your data source. Both modes use the same screens.
                        </Text>
                    </Card>

                    <View accessibilityRole="radiogroup" style={styles.choices}>
                        {(['sample', 'api'] as const).map((value) => {
                            const selected = choice === value;
                            return (
                                <Pressable
                                    key={value}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: selected }}
                                    onPress={() => setChoice(value)}
                                    style={styles.choiceShadow}
                                >
                                    <LinearGradient
                                        colors={selected ? SELECTED_GRADIENT : CARD_GRADIENT}
                                        style={[styles.choiceCard, selected && styles.choiceSelected]}
                                    >
                                        <View style={styles.choiceHeader}>
                                            <Ionicons
                                                name={selected ? 'radio-button-on' : 'radio-button-off'}
                                                size={30}
                                                color={selected ? GREEN : BLUE}
                                                accessible={false}
                                            />
                                            <Text style={styles.cardTitle}>
                                                {value === 'sample' ? 'Sample Data Mode' : 'API Mode'}
                                            </Text>
                                        </View>
                                        <Text style={styles.choiceBody}>
                                            {value === 'sample'
                                                ? 'Fictional records from our local database. No Epic sign-in needed.'
                                                : 'Request records from Epic’s sandbox. Epic sign-in and internet access are required.'}
                                        </Text>
                                    </LinearGradient>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Pressable
                        style={styles.button}
                        accessibilityRole="button"
                        onPress={() => {
                            selectDataMode(choice);
                            router.replace('/home');
                        }}
                    >
                        <Text style={styles.buttonText}>Continue</Text>
                    </Pressable>

                    <View style={styles.notice}>
                        <Text style={styles.noticeText}>
                            Both modes are for testing. Changing modes clears the app’s current connection.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </PageBackground>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 16,
        width: '100%',
        maxWidth: 540,
        alignSelf: 'center',
    },
    logo: { width: 130, height: 130, alignSelf: 'center' },
    introCard: { gap: 8, alignItems: 'center' },
    title: {
        fontFamily: FONT,
        fontSize: 28,
        fontWeight: '800',
        color: INK,
        textAlign: 'center',
    },
    body: { fontSize: 18, color: '#2E3A42', lineHeight: 26, textAlign: 'center' },
    choices: { gap: 14 },
    choiceShadow: {
        borderRadius: 24,
        backgroundColor: '#F7F8F3',
        ...shadow,
    },
    choiceCard: {
        padding: 18,
        gap: 8,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: BORDER,
        overflow: 'hidden',
    },
    choiceSelected: { borderColor: GREEN, borderWidth: 2.5 },
    choiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardTitle: {
        flex: 1,
        fontFamily: FONT,
        fontSize: 22,
        fontWeight: '800',
        color: INK,
    },
    choiceBody: { fontSize: 17, color: '#2E3A42', lineHeight: 24 },
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
    },
    notice: {
        padding: 14,
        borderRadius: 18,
        backgroundColor: '#E7F2EC',
        borderWidth: 1.5,
        borderColor: '#B9DCC8',
    },
    noticeText: { fontSize: 16, lineHeight: 23, color: '#18533F', textAlign: 'center' },
});