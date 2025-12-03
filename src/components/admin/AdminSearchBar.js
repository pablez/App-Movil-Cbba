import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AdminSearchBar = ({ onPress }) => {
  return (
    <View style={styles.searchContainer}>
      <TouchableOpacity 
        style={styles.searchInputContainer}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
        <Text style={styles.searchPlaceholder}>Buscar lugares en Cochabamba...</Text>
        <View style={styles.searchButtonContainer}>
          <Ionicons name="location" size={16} color="#2196F3" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f6f7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    paddingVertical: 0,
  },
  searchButtonContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 6,
    marginLeft: 8,
  },
});

export default AdminSearchBar;