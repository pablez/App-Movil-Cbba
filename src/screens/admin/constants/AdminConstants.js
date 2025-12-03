// Constantes para colores predefinidos
export const COLOR_OPTIONS = [
  '#FF5722', // Rojo-naranja
  '#2196F3', // Azul
  '#4CAF50', // Verde
  '#FF9800', // Naranja
  '#9C27B0', // Púrpura
  '#607D8B', // Azul gris
  '#795548', // Marrón
  '#F44336', // Rojo
  '#00BCD4', // Cian
  '#8BC34A', // Verde claro
  '#FFC107', // Ámbar
  '#E91E63', // Rosa
  '#3F51B5', // Índigo
  '#009688', // Verde azulado
  '#CDDC39', // Lima
  '#FF7043'  // Naranja profundo
];

// Tipos de dispositivos para responsividad
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
};

// Breakpoints para responsive design
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024
};

// Configuración de columnas responsive por defecto
export const DEFAULT_GRID_COLUMNS = {
  mobile: 1,
  tablet: 2,
  desktop: 3
};

// Tamaños de fuente base
export const FONT_SIZES = {
  xs: { mobile: 10, tablet: 12 },
  sm: { mobile: 12, tablet: 14 },
  md: { mobile: 14, tablet: 16 },
  lg: { mobile: 16, tablet: 18 },
  xl: { mobile: 18, tablet: 22 },
  xxl: { mobile: 20, tablet: 24 }
};

// Espaciado estándar
export const SPACING_VALUES = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

// Estados de formulario
export const FORM_STATES = {
  VIEWING: 'viewing',
  CREATING: 'creating',
  EDITING: 'editing'
};

// Tipos de acciones para rutas
export const ROUTE_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  SHOW: 'show',
  EDIT: 'edit'
};

// Configuración para point modal
export const POINT_MODAL_CONFIG = {
  maxNameLength: 50,
  maxStreetLength: 100,
  defaultName: 'Punto de parada',
  defaultStreet: 'Sin especificar'
};

// Configuración para validación de formularios
export const VALIDATION_RULES = {
  routeName: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-\_\.]+$/
  },
  routeColor: {
    required: true,
    pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },
  minPoints: 2,
  maxPoints: 50
};

// Mensajes de error estándar
export const ERROR_MESSAGES = {
  ROUTE_NAME_REQUIRED: 'El nombre de la ruta es obligatorio',
  ROUTE_NAME_TOO_SHORT: 'El nombre debe tener al menos 3 caracteres',
  ROUTE_NAME_TOO_LONG: 'El nombre no puede exceder 50 caracteres',
  ROUTE_NAME_INVALID: 'El nombre contiene caracteres no válidos',
  ROUTE_COLOR_REQUIRED: 'Debe seleccionar un color para la ruta',
  ROUTE_COLOR_INVALID: 'El color debe ser un código hexadecimal válido',
  INSUFFICIENT_POINTS: 'La ruta debe tener al menos 2 puntos',
  TOO_MANY_POINTS: 'La ruta no puede tener más de 50 puntos',
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  SAVE_ERROR: 'No se pudo guardar la ruta. Inténtalo de nuevo.',
  DELETE_ERROR: 'No se pudo eliminar la ruta. Inténtalo de nuevo.',
  LOAD_ERROR: 'No se pudieron cargar las rutas. Inténtalo de nuevo.'
};

// Configuración para animaciones
export const ANIMATION_CONFIG = {
  duration: {
    short: 200,
    medium: 300,
    long: 500
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out'
  }
};

// Configuración para accesibilidad
export const ACCESSIBILITY_CONFIG = {
  minimumTouchTarget: 44, // Píxeles mínimos para toque
  focusable: true,
  accessibilityTraits: {
    button: 'button',
    header: 'header',
    text: 'text',
    image: 'image'
  }
};