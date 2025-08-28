import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDyvw6YdotzdYWwKhfWOTj99_PmJzDiJO8",
  authDomain: "transportapp-cochabamba.firebaseapp.com",
  projectId: "transportapp-cochabamba",
  storageBucket: "transportapp-cochabamba.firebasestorage.app",
  messagingSenderId: "443534221039",
  appId: "1:443534221039:web:591b10b292727a5419851a",
  measurementId: "G-J35RR0PZQ6"
};

// Inicializar Firebase solo si no existe ya una instancia
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializar Auth con persistencia para React Native
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Si ya está inicializado, obtener la instancia existente
  auth = getAuth(app);
}

// Inicializar Firestore
const db = getFirestore(app);

// Inicializar Storage
const storage = getStorage(app);

// Exportar servicios
export { auth, db, storage };
export default app;
