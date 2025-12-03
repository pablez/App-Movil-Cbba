import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { generateMapHTML } from './MapHTML';

const MapWebView = ({ 
  location, 
  mapReady, 
  webViewRef, 
  onMessage,
  onLoadStart,
  onLoadEnd,
  onError,
  onHttpError 
}) => {
  return (
    <>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML(location) }}
        style={styles.map}
        androidLayerType="hardware"
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        bounces={false}
        renderLoading={() => (
          <View style={styles.webViewLoading}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.webViewLoadingText}>Cargando mapa OpenRouteService...</Text>
          </View>
        )}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onError={onError}
        onHttpError={onHttpError}
      />
      
      {/* Overlay de loading mientras el mapa no esté listo */}
      {!mapReady && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.mapLoadingText}>🗺️ Iniciando mapa...</Text>
          {location && (
            <Text style={styles.mapLoadingSubtext}>
              📍 Ubicación: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          )}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  map: { 
    flex: 1 
  },
  webViewLoading: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  webViewLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  mapLoadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#1976D2',
    fontWeight: '700',
    textAlign: 'center',
  },
  mapLoadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default MapWebView;