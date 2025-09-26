# Guía de Desarrollo y Testing - Ñan Go

## Comandos de Desarrollo

### Iniciar el Proyecto
```bash
cd TransportApp
npm start
```

### Ejecutar en Diferentes Plataformas
```bash
# Android (requiere Android Studio o emulador)
npm run android

# iOS (requiere Xcode en Mac)
npm run ios

# Web
npm run web
```

### Usar Expo Go
1. Instala Expo Go en tu dispositivo móvil
2. Escanea el código QR que aparece en la terminal
3. La app se cargará en tu dispositivo

## Estructura del Proyecto

```
TransportApp/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   └── QRScannerComponent.js
│   ├── context/            # Contextos de React
│   │   └── AuthContext.js
│   ├── navigation/         # Configuración de navegación
│   │   └── AppNavigator.js
│   ├── screens/           # Pantallas principales
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── PassengerScreen.js
│   │   ├── DriverScreen.js
│   │   ├── AdminScreen.js
│   │   └── PaymentScreen.js
│   ├── services/          # Servicios de API y Firebase
│   │   ├── firebaseConfig.js
│   │   └── firestoreService.js
│   └── utils/            # Utilidades y constantes
│       ├── constants.js
│       └── helpers.js
├── assets/               # Recursos estáticos
├── App.js               # Componente raíz
├── app.json            # Configuración de Expo
└── package.json        # Dependencias
```

## Funcionalidades por Rol

### 👤 Pasajero
- ✅ Registro y login
- ✅ Ver conductores cercanos en mapa
- ✅ Seleccionar tipo de pasajero (6 opciones con diferentes tarifas)
- ✅ Solicitar viaje
- ✅ Pagar en efectivo o con código QR
- 🔄 Ver estado del viaje en tiempo real

### 🚗 Conductor
- ✅ Registro con información de vehículo
- ✅ Toggle online/offline
- ✅ Ver solicitudes de viaje
- ✅ Aceptar/rechazar viajes
- ✅ Actualizar ubicación en tiempo real
- 🔄 Navegación GPS al punto de recogida

### 👨‍💼 Administrador
- ✅ Panel de control completo
- ✅ Gestión de usuarios (activar/desactivar/eliminar)
- ✅ Vista de vehículos registrados
- ✅ Historial de viajes
- 🔄 Reportes y estadísticas

## Testing Manual

### 1. Test de Registro
1. Abrir la app
2. Ir a "Registrarse"
3. Completar formulario:
   - **Pasajero**: Solo datos básicos
   - **Conductor**: Incluir información de vehículo
4. Verificar que se cree el usuario en Firebase
5. Verificar redirección automática según rol

### 2. Test de Login
1. Usar credenciales registradas
2. Verificar redirección según rol:
   - Pasajero → Mapa con conductores
   - Conductor → Panel de conductor
   - Admin → Panel administrativo

### 3. Test de Funcionalidad de Pasajero
1. Permitir permisos de ubicación
2. Verificar que aparezca mapa centrado en ubicación actual
3. Ver marcadores de conductores (simulados)
4. Cambiar tipo de pasajero y verificar cambio de tarifa
5. Solicitar viaje

### 4. Test de Funcionalidad de Conductor
1. Toggle estado online/offline
2. Verificar cambio de estado en interfaz
3. Ver solicitudes de viaje (simuladas)
4. Aceptar un viaje
5. Completar viaje

### 5. Test de Pago con QR
1. Desde pantalla de pago, seleccionar "Código QR"
2. Verificar apertura de cámara
3. Usar código QR de prueba:
```json
{
  "type": "transport_payment",
  "amount": 2.5,
  "reference": "PAY_TEST_001"
}
```
4. Verificar procesamiento de pago

### 6. Test de Panel Administrativo
1. Login como admin
2. Navegar entre pestañas (Usuarios, Vehículos, Viajes)
3. Activar/desactivar usuario
4. Verificar datos mostrados

## Datos de Prueba

### Usuarios de Prueba
Crea estos usuarios para testing completo:

```javascript
// Pasajero
{
  email: "pasajero@test.com",
  password: "123456",
  firstName: "Juan",
  lastName: "Pérez",
  phone: "+59170123456",
  role: "passenger"
}

// Conductor
{
  email: "conductor@test.com",
  password: "123456",
  firstName: "María",
  lastName: "García",
  phone: "+59170654321",
  role: "driver",
  vehicleInfo: {
    plate: "CBB-1234",
    model: "Toyota Hiace",
    capacity: "15"
  }
}

// Administrador
{
  email: "admin@test.com",
  password: "123456",
  firstName: "Carlos",
  lastName: "López",
  phone: "+59170987654",
  role: "admin"
}
```

## Problemas Comunes y Soluciones

### 1. Error de Permisos de Ubicación
**Problema**: App no obtiene ubicación
**Solución**: 
- Verificar permisos en configuración del dispositivo
- En Android: Configuración > Apps > TransportApp > Permisos > Ubicación

### 2. Error de Cámara en Scanner QR
**Problema**: Cámara no se abre
**Solución**:
- Verificar permisos de cámara
- Reiniciar la app
- En iOS: Configuración > Privacidad > Cámara > TransportApp

### 3. Firebase Connection Error
**Problema**: No conecta con Firebase
**Solución**:
- Verificar configuración en `firebaseConfig.js`
- Comprobar conexión a internet
- Verificar reglas de Firestore

### 4. Mapa No Se Carga
**Problema**: MapView muestra pantalla en blanco
**Solución**:
- En Android: Verificar Google Maps API key
- Reiniciar la app
- Verificar permisos de ubicación

## Mejoras Futuras

### Próximas Funcionalidades
- 🔄 Notificaciones push
- 🔄 Chat entre pasajero y conductor
- 🔄 Calificación y comentarios
- 🔄 Historial de viajes para pasajeros
- 🔄 Rutas optimizadas con OpenRouteService
- 🔄 Pagos con tarjetas de crédito
- 🔄 Sistema de recompensas
- 🔄 Reportes avanzados para admin

### Optimizaciones Técnicas
- 🔄 Implementar Redux para estado global
- 🔄 Caché de datos offline
- 🔄 Lazy loading de componentes
- 🔄 Optimización de renders
- 🔄 Testing automatizado con Jest

## Deployment

### Para Testing
```bash
# Crear build para Android
npx eas build --platform android --profile preview

# Crear build para iOS
npx eas build --platform ios --profile preview
```

### Para Producción
```bash
# Android Play Store
npx eas build --platform android --profile production

# iOS App Store
npx eas build --platform ios --profile production
```

## Contacto y Soporte

Para dudas sobre el desarrollo:
- Revisar documentación de Expo: https://docs.expo.dev/
- Firebase Documentation: https://firebase.google.com/docs
- React Navigation: https://reactnavigation.org/docs/getting-started
