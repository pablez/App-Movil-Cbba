import React from 'react';
import { TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ColorSwatch = ({ color, isSelected, onSelect, size = 'medium' }) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  
  const swatchSize = {
    small: isTablet ? 28 : 24,
    medium: isTablet ? 40 : 36,
    large: isTablet ? 48 : 42
  }[size];

  return (
    <TouchableOpacity
      style={[
        styles.swatch,
        {
          width: swatchSize,
          height: swatchSize,
          borderRadius: swatchSize / 2,
          backgroundColor: color,
          borderColor: isSelected ? '#fff' : 'transparent',
          borderWidth: isSelected ? 2 : 0
        }
      ]}
      onPress={() => onSelect(color)}
      activeOpacity={0.8}
      accessibilityLabel={`Color ${color}`}
      accessibilityRole="button"
    >
      {isSelected && (
        <Ionicons 
          name="checkmark" 
          size={swatchSize * 0.4} 
          color="#fff" 
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  swatch: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  }
});

export default ColorSwatch;