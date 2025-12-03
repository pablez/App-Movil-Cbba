import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RouteConfirmModal = ({ 
  visible, 
  confirmType, 
  confirmMessage, 
  onClose, 
  onGenerateRoute, 
  onContinue 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.checkAnimationContainer}>
            <View style={[styles.checkCircle, {
              backgroundColor: confirmType === 'origin' ? '#2196F3' : '#FF5722'
            }]}>
              <Ionicons name="checkmark" size={32} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.title}>
            {confirmType === 'origin' ? '✅ Origen Establecido' : '✅ Destino Establecido'}
          </Text>
          
          <Text style={styles.message}>
            {confirmMessage}
          </Text>
          
          <View style={styles.actions}>
            {confirmType === 'destination' ? (
              <>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.generateRouteBtn]}
                  onPress={onGenerateRoute}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.actionText}>Generar Ruta</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.continueBtn]}
                  onPress={onContinue}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueText}>Continuar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={[styles.actionBtn, styles.continueBtn]}
                onPress={onContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.continueText}>Continuar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  checkAnimationContainer: {
    marginBottom: 24,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  generateRouteBtn: {
    backgroundColor: '#4CAF50',
  },
  continueBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  continueText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RouteConfirmModal;