import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform, StatusBar } from 'react-native';

const ResponsiveLayout = ({ children, showFloatingButton = true }) => {
  const { width, height } = useWindowDimensions();
  
  // Detectar tipo de dispositivo
  const isTablet = width > 768;
  const isLandscape = width > height;
  const isLargeScreen = width > 1024;

  // Calcular padding superior
  const topOffset = Platform.OS === 'android' 
    ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 20) 
    : 44;

  const containerPaddingTop = Math.max(12, topOffset + 8);

  // Configuración de layout responsivo
  const layoutConfig = {
    containerPadding: isTablet ? 24 : 16,
    contentMaxWidth: isLargeScreen ? 1200 : '100%',
    contentMargin: isLargeScreen ? 'auto' : 0,
    columnGap: isTablet ? 24 : 16,
    rowGap: isTablet ? 16 : 12,
  };

  return (
    <View style={[
      styles.container,
      {
        paddingTop: containerPaddingTop,
        paddingHorizontal: layoutConfig.containerPadding,
      }
    ]}>
      <View style={[
        styles.content,
        {
          maxWidth: layoutConfig.contentMaxWidth,
          marginHorizontal: layoutConfig.contentMargin,
          gap: layoutConfig.rowGap,
        }
      ]}>
        {children}
      </View>
    </View>
  );
};

const ResponsiveGrid = ({ 
  children, 
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: 12, tablet: 16, desktop: 20 }
}) => {
  const { width } = useWindowDimensions();
  
  const getColumns = () => {
    if (width > 1024) return columns.desktop;
    if (width > 768) return columns.tablet;
    return columns.mobile;
  };

  const getGap = () => {
    if (width > 1024) return gap.desktop;
    if (width > 768) return gap.tablet;
    return gap.mobile;
  };

  const numColumns = getColumns();
  const gridGap = getGap();

  return (
    <View style={[
      styles.grid,
      {
        gap: gridGap,
      }
    ]}>
      {React.Children.map(children, (child, index) => (
        <View style={[
          styles.gridItem,
          {
            width: numColumns === 1 
              ? '100%' 
              : `${(100 / numColumns) - (gridGap * (numColumns - 1)) / numColumns}%`,
          }
        ]}>
          {child}
        </View>
      ))}
    </View>
  );
};

const ResponsiveRow = ({ children, spacing = 'medium', align = 'center' }) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  
  const spacingValues = {
    small: isTablet ? 8 : 6,
    medium: isTablet ? 16 : 12,
    large: isTablet ? 24 : 18,
  };

  return (
    <View style={[
      styles.row,
      {
        gap: spacingValues[spacing],
        alignItems: align,
      }
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export { ResponsiveLayout, ResponsiveGrid, ResponsiveRow };
export default ResponsiveLayout;