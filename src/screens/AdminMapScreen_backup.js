import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AdminMapScreen = ({ navigation, route }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>AdminMapScreen - Test Component</Text>
      <Text style={styles.subtext}>Si ves esto, el componente funciona</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});

export default AdminMapScreen;
