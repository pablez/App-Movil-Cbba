import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

// Componentes refactorizados
import ResponsiveLayout, { ResponsiveGrid, ResponsiveRow } from '../../components/layout/ResponsiveLayout';
import ColorSwatch from '../../components/admin/ColorSwatch';
import RouteCard from '../../components/admin/RouteCard';
import PointFormModal from '../../components/admin/PointFormModal';

// Hooks personalizados
import useRouteManagement from '../../hooks/useRouteManagement';
import useRouteForm from '../../hooks/useRouteForm';

// Estilos y constantes
import { adminStyles as styles } from './styles/AdminStyles';
import { COLOR_OPTIONS } from './constants/AdminConstants';

const AdminLinesScreenRefactored = ({ navigation, route }) => {
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  // Hooks personalizados
  const { 
    persistedRoutes, 
    loading, 
    error, 
    saveRoute, 
    updateRoute, 
    deleteRoute 
  } = useRouteManagement();

  const {
    formData,
    editingPointIndex,
    isEditing,
    setEditingPointIndex,
    setIsEditing,
    updateField,
    addPoint,
    updatePoint,
    removePoint,
    clearForm,
    validateForm,
    getFormattedData,
  } = useRouteForm();

  // Estados locales del UI
  const [showPointModal, setShowPointModal] = useState(false);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [selectedRouteForDetails, setSelectedRouteForDetails] = useState(null);
  const [showRouteDetailsModal, setShowRouteDetailsModal] = useState(false);

  // Manejar parámetros de navegación
  useEffect(() => {
    if (!isFocused) return;
    
    // Punto seleccionado desde AdminMap
    if (route?.params?.adminMapPoint) {
      const point = route.params.adminMapPoint;
      if (point?.latitude && point?.longitude) {
        setPendingPoint(point);
        setEditingPointIndex(null);
        setShowPointModal(true);
      }
      navigation.setParams({ adminMapPoint: null });
    }

    // Ruta editada desde mapa
    if (route?.params?.adminEditedRoute) {
      const edited = route.params.adminEditedRoute;
      if (edited?.coordinates) {
        const points = edited.coordinates.map(c => ({ 
          latitude: c[1], 
          longitude: c[0] 
        }));
        // Implementar lógica de carga de ruta editada
        Alert.alert('Edición', 'Ruta cargada desde el mapa para continuar la edición');
      }
      navigation.setParams({ adminEditedRoute: null });
    }
  }, [isFocused, route?.params, navigation]);

  // Handlers para el formulario de puntos
  const handleSavePoint = (pointData) => {
    if (!pendingPoint) return;
    
    const newPoint = {
      latitude: pendingPoint.latitude,
      longitude: pendingPoint.longitude,
      street: pointData.street,
      name: pointData.name,
    };

    if (editingPointIndex !== null && editingPointIndex >= 0) {
      updatePoint(editingPointIndex, newPoint);
      Alert.alert('Punto actualizado', `${newPoint.name || 'Punto'} actualizado correctamente`);
    } else {
      addPoint(newPoint);
      Alert.alert('Punto agregado', `${newPoint.name || 'Punto'} agregado correctamente`);
    }

    setShowPointModal(false);
    setPendingPoint(null);
    setEditingPointIndex(null);
  };

  const handleViewPointOnMap = (pointData) => {
    if (!pendingPoint) return;
    
    const coords = [[pendingPoint.longitude, pendingPoint.latitude]];
    setShowPointModal(false);
    
    navigation.navigate('EditMap', {
      customRoute: {
        coordinates: coords,
        color: formData.color,
        name: pointData.name || 'Punto'
      },
      returnTo: 'AdminLines'
    });
  };

  // Handlers para rutas
  const handleSaveRoute = async () => {
    if (!validateForm()) return;

    const routeData = getFormattedData();
    const result = await saveRoute(routeData);

    if (result.success) {
      navigation.navigate('AdminMap', {
        customRoute: {
          coordinates: routeData.coordsPairs,
          color: routeData.color,
          name: routeData.name
        }
      });
      clearForm();
    } else {
      Alert.alert('Error', 'No se pudo guardar la ruta: ' + result.error);
    }
  };

  const handleDeleteRoute = async (routeId) => {
    const deleted = await deleteRoute(routeId);
    if (deleted) {
      Alert.alert('Éxito', 'Ruta eliminada correctamente');
    }
  };

  // Convertir coordenadas para compatibilidad
  const convertCoordsToPairs = (coords) => {
    if (!coords) return [];
    if (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
      return coords;
    }
    return coords.map(c => [c.lng, c.lat]);
  };

  // Renderizado condicional basado en estado
  if (loading) {
    return (
      <ResponsiveLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Cargando rutas...</Text>
        </View>
      </ResponsiveLayout>
    );
  }

  if (error) {
    return (
      <ResponsiveLayout>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      {/* Header flotante */}
      <TouchableOpacity
        style={[styles.floatingButton, { top: isTablet ? 24 : 16 }]}
        onPress={() => navigation.openDrawer && navigation.openDrawer()}
        accessibilityLabel="Abrir menú"
      >
        <Ionicons name="menu" size={25} color="#fff" />
      </TouchableOpacity>

      {/* Header principal */}
      <View style={styles.header}>
        <ResponsiveRow align="center">
          <Ionicons name="bus" size={isTablet ? 32 : 28} color="#1976D2" />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { fontSize: isTablet ? 24 : 20 }]}>
              Administrar Líneas
            </Text>
            <Text style={[styles.headerSubtitle, { fontSize: isTablet ? 14 : 12 }]}>
              Crea, edita y muestra las rutas del sistema
            </Text>
          </View>
        </ResponsiveRow>
      </View>

      {!isEditing ? (
        // Vista de lista de rutas
        <View style={styles.listContainer}>
          {/* Botón crear línea */}
          <TouchableOpacity 
            style={[styles.createButton, { padding: isTablet ? 16 : 12 }]} 
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={[styles.createButtonText, { fontSize: isTablet ? 16 : 14 }]}>
              Crear Nueva Línea
            </Text>
          </TouchableOpacity>

          {/* Botones de utilidad */}
          <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
            <TouchableOpacity style={[styles.utilityButton, styles.defaultRoutesButton]}>
              <Ionicons name="download" size={16} color="#fff" />
              <Text style={styles.utilityButtonText}>Cargar rutas por defecto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.utilityButton, styles.publicRoutesButton]}>
              <Ionicons name="globe" size={16} color="#fff" />
              <Text style={styles.utilityButtonText}>Marcar todas como públicas</Text>
            </TouchableOpacity>
          </ResponsiveGrid>

          {/* Lista de rutas */}
          <FlatList
            data={persistedRoutes}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <RouteCard
                route={item}
                onEdit={() => {
                  const coords = convertCoordsToPairs(item.coordinates);
                  navigation.navigate('EditMap', {
                    editMode: true,
                    editableRoute: {
                      id: item.id,
                      coordinates: coords,
                      name: item.name,
                      color: item.color
                    },
                    returnTo: 'AdminLines'
                  });
                }}
                onShow={() => {
                  const coords = convertCoordsToPairs(item.coordinates);
                  navigation.navigate('AdminMap', {
                    customRoute: {
                      coordinates: coords,
                      color: item.color,
                      name: item.name
                    }
                  });
                }}
                onDelete={() => handleDeleteRoute(item.id)}
                onShowDetails={() => {
                  setSelectedRouteForDetails(item);
                  setShowRouteDetailsModal(true);
                }}
                isPersisted={!!persistedRoutes.find(r => r.id === item.id)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </View>
      ) : (
        // Vista de formulario de edición
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { fontSize: isTablet ? 22 : 18 }]}>
              {formData.name ? `Editando: ${formData.name}` : 'Nueva Línea'}
            </Text>
            <TouchableOpacity 
              style={styles.formCloseButton}
              onPress={() => {
                Alert.alert(
                  'Cancelar edición',
                  '¿Estás seguro? Se perderán los cambios no guardados.',
                  [
                    { text: 'Continuar editando', style: 'cancel' },
                    { text: 'Cancelar', style: 'destructive', onPress: clearForm }
                  ]
                );
              }}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <Text style={styles.inputLabel}>Nombre de la línea</Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="Ej: Línea 150"
              style={[styles.input, { fontSize: isTablet ? 16 : 14 }]}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Seleccionar color</Text>
            <ResponsiveGrid columns={{ mobile: 4, tablet: 6, desktop: 8 }}>
              {COLOR_OPTIONS.map(color => (
                <ColorSwatch
                  key={color}
                  color={color}
                  isSelected={formData.color === color}
                  onSelect={(selectedColor) => updateField('color', selectedColor)}
                  size={isTablet ? 'large' : 'medium'}
                />
              ))}
            </ResponsiveGrid>

            <Text style={styles.inputLabel}>Color personalizado (hex)</Text>
            <TextInput
              value={formData.color}
              onChangeText={(text) => updateField('color', text)}
              placeholder="#FF5722"
              style={[styles.input, { fontSize: isTablet ? 16 : 14 }]}
            />

            <Text style={styles.inputLabel}>
              Puntos seleccionados: {formData.points.length}
            </Text>
            
            <ResponsiveRow spacing="medium">
              <TouchableOpacity 
                style={[styles.mapButton, { flex: 1 }]}
                onPress={() => navigation.navigate('AdminMap', { 
                  editMode: true, 
                  returnTo: 'AdminLines' 
                })}
              >
                <Ionicons name="location" size={16} color="#fff" />
                <Text style={styles.mapButtonText}>Seleccionar en mapa</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.clearButton, { flex: 1 }]}
                onPress={() => updateField('points', [])}
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.clearButtonText}>Limpiar puntos</Text>
              </TouchableOpacity>
            </ResponsiveRow>

            {/* Lista de puntos */}
            {formData.points.length > 0 && (
              <View style={styles.pointsList}>
                <Text style={styles.pointsListTitle}>Puntos de la ruta:</Text>
                {formData.points.map((point, index) => (
                  <View key={`${point.latitude}_${point.longitude}_${index}`} style={styles.pointItem}>
                    <View style={styles.pointInfo}>
                      <Text style={styles.pointName}>
                        {point.name || `Punto ${index + 1}`}
                      </Text>
                      <Text style={styles.pointStreet}>
                        {point.street || 'Sin calle/avenida especificada'}
                      </Text>
                      <Text style={styles.pointCoords}>
                        {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                      </Text>
                    </View>
                    <ResponsiveRow spacing="small">
                      <TouchableOpacity 
                        style={styles.pointEditButton}
                        onPress={() => {
                          setPendingPoint(point);
                          setEditingPointIndex(index);
                          setShowPointModal(true);
                        }}
                      >
                        <Ionicons name="pencil" size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.pointDeleteButton}
                        onPress={() => removePoint(index)}
                      >
                        <Ionicons name="trash" size={14} color="#fff" />
                      </TouchableOpacity>
                    </ResponsiveRow>
                  </View>
                ))}
              </View>
            )}

            {/* Botones de acción */}
            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.saveButton, { padding: isTablet ? 16 : 12 }]}
                onPress={handleSaveRoute}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={[styles.saveButtonText, { fontSize: isTablet ? 16 : 14 }]}>
                  Guardar y Mostrar en Mapa
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal para formulario de punto */}
      <PointFormModal
        visible={showPointModal}
        onClose={() => {
          setShowPointModal(false);
          setPendingPoint(null);
          setEditingPointIndex(null);
        }}
        onSave={handleSavePoint}
        onViewOnMap={handleViewPointOnMap}
        initialData={editingPointIndex !== null ? formData.points[editingPointIndex] : null}
      />
    </ResponsiveLayout>
  );
};

export default AdminLinesScreenRefactored;