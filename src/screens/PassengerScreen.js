import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { PASSENGER_TYPES } from '../utils/constants';
import { db } from '../config/firebase';

const PassengerScreen = () => {
  const [location, setLocation] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [fare, setFare] = useState(2.5);
  const { user, logout } = useAuth();

  useEffect(() => {
    getCurrentLocation();
    loadUserProfile();
    // Aquí cargarías los conductores desde Firebase
    loadNearbyDrivers();
  }, []);

  useEffect(() => {
    // Calcular tarifa cuando tengamos el perfil del usuario
    if (userProfile?.passengerType) {
      const passengerTypeConfig = Object.values(PASSENGER_TYPES).find(
        type => type.id === userProfile.passengerType
      );
      if (passengerTypeConfig) {
        setFare(passengerTypeConfig.price);
      }
    }
  }, [userProfile]);

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

  const loadNearbyDrivers = () => {
    // Simulación de conductores cercanos
    // En una aplicación real, esto vendría de Firebase Firestore
    const mockDrivers = [
      {
        id: '1',
        name: 'Juan Pérez',
        vehicle: 'Toyota Hiace',
        plate: 'CBB-1234',
        latitude: -17.3895 + (Math.random() - 0.5) * 0.01,
        longitude: -66.1568 + (Math.random() - 0.5) * 0.01,
        available: true
      },
      {
        id: '2',
        name: 'María García',
        vehicle: 'Ford Transit',
        plate: 'CBB-5678',
        latitude: -17.3895 + (Math.random() - 0.5) * 0.01,
        longitude: -66.1568 + (Math.random() - 0.5) * 0.01,
        available: true
      }
    ];
    setDrivers(mockDrivers);
  };

  const requestTrip = () => {
    if (!location) {
      Alert.alert('Error', 'Primero necesitamos tu ubicación');
      return;
    }

    const passengerTypeConfig = userProfile?.passengerType ? 
      Object.values(PASSENGER_TYPES).find(type => type.id === userProfile.passengerType) 
      : PASSENGER_TYPES.REGULAR;

    Alert.alert(
      'Solicitar Viaje',
      `¿Confirmas solicitar un viaje?\nTipo: ${passengerTypeConfig?.name || 'Regular'}\nTarifa: ${fare} Bs`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          onPress: () => {
            // Aquí implementarías la lógica para crear el viaje en Firebase
            Alert.alert('Éxito', 'Solicitud enviada. Esperando conductor...');
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
            Hola, {userProfile?.firstName || user?.displayName || 'Pasajero'}
          </Text>
          <Text style={styles.userRole}>
            Rol: Pasajero {userProfile?.passengerType ? 
              `• Tipo: ${Object.values(PASSENGER_TYPES).find(type => type.id === userProfile.passengerType)?.name || 'Regular'}` 
              : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {location ? (
        <MapView style={styles.map} region={location}>
          <Marker
            coordinate={location}
            title="Tu ubicación"
            description="Estás aquí"
            pinColor="blue"
          />
          
          {drivers.map(driver => (
            <Marker
              key={driver.id}
              coordinate={{
                latitude: driver.latitude,
                longitude: driver.longitude
              }}
              title={driver.name}
              description={`${driver.vehicle} - ${driver.plate}`}
              pinColor="green"
            />
          ))}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text>Cargando mapa...</Text>
        </View>
      )}

      <View style={styles.bottomPanel}>
        <Text style={styles.panelTitle}>Solicitar Viaje</Text>
        
        <View style={styles.fareInfo}>
          <Text style={styles.fareLabel}>Tipo de pasajero:</Text>
          <Text style={styles.fareType}>
            {userProfile?.passengerType ? 
              Object.values(PASSENGER_TYPES).find(type => type.id === userProfile.passengerType)?.name 
              : 'Regular'}
          </Text>
          <Text style={styles.fareAmount}>{fare} Bs</Text>
        </View>

        <TouchableOpacity 
          style={styles.requestButton} 
          onPress={requestTrip}
        >
          <Text style={styles.requestButtonText}>Solicitar Viaje</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2E86AB',
  },
  welcome: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
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
    color: '#2E86AB',
    fontWeight: 'bold',
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
    padding: 20,
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
    marginBottom: 15,
    textAlign: 'center',
  },
  fareInfo: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  fareLabel: {
    fontSize: 16,
    color: '#666',
  },
  fareType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E86AB',
    textAlign: 'right',
  },
  requestButton: {
    backgroundColor: '#2E86AB',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PassengerScreen;
