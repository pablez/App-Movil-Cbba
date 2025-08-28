import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  TextInput
} from 'react-native';

// Importación condicional para evitar errores
let BarCodeScanner;
try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch (error) {
  console.log('BarCodeScanner no disponible:', error);
  BarCodeScanner = null;
}

const QRScannerComponent = ({ visible, onClose, onScan }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    if (BarCodeScanner) {
      (async () => {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    } else {
      // Si no hay scanner disponible, mostrar input manual
      setShowManualInput(true);
    }
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    processQRData(data);
  };

  const handleManualInput = () => {
    if (manualCode.trim()) {
      processQRData(manualCode);
    } else {
      Alert.alert('Error', 'Por favor ingresa un código válido');
    }
  };

  const processQRData = (data) => {
    try {
      // Intentar parsear el QR como JSON
      const qrData = JSON.parse(data);
      
      // Validar que tenga la estructura esperada
      if (qrData.type === 'transport_payment' && qrData.amount && qrData.reference) {
        onScan(qrData);
      } else {
        Alert.alert('Error', 'Código QR no válido para pagos de transporte');
      }
    } catch (error) {
      // Si falla el JSON, crear un objeto de prueba
      Alert.alert(
        'Código QR Simulado',
        'Para testing, se usará un pago simulado de 2.5 Bs',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Continuar',
            onPress: () => {
              onScan({
                type: 'transport_payment',
                amount: 2.5,
                reference: `MANUAL_${Date.now()}`
              });
            }
          }
        ]
      );
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setManualCode('');
  };

  // Si no hay scanner disponible o hay problemas, mostrar input manual
  if (!BarCodeScanner || hasPermission === false || showManualInput) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Código de Pago</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.errorText}>
              {!BarCodeScanner ? 'Scanner QR no disponible' : 
               hasPermission === false ? 'No se tiene acceso a la cámara' :
               'Ingreso manual de código'}
            </Text>
            
            <Text style={styles.instructionText}>
              Ingresa el código de pago manualmente:
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Ej: {'type':'transport_payment','amount':2.5,'reference':'PAY001'}"
              value={manualCode}
              onChangeText={setManualCode}
              multiline
            />
            
            <TouchableOpacity style={styles.processButton} onPress={handleManualInput}>
              <Text style={styles.processButtonText}>Procesar Pago</Text>
            </TouchableOpacity>
            
            <Text style={styles.testText}>
              Para testing, puedes usar cualquier texto y se creará un pago simulado
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text>Solicitando permiso de cámara...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Escanear Código QR</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.scanner}
          />
          
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.instructionText}>
            Apunta la cámara hacia el código QR de pago
          </Text>
          
          <TouchableOpacity 
            style={styles.manualButton} 
            onPress={() => setShowManualInput(true)}
          >
            <Text style={styles.manualButtonText}>Ingreso Manual</Text>
          </TouchableOpacity>
          
          {scanned && (
            <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
              <Text style={styles.scanAgainText}>Escanear otra vez</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2E86AB',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#2E86AB',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  footer: {
    padding: 20,
    backgroundColor: '#2E86AB',
  },
  instructionText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 10,
  },
  scanAgainButton: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanAgainText: {
    color: '#2E86AB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    fontSize: 14,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  processButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  processButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  manualButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  manualButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default QRScannerComponent;
