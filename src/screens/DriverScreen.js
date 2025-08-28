import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Switch
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';

const DriverScreen = () => {
  const [location, setLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [tripRequests, setTripRequests] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    getCurrentLocation();
    loadUserProfile();
    // Cargar solicitudes de viaje
    loadTripRequests();
  }, []);

  useEffect(() => {
    if (isOnline && location) {
      // Actualizar ubicación del conductor en tiempo real
      updateDriverLocation();
    }
  }, [isOnline, location]);

  const loadUserProfile = async () => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    }
  };

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Permiso de ubicación denegado');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    }
  };

  const updateDriverLocation = () => {
    // Aquí actualizarías la ubicación del conductor en Firebase Firestore
    console.log('Actualizando ubicación del conductor...');
  };

  const loadTripRequests = () => {
    // Simulación de solicitudes de viaje
    const mockRequests = [
      {
        id: '1',
        passengerName: 'Ana López',
        pickupLocation: {
          latitude: -17.3895 + (Math.random() - 0.5) * 0.005,
          longitude: -66.1568 + (Math.random() - 0.5) * 0.005,
          address: 'Av. América'
        },
        destinationLocation: {
          latitude: -17.3895 + (Math.random() - 0.5) * 0.01,
          longitude: -66.1568 + (Math.random() - 0.5) * 0.01,
          address: 'Plaza 14 de Septiembre'
        },
        passengerType: 'Universitario',
        fare: 1.0,
        timestamp: new Date()
      }
    ];
    setTripRequests(mockRequests);
  };

  const toggleOnlineStatus = () => {
    if (!location) {
      Alert.alert('Error', 'Necesitas activar la ubicación primero');
      return;
    }
    setIsOnline(!isOnline);
  };

  const acceptTrip = (trip) => {
    Alert.alert(
      'Aceptar Viaje',
      `¿Aceptar el viaje de ${trip.passengerName}?\nTarifa: ${trip.fare} Bs`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Aceptar',
          onPress: () => {
            setCurrentTrip(trip);
            setTripRequests(prev => prev.filter(t => t.id !== trip.id));
            Alert.alert('Éxito', 'Viaje aceptado. Dirígete al punto de recogida.');
          }
        }
      ]
    );
  };

  const completeTrip = () => {
    Alert.alert(
      'Completar Viaje',
      '¿Has completado el viaje?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Sí',
          onPress: () => {
            setCurrentTrip(null);
            Alert.alert('Éxito', 'Viaje completado exitosamente.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>
            Conductor: {userProfile?.firstName || user?.displayName || 'Usuario'}
          </Text>
          <Text style={styles.userInfo}>
            Rol: Conductor
            {userProfile?.vehicleInfo?.plate ? ` • Placa: ${userProfile.vehicleInfo.plate}` : ''}
            {userProfile?.vehicleInfo?.model ? ` • ${userProfile.vehicleInfo.model}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusLabel}>Estado:</Text>
        <Text style={[styles.statusText, { color: isOnline ? '#4CAF50' : '#F44336' }]}>
          {isOnline ? 'EN LÍNEA' : 'DESCONECTADO'}
        </Text>
        <Switch
          value={isOnline}
          onValueChange={toggleOnlineStatus}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isOnline ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>

      {location ? (
        <MapView style={styles.map} region={location}>
          <Marker
            coordinate={location}
            title="Tu ubicación"
            description="Tu vehículo"
            pinColor="blue"
          />
          
          {currentTrip && (
            <>
              <Marker
                coordinate={currentTrip.pickupLocation}
                title="Punto de recogida"
                description={currentTrip.passengerName}
                pinColor="green"
              />
              <Marker
                coordinate={currentTrip.destinationLocation}
                title="Destino"
                description={currentTrip.destinationLocation.address}
                pinColor="red"
              />
            </>
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text>Cargando mapa...</Text>
        </View>
      )}

      <View style={styles.bottomPanel}>
        {currentTrip ? (
          <View style={styles.currentTripPanel}>
            <Text style={styles.panelTitle}>Viaje Actual</Text>
            <Text style={styles.passengerName}>Pasajero: {currentTrip.passengerName}</Text>
            <Text style={styles.fareAmount}>Tarifa: {currentTrip.fare} Bs</Text>
            <Text style={styles.pickupAddress}>
              Recogida: {currentTrip.pickupLocation.address}
            </Text>
            <Text style={styles.destinationAddress}>
              Destino: {currentTrip.destinationLocation.address}
            </Text>
            
            <TouchableOpacity 
              style={styles.completeButton} 
              onPress={completeTrip}
            >
              <Text style={styles.buttonText}>Completar Viaje</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.requestsPanel}>
            <Text style={styles.panelTitle}>
              Solicitudes de Viaje ({tripRequests.length})
            </Text>
            
            {tripRequests.length > 0 ? (
              tripRequests.map(trip => (
                <View key={trip.id} style={styles.tripRequest}>
                  <Text style={styles.passengerName}>{trip.passengerName}</Text>
                  <Text style={styles.passengerType}>{trip.passengerType}</Text>
                  <Text style={styles.fareAmount}>{trip.fare} Bs</Text>
                  <TouchableOpacity 
                    style={styles.acceptButton} 
                    onPress={() => acceptTrip(trip)}
                  >
                    <Text style={styles.buttonText}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noRequestsText}>
                {isOnline ? 'Esperando solicitudes...' : 'Conéctate para recibir solicitudes'}
              </Text>
            )}
          </View>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#4CAF50',
  },
  welcome: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPanel: {
    backgroundColor: '#ffffff',
    maxHeight: '40%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  currentTripPanel: {
    padding: 20,
  },
  requestsPanel: {
    maxHeight: 300,
  },
  tripRequest: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passengerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  passengerType: {
    fontSize: 14,
    color: '#666',
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pickupAddress: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  destinationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  completeButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  noRequestsText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontSize: 16,
  },
});

export default DriverScreen;
