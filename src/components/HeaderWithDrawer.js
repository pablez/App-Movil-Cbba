import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const HeaderWithDrawer = ({ title, showProfile = true }) => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
        </View>
        
        {showProfile && user && (
          <View style={styles.rightSection}>
            <TouchableOpacity style={styles.profileButton}>
              <View style={styles.profileIcon}>
                <Text style={styles.profileText}>
                  {user.firstName?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 20,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  profileButton: {
    padding: 4,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HeaderWithDrawer;
