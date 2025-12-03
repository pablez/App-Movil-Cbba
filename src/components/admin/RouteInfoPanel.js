import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTE_INFO } from '../../data/routes';

const RouteInfoPanel = ({ 
  currentRoute, 
  onCloseRoute 
}) => {
  if (!currentRoute || !ROUTE_INFO[currentRoute]) {
    return null;
  }

  const routeInfo = ROUTE_INFO[currentRoute];

  return (
    <View style={styles.routeInfoContainer}>
      <View style={styles.routeHeader}>
        <View style={[styles.routeIcon, { backgroundColor: routeInfo.color }]}>
          <Ionicons name="bus" size={16} color="#fff" />
        </View>
        <Text style={styles.routeTitle}>
          {routeInfo.name}
        </Text>
        <TouchableOpacity 
          onPress={onCloseRoute} 
          style={styles.closeRouteButton}
        >
          <Ionicons name="close" size={16} color="#666" />
        </TouchableOpacity>
      </View>
      <Text style={styles.routeDescription}>
        {routeInfo.description}
      </Text>
      <View style={styles.routeStats}>
        <View style={styles.routeStat}>
          <Text style={styles.routeStatText}>📏 {routeInfo.distance}</Text>
        </View>
        <View style={styles.routeStat}>
          <Text style={styles.routeStatText}>⏱️ {routeInfo.duration}</Text>
        </View>
        <View style={styles.routeStat}>
          <Text style={styles.routeStatText}>💰 {routeInfo.fare}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  routeInfoContainer: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  routeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  closeRouteButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f5f6f7',
  },
  routeDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeStat: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  routeStatText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
});

export default RouteInfoPanel;