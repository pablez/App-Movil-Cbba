import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;

// Colores base del sistema
export const COLORS = {
  primary: '#1976D2',
  primaryDark: '#0d47a1',
  secondary: '#FF5722',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#f44336',
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  border: '#e0e0e0',
  disabled: '#bdbdbd'
};

// Espaciado responsivo
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

// Fuentes responsivas
const getFontSize = (mobile, tablet = mobile) => isTablet ? tablet : mobile;

export const adminStyles = StyleSheet.create({
  // Contenedores principales
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  listContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 80,
  },
  formContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingTop: 80,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingTop: isTablet ? 24 : 16,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  headerTitle: {
    fontSize: getFontSize(20, 24),
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: getFontSize(12, 14),
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Botón flotante
  floatingButton: {
    position: 'absolute',
    right: SPACING.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  // Botones principales
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: SPACING.sm,
  },

  utilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    padding: SPACING.sm,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  utilityButtonText: {
    color: '#fff',
    fontSize: getFontSize(12, 14),
    fontWeight: '600',
    marginLeft: SPACING.xs,
    textAlign: 'center',
  },
  defaultRoutesButton: {
    backgroundColor: COLORS.warning,
  },
  publicRoutesButton: {
    backgroundColor: COLORS.success,
  },

  // Formulario
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  formTitle: {
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  formCloseButton: {
    padding: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },

  form: {
    padding: SPACING.md,
  },
  inputLabel: {
    fontSize: getFontSize(14, 16),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  // Botones del formulario
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    padding: SPACING.sm,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: getFontSize(12, 14),
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
    padding: SPACING.sm,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: getFontSize(12, 14),
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },

  // Lista de puntos
  pointsList: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
  },
  pointsListTitle: {
    fontSize: getFontSize(14, 16),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pointInfo: {
    flex: 1,
  },
  pointName: {
    fontSize: getFontSize(14, 16),
    fontWeight: '600',
    color: COLORS.text,
  },
  pointStreet: {
    fontSize: getFontSize(12, 14),
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pointCoords: {
    fontSize: getFontSize(10, 12),
    color: COLORS.disabled,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  pointEditButton: {
    backgroundColor: COLORS.warning,
    borderRadius: 4,
    padding: SPACING.xs,
    marginHorizontal: 2,
  },
  pointDeleteButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 4,
    padding: SPACING.xs,
    marginHorizontal: 2,
  },

  // Botón guardar
  formActions: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: SPACING.sm,
  },

  // Estados de carga y error
  loadingText: {
    fontSize: getFontSize(14, 16),
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: getFontSize(14, 16),
    color: COLORS.danger,
    marginVertical: SPACING.md,
    textAlign: 'center',
    marginHorizontal: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    marginTop: SPACING.md,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: getFontSize(14, 16),
    fontWeight: '600',
  },

  // Estilos para adaptabilidad
  responsiveText: {
    fontSize: getFontSize(14, 16),
  },
  responsiveSmallText: {
    fontSize: getFontSize(12, 14),
  },
  responsiveLargeText: {
    fontSize: getFontSize(18, 22),
  },
  responsivePadding: {
    padding: isTablet ? SPACING.lg : SPACING.md,
  },
  responsiveMargin: {
    margin: isTablet ? SPACING.lg : SPACING.md,
  },
});