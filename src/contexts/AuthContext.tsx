import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // Check if admin manually created them by email
            const email = firebaseUser.email?.toLowerCase();
            if (email) {
              const manualDocRef = doc(db, 'users', email);
              const manualDoc = await getDoc(manualDocRef);
              
              if (manualDoc.exists()) {
                // Migrate manual doc to UID-based doc
                const data = manualDoc.data();
                const { setDoc, deleteDoc } = await import('firebase/firestore');
                await setDoc(userDocRef, { ...data, email });
                await deleteDoc(manualDocRef);
                userDoc = await getDoc(userDocRef);
              }
            }
          }

          if (userDoc.exists()) {
            setUser({
              id: firebaseUser.uid,
              ...userDoc.data() as Omit<User, 'id'>
            });
          } else {
            // Self-Registration Logic
            const { getDocs, collection, query, limit, setDoc } = await import('firebase/firestore');
            const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
            const isFirstUser = usersSnap.empty;

            const newUser: Omit<User, 'id'> = {
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: isFirstUser ? 'admin' : 'staff',
              email: firebaseUser.email?.toLowerCase() || ''
            };
            
            await setDoc(userDocRef, newUser);
            setUser({ id: firebaseUser.uid, ...newUser });
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
