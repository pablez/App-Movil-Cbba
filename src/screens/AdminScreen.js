import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { PASSENGER_TYPES, USER_ROLES } from '../utils/constants';

const AdminScreen = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Simulación de datos (en una app real vendría de Firebase)
    loadUsers();
    loadVehicles();
    loadTrips();
  };

  const loadUsers = () => {
    const mockUsers = [
      {
        id: '1',
        name: 'Juan Pérez',
        email: 'juan@email.com',
        role: USER_ROLES.DRIVER,
        phone: '+59170123456',
        status: 'active'
      },
      {
        id: '2',
        name: 'María García',
        email: 'maria@email.com',
        role: USER_ROLES.PASSENGER,
        phone: '+59170654321',
        status: 'active'
      },
      {
        id: '3',
        name: 'Carlos López',
        email: 'carlos@email.com',
        role: USER_ROLES.DRIVER,
        phone: '+59170987654',
        status: 'inactive'
      }
    ];
    setUsers(mockUsers);
  };

  const loadVehicles = () => {
    const mockVehicles = [
      {
        id: '1',
        plate: 'CBB-1234',
        model: 'Toyota Hiace',
        capacity: 15,
        driver: 'Juan Pérez',
        status: 'active'
      },
      {
        id: '2',
        plate: 'CBB-5678',
        model: 'Ford Transit',
        capacity: 12,
        driver: 'Carlos López',
        status: 'maintenance'
      }
    ];
    setVehicles(mockVehicles);
  };

  const loadTrips = () => {
    const mockTrips = [
      {
        id: '1',
        passenger: 'María García',
        driver: 'Juan Pérez',
        date: '2025-08-27',
        fare: 2.5,
        status: 'completed'
      },
      {
        id: '2',
        passenger: 'Ana López',
        driver: 'Carlos López',
        date: '2025-08-27',
        fare: 1.0,
        status: 'in_progress'
      }
    ];
    setTrips(mockTrips);
  };

  const toggleUserStatus = (userId) => {
    Alert.alert(
      'Cambiar Estado',
      '¿Deseas cambiar el estado de este usuario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            setUsers(prev => prev.map(user => 
              user.id === userId 
                ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
                : user
            ));
          }
        }
      ]
    );
  };

  const deleteUser = (userId) => {
    Alert.alert(
      'Eliminar Usuario',
      '¿Estás seguro de que deseas eliminar este usuario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setUsers(prev => prev.filter(user => user.id !== userId));
          }
        }
      ]
    );
  };

  const renderUsers = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Gestión de Usuarios ({users.length})</Text>
      {users.map(user => (
        <View key={user.id} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{user.name}</Text>
            <View style={[styles.statusBadge, 
              { backgroundColor: user.status === 'active' ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.statusText}>
                {user.status === 'active' ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
          <Text style={styles.itemSubtitle}>{user.email}</Text>
          <Text style={styles.itemSubtitle}>{user.phone}</Text>
          <Text style={styles.roleText}>
            Rol: {user.role === USER_ROLES.DRIVER ? 'Conductor' : 
                  user.role === USER_ROLES.PASSENGER ? 'Pasajero' : 'Admin'}
          </Text>
          
          <View style={styles.itemActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => toggleUserStatus(user.id)}
            >
              <Text style={styles.actionButtonText}>
                {user.status === 'active' ? 'Desactivar' : 'Activar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteUser(user.id)}
            >
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                Eliminar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderVehicles = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Gestión de Vehículos ({vehicles.length})</Text>
      {vehicles.map(vehicle => (
        <View key={vehicle.id} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{vehicle.plate}</Text>
            <View style={[styles.statusBadge, 
              { backgroundColor: vehicle.status === 'active' ? '#4CAF50' : '#FF9800' }
            ]}>
              <Text style={styles.statusText}>
                {vehicle.status === 'active' ? 'Activo' : 'Mantenimiento'}
              </Text>
            </View>
          </View>
          <Text style={styles.itemSubtitle}>Modelo: {vehicle.model}</Text>
          <Text style={styles.itemSubtitle}>Conductor: {vehicle.driver}</Text>
          <Text style={styles.itemSubtitle}>Capacidad: {vehicle.capacity} pasajeros</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderTrips = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Historial de Viajes ({trips.length})</Text>
      {trips.map(trip => (
        <View key={trip.id} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>Viaje #{trip.id}</Text>
            <View style={[styles.statusBadge, 
              { backgroundColor: trip.status === 'completed' ? '#4CAF50' : '#2196F3' }
            ]}>
              <Text style={styles.statusText}>
                {trip.status === 'completed' ? 'Completado' : 'En Progreso'}
              </Text>
            </View>
          </View>
          <Text style={styles.itemSubtitle}>Pasajero: {trip.passenger}</Text>
          <Text style={styles.itemSubtitle}>Conductor: {trip.driver}</Text>
          <Text style={styles.itemSubtitle}>Fecha: {trip.date}</Text>
          <Text style={styles.fareText}>Tarifa: {trip.fare} Bs</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'users' && styles.activeTab]}
        onPress={() => setActiveTab('users')}
      >
        <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
          Usuarios
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'vehicles' && styles.activeTab]}
        onPress={() => setActiveTab('vehicles')}
      >
        <Text style={[styles.tabText, activeTab === 'vehicles' && styles.activeTabText]}>
          Vehículos
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'trips' && styles.activeTab]}
        onPress={() => setActiveTab('trips')}
      >
        <Text style={[styles.tabText, activeTab === 'trips' && styles.activeTabText]}>
          Viajes
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Panel de Administrador</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {renderTabs()}

      {activeTab === 'users' && renderUsers()}
      {activeTab === 'vehicles' && renderVehicles()}
      {activeTab === 'trips' && renderTrips()}
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
    backgroundColor: '#FF5722',
  },
  welcome: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    color: '#FF5722',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF5722',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FF5722',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
  },
  fareText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteButtonText: {
    color: '#ffffff',
  },
});

export default AdminScreen;
