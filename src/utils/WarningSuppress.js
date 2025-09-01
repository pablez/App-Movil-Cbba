// Suprimir advertencias conocidas que no afectan la funcionalidad
import { LogBox } from 'react-native';

// Suprimir advertencias específicas
LogBox.ignoreLogs([
  'BarCodeScanner no disponible',
  'Cannot find native module \'ExpoBarCodeScanner\'',
  'Non-serializable values were found in the navigation state',
  'Warning: Cannot update a component',
  'VirtualizedLists should never be nested',
]);

// Suprimir todas las advertencias amarillas (opcional)
LogBox.ignoreAllLogs(false); // Mantener en false para debugging

export default LogBox;
