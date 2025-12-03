import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { db, auth } from '../config/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export const useRouteManagement = () => {
  const [persistedRoutes, setPersistedRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Suscribirse a rutas de Firestore
  useEffect(() => {
    const q = query(collection(db, 'routes'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const routes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPersistedRoutes(routes);
          setError(null);
        } catch (err) {
          console.error('Error processing routes snapshot:', err);
          setError('Error procesando rutas');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error subscribing to routes:', err);
        setError('Error conectando con la base de datos');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const saveRoute = async (routeData) => {
    try {
      const userId = auth?.currentUser?.uid;
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const payload = {
        ...routeData,
        public: true,
        createdBy: userId,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'routes'), payload);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving route:', error);
      return { success: false, error: error.message };
    }
  };

  const updateRoute = async (routeId, routeData) => {
    try {
      const userId = auth?.currentUser?.uid;
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const payload = {
        ...routeData,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'routes', routeId), payload);
      return { success: true };
    } catch (error) {
      console.error('Error updating route:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteRoute = async (routeId) => {
    return new Promise((resolve) => {
      Alert.alert(
        'Confirmar eliminación',
        '¿Estás seguro de que deseas eliminar esta ruta?',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteDoc(doc(db, 'routes', routeId));
                resolve(true);
              } catch (error) {
                console.error('Error deleting route:', error);
                Alert.alert('Error', 'No se pudo eliminar la ruta: ' + error.message);
                resolve(false);
              }
            }
          }
        ]
      );
    });
  };

  return {
    persistedRoutes,
    loading,
    error,
    saveRoute,
    updateRoute,
    deleteRoute,
  };
};

export default useRouteManagement;