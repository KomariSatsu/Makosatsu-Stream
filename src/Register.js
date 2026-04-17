import React, { useState } from 'react';
import { auth, db } from './firebase-config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser'; 

function Register({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inputCode, setInputCode] = useState(''); 
  const [generatedCode, setGeneratedCode] = useState(null); 
  const [step, setStep] = useState(1); // 1 = Isi Data, 2 = Isi Kode OTP

  // FUNGSI 1: KIRIM KODE KE EMAIL
  const sendOTP = (e) => {
    e.preventDefault();
    if (password.length < 6) {
      alert("Password minimal 6 karakter!");
      return;
    }

    // Generate 6 angka acak
    const code = Math.floor(100000 + Math.random() * 900000).toString(); 
    setGeneratedCode(code);

    // --- DATA EMAILJS MAX YANG SUDAH TERISI ---
    const serviceID = 'service_pqimq0o'; 
    const templateID = 'template_xsvm2oh';
    const publicKey = 'CbkybadbZjgPJuaiS';
    // ------------------------------------------

    const templateParams = { to_email: email, otp_code: code };

    emailjs.send(serviceID, templateID, templateParams, publicKey)
      .then(() => {
        alert("✅ Kode verifikasi berhasil dikirim ke email kamu!");
        setStep(2); // PINDAH KE TAMPILAN INPUT KODE
      }, (err) => {
        alert("❌ Gagal kirim email: " + err.text);
      });
  };

  // FUNGSI 2: VERIFIKASI KODE & BUAT AKUN
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (inputCode !== generatedCode) {
      alert("❌ Kode salah! Silakan cek kembali email kamu.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Simpan role ke Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email,
        role: 'user',
        createdAt: serverTimestamp()
      });
      alert("🎉 Akun Berhasil Dibuat! Silakan Login.");
      onSwitch(); // Pindah ke halaman Login
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={formStyle}>
        <h2 style={{ color: '#E50914', textAlign: 'center', marginBottom: '30px' }}>DAFTAR MAKOSATSU</h2>
        
        {/* TAMPILAN 1: FORM PENDAFTARAN */}
        {step === 1 && (
          <form onSubmit={sendOTP}>
            <p style={{ fontSize: '14px', marginBottom: '15px', color: '#aaa' }}>Langkah 1: Isi data akun kamu</p>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password (min 6 karakter)" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" style={btnRed}>Kirim Kode Verifikasi</button>
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
              Sudah punya akun? <span onClick={onSwitch} style={{ color: '#E50914', cursor: 'pointer', fontWeight: 'bold' }}>Login</span>
            </p>
          </form>
        )}

        {/* TAMPILAN 2: FORM INPUT KODE OTP (Hanya muncul setelah klik Kirim Kode) */}
        {step === 2 && (
          <form onSubmit={handleVerifyAndRegister}>
            <p style={{ textAlign: 'center', marginBottom: '10px' }}>Langkah 2: Masukkan kode</p>
            <p style={{ textAlign: 'center', fontSize: '13px', marginBottom: '20px', color: '#aaa' }}>
              6 Digit kode telah dikirim ke: <br/><b style={{ color: 'white' }}>{email}</b>
            </p>
            <input type="text" placeholder="Masukkan 6 Digit Kode" value={inputCode} onChange={e => setInputCode(e.target.value)} required style={inputStyle} maxLength="6" />
            <button type="submit" style={btnRed}>Verifikasi & Daftar</button>
            <button type="button" onClick={() => setStep(1)} style={{ ...btnRed, backgroundColor: '#444', marginTop: '10px' }}>Kembali / Ganti Email</button>
          </form>
        )}
      </div>
    </div>
  );
}

// --- JANGAN UBAH BAGIAN STYLE INI ---
const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#141414', color: 'white' };
const formStyle = { backgroundColor: 'rgba(0,0,0,0.85)', padding: '40px 50px', borderRadius: '8px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' };
const inputStyle = { width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '4px', border: 'none', backgroundColor: '#333', color: 'white', boxSizing: 'border-box', fontSize: '16px' };
const btnRed = { width: '100%', padding: '14px', backgroundColor: '#E50914', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', transition: '0.2s' };

export default Register;