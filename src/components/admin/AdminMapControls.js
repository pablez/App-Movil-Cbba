import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AdminMapControls = ({ 
  location, 
  onCenterLocation 
}) => {
  return (
    <View style={styles.controlsContainer}>
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={[styles.controlButton, !location && styles.controlButtonDisabled]} 
          onPress={onCenterLocation}
          disabled={!location}
        >
          <Ionicons name="locate" size={18} color="#fff" />
          <Text style={styles.controlButtonText}>
            {location ? 'Mi Ubicación' : 'Buscando GPS...'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.locationText}>
          {location 
            ? `📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
            : '🔍 Buscando ubicación...'
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  controlButtonDisabled: {
    backgroundColor: '#BDBDBD',
    shadowColor: '#BDBDBD',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  locationText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
});

export default AdminMapControls;