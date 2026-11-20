import { ReactNode } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

// Page background used on every screen
// offsetY: moves the picture up by that many pixels (default 0 = no change)
export default function PageBackground({
  children,
  offsetY = 0,
}: {
  children: ReactNode;
  offsetY?: number;
}) {
  return (
      <ImageBackground
          source={require('../../assets/images/bg.png')}
          style={styles.page}
          resizeMode="cover"
          imageStyle={
            offsetY
                ? { bottom: -offsetY, transform: [{ translateY: -offsetY }] }
                : undefined
          }
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