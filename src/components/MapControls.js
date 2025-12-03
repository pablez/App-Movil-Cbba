import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MapControls = ({
  isSelectingPoints,
  onToggleSelect,
  onClearRoute,
  onCenterUser,
  onCenterRoute,
  onOpenGuest,
  customRoute,
  hasGeneratedRoute
}) => {
  return (
    <View style={styles.mapButtons}>
      <TouchableOpacity
        style={[styles.fab, styles.navigationFab, { 
          backgroundColor: isSelectingPoints ? '#FF5722' : '#1976D2',
          width: isSelectingPoints ? 48 : 60,
          height: isSelectingPoints ? 48 : 60,
          marginBottom: 12
        }]}
        onPress={onToggleSelect}
        activeOpacity={0.85}
      >
        {isSelectingPoints ? (
          <Ionicons name="close" size={24} color="#fff" />
        ) : (
          <View style={styles.navigationIcon}>
            <Ionicons name="navigate" size={24} color="#fff" />
            <Text style={styles.navigationLabel}>RUTAS</Text>
          </View>
        )}
      </TouchableOpacity>

      {hasGeneratedRoute && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#f44336', marginBottom: 12 }]}
          onPress={onClearRoute}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={onCenterUser}
        activeOpacity={0.85}
      >
        <Ionicons name="locate" size={20} color="#fff" />
      </TouchableOpacity>

      {customRoute && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: customRoute.color || '#1976D2', marginTop: 12 }]}
          onPress={onCenterRoute}
          activeOpacity={0.85}
        >
          <Ionicons name="map" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: '#4CAF50', marginTop: 12 }]}
        onPress={onOpenGuest}
        activeOpacity={0.85}
      >
        <Ionicons name="person" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  mapButtons: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  navigationFab: {
    elevation: 8,
    shadowOpacity: 0.3,
  },
  navigationIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 8,
    marginTop: 2,
  }
});

export default MapControls;
