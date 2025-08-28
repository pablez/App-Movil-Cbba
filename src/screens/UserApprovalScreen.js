import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { USER_ROLES, PASSENGER_TYPES } from '../utils/constants';

const { width } = Dimensions.get('window');

const UserApprovalScreen = ({ route, navigation }) => {
  const { userId, userData } = route.params;
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-BO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const getPassengerTypeName = (typeId) => {
    const passengerType = Object.values(PASSENGER_TYPES).find(
      type => type.id === typeId
    );
    return passengerType ? passengerType.name : 'No especificado';
  };

  const handleApproval = async (approved) => {
    const actionText = approved ? 'aprobar' : 'rechazar';
    const statusText = approved ? 'aprobada' : 'rechazada';
    
    Alert.alert(
      `¿${approved ? 'Aprobar' : 'Rechazar'} solicitud?`,
      `¿Estás seguro de que quieres ${actionText} la solicitud de ${userData.firstName} ${userData.lastName}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: approved ? 'Aprobar' : 'Rechazar',
          style: approved ? 'default' : 'destructive',
          onPress: () => processApproval(approved, statusText)
        }
      ]
    );
  };

  const processApproval = async (approved, statusText) => {
    setLoading(true);
    try {
      const newStatus = approved ? 'approved' : 'rejected';
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        status: newStatus,
        approvedAt: new Date().toISOString(),
        // Agregar campos adicionales si es aprobado
        ...(approved && {
          isActive: true,
          approvedBy: 'admin' // Aquí podrías poner el ID del admin actual
        })
      });

      Alert.alert(
        'Éxito',
        `La solicitud ha sido ${statusText} correctamente.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado de la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const ImagePreview = ({ imageUri, label }) => {
    if (!imageUri) return null;

    return (
      <View style={styles.imageContainer}>
        <Text style={styles.imageLabel}>{label}</Text>
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
      </View>
    );
  };

  const InfoRow = ({ icon, label, value, color = '#333' }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color="#2E86AB" style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, { color }]}>{value || 'No especificado'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2E86AB" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalles de Solicitud</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información Personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Información Personal</Text>
          
          <InfoRow
            icon="person"
            label="Nombre completo"
            value={`${userData.firstName} ${userData.lastName}`}
          />
          
          <InfoRow
            icon="mail"
            label="Correo electrónico"
            value={userData.email}
          />
          
          <InfoRow
            icon="call"
            label="Teléfono"
            value={userData.phone}
          />
          
          <InfoRow
            icon="calendar"
            label="Fecha de solicitud"
            value={formatDate(userData.createdAt)}
          />
        </View>

        {/* Información del Rol */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {userData.role === USER_ROLES.DRIVER ? '🚗 Información de Conductor' : '🎫 Información de Pasajero'}
          </Text>
          
          <InfoRow
            icon={userData.role === USER_ROLES.DRIVER ? 'car' : 'person'}
            label="Rol solicitado"
            value={userData.role === USER_ROLES.DRIVER ? 'Conductor' : 'Pasajero'}
            color={userData.role === USER_ROLES.DRIVER ? '#F24236' : '#2E86AB'}
          />

          {userData.role === USER_ROLES.PASSENGER && (
            <InfoRow
              icon="card"
              label="Tipo de pasajero"
              value={getPassengerTypeName(userData.passengerType)}
            />
          )}

          {userData.role === USER_ROLES.DRIVER && userData.vehicleInfo && (
            <>
              <InfoRow
                icon="car-sport"
                label="Modelo del vehículo"
                value={userData.vehicleInfo.model}
              />
              <InfoRow
                icon="document-text"
                label="Placa"
                value={userData.vehicleInfo.plate}
              />
              <InfoRow
                icon="calendar"
                label="Año"
                value={userData.vehicleInfo.year}
              />
              <InfoRow
                icon="people"
                label="Capacidad"
                value={`${userData.vehicleInfo.capacity} pasajeros`}
              />
            </>
          )}
        </View>

        {/* Documentos e Imágenes */}
        {(userData.profileImage || userData.idCardFront || userData.idCardBack || 
          userData.studentCard || userData.vehicleFront || userData.vehicleBack ||
          userData.vehicleInterior || userData.driverLicense || userData.proofOfOwnership ||
          userData.criminalBackground) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📄 Documentos e Imágenes</Text>
            
            <View style={styles.imagesGrid}>
              <ImagePreview imageUri={userData.profileImage} label="Foto de Perfil" />
              <ImagePreview imageUri={userData.idCardFront} label="Cédula (Frente)" />
              <ImagePreview imageUri={userData.idCardBack} label="Cédula (Reverso)" />
              
              {userData.role === USER_ROLES.PASSENGER && (
                <ImagePreview imageUri={userData.studentCard} label="Carnet Estudiantil" />
              )}
              
              {userData.role === USER_ROLES.DRIVER && (
                <>
                  <ImagePreview imageUri={userData.vehicleFront} label="Vehículo (Frente)" />
                  <ImagePreview imageUri={userData.vehicleBack} label="Vehículo (Atrás)" />
                  <ImagePreview imageUri={userData.vehicleInterior} label="Vehículo (Interior)" />
                  <ImagePreview imageUri={userData.driverLicense} label="Licencia de Conducir" />
                  <ImagePreview imageUri={userData.proofOfOwnership} label="Prueba de Propiedad" />
                  <ImagePreview imageUri={userData.criminalBackground} label="Antecedentes Penales" />
                </>
              )}
            </View>
          </View>
        )}

        {/* Estado actual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Estado</Text>
          <View style={styles.statusContainer}>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>⏳ Pendiente de aprobación</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botones de acción */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleApproval(false)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.rejectButtonText}>Rechazar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApproval(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.approveButtonText}>Aprobar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: (width - 80) / 2,
    marginBottom: 16,
  },
  imageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  statusContainer: {
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  pendingText: {
    color: '#B8860B',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  rejectButton: {
    backgroundColor: '#F24236',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  approveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default UserApprovalScreen;
