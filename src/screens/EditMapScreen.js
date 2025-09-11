import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
// Reuse the advanced AdminMapScreenNew which already contains the WebView edit helpers
import AdminMapScreenNew from './AdminMapScreenNew';

const EditMapScreen = (props) => {
  // Wrapper ensuring content doesn't overlap status bar or navigation gestures
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <AdminMapScreenNew {...props} />
    </SafeAreaView>
  );
};

export default EditMapScreen;
