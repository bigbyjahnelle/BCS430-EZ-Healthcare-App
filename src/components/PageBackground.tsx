import { ReactNode } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

// Page background used on every screen
export default function PageBackground({ children }: { children: ReactNode }) {
  return (
      <ImageBackground
          source={require('../../assets/images/bg.png')}
          style={styles.page}
          resizeMode="cover"
      >
        {children}
      </ImageBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F7F8F3',
  },
});