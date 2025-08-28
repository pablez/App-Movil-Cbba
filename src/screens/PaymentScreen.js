import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import QRScannerComponent from '../components/QRScannerComponent';
import { PASSENGER_TYPES, PAYMENT_METHODS } from '../utils/constants';
import { calculateFare } from '../utils/helpers';

const PaymentScreen = ({ visible, onClose, onPaymentComplete, tripDetails }) => {
  const [passengerType, setPassengerType] = useState('GENERAL');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [fare, setFare] = useState(calculateFare('GENERAL'));

  const handlePassengerTypeChange = (newType) => {
    setPassengerType(newType);
    setFare(calculateFare(newType));
  };

  const handleCashPayment = () => {
    Alert.alert(
      'Pago en Efectivo',
      `Confirma el pago de ${fare} Bs en efectivo`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          onPress: () => {
            const paymentData = {
              method: PAYMENT_METHODS.CASH,
              amount: fare,
              passengerType: PASSENGER_TYPES[passengerType].name,
              timestamp: new Date().toISOString(),
              reference: `CASH_${Date.now()}`
            };
            onPaymentComplete(paymentData);
          }
        }
      ]
    );
  };

  const handleQRPayment = () => {
    setShowQRScanner(true);
  };

  const handleQRScanned = (qrData) => {
    setShowQRScanner(false);
    
    if (qrData.amount !== fare) {
      Alert.alert(
        'Error',
        `El monto del QR (${qrData.amount} Bs) no coincide con la tarifa (${fare} Bs)`
      );
      return;
    }

    Alert.alert(
      'Pago QR Procesado',
      `Pago de ${qrData.amount} Bs procesado exitosamente`,
      [
        {
          text: 'OK',
          onPress: () => {
            const paymentData = {
              method: PAYMENT_METHODS.QR,
              amount: qrData.amount,
              passengerType: PASSENGER_TYPES[passengerType].name,
              timestamp: new Date().toISOString(),
              reference: qrData.reference,
              qrData: qrData
            };
            onPaymentComplete(paymentData);
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Procesar Pago</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tripInfo}>
              <Text style={styles.tripInfoTitle}>Detalles del Viaje</Text>
              <Text style={styles.tripInfoText}>
                Conductor: {tripDetails?.driverName || 'N/A'}
              </Text>
              <Text style={styles.tripInfoText}>
                Vehículo: {tripDetails?.vehiclePlate || 'N/A'}
              </Text>
            </View>

            <View style={styles.passengerTypeSection}>
              <Text style={styles.sectionTitle}>Tipo de Pasajero</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={passengerType}
                  onValueChange={handlePassengerTypeChange}
                  style={styles.picker}
                >
                  {Object.entries(PASSENGER_TYPES).map(([key, type]) => (
                    <Picker.Item key={key} label={type.name} value={key} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.fareSection}>
              <Text style={styles.fareLabel}>Tarifa a Pagar:</Text>
              <Text style={styles.fareAmount}>{fare} Bs</Text>
            </View>

            <View style={styles.paymentMethodSection}>
              <Text style={styles.sectionTitle}>Método de Pago</Text>
              
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === PAYMENT_METHODS.CASH && styles.selectedPaymentOption
                ]}
                onPress={() => setPaymentMethod(PAYMENT_METHODS.CASH)}
              >
                <Text style={[
                  styles.paymentOptionText,
                  paymentMethod === PAYMENT_METHODS.CASH && styles.selectedPaymentOptionText
                ]}>
                  💵 Pago en Efectivo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === PAYMENT_METHODS.QR && styles.selectedPaymentOption
                ]}
                onPress={() => setPaymentMethod(PAYMENT_METHODS.QR)}
              >
                <Text style={[
                  styles.paymentOptionText,
                  paymentMethod === PAYMENT_METHODS.QR && styles.selectedPaymentOptionText
                ]}>
                  📱 Código QR
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.payButton}
                onPress={paymentMethod === PAYMENT_METHODS.CASH ? handleCashPayment : handleQRPayment}
              >
                <Text style={styles.payButtonText}>
                  {paymentMethod === PAYMENT_METHODS.CASH ? 'Confirmar Pago en Efectivo' : 'Escanear QR'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        <QRScannerComponent
          visible={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScanned}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  tripInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  tripInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tripInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  passengerTypeSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  fareSection: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  fareAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentMethodSection: {
    marginBottom: 20,
  },
  paymentOption: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  selectedPaymentOption: {
    borderColor: '#2E86AB',
    backgroundColor: '#e3f2fd',
  },
  paymentOptionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  selectedPaymentOptionText: {
    color: '#2E86AB',
    fontWeight: 'bold',
  },
  actionButtons: {
    marginTop: 10,
  },
  payButton: {
    backgroundColor: '#2E86AB',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentScreen;
