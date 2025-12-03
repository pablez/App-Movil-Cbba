import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FloatingSearchButton = ({ onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.floatingSearchButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.floatingButtonContent}>
        <Ionicons name="search-circle" size={24} color="#fff" />
        <Text style={styles.floatingButtonText}>Buscar</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingSearchButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: '#FF5722',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default FloatingSearchButton;