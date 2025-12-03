import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GuestWelcomeModal = ({ visible, onClose, onNavigateToLogin }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.content}>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.icon}>
              <Ionicons name="map" size={32} color="#1976D2" />
            </View>
            <Text style={styles.title}>
              ¡Explora el mapa de rutas!
            </Text>
            <Text style={styles.subtitle}>
              Puedes ver las rutas disponibles y crear rutas personalizadas. Para acceder a más funciones, únete a nosotros.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.registerBtn]}
              onPress={() => {
                onClose();
                onNavigateToLogin();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.actionText}>Registrarse</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.loginBtn]}
              onPress={() => {
                onClose();
                onNavigateToLogin();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in" size={18} color="#fff" />
              <Text style={styles.actionText}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.continueGuestBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.continueGuestText}>
              Continuar explorando como invitado
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  registerBtn: {
    backgroundColor: '#1976D2',
  },
  loginBtn: {
    backgroundColor: '#4CAF50',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  continueGuestBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  continueGuestText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default GuestWelcomeModal;