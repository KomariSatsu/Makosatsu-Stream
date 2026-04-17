import React, { useState } from 'react';
import { auth, db, googleProvider } from './firebase-config'; 
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'; // TAMBAH signOut
import { doc, getDoc } from 'firebase/firestore';

function Login({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // --- TAMBAHAN LOGIKA VERIFIKASI ---
      await user.reload(); // Ambil status terbaru (siapa tahu baru diklik linknya)
      
      if (!user.emailVerified) {
        alert("⚠️ Email belum diverifikasi! Silakan cek inbox atau folder spam email kamu.");
        await signOut(auth); // Paksa logout agar tetap tertahan di halaman Login
        return;
      }
      // ----------------------------------

      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        alert(`Selamat Datang ${userData.role}!`);
        localStorage.setItem('userRole', userData.role);
      } else {
        localStorage.setItem('userRole', 'User');
      }
    } catch (error) {
      alert("Gagal Login: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        localStorage.setItem('userRole', userDoc.data().role);
      } else {
        localStorage.setItem('userRole', 'User');
      }
      
      alert(`Selamat Datang, ${user.displayName}!`);
    } catch (error) {
      alert("Gagal Login Google: " + error.message);
    }
  };

  return (
    <div style={containerStyle}>
    <h1 
  style={{ 
    // --- EFEK GRADASI ---
    background: 'linear-gradient(45deg, #E50914 20%, #ffc107 80%)', // Gradasi Merah ke Kuning Emas
    WebkitBackgroundClip: 'text',   // Background "masuk" ke dalam huruf
    WebkitTextFillColor: 'transparent', // Warna teks asli jadi transparan
    
    // --- STYLE ASLI MAX ---
    fontSize: '3rem', 
    letterSpacing: '2px', 
    marginBottom: '20px',
    fontWeight: '900', // Bikin extra bold supaya gradasinya makin puas dilihat
    textAlign: 'center' // Pastikan di tengah
  }}
> 
  MAKOSATSU 
</h1>
      <div style={cardStyle}>
        <h2 style={{ color: '#fff', textAlign: 'left', marginBottom: '20px' }}>Masuk</h2>
        <input 
          type="email" 
          placeholder="Email" 
          style={inputStyle} 
          onChange={(e) => setEmail(e.target.value)} 
        /><br/>
        <input 
          type="password" 
          placeholder="Password" 
          style={inputStyle} 
          onChange={(e) => setPassword(e.target.value)} 
        /><br/>
        <button onClick={handleLogin} style={buttonStyle}>Login</button>

        <button 
          onClick={handleGoogleLogin} 
          style={{ 
            ...buttonStyle, 
            backgroundColor: '#fff', 
            color: '#000', 
            marginTop: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '10px' 
          }}
        >
          <img src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" width="18px" alt="google" />
          Masuk dengan Google
        </button>

        <p style={{ color: '#aaa', marginTop: '15px' }}>
          Baru di Max Stream? <span onClick={onSwitch} style={{ color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Daftar sekarang.</span>
        </p>
      </div>
    </div>
  );
}

const containerStyle = { 
  textAlign: 'center', 
  backgroundColor: '#141414', 
  minHeight: '100vh', 
  display: 'flex', 
  flexDirection: 'column', 
  justifyContent: 'center',
  alignItems: 'center',
  fontFamily: 'Helvetica, Arial, sans-serif'
};

const cardStyle = { 
  backgroundColor: 'rgba(0,0,0,0.75)', 
  padding: '60px', 
  borderRadius: '4px', 
  width: '350px' 
};

const inputStyle = { 
  padding: '12px', 
  margin: '10px 0', 
  width: '100%', 
  borderRadius: '4px', 
  border: 'none', 
  backgroundColor: '#333', 
  color: 'white',
  boxSizing: 'border-box'
};

const buttonStyle = { 
  padding: '12px', 
  width: '100%', 
  backgroundColor: '#e50914', 
  color: 'white', 
  border: 'none', 
  borderRadius: '4px', 
  cursor: 'pointer', 
  fontWeight: 'bold',
  marginTop: '20px' 
};

export default Login;