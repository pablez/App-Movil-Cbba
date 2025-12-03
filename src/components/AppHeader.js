import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AppHeader = () => {
  return (
    <View style={styles.appHeader}>
      <View style={styles.appNameContainer}>
        <Text style={styles.appName}>
          <Text style={styles.appNamePrimary}>Ñan</Text>
          <Text style={styles.appNameSecondary}> Go</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  appHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  appNameContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    alignSelf: 'flex-start',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appNamePrimary: {
    color: '#1a1a1a',
    fontWeight: '900',
  },
  appNameSecondary: {
    color: '#FF6B35',
    fontWeight: '800',
  },
});

export default AppHeader;