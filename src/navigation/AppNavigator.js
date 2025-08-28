import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../utils/constants';

// Pantallas de autenticación
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Pantallas principales
import PassengerScreen from '../screens/PassengerScreen';
import DriverScreen from '../screens/DriverScreen';
import AdminScreen from '../screens/AdminScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminMapScreen from '../screens/AdminMapScreen';
import LocationSearchScreen from '../screens/LocationSearchScreen';
import UserApprovalScreen from '../screens/UserApprovalScreen';
import PaymentScreen from '../screens/PaymentScreen';
import SimpleTestScreen from '../screens/SimpleTestScreen';

const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const PassengerStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="PassengerMain" component={SimpleTestScreen} />
    <Stack.Screen 
      name="Payment" 
      component={PaymentScreen}
      options={{ 
        presentation: 'modal',
        headerShown: false 
      }}
    />
  </Stack.Navigator>
);

const DriverStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="DriverMain" component={SimpleTestScreen} />
  </Stack.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="AdminMap" component={AdminMapScreen} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="LocationSearch" component={LocationSearchScreen} />
    <Stack.Screen 
      name="UserApproval" 
      component={UserApprovalScreen}
      options={{ 
        headerShown: false 
      }}
    />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { user, userRole, isAdmin, loading } = useAuth();

  if (loading) {
    return null; // O un componente de loading
  }

  if (!user) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }

  // Determinar qué stack mostrar basado en el rol del usuario
  const getMainStack = () => {
    if (isAdmin) {
      return <AdminStack />;
    }
    
    switch (userRole) {
      case USER_ROLES.PASSENGER:
        return <PassengerStack />;
      case USER_ROLES.DRIVER:
        return <DriverStack />;
      default:
        return <PassengerStack />; // Por defecto, pantalla de pasajero
    }
  };

  return (
    <NavigationContainer>
      {getMainStack()}
    </NavigationContainer>
  );
};

export default AppNavigator;
