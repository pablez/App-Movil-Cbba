import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PublicRoutesScreen from '../screens/PublicRoutesScreen';
import PublicMapScreen from '../screens/PublicMapScreen';
import GuestScreen from '../screens/GuestScreen';
import LoginScreen from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Navegador de pestañas solo para Rutas y Mapa
const TabsOnly = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 70 + Math.max(insets.bottom, 0),
            elevation: 8,
            backgroundColor: '#ffffff',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: -2 },
            shadowRadius: 8,
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 10),
            paddingHorizontal: 20,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
          tabBarActiveTintColor: '#1976D2',
          tabBarInactiveTintColor: '#9E9E9E',
          tabBarIcon: ({ color, size, focused }) => {
            let iconName = 'ellipse';
            if (route.name === 'Rutas') iconName = focused ? 'bus' : 'bus-outline';
            else if (route.name === 'Mapa') iconName = focused ? 'map' : 'map-outline';
            return <Ionicons name={iconName} size={24} color={color} />;
          }
        })}
      >
        <Tab.Screen name="Rutas" component={PublicRoutesScreen} />
        <Tab.Screen name="Mapa" component={GuestScreen} />
      </Tab.Navigator>
    </View>
  );
};

// Stack navigator principal que maneja las transiciones
const BottomTabs = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Pantalla principal con tabs (Rutas y Mapa) */}
      <Stack.Screen name="MainTabs" component={TabsOnly} />
      {/* Login como pantalla separada sin tabs */}
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* PublicMap como pantalla separada sin tabs */}
      <Stack.Screen name="PublicMap" component={PublicMapScreen} />
    </Stack.Navigator>
  );
};

export default BottomTabs;
