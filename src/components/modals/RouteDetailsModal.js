import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RouteDetailsModal = ({ visible, route, onClose, onClearRoute }) => {
  if (!route) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>🛣️ Ruta Generada</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.routeDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="speedometer-outline" size={20} color="#1976D2" />
              <Text style={styles.detailText}>
                Distancia: {(route.distance / 1000).toFixed(2)} km
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color="#1976D2" />
              <Text style={styles.detailText}>
                Tiempo estimado: {Math.round((route.duration || 0) / 60)} min
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={20} color="#1976D2" />
              <Text style={styles.detailText}>
                Puntos de ruta: {route.coordinates ? route.coordinates.length : 0}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="car-outline" size={20} color="#1976D2" />
              <Text style={styles.detailText}>
                Modo: {route.profile === 'driving-car' ? 'En vehículo' : 'Otros'}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={onClose}
            >
              <Text style={styles.actionText}>Ver en Mapa</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.secondaryActionBtn]}
              onPress={() => {
                onClearRoute();
                onClose();
              }}
            >
              <Text style={styles.secondaryActionText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  routeDetails: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  detailText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryActionBtn: {
    backgroundColor: '#f44336',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default RouteDetailsModal;