# Guía de Configuración Firebase para TransportApp

## 1. Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear proyecto"
3. Nombra tu proyecto: "TransportApp-Cochabamba"
4. Habilita Google Analytics (opcional)
5. Crea el proyecto

## 2. Configurar Firestore Database

1. En Firebase Console, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Comenzar en modo de prueba"
4. Elige una ubicación (preferiblemente South America)

### Estructura de Colecciones Recomendada:

```
/users/{userId}
  - firstName: string
  - lastName: string
  - email: string
  - phone: string
  - role: string ('passenger', 'driver', 'admin')
  - createdAt: timestamp
  - vehicleInfo?: object (solo para conductores)

/trips/{tripId}
  - passengerId: string
  - driverId: string
  - passengerType: string
  - fare: number
  - pickupLocation: geopoint
  - destinationLocation: geopoint
  - status: string ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')
  - createdAt: timestamp
  - updatedAt: timestamp

/driverLocations/{driverId}
  - latitude: number
  - longitude: number
  - isOnline: boolean
  - timestamp: timestamp

/payments/{paymentId}
  - tripId: string
  - userId: string
  - amount: number
  - method: string ('cash', 'qr')
  - status: string
  - reference: string
  - createdAt: timestamp

/vehicles/{vehicleId}
  - driverId: string
  - plate: string
  - model: string
  - capacity: number
  - status: string ('active', 'inactive', 'maintenance')
  - createdAt: timestamp
```

## 3. Configurar Authentication

1. Ve a "Authentication"
2. Haz clic en "Comenzar"
3. En la pestaña "Sign-in method":
   - Habilita "Correo electrónico/contraseña"
   - Guarda los cambios

## 4. Configurar la App

1. En "Configuración del proyecto" > "Tus apps"
2. Haz clic en el ícono de Android para agregar una app Android
3. Introduce el ID del paquete: `com.transportapp.cochabamba`
4. Descarga el archivo `google-services.json`
5. Para iOS, haz clic en el ícono de iOS y sigue los pasos similares

## 5. Obtener Configuración Web

1. En "Configuración del proyecto" > "Tus apps"
2. Haz clic en el ícono web (</>)
3. Registra la app con nombre: "TransportApp Web"
4. Copia la configuración que aparece

## 6. Actualizar firebaseConfig.js

Reemplaza el contenido de `src/services/firebaseConfig.js` con tu configuración:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
```

## 7. Reglas de Seguridad Firestore

Ve a "Firestore Database" > "Reglas" y reemplaza con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios pueden leer/escribir solo sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Administradores pueden leer todos los usuarios
    match /users/{document=**} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Viajes: pasajeros y conductores pueden ver sus viajes
    match /trips/{tripId} {
      allow read, write: if request.auth != null && 
        (resource.data.passengerId == request.auth.uid || 
         resource.data.driverId == request.auth.uid);
      allow create: if request.auth != null;
    }
    
    // Ubicaciones de conductores: todos pueden leer, solo el conductor puede escribir
    match /driverLocations/{driverId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == driverId;
    }
    
    // Pagos: solo el usuario propietario puede ver sus pagos
    match /payments/{paymentId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Vehículos: solo el conductor propietario puede gestionar
    match /vehicles/{vehicleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        resource.data.driverId == request.auth.uid;
    }
  }
}
```

## 8. Testing

Para probar tu configuración:

1. Ejecuta `npm start` en tu proyecto
2. Intenta registrar un nuevo usuario
3. Verifica que aparezca en Firestore Database
4. Prueba el login con las credenciales creadas

## Notas Importantes

- **Seguridad**: Las reglas de Firestore arriba son básicas. En producción, implementa reglas más específicas.
- **Índices**: Firestore creará automáticamente índices simples, pero para consultas complejas necesitarás crear índices compuestos.
- **Costos**: Firestore cobra por operaciones de lectura/escritura. Optimiza tus consultas para reducir costos.

## Solución de Problemas Comunes

1. **Error de permisos**: Verifica que las reglas de Firestore permitan la operación
2. **Error de inicialización**: Confirma que tu `firebaseConfig.js` tenga las credenciales correctas
3. **Error de red**: Verifica tu conexión a internet y que Firebase esté accesible
