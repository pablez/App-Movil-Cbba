// Tipos de usuarios y sus roles
export const USER_ROLES = {
  PASSENGER: 'PASSENGER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN'
};

// Tipos de pasajeros y sus tarifas (en Bs)
export const PASSENGER_TYPES = {
  REGULAR: {
    name: 'Regular',
    price: 2.5,
    id: 'regular',
    requiresID: true,
    requiresStudentCard: false
  },
  STUDENT: {
    name: 'Estudiante',
    price: 1.0,
    id: 'student',
    requiresID: true,
    requiresStudentCard: true
  },
  UNIVERSITY: {
    name: 'Universitario',
    price: 1.0,
    id: 'university',
    requiresID: true,
    requiresStudentCard: true
  },
  SENIOR: {
    name: 'Adulto mayor',
    price: 1.5,
    id: 'senior',
    requiresID: true,
    requiresStudentCard: false
  },
  DISABLED: {
    name: 'Discapacitado',
    price: 1.5,
    id: 'disabled',
    requiresID: true,
    requiresStudentCard: false
  }
};

// Rutas de ejemplo para conductores
export const EXAMPLE_ROUTES = [
  'Av. Capitán Ustáriz',
  'Av. Aroma',
  'Av. América',
  'Av. Heroínas',
  'Av. Blanco Galindo',
  'Av. Pando',
  'Plaza 14 de Septiembre',
  'Terminal de Buses',
  'Universidad Mayor de San Simón',
  'Mercado La Cancha'
];

// Líneas de transporte de ejemplo
export const EXAMPLE_LINES = [
  '150', '107', 'R', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
];

// Métodos de pago
export const PAYMENT_METHODS = {
  CASH: 'cash',
  QR: 'qr'
};

// Estados de viaje
export const TRIP_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// OpenRouteService API Key
export const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliYzhiZDJmY2RjMTQxNzRhZGRkM2UyZDUyNWRhYmJiIiwiaCI6Im11cm11cjY0In0=';
