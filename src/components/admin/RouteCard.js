import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RouteCard = ({ 
  route, 
  onEdit, 
  onShow, 
  onDelete, 
  onShowDetails,
  isPersisted = true 
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const isLandscape = width > 900;

  const pointsInfo = route.points 
    ? `${route.points.length} puntos con detalles` 
    : `${route.coordinates?.length || 0} puntos`;
  
  const hasDetailedPoints = route.points && route.points.some(p => p.street || p.name);

  return (
    <View style={[
      styles.card,
      {
        marginHorizontal: isTablet ? 8 : 2,
        padding: isTablet ? 16 : 12
      }
    ]}>
      <View style={styles.cardHeader}>
        <View style={[
          styles.colorBox, 
          { 
            backgroundColor: route.color,
            width: isTablet ? 24 : 18,
            height: isTablet ? 24 : 18
          }
        ]} />
        <View style={styles.routeInfo}>
          <Text style={[
            styles.routeName,
            { fontSize: isTablet ? 18 : 16 }
          ]}>
            {route.name}
          </Text>
          <Text style={[
            styles.routeMeta,
            { fontSize: isTablet ? 14 : 12 }
          ]}>
            {pointsInfo}
          </Text>
          {hasDetailedPoints && (
            <View style={styles.detailsBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={styles.detailsText}>
                Con información de calles
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={[
        styles.actions,
        { 
          flexDirection: isLandscape ? 'row' : 'row',
          flexWrap: isLandscape ? 'nowrap' : 'wrap'
        }
      ]}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={onEdit}
          accessibilityLabel="Editar ruta"
        >
          <Ionicons name="pencil" size={14} color="#fff" />
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.showButton]} 
          onPress={onShow}
          accessibilityLabel="Mostrar ruta en mapa"
        >
          <Ionicons name="map" size={14} color="#fff" />
          <Text style={styles.buttonText}>Mostrar</Text>
        </TouchableOpacity>

        {hasDetailedPoints && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.detailsButton]} 
            onPress={onShowDetails}
            accessibilityLabel="Ver detalles de la ruta"
          >
            <Ionicons name="information-circle" size={14} color="#fff" />
            <Text style={styles.buttonText}>Detalles</Text>
          </TouchableOpacity>
        )}

        {isPersisted && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={onDelete}
            accessibilityLabel="Eliminar ruta"
          >
            <Ionicons name="trash" size={14} color="#fff" />
            <Text style={styles.buttonText}>Eliminar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginVertical: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorBox: {
    borderRadius: 6,
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  routeMeta: {
    color: '#666',
    marginBottom: 4,
  },
  detailsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailsText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#FFA000',
  },
  showButton: {
    backgroundColor: '#1976D2',
  },
  detailsButton: {
    backgroundColor: '#9C27B0',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
});

export default RouteCard;