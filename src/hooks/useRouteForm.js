import { useState } from 'react';
import { Alert } from 'react-native';

export const useRouteForm = (initialRoute = null) => {
  const [formData, setFormData] = useState({
    name: initialRoute?.name || '',
    color: initialRoute?.color || '#FF5722',
    points: initialRoute?.points || [],
  });

  const [editingPointIndex, setEditingPointIndex] = useState(null);
  const [isEditing, setIsEditing] = useState(!!initialRoute);

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPoint = (point) => {
    setFormData(prev => ({
      ...prev,
      points: [...prev.points, point]
    }));
  };

  const updatePoint = (index, point) => {
    setFormData(prev => ({
      ...prev,
      points: prev.points.map((p, i) => i === index ? point : p)
    }));
  };

  const removePoint = (index) => {
    Alert.alert(
      'Eliminar punto',
      '¿Estás seguro de que deseas eliminar este punto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setFormData(prev => ({
              ...prev,
              points: prev.points.filter((_, i) => i !== index)
            }));
          }
        }
      ]
    );
  };

  const clearForm = () => {
    setFormData({
      name: '',
      color: '#FF5722',
      points: [],
    });
    setIsEditing(false);
    setEditingPointIndex(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la línea');
      return false;
    }
    
    if (formData.points.length < 2) {
      Alert.alert('Error', 'Selecciona al menos 2 puntos en el mapa');
      return false;
    }
    
    return true;
  };

  const getFormattedData = () => {
    // Convertir puntos a diferentes formatos necesarios
    const coordsPairs = formData.points.map(p => [p.longitude, p.latitude]);
    const coordsObjects = coordsPairs.map(c => ({ lng: c[0], lat: c[1] }));
    const pointsWithMetadata = formData.points.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
      street: p.street || '',
      name: p.name || '',
      coordinates: [p.longitude, p.latitude]
    }));

    return {
      name: formData.name,
      color: formData.color,
      coordinates: coordsObjects,
      points: pointsWithMetadata,
      totalPoints: formData.points.length,
      coordsPairs, // Para navegación al mapa
    };
  };

  return {
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
  };
};

export default useRouteForm;