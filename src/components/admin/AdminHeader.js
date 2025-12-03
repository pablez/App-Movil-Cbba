import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeaderWithDrawer from '../HeaderWithDrawer';
import { ROUTE_INFO } from '../../data/routes';

const AdminHeader = ({ 
  currentRoute, 
  onCloseRoute, 
  navigation 
}) => {
  const getHeaderTitle = () => {
    if (currentRoute && ROUTE_INFO[currentRoute]) {
      return `🚌 ${ROUTE_INFO[currentRoute].name}`;
    }
    return "📍 Mapa";
  };

  return (
    <HeaderWithDrawer 
      title={getHeaderTitle()}
      navigation={navigation}
    />
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1976D2',
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    marginRight: 12,
    padding: 6,
    borderRadius: 6,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#E3F2FD',
    marginTop: 2,
  },
});

export default AdminHeader;