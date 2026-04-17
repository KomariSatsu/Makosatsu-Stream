import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Tambahkan ini
import Home from './Home';
import Login from './Login';
import Register from './Register';

function App() {
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true); // Tambah loading agar tidak kedap-kedip

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Ambil ulang role dari Firestore untuk memastikan isAdmin akurat
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          localStorage.setItem('userRole', userDoc.data().role);
        } else {
          localStorage.setItem('userRole', 'User');
        }
        setUser(currentUser);
      } else {
        setUser(null);
        localStorage.removeItem('userRole');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{backgroundColor: '#141414', minHeight: '100vh'}}></div>;

  if (user) {
    return <Home />;
  }

  return (
    <>
      {isRegistering ? (
        <Register onSwitch={() => setIsRegistering(false)} />
      ) : (
        <Login onSwitch={() => setIsRegistering(true)} />
      )}
    </>
  );
}

export default App;