import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../utils/constants';

const DrawerContent = ({ navigation, state }) => {
  const { user, userRole, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigation.closeDrawer();
  };

  const handleNavigation = (screenName, params = {}) => {
    navigation.navigate(screenName, params);
    navigation.closeDrawer();
  };

  const menuItems = [
    // Siempre visible - Autenticación
    ...(!user ? [
      {
        id: 'login',
        title: 'Iniciar Sesión',
        icon: 'log-in-outline',
        onPress: () => handleNavigation('Login'),
        color: '#2196F3'
      },
      {
        id: 'register',
        title: 'Registrarse',
        icon: 'person-add-outline',
        onPress: () => handleNavigation('Register'),
        color: '#4CAF50'
      }
    ] : []),

    // Usuario autenticado
    ...(user ? [
      {
        id: 'profile',
        title: 'Editar Perfil',
        icon: 'person-outline',
        onPress: () => handleNavigation('EditProfile'),
        color: '#FF9800'
      },
      {
        id: 'map',
        title: 'Mapa',
        icon: 'map-outline',
        onPress: () => {
          // Navegar al mapa correcto según el rol del usuario
          let target = 'AdminMap';
          if (isAdmin) target = 'AdminMap';
          else if (userRole === USER_ROLES.PASSENGER) target = 'PassengerMain';
          else if (userRole === USER_ROLES.DRIVER) target = 'DriverMain';
          handleNavigation(target);
        },
        color: '#2196F3'
      },
      {
        id: 'line150',
        title: 'Línea 150',
        icon: 'bus-outline',
        onPress: () => handleNavigation('AdminMap', { routeType: 'line150' }),
        color: '#FF5722'
      },
      {
        id: 'line230',
        title: 'Línea 230',
        icon: 'bus-outline',
        onPress: () => handleNavigation('AdminMap', { routeType: 'line230' }),
        color: '#9C27B0'
      }
    ] : []),

    // Solo para Admin
    ...(isAdmin ? [
      {
        id: 'admin-dashboard',
        title: 'Panel Admin',
        icon: 'shield-checkmark-outline',
        onPress: () => handleNavigation('AdminDashboard'),
        color: '#9C27B0'
      }
    ] : []),

    // Solo para Pasajero
    ...(userRole === USER_ROLES.PASSENGER ? [
      {
        id: 'passenger-main',
        title: 'Buscar Viaje',
        icon: 'car-outline',
        onPress: () => handleNavigation('PassengerMain'),
        color: '#4CAF50'
      }
    ] : []),

    // Solo para Conductor
    ...(userRole === USER_ROLES.DRIVER ? [
      {
        id: 'driver-main',
        title: 'Panel Conductor',
        icon: 'car-sport-outline',
        onPress: () => handleNavigation('DriverMain'),
        color: '#FF5722'
      }
    ] : []),

    // Logout si está autenticado
    ...(user ? [
      {
        id: 'logout',
        title: 'Cerrar Sesión',
        icon: 'log-out-outline',
        onPress: handleLogout,
        color: '#F44336',
        separator: true
      }
    ] : [])
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userSection}>
          {user ? (
            <>
              <View style={styles.avatar}>
                {user.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
                ) : (
                  <Ionicons 
                    name="person" 
                    size={30} 
                    color="#fff" 
                  />
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text style={styles.userRole}>
                  {isAdmin ? 'Administrador' : 
                   userRole === USER_ROLES.DRIVER ? 'Conductor' : 'Pasajero'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.avatar, { backgroundColor: '#666' }]}>
                <Ionicons 
                  name="person-outline" 
                  size={30} 
                  color="#fff" 
                />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Invitado</Text>
                <Text style={styles.userRole}>No autenticado</Text>
              </View>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.closeDrawer()}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <View key={item.id}>
            {item.separator && <View style={styles.separator} />}
            <TouchableOpacity
              style={[
                styles.menuItem,
                // Mappear ids que representan pantallas a las rutas reales para el resaltado
                (item.id === 'map'
                  ? ['AdminMap', 'PassengerMain', 'DriverMain'].includes(state.routeNames[state.index])
                  : state.routeNames[state.index] === item.id)
                  && styles.activeMenuItem
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={item.icon} 
                size={24} 
                color={item.color}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: item.color }]}>
                {item.title}
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color="#999" 
              />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>TransportApp v1.0</Text>
        <Text style={styles.footerSubText}>Cochabamba, Bolivia</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0, // Margen superior para bajar el drawer
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#E3F2FD',
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 5,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  activeMenuItem: {
    backgroundColor: '#f5f5f5',
  },
  menuIcon: {
    marginRight: 15,
    width: 24,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0, // Menos espacio abajo
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  footerSubText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default DrawerContent;
