import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDyvw6YdotzdYWwKhfWOTj99_PmJzDiJO8",
  authDomain: "transportapp-cochabamba.firebaseapp.com",
  projectId: "transportapp-cochabamba",
  // Corregido a formato típico de bucket: <project-id>.appspot.com
  storageBucket: "transportapp-cochabamba.appspot.com",
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
// En React Native/Expo algunas conexiones de Firestore por WebChannel fallan.
// Forzamos long-polling y desactivamos fetch streams para mayor compatibilidad.
// Inicializar Firestore preferiblemente con long-polling (necesario en React Native/Expo)
// Usamos una bandera global para evitar re-inicializar durante hot-reload
let db;
try {
  if (!global.__RN_FIRESTORE_INITIALIZED) {
    db = initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false });
    global.__RN_FIRESTORE_INITIALIZED = true;
  } else {
    // Si ya se inicializó en otra ejecución, obtener la instancia existente
    db = getFirestore(app);
  }
} catch (e) {
  // Fallback si initializeFirestore falla por alguna razón
  console.warn('initializeFirestore failed, falling back to getFirestore()', e);
  db = getFirestore(app);
}

// Activar logs detallados en desarrollo para diagnosticar problemas de conexión
try {
  if (__DEV__) {
    // Reducir ruido de logs en desarrollo
    try {
      setLogLevel('warn');
    } catch (e) {
      // algunos SDKs más antiguos pueden no soportar setLogLevel
    }
  }
} catch (e) {
  // ignore if setLogLevel not available
}

// Inicializar Storage
const storage = getStorage(app);

// Exportar servicios
export { auth, db, storage };
export default app;
