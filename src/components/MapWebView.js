import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { generateMapHTML } from './map/MapHTML';

// Componente que encapsula WebView y expone un método postCommand(ref)
const MapWebView = forwardRef(({ onMessage, onMapReady, style, initialLocation }, ref) => {
  const webviewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    postCommand: (obj) => {
      try {
        const payload = typeof obj === 'string' ? obj : JSON.stringify(obj);
        webviewRef.current && webviewRef.current.postMessage(payload);
      } catch (e) {
        console.warn('MapWebView postCommand error', e);
      }
    }
  }));

  const handleMessage = (event) => {
    const data = event && event.nativeEvent && event.nativeEvent.data;
    if (!data) return;

    // Detectar mensaje 'mapReady' y notificar
    if (data === 'mapReady' && typeof onMapReady === 'function') {
      onMapReady();
    }

    if (typeof onMessage === 'function') onMessage(event);
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: generateMapHTML(initialLocation) }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden'
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)'
  }
});

export default MapWebView;
