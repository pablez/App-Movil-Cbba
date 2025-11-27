import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
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

  const [persistedRoutes, setPersistedRoutes] = useState([]);

  useEffect(() => {
    // Solo suscribirse si es admin
    if (!isAdmin) return;

    // Comprobación rápida: asegurar que auth.currentUser existe y obtener token para debug
    const current = auth && auth.currentUser ? auth.currentUser : null;
    if (!current) {
      console.warn('No hay usuario Firebase activo; no se suscribirá a rutas. Asegúrate de iniciar sesión en Firebase Auth.');
      return;
    }

    // Resolver token para verificar que el SDK envía credenciales al backend
    try {
      console.log('Firebase currentUser uid:', current.uid);
      current.getIdToken().then(t => console.log('Firebase idToken (short):', (t || '').slice(0, 20) + '...'))
        .catch(e => console.warn('No se pudo obtener idToken:', e));
    } catch (e) {
      console.warn('getIdToken no disponible en current user:', e);
    }

    const q = query(collection(db, 'routes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPersistedRoutes(docs);
    }, (err) => {
      console.error('Error cargando rutas en DrawerContent', err);
      // Si es error de permisos, avisar al usuario/admin
      if (err && err.code && err.code.includes('permission')) {
        console.warn('Firestore denegó el acceso a /routes — revisa reglas o autenticación.');
      }
    });
    return () => unsub();
  }, [isAdmin]);

  const handleLogout = () => {
    logout();
    navigation.closeDrawer();
  };

  const handleNavigation = (screenName, params = {}) => {
    navigation.navigate(screenName, params);
    navigation.closeDrawer();
  };

  // Construcción segura del menú por pasos para evitar errores de sintaxis con spreads
  const menuItems = [];

  // Siempre visible - autenticación
  if (!user) {
    menuItems.push({ id: 'main-tabs', title: '🏠 Inicio (Navegador)', icon: 'home-outline', onPress: () => handleNavigation('MainTabs'), color: '#1976D2' });
    menuItems.push({ id: 'login', title: 'Iniciar Sesión', icon: 'log-in-outline', onPress: () => handleNavigation('Login'), color: '#2196F3' });
    menuItems.push({ id: 'register', title: 'Registrarse', icon: 'person-add-outline', onPress: () => handleNavigation('Register'), color: '#4CAF50' });
    // Permitir a invitados ver rutas públicas sin iniciar sesión
    menuItems.push({ id: 'public-routes', title: 'Ver Rutas Públicas', icon: 'bus-outline', onPress: () => handleNavigation('PublicRoutes'), color: '#2196F3' });
  }

  // Usuario autenticado
  if (user) {
    menuItems.push({ id: 'profile', title: 'Editar Perfil', icon: 'person-outline', onPress: () => handleNavigation('EditProfile'), color: '#FF9800' });
    menuItems.push({
      id: 'map', title: 'Mapa', icon: 'map-outline', onPress: () => {
        let target = 'AdminMap';
        if (isAdmin) target = 'AdminMap';
        else if (userRole === USER_ROLES.PASSENGER) target = 'PassengerMain';
        else if (userRole === USER_ROLES.DRIVER) target = 'DriverMain';
        handleNavigation(target);
      }, color: '#2196F3'
    });
  // No mostrar las entradas integradas si ya existe una ruta persistida con ese nombre
  const has150 = persistedRoutes.some(r => (r.name || '').toLowerCase() === 'línea 150' || (r.name || '').toLowerCase() === 'linea 150' || (r.name || '').toLowerCase() === '150');
  const has230 = persistedRoutes.some(r => (r.name || '').toLowerCase() === 'línea 230' || (r.name || '').toLowerCase() === 'linea 230' || (r.name || '').toLowerCase() === '230');
  if (!has150) menuItems.push({ id: 'line150', title: 'Línea 150', icon: 'bus-outline', onPress: () => handleNavigation('AdminMap', { routeType: 'line150' }), color: '#FF5722' });
  if (!has230) menuItems.push({ id: 'line230', title: 'Línea 230', icon: 'bus-outline', onPress: () => handleNavigation('AdminMap', { routeType: 'line230' }), color: '#9C27B0' });
  }

  // Solo para Admin
  if (isAdmin) {
    menuItems.push({ id: 'admin-dashboard', title: 'Panel Admin', icon: 'shield-checkmark-outline', onPress: () => handleNavigation('AdminDashboard'), color: '#9C27B0' });
    menuItems.push({ id: 'admin-lines', title: 'Gestión de Líneas', icon: 'git-compare-outline', onPress: () => handleNavigation('AdminLines'), color: '#00796B' });

    // Rutas dinámicas guardadas en Firestore (visibles solo para admin)
    if (persistedRoutes && persistedRoutes.length > 0) {
      persistedRoutes.forEach(r => {
        const coords = Array.isArray(r.coordinates) && r.coordinates.length > 0 && Array.isArray(r.coordinates[0])
          ? // Si ya está como pares, asumimos [lng,lat] y lo usamos tal cual
            r.coordinates
          : // Si está guardado como objetos {lng,lat}, convertir a [lng,lat]
            (r.coordinates || []).map(c => [c.lng, c.lat]);
        menuItems.push({
          id: `route_${r.id}`,
          title: r.name,
          icon: 'bus-outline',
          onPress: () => handleNavigation('AdminMap', { customRoute: { coordinates: coords, color: r.color, name: r.name } }),
          color: r.color || '#607D8B'
        });
      });
    }
  }

  // Solo para Pasajero
  if (userRole === USER_ROLES.PASSENGER) {
    // Nuevo acceso directo para buscar rutas
    menuItems.push({ id: 'buscar-ruta', title: 'Buscar Ruta', icon: 'navigate-outline', onPress: () => handleNavigation('RouteSearch'), color: '#2E86AB' });
    // Entrada existente para la pantalla principal de pasajero
    menuItems.push({ id: 'passenger-main', title: 'Buscar Viaje', icon: 'car-outline', onPress: () => handleNavigation('PassengerMain'), color: '#4CAF50' });
  }

  // Solo para Conductor
  if (userRole === USER_ROLES.DRIVER) {
    menuItems.push({ id: 'driver-main', title: 'Panel Conductor', icon: 'car-sport-outline', onPress: () => handleNavigation('DriverMain'), color: '#FF5722' });
  }

  // Logout si está autenticado
  if (user) {
    menuItems.push({ id: 'logout', title: 'Cerrar Sesión', icon: 'log-out-outline', onPress: handleLogout, color: '#F44336', separator: true });
  }

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
    paddingTop: 48,
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
    paddingTop: 15,
    paddingBottom: 55, // Menos espacio abajo
    borderTopWidth: 5,
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
