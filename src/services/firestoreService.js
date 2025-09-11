import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, // Agregamos setDoc para crear/actualizar documentos
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Servicio para gestionar usuarios
export const UserService = {
  // Crear usuario en Firestore
  createUser: async (userId, userData) => {
    try {
      await setDoc(doc(db, 'users', userId), userData);
      return { success: true };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener datos de usuario
  getUser: async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      } else {
        return { success: false, error: 'Usuario no encontrado' };
      }
    } catch (error) {
      console.error('Error getting user:', error);
      return { success: false, error: error.message };
    }
  },

  // Actualizar usuario
  updateUser: async (userId, updates) => {
    try {
      await updateDoc(doc(db, 'users', userId), updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener todos los usuarios (solo para admin)
  getAllUsers: async () => {
    try {
      // Comprobación cliente: asegurar que hay un usuario autenticado
      if (!auth || !auth.currentUser) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // Comprobar que el usuario actual tiene role 'admin' o 'ADMIN' en su documento
      const meDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!meDoc.exists()) {
        return { success: false, error: 'Documento del usuario no encontrado' };
      }
      const myRole = meDoc.data()?.role;
      if (!(myRole === 'admin' || myRole === 'ADMIN')) {
        return { success: false, error: 'No tienes permisos para listar usuarios' };
      }

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = [];
      usersSnapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: users };
    } catch (error) {
      console.error('Error getting users:', error);
      return { success: false, error: error.message };
    }
  }
};

// Servicio para gestionar viajes
export const TripService = {
  // Crear solicitud de viaje
  createTrip: async (tripData) => {
    try {
      const docRef = await addDoc(collection(db, 'trips'), {
        ...tripData,
        createdAt: new Date(),
        status: 'pending'
      });
      return { success: true, tripId: docRef.id };
    } catch (error) {
      console.error('Error creating trip:', error);
      return { success: false, error: error.message };
    }
  },

  // Actualizar estado del viaje
  updateTripStatus: async (tripId, status, additionalData = {}) => {
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        status,
        ...additionalData,
        updatedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating trip:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener viajes pendientes para conductores
  getPendingTrips: (callback) => {
    const q = query(
      collection(db, 'trips'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const trips = [];
      snapshot.forEach(doc => {
        trips.push({ id: doc.id, ...doc.data() });
      });
      callback(trips);
    });
  },

  // Obtener viajes de un usuario específico
  getUserTrips: async (userId, role) => {
    try {
      const field = role === 'driver' ? 'driverId' : 'passengerId';
      const q = query(
        collection(db, 'trips'),
        where(field, '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const tripsSnapshot = await getDocs(q);
      const trips = [];
      tripsSnapshot.forEach(doc => {
        trips.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: trips };
    } catch (error) {
      console.error('Error getting user trips:', error);
      return { success: false, error: error.message };
    }
  }
};

// Servicio para ubicaciones de conductores
export const LocationService = {
  // Actualizar ubicación del conductor - usa setDoc para crear/actualizar
  updateDriverLocation: async (driverId, location) => {
    try {
      // setDoc con merge permite crear el documento si no existe o actualizarlo si existe
      await setDoc(doc(db, 'driverLocations', driverId), {
        ...location,
        timestamp: new Date(),
        isOnline: true
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error updating location:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener conductores cercanos
  getNearbyDrivers: (callback) => {
    const q = query(
      collection(db, 'driverLocations'),
      where('isOnline', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
      const drivers = [];
      snapshot.forEach(doc => {
        drivers.push({ id: doc.id, ...doc.data() });
      });
      callback(drivers);
    });
  },

  // Marcar conductor como offline - usa setDoc para asegurar que el documento existe
  setDriverOffline: async (driverId) => {
    try {
      // Primero verificamos si el documento existe, si no lo creamos
      const driverDoc = await getDoc(doc(db, 'driverLocations', driverId));
      
      if (driverDoc.exists()) {
        // Si existe, actualizamos
        await updateDoc(doc(db, 'driverLocations', driverId), {
          isOnline: false,
          timestamp: new Date()
        });
      } else {
        // Si no existe, creamos el documento con estado offline
        await setDoc(doc(db, 'driverLocations', driverId), {
          isOnline: false,
          timestamp: new Date(),
          latitude: null,
          longitude: null,
          accuracy: null
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Error setting driver offline:', error);
      return { success: false, error: error.message };
    }
  }
};

// Servicio para pagos
export const PaymentService = {
  // Registrar pago
  recordPayment: async (paymentData) => {
    try {
      const docRef = await addDoc(collection(db, 'payments'), {
        ...paymentData,
        createdAt: new Date(),
        status: 'completed'
      });
      return { success: true, paymentId: docRef.id };
    } catch (error) {
      console.error('Error recording payment:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener historial de pagos
  getPaymentHistory: async (userId) => {
    try {
      const q = query(
        collection(db, 'payments'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const paymentsSnapshot = await getDocs(q);
      const payments = [];
      paymentsSnapshot.forEach(doc => {
        payments.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: payments };
    } catch (error) {
      console.error('Error getting payment history:', error);
      return { success: false, error: error.message };
    }
  }
};

// Servicio para vehículos
export const VehicleService = {
  // Registrar vehículo
  addVehicle: async (vehicleData) => {
    try {
      const docRef = await addDoc(collection(db, 'vehicles'), {
        ...vehicleData,
        createdAt: new Date(),
        status: 'active'
      });
      return { success: true, vehicleId: docRef.id };
    } catch (error) {
      console.error('Error adding vehicle:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener vehículos de un conductor
  getDriverVehicles: async (driverId) => {
    try {
      const q = query(
        collection(db, 'vehicles'),
        where('driverId', '==', driverId)
      );
      
      const vehiclesSnapshot = await getDocs(q);
      const vehicles = [];
      vehiclesSnapshot.forEach(doc => {
        vehicles.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: vehicles };
    } catch (error) {
      console.error('Error getting driver vehicles:', error);
      return { success: false, error: error.message };
    }
  },

  // Actualizar vehículo
  updateVehicle: async (vehicleId, updates) => {
    try {
      await updateDoc(doc(db, 'vehicles', vehicleId), {
        ...updates,
        updatedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return { success: false, error: error.message };
    }
  }
};
