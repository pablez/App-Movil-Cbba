import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
  Badge
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../utils/constants';

const AdminDashboardScreen = ({ navigation }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('isApproved', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const users = [];
      
      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() };
        users.push(userData);
      });
      
      // Ordenar por fecha localmente
      users.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });
      
      setPendingUsers(users);
      console.log('Loaded pending users:', users.length);
    } catch (error) {
      console.error('Error loading pending users:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes pendientes');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-BO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const getRoleIcon = (role) => {
    return role === USER_ROLES.DRIVER ? 'car' : 'person';
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, cerrar sesión', style: 'destructive', onPress: logout }
      ]
    );
  };

  const getRoleColor = (role) => {
    return role === USER_ROLES.DRIVER ? '#F24236' : '#2E86AB';
  };

  const getRoleText = (role) => {
    return role === USER_ROLES.DRIVER ? 'Conductor' : 'Pasajero';
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('UserApproval', { userId: item.id, userData: item })}
    >
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>
              {item.firstName} {item.lastName}
            </Text>
            <View style={[styles.roleTag, { backgroundColor: getRoleColor(item.role) }]}>
              <Ionicons 
                name={getRoleIcon(item.role)} 
                size={12} 
                color="white" 
                style={{ marginRight: 4 }} 
              />
              <Text style={styles.roleText}>{getRoleText(item.role)}</Text>
            </View>
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
        </View>
        
        <View style={styles.rightSection}>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </View>

      {/* Información específica del rol */}
      {item.role === USER_ROLES.DRIVER && item.vehicleInfo && (
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleText}>
            🚗 {item.vehicleInfo.model} - {item.vehicleInfo.plate}
          </Text>
        </View>
      )}

      {item.role === USER_ROLES.PASSENGER && (
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerText}>
            👤 Tipo: {item.passengerType || 'No especificado'}
          </Text>
        </View>
      )}

      <View style={styles.statusContainer}>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>⏳ Pendiente de aprobación</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="checkmark-circle-outline" size={80} color="#4CAF50" />
      <Text style={styles.emptyTitle}>¡Todo al día!</Text>
      <Text style={styles.emptySubtitle}>
        No hay solicitudes pendientes de aprobación
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={loadPendingUsers}>
        <Ionicons name="refresh" size={20} color="#2E86AB" />
        <Text style={styles.refreshButtonText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => navigation.navigate('AdminMap')}
          >
            <Ionicons name="map" size={24} color="#2E86AB" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Panel Admin</Text>
            <Text style={styles.subtitle}>Solicitudes pendientes</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {pendingUsers.length > 0 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{pendingUsers.length}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.refreshIconButton}
            onPress={loadPendingUsers}
          >
            <Ionicons name="refresh" size={24} color="#2E86AB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={24} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={pendingUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPendingUsers} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBadge: {
    backgroundColor: '#F24236',
    borderRadius: 15,
    minWidth: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  counterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  refreshIconButton: {
    padding: 8,
    marginRight: 8,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  vehicleInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  vehicleText: {
    fontSize: 14,
    color: '#333',
  },
  passengerInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  passengerText: {
    fontSize: 14,
    color: '#333',
  },
  statusContainer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  pendingBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  pendingText: {
    color: '#B8860B',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2E86AB',
  },
  refreshButtonText: {
    color: '#2E86AB',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AdminDashboardScreen;
