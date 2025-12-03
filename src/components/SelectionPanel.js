import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SelectionPanel = ({ startPoint, endPoint, routeLoading, onGenerateRoute, style }) => {
  return (
    <View style={[styles.selectionPanel, style]}>
      <View style={styles.selectionHeader}>
        <View style={styles.animatedIcon}>
          <Ionicons name="navigate-circle" size={24} color="#1976D2" />
        </View>
        <View style={styles.selectionTitleContainer}>
          <Text style={styles.selectionTitle}>
            {!startPoint ? '👆 Toca en el mapa para seleccionar ORIGEN' : 
             !endPoint ? '👆 Toca en el mapa para seleccionar DESTINO' : 
             '✅ Puntos seleccionados - Genera la ruta'}
          </Text>
          <Text style={styles.selectionSubtitle}>
            {!startPoint ? 'Paso 1 de 2' : 
             !endPoint ? 'Paso 2 de 2' : 
             'Listo para generar'}
          </Text>
        </View>
      </View>

      <View style={styles.selectionStatus}>
        <View style={[styles.statusItem, startPoint && styles.statusItemActive]}>
          <View style={[styles.statusDot, { backgroundColor: startPoint ? '#2196F3' : '#ccc' }]} />
          <Text style={[styles.statusText, startPoint && styles.statusTextActive]}>Origen {startPoint ? '✓' : '(pendiente)'}</Text>
        </View>
        <View style={[styles.statusItem, endPoint && styles.statusItemActive]}>
          <View style={[styles.statusDot, { backgroundColor: endPoint ? '#FF5722' : '#ccc' }]} />
          <Text style={[styles.statusText, endPoint && styles.statusTextActive]}>Destino {endPoint ? '✓' : '(pendiente)'}</Text>
        </View>
      </View>

      {startPoint && endPoint && !routeLoading && (
        <TouchableOpacity style={styles.generateRouteBtn} onPress={() => onGenerateRoute(startPoint, endPoint)}>
          <Ionicons name="map-outline" size={18} color="#fff" />
          <Text style={styles.generateRouteBtnText}>🛣️ Generar Ruta Personalizada</Text>
        </TouchableOpacity>
      )}

      {routeLoading && (
        <View style={styles.routeLoadingContainer}>
          <ActivityIndicator size="small" color="#1976D2" />
          <Text style={styles.routeLoadingText}>🔄 Calculando la mejor ruta...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  selectionPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  animatedIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  selectionTitleContainer: {
    flex: 1,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    lineHeight: 20,
  },
  selectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
  },
  selectionStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  statusItemActive: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  generateRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    elevation: 4,
  },
  generateRouteBtnText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 16,
  },
  routeLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  routeLoadingText: {
    marginLeft: 8,
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  }
});

export default SelectionPanel;
