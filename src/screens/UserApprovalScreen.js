import React, { useState, useEffect } from 'react';
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
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { USER_ROLES, PASSENGER_TYPES } from '../utils/constants';

const { width } = Dimensions.get('window');

const UserApprovalScreen = ({ route, navigation }) => {
  const { userId, userData } = route.params;
  const [loading, setLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState(null);

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

  // Comprueba si hay alguna imagen disponible (a nivel top-level o en userData.images)
  const hasAnyImage = () => {
    if (!userData) return false;
    const keys = [
      'profileImage','idCardFront','idCardBack','studentCard','vehicleFront','vehicleBack',
      'vehicleInterior','driverLicense','proofOfOwnership','criminalBackground','universityCardFront','universityCardBack'
    ];
    // Check top-level
    for (const k of keys) {
      const v = userData[k];
      if (v && typeof v === 'string') return true;
    }
    // Check inside images map
    const imagesMap = userData.images || {};
    for (const k of keys) {
      const v = imagesMap[k];
      if (v && typeof v === 'string') return true;
    }
    return false;
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

  // Helper to resolve image URI: check top-level key or inside userData.images
  const getImageUri = (key) => {
    if (!userData) return null;
    // Top-level value (legacy)
    const top = userData[key];
    if (top && typeof top === 'string') return top;
    // New structure under images map
    const imagesMap = userData.images || {};
    const val = imagesMap[key];
    if (val && typeof val === 'string') return val;
    return null;
  };

  const ImagePreview = ({ imageKey, label }) => {
    const imageUri = getImageUri(imageKey);
    const [failed, setFailed] = useState(false);
    const [checking, setChecking] = useState(false);
    const [valid, setValid] = useState(null); // null = unknown, true = ok, false = not reachable
  const [lastError, setLastError] = useState(null);
  const [attempts, setAttempts] = useState(0);

    // Verifica mediante un GET que la URL remota responde OK antes de renderizarla
    useEffect(() => {
      let controller = new AbortController();
      const checkImage = async () => {
        if (!imageUri) {
          setValid(false);
          setChecking(false);
          setLastError(null);
          return;
        }
        setChecking(true);
        setValid(null);
        setLastError(null);
        try {
          const res = await fetch(imageUri, { method: 'GET', signal: controller.signal });
          if (controller.signal.aborted) return;
          setValid(res.ok);
          if (!res.ok) {
            const msg = `HTTP ${res.status} ${res.statusText}`;
            console.warn('[ImagePreview] GET non-ok for', imageUri, msg);
            setLastError(msg);
          }
        } catch (e) {
          if (controller.signal.aborted) return;
          const msg = e?.message || String(e);
          console.warn('[ImagePreview] GET failed for', imageUri, msg);
          setValid(false);
          setLastError(msg);
        } finally {
          if (controller.signal.aborted) return;
          setChecking(false);
        }
      };
      checkImage();
      return () => controller.abort();
    }, [imageUri, attempts]);

    const handleOpen = () => {
      if (!imageUri) return;
      setViewerUri(imageUri);
      setViewerVisible(true);
    };

    // Show placeholder when no uri or image failed to load
    return (
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={handleOpen}
        activeOpacity={imageUri ? 0.9 : 1}
      >
        <Text style={styles.imageLabel}>{label}</Text>
        {imageUri && !failed && valid !== false ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            onError={() => {
              console.warn('Image failed to load:', imageUri);
              setFailed(true);
            }}
          />
        ) : (
          <View style={[styles.previewImage, styles.previewPlaceholder]}>
            {checking ? (
              <ActivityIndicator size="small" color="#666" />
            ) : null}
            <Ionicons name="image" size={36} color="#999" />
            <Text style={styles.placeholderText}>{imageUri ? (valid === false || failed ? 'No se pudo cargar' : 'No disponible') : 'No disponible'}</Text>
            {/* Retry and error controls */}
            {imageUri && (valid === false || failed) ? (
              <View style={styles.retryRow}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    console.log('[ImagePreview] retry for', imageUri);
                    setAttempts((a) => a + 1);
                  }}
                >
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    Alert.alert('Detalle del error', lastError || 'Sin detalles disponibles');
                  }}
                >
                  <Text style={[styles.retryText, { color: '#b00' }]}>Ver error</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Comprueba todas las imágenes del usuario con GET y muestra un resumen
  const checkAllImages = async () => {
    const keys = [
      'profileImage','idCardFront','idCardBack','studentCard','vehicleFront','vehicleBack',
      'vehicleInterior','driverLicense','proofOfOwnership','criminalBackground','universityCardFront','universityCardBack'
    ];
    const results = [];
    for (const key of keys) {
      const uri = getImageUri(key);
      if (!uri) continue;
      try {
        const res = await fetch(uri, { method: 'GET' });
        if (res.ok) {
          results.push({ key, uri, ok: true, status: res.status });
        } else {
          results.push({ key, uri, ok: false, status: res.status, statusText: res.statusText });
        }
      } catch (e) {
        results.push({ key, uri, ok: false, error: e?.message || String(e) });
      }
    }

    const okCount = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok);
    let message = `${okCount} OK, ${fail.length} fallidas`;
    if (fail.length) {
      message += '\n\nDetalles:';
      for (const f of fail) {
        message += `\n- ${f.key}: ${f.status ? `HTTP ${f.status} ${f.statusText || ''}` : f.error}`;
      }
    }
    Alert.alert('Verificación de imágenes', message, [{ text: 'OK' }]);
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
      <View style={styles.headerModern}>
        <TouchableOpacity
          style={styles.backButtonModern}
          onPress={() => {
            try {
              const { CommonActions } = require('@react-navigation/native');
              if (navigation && navigation.dispatch) {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'AdminDashboard' }],
                  })
                );
                return;
              }
            } catch (e) {
              // fallback
            }
            navigation.navigate('AdminDashboard');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.titleModern}>Detalles de Solicitud</Text>
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
  {hasAnyImage() && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📄 Documentos e Imágenes</Text>
              
              <View style={styles.imagesGrid}>
                  <View style={styles.verifyRow}>
                    <TouchableOpacity style={styles.verifyButton} onPress={checkAllImages}>
                      <Ionicons name="cloud-upload" size={16} color="#fff" />
                      <Text style={styles.verifyButtonText}>  Verificar imágenes</Text>
                    </TouchableOpacity>
                  </View>
                <ImagePreview imageKey={'profileImage'} label="Foto de Perfil" />
                <ImagePreview imageKey={'idCardFront'} label="Cédula (Frente)" />
                <ImagePreview imageKey={'idCardBack'} label="Cédula (Reverso)" />
                
                {userData.role === USER_ROLES.PASSENGER && (
                  <>
                    <ImagePreview imageKey={'studentCard'} label="Carnet Estudiantil" />
                    {/* Mostrar carnet universitario si es tipo 'university' */}
                    {userData.passengerType === 'university' && (
                      <>
                        <ImagePreview imageKey={'universityCardFront'} label="Carnet Universitario (Frente)" />
                        <ImagePreview imageKey={'universityCardBack'} label="Carnet Universitario (Reverso)" />
                      </>
                    )}
                  </>
                )}
                
                {userData.role === USER_ROLES.DRIVER && (
                  <>
                    <ImagePreview imageKey={'vehicleFront'} label="Vehículo (Frente)" />
                    <ImagePreview imageKey={'vehicleBack'} label="Vehículo (Atrás)" />
                    <ImagePreview imageKey={'vehicleInterior'} label="Vehículo (Interior)" />
                    <ImagePreview imageKey={'driverLicense'} label="Licencia de Conducir" />
                    <ImagePreview imageKey={'proofOfOwnership'} label="Prueba de Propiedad" />
                    <ImagePreview imageKey={'criminalBackground'} label="Antecedentes Penales" />
                  </>
                )}
              </View>
            </View>
            {/* Mostrar vencimiento del carnet universitario si aplica */}
            {userData.role === USER_ROLES.PASSENGER && userData.passengerType === 'university' && (
              <View style={{ marginTop: 12 }}>
                <InfoRow
                  icon="calendar"
                  label="Vencimiento carnet universitario"
                  value={userData.universityCardExpiry ? formatDate(userData.universityCardExpiry) : 'No especificado'}
                />
              </View>
            )}
          </>
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
      {/* Modal de visualización de imagen con zoom */}
      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.viewerClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.viewerScroll}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            bounces={false}
            centerContent
          >
            {viewerUri && (
              <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40, // Más espacio arriba
    paddingBottom: 22, // Más espacio abajo
    marginTop: 0, // Baja todo el header
    backgroundColor: '#2196F3',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButtonModern: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  titleModern: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    letterSpacing: 0.5,
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
  previewPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee'
  },
  placeholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 12,
  },
  retryRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-around',
    width: '100%'
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eee'
  },
  retryText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600'
  },
  verifyRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
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
  // Viewer styles
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerHeader: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  viewerClose: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 24,
  },
  viewerScroll: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  viewerImage: {
    width: width,
    height: '80%'
  },
});

export default UserApprovalScreen;
