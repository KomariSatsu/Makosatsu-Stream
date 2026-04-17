import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase-config';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, getDoc, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';


const Modal = ({ title, children, onClose }) => (
  <div style={modalOverlay} onClick={onClose}>
    <div style={modalContent} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button onClick={onClose} style={btnRed}>Tutup</button>
      </div>
      {children}
    </div>
  </div>
);

function Home() {
  const [animes, setAnimes] = useState([]);
  const [watchlistIds, setWatchlistIds] = useState([]); 
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [episodes, setEpisodes] = useState(() => {
    const saved = localStorage.getItem('makosatsu_episodes_cache');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddAnime, setShowAddAnime] = useState(false);
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [editMode, setEditMode] = useState(null); 
  const [filter, setFilter] = useState("Semua");
  const [activeVideo, setActiveVideo] = useState(null); // Menyimpan video yang sedang ditonton
  

  // --- TAMBAHKAN STATE SEARCH ---
  const [searchTerm, setSearchTerm] = useState(""); 

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  
  const [username, setUsername] = useState(auth.currentUser?.email?.split('@')[0] || "User");
  const [tempUsername, setTempUsername] = useState(username); 
  const [profilePic, setProfilePic] = useState("https://cdn-icons-png.flaticon.com/512/3135/3135715.png");
  const [tempProfilePic, setTempProfilePic] = useState(profilePic);
  
  const [history, setHistory] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [adminFeedbacks, setAdminFeedbacks] = useState([]); 
  const [downloadDir, setDownloadDir] = useState("/internal/Makosatsu/Videos");

  const [newAnime, setNewAnime] = useState({ 
    title: '', score: '', genre: '', totalEps: '', releaseDate: '', synopsis: '', mainTrailer: '',
    status: 'Ongoing', isRecommended: false, coverUrl: '', isInWatchlist: false 
  });


  const [newEps, setNewEps] = useState({ epsNumber: '', videoUrl: '', epsTrailer: '', downloadUrl: '' });

  // --- DETEKSI LAYAR HP ATAU PC ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const userRole = localStorage.getItem('userRole') || 'User';
  const isAdmin = userRole === 'Admin' || auth.currentUser?.email === "admin@gmail.com"; 

  useEffect(() => {
    if (auth.currentUser) {
      const q = collection(db, "users", auth.currentUser.uid, "watchlist");
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ids = snapshot.docs.map(doc => doc.id);
        setWatchlistIds(ids); 
      });
      return () => unsubscribe();
    }
  }, [auth.currentUser]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('makosatsu_history');
    const savedDownloads = localStorage.getItem('makosatsu_downloads');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedDownloads) setDownloads(JSON.parse(savedDownloads));
  }, []);

  useEffect(() => {
    localStorage.setItem('makosatsu_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('makosatsu_downloads', JSON.stringify(downloads));
  }, [downloads]);

  useEffect(() => {
    const q = query(collection(db, "animes"), orderBy("createdAt", "desc"), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const animeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnimes(animeData);
      if (selectedAnime) {
        const current = animeData.find(a => a.id === selectedAnime.id);
        if (current && JSON.stringify(current) !== JSON.stringify(selectedAnime)) {
          setSelectedAnime(current);
        }
      }
    });
    return () => unsubscribe();
  }, [selectedAnime?.id]);

  useEffect(() => {
    if (selectedAnime?.id) {
      const qEps = query(
        collection(db, "animes", selectedAnime.id, "episodes"), 
        orderBy("epsNumber", "asc")
      );
      const unsubEps = onSnapshot(qEps, (snapshot) => {
        const dataEps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEpisodes(dataEps);
      });
      return () => unsubEps();
    }
  }, [selectedAnime?.id]);

  useEffect(() => {
    if (activeModal === 'feedback' && auth.currentUser?.email === "admin@gmail.com") { 
      const qFb = query(collection(db, "feedback"), orderBy("date", "desc"));
      const unsubFb = onSnapshot(qFb, (snapshot) => {
        setAdminFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubFb();
    }
  }, [activeModal]);

  const handleDownload = (animeTitle, epsNumber) => {
    const downloadItem = {
      id: `${animeTitle}-${epsNumber}-${Date.now()}`,
      title: animeTitle,
      episode: epsNumber,
      status: 'Completed',  
      size: '250MB'
    };
    setDownloads(prev => [downloadItem, ...prev]);
    alert(`Episode ${epsNumber} tersimpan di folder ${downloadDir}`);
  };

  const handleBatchDownload = () => {
    const newBatch = episodes.map(eps => ({ id: Math.random(), title: selectedAnime.title, episode: eps.epsNumber, path: downloadDir }));
    setDownloads([...newBatch, ...downloads]);
    alert(`Semua episode berhasil didownload ke ${downloadDir}.`);
  };

  const handleFeedback = async () => {
    if(!feedbackText) return;
    await addDoc(collection(db, "feedback"), {
      user: username,
      msg: feedbackText,
      date: serverTimestamp()
    });
    alert("Feedback terkirim!");
    setFeedbackText("");
    setActiveModal(null);
  };

  // --- TAMBAHKAN LOGIKA SEARCH DI FILTER ---
  const filteredAnimes = animes.filter(anime => {
    const matchSearch = anime.title.toLowerCase().includes(searchTerm.toLowerCase());
    let matchCategory = true;
    if (filter === "Rekomendasi") matchCategory = anime.isRecommended === true;
    else if (filter === "Watchlist") matchCategory = watchlistIds.includes(anime.id);
    else if (filter !== "Semua") matchCategory = anime.status === filter;

    return matchSearch && matchCategory;
  });

  const handleSaveAnime = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        const { id, ...dataToUpdate } = newAnime;
        await updateDoc(doc(db, "animes", editMode), dataToUpdate);
        alert("Judul Berhasil Diupdate!");
      } else {
        await addDoc(collection(db, "animes"), { 
          ...newAnime, 
          createdAt: serverTimestamp()
        });
        alert("Judul Berhasil Ditambah!");
      }
      setNewAnime({ title: '', score: '', genre: '', totalEps: '', releaseDate: '', synopsis: '', mainTrailer: '', status: 'Ongoing', isRecommended: false, coverUrl: '', isInWatchlist: false });
      setEditMode(null);
      setShowAddAnime(false);
    } catch (err) { alert(err.message); }
  };

  const toggleWatchlist = async (e, anime) => {
    e.stopPropagation();
    if (!auth.currentUser) return alert("Silakan login terlebih dahulu!");
    const watchlistRef = doc(db, "users", auth.currentUser.uid, "watchlist", anime.id);
    try {
      if (watchlistIds.includes(anime.id)) {
        await deleteDoc(watchlistRef);
      } else {
        await setDoc(watchlistRef, { 
          title: anime.title, 
          addedAt: serverTimestamp() 
        });
      }
    } catch (err) {
      alert("Gagal update watchlist: " + err.message);
    }
  };

  const deleteAnime = async (id) => {
    if (window.confirm("Hapus judul anime ini?")) {
      await deleteDoc(doc(db, "animes", id));
      if (selectedAnime?.id === id) setSelectedAnime(null);
    }
  };

  // --- UPDATE HANDLE SAVE EPISODE ---
  const handleSaveEpisode = async (e) => {
    e.preventDefault();
    try {
      const epsData = { 
        epsNumber: Number(newEps.epsNumber), 
        videoUrl: newEps.videoUrl,
        epsTrailer: newEps.epsTrailer || '',
        downloadUrl: newEps.downloadUrl || '' 
      };
      if (editMode) {
        await updateDoc(doc(db, "animes", selectedAnime.id, "episodes", editMode), epsData);
        alert("Episode Berhasil Diupdate!");
      } else {
        await addDoc(collection(db, "animes", selectedAnime.id, "episodes"), epsData);
        alert("Episode Berhasil Ditambah!");
      }
      setNewEps({ epsNumber: '', videoUrl: '', epsTrailer: '', downloadUrl: '' });
      setEditMode(null);
      setShowAddEpisode(false);
    } catch (err) { alert(err.message); }
  };

  const deleteEpisode = async (epsId) => {
    if (window.confirm("Hapus episode ini?")) {
      await deleteDoc(doc(db, "animes", selectedAnime.id, "episodes", epsId));
    }
  };

return (
    <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: 'Poppins', overflowX: 'hidden' }}>
      {/* NAVBAR */}
      <nav className="nav-container" style={{ 
        padding: isMobile ? '10px 15px' : '15px 40px', 
        backgroundColor: '#000', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        width: '100%',
        boxSizing: 'border-box' 
      }}>
        <h2 
          className="logo-gradiasi"
          style={{ 
            background: 'linear-gradient(90deg, #E50914 0%, #ffc107 50%, #E50914 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            color: 'transparent', 
            display: 'inline-block',
            backgroundSize: '200% auto',
            cursor: 'pointer', 
            margin: 0,
            fontWeight: 'bold',
            letterSpacing: '1px',
            fontSize: isMobile ? '1.1rem' : '1.5rem',
            flexShrink: 0,
          }} 
          onClick={() => {setSelectedAnime(null); setEditMode(null); setFilter("Semua"); setSearchTerm(""); setActiveVideo(null);}}
        >
          MAKOSATSU STREAM
        </h2>
        <div style={{ position: 'relative' }}>
          <div onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', cursor: 'pointer' }}>
            {!isMobile && <span className="username-text">{username}</span>}
            {isMobile && <span className="username-text" style={{maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px'}}>{username}</span>}
            <img src={profilePic} alt="profile" style={{ width: isMobile ? '35px' : '40px', height: isMobile ? '35px' : '40px', borderRadius: '50%', border: '2px solid #E50914', objectFit: 'cover' }} />
          </div>
          {showProfileMenu && (
            <div style={dropdownMenu}>
              <div style={menuItem} onClick={() => {setTempUsername(username); setTempProfilePic(profilePic); setActiveModal('editProfile'); setShowProfileMenu(false);}}>Edit Profil</div>
              <div style={menuItem} onClick={() => {setActiveModal('history'); setShowProfileMenu(false);}}>Riwayat Tontonan</div>
              <div style={menuItem} onClick={() => {setActiveModal('download'); setShowProfileMenu(false);}}>Daftar Download</div>
              <div style={menuItem} onClick={() => {setActiveModal('setting'); setShowProfileMenu(false);}}>Settings</div>
              <div style={menuItem} onClick={() => {setActiveModal('feedback'); setShowProfileMenu(false);}}>Feedback</div>
              <hr style={{ borderColor: '#444' }} />
              <div style={{ ...menuItem, color: '#E50914' }} onClick={() => signOut(auth)}>Logout</div>
            </div>
          )}
        </div>
      </nav>
      
      {/* MODAL SECTION */}
      {activeModal === 'editProfile' && (
        <Modal title="Edit Profil" onClose={() => setActiveModal(null)}>
          <input type="text" placeholder="Username Baru" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)} style={inputStyle} autoFocus />
          <input type="text" placeholder="URL Foto Profil" value={tempProfilePic} onChange={(e) => setTempProfilePic(e.target.value)} style={inputStyle} />
          <button style={btnRed} onClick={() => { setUsername(tempUsername); setProfilePic(tempProfilePic); setActiveModal(null); alert("Profil diperbarui!"); }}>Simpan Perubahan</button>
        </Modal>
      )}
      {activeModal === 'history' && (
        <Modal title="Riwayat Tontonan" onClose={() => setActiveModal(null)}>
          <div style={{maxHeight: '400px', overflowY: 'auto'}}>
            {history.length > 0 ? history.map((item, i) => <div key={i} style={{padding: '12px', borderBottom: '1px solid #333'}}>• {item}</div>) : <p>Belum ada riwayat tontonan.</p>}
          </div>
        </Modal>
      )}
      {activeModal === 'download' && (
        <Modal title="Daftar Download" onClose={() => setActiveModal(null)}>
          <div style={{maxHeight: '400px', overflowY: 'auto'}}>
            {downloads.length > 0 ? downloads.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#333', marginBottom: '8px', borderRadius: '8px', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 'bold' }}>{item.title}</div><small style={{ color: '#aaa' }}>Episode {item.episode}</small></div>
                <button onClick={() => setDownloads(downloads.filter((_, i) => i !== index))} style={{...btnDel, padding: '5px 12px'}}>Hapus</button>
              </div>
            )) : <p>Belum ada video yang didownload</p>}
          </div>
        </Modal>
      )}
      {activeModal === 'setting' && (
        <Modal title="Settings" onClose={() => setActiveModal(null)}>
          <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', marginBottom: '8px' }}>Lokasi Direktori Download:</label><input type="text" value={downloadDir} onChange={(e) => setDownloadDir(e.target.value)} style={inputStyle} /></div>
          <button style={{...btnGrey, width: '100%', marginBottom: '10px'}} onClick={() => alert("Speed Internet: 24.5 Mbps - Stabil")}>Test Speed Internet</button>
          <button style={{ ...btnRed, width: '100%' }} onClick={() => {setDownloads([]); setHistory([]); alert("Semua data lokal telah dihapus!");}}>Hapus Semua Data Lokal</button>
        </Modal>
      )}
      {activeModal === 'feedback' && (
        <Modal title={auth.currentUser?.email === "admin@gmail.com" ? "Dashboard Feedback Admin" : "Feedback User"} onClose={() => setActiveModal(null)}>
          {auth.currentUser?.email === "admin@gmail.com" ? (
             <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                {adminFeedbacks.length > 0 ? adminFeedbacks.map(fb => (
                  <div key={fb.id} style={{backgroundColor: '#333', padding: '12px', marginBottom: '10px', borderRadius: '8px', borderLeft: '4px solid #E50914'}}>
                    <small style={{color: '#E50914', fontWeight: 'bold'}}>{fb.user}</small>
                    <p style={{margin: '5px 0', fontSize: '14px'}}>{fb.msg}</p>
                  </div>
                )) : <p>Belum ada feedback masuk.</p>}
             </div>
          ) : (
            <>
              <textarea placeholder="Isi apa saja yang kurang..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} style={{ ...inputStyle, height: '150px' }} />
              <button style={btnRed} onClick={handleFeedback}>Kirim Feedback</button>
            </>
          )}
        </Modal>
      )}

      <div style={{ padding: isMobile ? '20px' : '40px', boxSizing: 'border-box' }}>
        {!selectedAnime ? (
          <>
            <div style={{ marginBottom: '20px', width: '100%' }}>
              <input 
                type="text" 
                placeholder="🔍 Cari judul anime..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  ...inputStyle,
                  marginBottom: '10px',
                  borderRadius: '30px',
                  padding: '12px 25px',
                  border: searchTerm ? '1px solid #E50914' : '1px solid #444',
                  backgroundColor: '#222',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '20px', gap: '15px' }}>
              {isAdmin && (
                <button onClick={() => { setShowAddAnime(!showAddAnime); setEditMode(null); }} style={{...btnGrey, width: isMobile ? '100%' : 'auto'}}>
                  {showAddAnime ? 'Batal' : '+ Tambah Judul Anime Baru'}
                </button>
              )}
              <div style={{ display: 'flex', gap: '10px', width: '100%', overflowX: 'auto', paddingBottom: isMobile ? '10px' : '0', scrollbarWidth: 'none' }}>
                {["Semua", "Ongoing", "Selesai", "Rekomendasi", "Watchlist"].map(type => (
                  <button key={type} onClick={() => setFilter(type)} style={{ ...btnFilter, backgroundColor: filter === type ? '#E50914' : '#333', whiteSpace: 'nowrap' }}>{type}</button>
                ))}
              </div>
            </div>
            
            {isAdmin && showAddAnime && (
              <form onSubmit={handleSaveAnime} style={{...formStyle, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'}}>
                <h3 style={{gridColumn: isMobile ? 'span 1' : 'span 2'}}>{editMode ? 'Edit Judul Anime' : 'Tambah Judul Baru'}</h3>
                <input type="text" placeholder="Judul" value={newAnime.title} onChange={e => setNewAnime({...newAnime, title: e.target.value})} required style={inputStyle}/>
                <input type="text" placeholder="Skor" value={newAnime.score} onChange={e => setNewAnime({...newAnime, score: e.target.value})} style={inputStyle}/>
                <input type="text" placeholder="Genre" value={newAnime.genre} onChange={e => setNewAnime({...newAnime, genre: e.target.value})} style={inputStyle}/>
                <input type="text" placeholder="Total Eps" value={newAnime.totalEps} onChange={e => setNewAnime({...newAnime, totalEps: e.target.value})} style={inputStyle}/> 
                <input type="date" value={newAnime.releaseDate} onChange={e => setNewAnime({...newAnime, releaseDate: e.target.value})} style={inputStyle}/>
                <input type="text" placeholder="Link Trailer" value={newAnime.mainTrailer} onChange={e => setNewAnime({...newAnime, mainTrailer: e.target.value})} style={inputStyle}/>
                <input type="text" placeholder="Link Sampul" value={newAnime.coverUrl} onChange={e => setNewAnime({...newAnime, coverUrl: e.target.value})} style={{...inputStyle, gridColumn: isMobile ? 'span 1' : 'span 2'}}/>
                <select value={newAnime.status} onChange={e => setNewAnime({...newAnime, status: e.target.value})} style={inputStyle}>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Selesai">Selesai</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#333', padding: '10px', borderRadius: '6px' }}>
                  <input type="checkbox" checked={newAnime.isRecommended} onChange={e => setNewAnime({...newAnime, isRecommended: e.target.checked})} />
                  <label>Rekomendasi</label>
                </div>
                <textarea placeholder="Sinopsis" value={newAnime.synopsis} onChange={e => setNewAnime({...newAnime, synopsis: e.target.value})} style={{...inputStyle, gridColumn: isMobile ? 'span 1' : 'span 2', height: '100px'}} />
                <button type="submit" style={btnRed}>{editMode ? 'Update' : 'Simpan'}</button>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? '12px' : '20px', marginTop: '30px' }}>
              {filteredAnimes.map(anime => (
                <div 
                  key={anime.id} 
                  className="anime-card-hover" 
                  style={cardStyle}
                >
                  <div onClick={() => setSelectedAnime(anime)} style={{ height: isMobile ? '220px' : '300px', backgroundColor: '#333', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    {anime.coverUrl ? <img src={anime.coverUrl} alt={anime.title} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}><h3>{anime.title}</h3></div>}
                    {anime.isRecommended && <span style={badgeTop}>Top</span>}
                    <button onClick={(e) => toggleWatchlist(e, anime)} style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: watchlistIds.includes(anime.id) ? '#E50914' : 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', zIndex: 10 }}>{watchlistIds.includes(anime.id) ? '✓' : '+'}</button>
                  </div>
                  <div style={{ padding: isMobile ? '10px' : '15px', backgroundColor: '#1f1f1f' }}>
                    <h4 style={{ margin: '0 0 10px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>{anime.title}</h4>
                    {isAdmin && (
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '5px'}}>
                        <button onClick={() => {setNewAnime(anime); setEditMode(anime.id); setShowAddAnime(true);}} style={{...btnEdit, fontSize: isMobile ? '10px' : '12px', padding: '5px'}}>Edit</button>
                        <button onClick={() => deleteAnime(anime.id)} style={{...btnDel, fontSize: isMobile ? '10px' : '12px', padding: '5px'}}>Hapus</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '10px' : '12px' }}>
                      <span style={{ color: '#E50914' }}>⭐ {anime.score}</span>
                      <span>{anime.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredAnimes.length === 0 && (
              <p style={{ textAlign: 'center', marginTop: '50px', color: '#aaa' }}>
                {filter === "Watchlist" 
                  ? "Tidak ada bookmark di kategori ini" 
                  : `Anime "${searchTerm}" tidak ditemukan.`}
              </p>
            )}
            
          </>
        ) : (
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <button onClick={() => {setSelectedAnime(null); setActiveVideo(null);}} style={{ ...btnGrey, marginBottom: '20px', width: isMobile ? '100%' : 'auto' }}>← Kembali</button>
            
            <div style={{display: 'flex', gap: isMobile ? '20px' : '40px', flexWrap: 'wrap'}}>
              
              {/* KOLOM KIRI: MAIN PLAYER */}
              <div style={{flex: '1 1 600px', width: '100%'}}>
                <div style={{ backgroundColor: '#000', borderRadius: '15px', overflow: 'hidden', aspectRatio: '16/9', marginBottom: '20px', border: '1px solid #333', position: 'relative' }}>
                  {activeVideo ? (
                    <iframe src={activeVideo} width="100%" height="100%" style={{border: 'none'}} allowFullScreen={true} allow="autoplay; fullscreen"></iframe>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', textAlign: 'center', padding: '20px' }}>
                      <span style={{fontSize: '3rem'}}>🎬</span>
                      <p>Pilih Episode atau Trailer di samping</p>
                    </div>
                  )}
                </div>
                
                <h1 style={{fontSize: isMobile ? '1.5rem' : '2.5rem', marginBottom: '10px'}}>{selectedAnime.title}</h1>
                <div style={{display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap'}}>
                   <span style={{backgroundColor: '#333', padding: '5px 12px', borderRadius: '5px', fontSize: '12px'}}>{selectedAnime.genre}</span>
                   <span style={{backgroundColor: '#333', padding: '5px 12px', borderRadius: '5px', fontSize: '12px'}}>{selectedAnime.status}</span>
                   <span style={{color: '#E50914', fontWeight: 'bold'}}>⭐ {selectedAnime.score}</span>
                </div>
                <button onClick={(e) => toggleWatchlist(e, selectedAnime)} style={{ ...btnGrey, width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? 'none' : '250px', backgroundColor: watchlistIds.includes(selectedAnime.id) ? '#E50914' : '#333', marginBottom: '15px' }}>{watchlistIds.includes(selectedAnime.id) ? 'Hapus Watchlist' : '+ Watchlist'}</button>
                <p style={{lineHeight: '1.6', fontSize: isMobile ? '0.9rem' : '1rem', color: '#ccc'}}>{selectedAnime.synopsis}</p>
              </div>

              {/* KOLOM KANAN: LIST EPISODE & TRAILER */}
              <div style={{flex: '1 1 300px', width: '100%', backgroundColor: '#222', padding: isMobile ? '15px' : '25px', borderRadius: '15px', boxSizing: 'border-box', height: 'fit-content'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3 style={{fontSize: isMobile ? '1rem' : '1.2rem', margin: 0}}>Pilih Tontonan</h3>
                    {isAdmin && (
                        <button onClick={() => { setShowAddEpisode(!showAddEpisode); setEditMode(null); setNewEps({ epsNumber: '', videoUrl: '', epsTrailer: '', downloadUrl: '' }); }} style={{...btnRed, fontSize: '11px'}}>+ Eps</button>
                    )}
                </div>
                
                {/* TOMBOL TRAILER */}
                <button 
                  onClick={() => {setActiveVideo(selectedAnime.mainTrailer); window.scrollTo({top: 0, behavior: 'smooth'});}}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    backgroundColor: activeVideo === selectedAnime.mainTrailer ? '#E50914' : '#444', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    marginBottom: '20px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  🎞️ Tonton Trailer Resmi
                </button>

                {/* FORM INPUT ADMIN (LINK DOWNLOAD) */}
                {isAdmin && showAddEpisode && (
                  <form onSubmit={handleSaveEpisode} style={{...formStyle, gridTemplateColumns: '1fr', padding: '15px', marginBottom: '20px'}}>
                    <input type="number" placeholder="Eps ke-" value={newEps.epsNumber} onChange={e => setNewEps({...newEps, epsNumber: e.target.value})} required style={inputStyle}/>
                    <input type="text" placeholder="Link Video (Iframe/Player)" value={newEps.videoUrl} onChange={e => setNewEps({...newEps, videoUrl: e.target.value})} required style={inputStyle}/>
                    <input type="text" placeholder="Link Download Manual (GDrive/Mediafire)" value={newEps.downloadUrl} onChange={e => setNewEps({...newEps, downloadUrl: e.target.value})} style={{...inputStyle, border: '1px solid #E50914'}}/>
                    <button type="submit" style={btnRed}>{editMode ? 'Update' : 'Simpan'}</button>
                  </form>
                )}

                {/* LIST EPISODE DENGAN EFEK HOVER */}
                <div style={{maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {episodes.map(eps => (
                    <div 
                      key={eps.id} 
                      className="episode-item" 
                      onClick={() => {setActiveVideo(eps.videoUrl); window.scrollTo({top: 0, behavior: 'smooth'});}}
                      style={{
                        backgroundColor: activeVideo === eps.videoUrl ? '#333' : '#2a2a2a', 
                        padding: '12px 15px', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        borderLeft: activeVideo === eps.videoUrl ? '4px solid #E50914' : '4px solid transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}
                    >
                      <span style={{fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: activeVideo === eps.videoUrl ? 'bold' : 'normal'}}>
                        ▶ Episode {eps.epsNumber}
                      </span>
                      <div style={{display: 'flex', gap: '5px'}}>
                        {isAdmin && (
                          <>
                            <button onClick={(e) => {e.stopPropagation(); setNewEps(eps); setEditMode(eps.id); setShowAddEpisode(true);}} style={{...btnEdit, padding: '4px 8px', fontSize: '10px'}}>Edit</button>
                            <button onClick={(e) => {e.stopPropagation(); deleteEpisode(eps.id);}} style={{...btnDel, padding: '4px 8px', fontSize: '10px'}}>Hapus</button>
                          </>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            if(eps.downloadUrl) {
                              window.open(eps.downloadUrl, '_blank');
                            } else {
                              alert("Link download belum tersedia.");
                            }
                          }} 
                          style={{
                            ...btnGrey, 
                            padding: '4px 10px', 
                            fontSize: '10px', 
                            backgroundColor: eps.downloadUrl ? '#007bff' : '#444',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        >
                          {eps.downloadUrl ? 'Download' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// STYLES TETAP DI LUAR
const dropdownMenu = { position: 'absolute', top: '50px', right: 0, backgroundColor: '#222', borderRadius: '8px', width: '200px', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 1000 };
const menuItem = { padding: '12px 20px', cursor: 'pointer', fontSize: '14px', transition: '0.2s', textAlign: 'left' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContent = { backgroundColor: '#222', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '500px', color: 'white' };
const btnRed = { backgroundColor: '#E50914', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const btnGrey = { backgroundColor: '#333', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '5px', cursor: 'pointer' };
const btnEdit = { backgroundColor: '#ffa500', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' };
const btnDel = { backgroundColor: '#8b0000', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' };
const btnFilter = { border: 'none', color: 'white', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' };
const badgeTop = { position: 'absolute', top: '10px', right: '10px', backgroundColor: '#E50914', color: 'white', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', zIndex: 1 };
const inputStyle = { padding: '14px', borderRadius: '6px', border: 'none', backgroundColor: '#444', color: 'white', marginBottom: '12px', width: '100%', boxSizing: 'border-box' };
const formStyle = { display: 'grid', gap: '15px', backgroundColor: '#222', padding: '25px', borderRadius: '12px', marginTop: '20px' };
const cardStyle = { backgroundColor: '#1f1f1f', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333' };

export default Home;
