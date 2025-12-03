import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FloatingActionButtons = ({ 
  isSelectingPoints,
  startPoint,
  endPoint,
  generatedRoute,
  bottomSpacing,
  onTogglePointSelection,
  onClearRoute,
  onCenterOnUser,
  onShowMapTypeSelector,
  onShowGuestModal
}) => {
  return (
    <View style={[styles.mapButtons, { bottom: bottomSpacing + 16 }]} pointerEvents="box-none">
      {/* Botón principal para activar/desactivar selección de puntos */}
      <TouchableOpacity
        style={[styles.fab, styles.navigationFab, { 
          backgroundColor: isSelectingPoints ? '#FF5722' : '#1976D2',
          width: isSelectingPoints ? 48 : 60,
          height: isSelectingPoints ? 48 : 60,
          marginBottom: 12
        }]}
        onPress={onTogglePointSelection}
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

      {/* Botón para limpiar ruta generada */}
      {(startPoint || endPoint || generatedRoute) && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#f44336', marginBottom: 12 }]}
          onPress={onClearRoute}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Botón para centrar en usuario */}
      <TouchableOpacity style={styles.fab} onPress={onCenterOnUser}>
        <Ionicons name="locate" size={20} color="#fff" />
      </TouchableOpacity>
      
      {/* Botón para selector de tipo de mapa */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: '#9C27B0', marginTop: 12 }]} 
        onPress={onShowMapTypeSelector}
      >
        <Ionicons name="layers" size={18} color="#fff" />
      </TouchableOpacity>
      
      {/* Botón para mostrar opciones de cuenta */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: '#4CAF50', marginTop: 12 }]} 
        onPress={onShowGuestModal}
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
    alignItems: 'center' 
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
  },
});

export default FloatingActionButtons;