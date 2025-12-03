import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { generateAdminMapHTML } from '../map/AdminMapHTML';

const AdminMapWebView = ({ 
  location,
  mapReady,
  webViewRef,
  editMode,
  onMessage,
  onMapReady
}) => {
  return (
    <View style={styles.mapContainer}>
      <WebView
        ref={webViewRef}
        source={{ html: generateAdminMapHTML(editMode) }}
        style={styles.map}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>🗺️ Cargando mapa...</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default AdminMapWebView;