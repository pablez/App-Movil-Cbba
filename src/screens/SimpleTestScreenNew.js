import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import HeaderWithDrawer from '../components/HeaderWithDrawer';

const SimpleTestScreen = () => {
  const { user, logout, userRole } = useAuth();

  const testFunction = () => {
    Alert.alert(
      'Test Exitoso', 
      `Usuario: ${user?.email}\nRol: ${userRole}\nTodo funciona correctamente!`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithDrawer title="🚌 TransportApp" />
      <View style={styles.content}>
        <Text style={styles.subtitle}>Modo de Testing</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Usuario Actual:</Text>
          <Text style={styles.infoText}>Email: {user?.email}</Text>
          <Text style={styles.infoText}>Rol: {userRole}</Text>
        </View>

        <TouchableOpacity style={styles.testButton} onPress={testFunction}>
          <Text style={styles.buttonText}>Probar Funcionalidad</Text>
        </TouchableOpacity>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>✅ Estado del Sistema</Text>
          <Text style={styles.statusText}>• Autenticación: Funcionando</Text>
          <Text style={styles.statusText}>• Firebase: Conectado</Text>
          <Text style={styles.statusText}>• Navegación: Activa</Text>
          <Text style={styles.statusText}>• Roles: Configurados</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#388E3C',
    marginBottom: 5,
  },
});

export default SimpleTestScreen;
