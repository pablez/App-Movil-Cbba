import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { uploadImage, generateImageFileName, getImageStoragePath } from '../utils/imageUpload';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Obtener el rol del usuario desde Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            setIsAdmin(userData.role === 'ADMIN' || userData.isAdmin === true);
            console.log('User role:', userData.role);
            console.log('Is admin:', userData.role === 'ADMIN' || userData.isAdmin === true);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      // Por ahora, guardar solo las URIs locales temporalmente
      // TODO: Implementar carga de imágenes cuando Firebase Storage esté configurado
      const userDataToSave = {
        ...userData,
        email,
        createdAt: new Date().toISOString(),
        status: 'pending', // Registration needs approval
      };
      
      await setDoc(doc(db, 'users', userId), userDataToSave);

      return userCredential;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserRole(null);
      setIsAdmin(false);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    isAdmin,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
