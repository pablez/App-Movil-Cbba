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

      {/* Map type selector will be injected by parent when provided via props */}
      {typeof arguments[0] === 'object' && arguments[0].changeTileLayer ? (
        <View style={styles.mapTypeRow}>
          <TouchableOpacity style={[styles.mapTypeButton, arguments[0].mapStyle === 'standard' && styles.mapTypeButtonActive]} onPress={() => arguments[0].changeTileLayer('standard')}>
            <Text style={[styles.mapTypeText, arguments[0].mapStyle === 'standard' && styles.mapTypeTextActive]}>Estándar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapTypeButton, arguments[0].mapStyle === 'cyclo' && styles.mapTypeButtonActive]} onPress={() => arguments[0].changeTileLayer('cyclo')}>
            <Text style={[styles.mapTypeText, arguments[0].mapStyle === 'cyclo' && styles.mapTypeTextActive]}>Ciclista</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapTypeButton, arguments[0].mapStyle === 'transport' && styles.mapTypeButtonActive]} onPress={() => arguments[0].changeTileLayer('transport')}>
            <Text style={[styles.mapTypeText, arguments[0].mapStyle === 'transport' && styles.mapTypeTextActive]}>Transporte</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  mapTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  mapTypeButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  mapTypeButtonActive: {
    backgroundColor: '#1976D2',
  },
  mapTypeText: {
    color: '#333',
    fontWeight: '600',
  },
  mapTypeTextActive: {
    color: '#fff'
  },
});

export default AdminMapControls;