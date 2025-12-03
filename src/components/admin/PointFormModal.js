import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PointFormModal = ({ 
  visible, 
  onClose, 
  onSave, 
  onViewOnMap,
  initialData = null 
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  
  const [street, setStreet] = useState(initialData?.street || '');
  const [name, setName] = useState(initialData?.name || '');

  const handleSave = () => {
    const pointData = {
      street: street.trim(),
      name: name.trim(),
    };
    onSave(pointData);
    handleClose();
  };

  const handleClose = () => {
    setStreet('');
    setName('');
    onClose();
  };

  const handleViewOnMap = () => {
    onViewOnMap({ street, name });
  };

  React.useEffect(() => {
    if (initialData) {
      setStreet(initialData.street || '');
      setName(initialData.name || '');
    }
  }, [initialData]);

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.container,
            { 
              width: isTablet ? '60%' : '90%',
              maxWidth: isTablet ? 500 : 400 
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={[
              styles.title,
              { fontSize: isTablet ? 20 : 18 }
            ]}>
              {initialData ? 'Editar punto' : 'Agregar punto'}
            </Text>
            <TouchableOpacity 
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityLabel="Cerrar modal"
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Calle o Avenida</Text>
            <TextInput
              value={street}
              onChangeText={setStreet}
              placeholder="Ej: Av. Bolivia"
              style={[
                styles.input,
                { fontSize: isTablet ? 16 : 14 }
              ]}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Nombre del punto</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej: Parada Central"
              style={[
                styles.input,
                { fontSize: isTablet ? 16 : 14 }
              ]}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={handleClose}
            >
              <Ionicons name="close-circle" size={16} color="#666" />
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.mapButton]} 
              onPress={handleViewOnMap}
            >
              <Ionicons name="map" size={16} color="#fff" />
              <Text style={styles.buttonText}>Ver en mapa</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.saveButton]} 
              onPress={handleSave}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.buttonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  mapButton: {
    backgroundColor: '#3b82f6',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default PointFormModal;