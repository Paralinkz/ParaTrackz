import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, FileText, Download, Trash2, StopCircle, MapPin, FolderOpen, Plus, Save } from 'lucide-react';

const InvestigationTools = () => {
  const [activeTab, setActiveTab] = useState('sessions');
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState('');
  const [photos, setPhotos] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get GPS location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.log('Location access denied or unavailable');
        }
      );
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Session Management Functions
  const createSession = () => {
    if (newSessionName.trim()) {
      const newSession = {
        id: Date.now(),
        name: newSessionName,
        startTime: new Date().toLocaleString(),
        location: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        } : null,
        notes: [],
        photos: [],
        recordings: []
      };
      setSessions([newSession, ...sessions]);
      setActiveSession(newSession.id);
      setNewSessionName('');
      setShowNewSessionForm(false);
      setNotes([]);
      setPhotos([]);
      setRecordings([]);
    }
  };

  const loadSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSession(sessionId);
      setNotes(session.notes || []);
      setPhotos(session.photos || []);
      setRecordings(session.recordings || []);
    }
  };

  const saveCurrentSession = () => {
    if (activeSession) {
      setSessions(sessions.map(s => 
        s.id === activeSession 
          ? { ...s, notes, photos, recordings, lastSaved: new Date().toLocaleString() }
          : s
      ));
      alert('Session saved successfully!');
    }
  };

  const deleteSession = (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (activeSession === sessionId) {
        setActiveSession(null);
        setNotes([]);
        setPhotos([]);
        setRecordings([]);
      }
    }
  };

  const exportSession = () => {
    const session = sessions.find(s => s.id === activeSession);
    if (session) {
      const exportData = {
        sessionName: session.name,
        startTime: session.startTime,
        location: session.location,
        notes: session.notes,
        photoCount: session.photos.length,
        recordingCount: session.recordings.length
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investigation-${session.name}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Field Notes Functions
  const addNote = () => {
    if (currentNote.trim() && activeSession) {
      const newNote = {
        id: Date.now(),
        text: currentNote,
        timestamp: new Date().toLocaleString(),
        location: currentLocation ? {
          latitude: currentLocation.latitude.toFixed(6),
          longitude: currentLocation.longitude.toFixed(6)
        } : null
      };
      setNotes([newNote, ...notes]);
      setCurrentNote('');
    }
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const exportNotes = () => {
    const notesText = notes.map(note => {
      let locationStr = 'Location: Unknown';
      if (note.location) {
        locationStr = `Location: ${note.location.latitude}, ${note.location.longitude}`;
      }
      return `[${note.timestamp}] ${locationStr}\n${note.text}\n\n`;
    }).join('');
    
    const blob = new Blob([notesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investigation-notes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Photo Upload Functions
  const handlePhotoUpload = (e) => {
    if (!activeSession) {
      alert('Please create or select a session first');
      return;
    }
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto = {
          id: Date.now() + Math.random(),
          url: event.target.result,
          timestamp: new Date().toLocaleString(),
          name: file.name,
          location: currentLocation ? {
            latitude: currentLocation.latitude.toFixed(6),
            longitude: currentLocation.longitude.toFixed(6)
          } : null,
          notes: ''
        };
        setPhotos(prev => [newPhoto, ...prev]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const deletePhoto = (id) => {
    setPhotos(photos.filter(photo => photo.id !== id));
  };

  const updatePhotoNotes = (id, noteText) => {
    setPhotos(photos.map(photo => 
      photo.id === id ? { ...photo, notes: noteText } : photo
    ));
  };

  // EVP Recording Functions
  const startRecording = async () => {
    if (!activeSession) {
      alert('Please create or select a session first');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const newRecording = {
          id: Date.now(),
          url: audioUrl,
          timestamp: new Date().toLocaleString(),
          duration: recordingTime,
          location: currentLocation ? {
            latitude: currentLocation.latitude.toFixed(6),
            longitude: currentLocation.longitude.toFixed(6)
          } : null,
          notes: ''
        };
        
        setRecordings(prev => [newRecording, ...prev]);
        setRecordingTime(0);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      alert('Microphone access denied. Please allow microphone access to record EVP.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const deleteRecording = (id) => {
    const recording = recordings.find(r => r.id === id);
    if (recording) {
      URL.revokeObjectURL(recording.url);
    }
    setRecordings(recordings.filter(r => r.id !== id));
  };

  const updateRecordingNotes = (id, noteText) => {
    setRecordings(recordings.map(rec => 
      rec.id === id ? { ...rec, notes: noteText } : rec
    ));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLocation = (location) => {
    if (!location) return 'Location unavailable';
    return `${location.latitude}, ${location.longitude}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '3rem',
            background: 'linear-gradient(90deg, #f97316, #ec4899, #22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px',
            fontWeight: 'bold'
          }}>Investigation Manager</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            Track and preserve evidence of your investigations.
          </p>
          {currentLocation && (
            <div style={{ 
              color: '#22d3ee', 
              fontSize: '0.9rem', 
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}>
              <MapPin size={16} />
              {formatLocation(currentLocation)}
            </div>
          )}
        </div>

        {/* Active Session Banner */}
        {activeSession && (
          <div style={{
            background: 'rgba(34, 211, 238, 0.1)',
            border: '2px solid rgba(34, 211, 238, 0.4)',
            borderRadius: '12px',
            padding: '15px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ color: '#22d3ee', fontWeight: 'bold', fontSize: '1.1rem' }}>
                Active Session: {sessions.find(s => s.id === activeSession)?.name}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                {notes.length} notes • {photos.length} photos • {recordings.length} recordings
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={saveCurrentSession}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(34, 211, 238, 0.2)',
                  border: '1px solid rgba(34, 211, 238, 0.5)',
                  borderRadius: '6px',
                  color: '#22d3ee',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={exportSession}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(168, 85, 247, 0.2)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  borderRadius: '6px',
                  color: '#a855f7',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '30px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'sessions', label: 'Sessions', icon: <FolderOpen size={20} /> },
            { id: 'notes', label: 'Field Notes', icon: <FileText size={20} /> },
            { id: 'evp', label: 'EVP Recording', icon: <Mic size={20} /> },
            { id: 'photos', label: 'Photo Evidence', icon: <Camera size={20} /> }         
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                background: activeTab === tab.id 
                  ? 'linear-gradient(90deg, #22d3ee, #a855f7)' 
                  : 'rgba(34, 211, 238, 0.1)',
                border: activeTab === tab.id ? 'none' : '2px solid rgba(34, 211, 238, 0.3)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div style={{
            background: 'rgba(34, 211, 238, 0.05)',
            border: '2px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              {!showNewSessionForm ? (
                <button
                  onClick={() => setShowNewSessionForm(true)}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={20} />
                  New Investigation Session
                </button>
              ) : (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(34, 211, 238, 0.3)',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="Enter session name (e.g., Abandoned Hospital - Oct 2025)"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(34, 211, 238, 0.3)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '1rem',
                      marginBottom: '15px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={createSession}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Create Session
                    </button>
                    <button
                      onClick={() => {
                        setShowNewSessionForm(false);
                        setNewSessionName('');
                      }}
                      style={{
                        padding: '10px 20px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {sessions.map(session => (
                <div
                  key={session.id}
                  style={{
                    background: session.id === activeSession 
                      ? 'rgba(34, 211, 238, 0.15)' 
                      : 'rgba(15, 23, 42, 0.6)',
                    border: session.id === activeSession 
                      ? '2px solid rgba(34, 211, 238, 0.5)' 
                      : '1px solid rgba(34, 211, 238, 0.3)',
                    borderRadius: '8px',
                    padding: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px' }}>
                        {session.name}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '5px' }}>
                        Started: {session.startTime}
                      </div>
                      {session.location && (
                        <div style={{ 
                          color: '#22d3ee', 
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <MapPin size={14} />
                          {formatLocation(session.location)}
                        </div>
                      )}
                      {session.lastSaved && (
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '5px' }}>
                          Last saved: {session.lastSaved}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {session.id !== activeSession && (
                        <button
                          onClick={() => loadSession(session.id)}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(34, 211, 238, 0.2)',
                            border: '1px solid rgba(34, 211, 238, 0.5)',
                            borderRadius: '6px',
                            color: '#22d3ee',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Load
                        </button>
                      )}
                      <button
                        onClick={() => deleteSession(session.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.5)',
                          borderRadius: '6px',
                          padding: '8px',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ 
                    color: '#cbd5e1', 
                    fontSize: '0.9rem',
                    display: 'flex',
                    gap: '15px',
                    flexWrap: 'wrap'
                  }}>
                    <span>{session.notes?.length || 0} notes</span>
                    <span>{session.photos?.length || 0} photos</span>
                    <span>{session.recordings?.length || 0} recordings</span>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#94a3b8'
                }}>
                  No investigation sessions yet. Create one to get started!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Field Notes Tab */}
        {activeTab === 'notes' && (
          <div style={{
            background: 'rgba(34, 211, 238, 0.05)',
            border: '2px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            {!activeSession ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#94a3b8'
              }}>
                Please create or select a session first
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <textarea
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    placeholder="Enter your field observations..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '15px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(34, 211, 238, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '1rem',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                    <button
                      onClick={addNote}
                      style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Add Note
                    </button>
                    {notes.length > 0 && (
                      <button
                        onClick={exportNotes}
                        style={{
                          padding: '12px 24px',
                          background: 'rgba(34, 211, 238, 0.2)',
                          border: '1px solid rgba(34, 211, 238, 0.5)',
                          borderRadius: '8px',
                          color: '#22d3ee',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Download size={16} />
                        Export Notes
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {notes.map(note => (
                    <div
                      key={note.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(34, 211, 238, 0.3)',
                        borderRadius: '8px',
                        padding: '20px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ color: '#22d3ee', fontSize: '0.9rem', marginBottom: '5px' }}>
                            {note.timestamp}
                          </div>
                          {note.location && (
                            <div style={{ 
                              color: '#94a3b8', 
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <MapPin size={12} />
                              {formatLocation(note.location)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteNote(note.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            borderRadius: '6px',
                            padding: '8px',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p style={{ color: 'white', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Photo Evidence Tab */}
        {activeTab === 'photos' && (
          <div style={{
            background: 'rgba(34, 211, 238, 0.05)',
            border: '2px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            {!activeSession ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#94a3b8'
              }}>
                Please create or select a session first
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Camera size={20} />
                  Upload Photos
                </button>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {photos.map(photo => (
                    <div
                      key={photo.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(34, 211, 238, 0.3)',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={photo.url}
                        alt="Evidence"
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ padding: '15px' }}>
                        <div style={{ color: '#22d3ee', fontSize: '0.85rem', marginBottom: '5px' }}>
                          {photo.timestamp}
                        </div>
                        {photo.location && (
                          <div style={{ 
                            color: '#94a3b8', 
                            fontSize: '0.75rem', 
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <MapPin size={12} />
                            {formatLocation(photo.location)}
                          </div>
                        )}
                        <textarea
                          value={photo.notes}
                          onChange={(e) => updatePhotoNotes(photo.id, e.target.value)}
                          placeholder="Add notes about this photo..."
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            padding: '10px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(34, 211, 238, 0.3)',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.9rem',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            marginBottom: '10px'
                          }}
                        />
                        <button
                          onClick={() => deletePhoto(photo.id)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Delete Photo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* EVP Recording Tab */}
        {activeTab === 'evp' && (
          <div style={{
            background: 'rgba(34, 211, 238, 0.05)',
            border: '2px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            {!activeSession ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#94a3b8'
              }}>
                Please create or select a session first
              </div>
            ) : (
              <>
                <div style={{
                  textAlign: 'center',
                  marginBottom: '30px',
                  padding: '40px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '12px'
                }}>
                  {isRecording ? (
                    <>
                      <div style={{
                        fontSize: '3rem',
                        color: '#ef4444',
                        marginBottom: '20px'
                      }}>
                        ⬤
                      </div>
                      <div style={{ fontSize: '2rem', color: 'white', marginBottom: '20px' }}>
                        {formatTime(recordingTime)}
                      </div>
                      <button
                        onClick={stopRecording}
                        style={{
                          padding: '15px 40px',
                          background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          margin: '0 auto'
                        }}
                      >
                        <StopCircle size={24} />
                        Stop Recording
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startRecording}
                      style={{
                        padding: '15px 40px',
                        background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        margin: '0 auto'
                      }}
                    >
                      <Mic size={24} />
                      Start EVP Recording
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {recordings.map(recording => (
                    <div
                      key={recording.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(34, 211, 238, 0.3)',
                        borderRadius: '8px',
                        padding: '20px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ color: '#22d3ee', fontSize: '0.9rem', marginBottom: '5px' }}>
                            {recording.timestamp}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '5px' }}>
                            Duration: {formatTime(recording.duration)}
                          </div>
                          {recording.location && (
                            <div style={{ 
                              color: '#94a3b8', 
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <MapPin size={12} />
                              {formatLocation(recording.location)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteRecording(recording.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            borderRadius: '6px',
                            padding: '8px',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <audio
                        controls
                        src={recording.url}
                        style={{
                          width: '100%',
                          marginBottom: '15px'
                        }}
                      />
                      <textarea
                        value={recording.notes}
                        onChange={(e) => updateRecordingNotes(recording.id, e.target.value)}
                        placeholder="Add notes about this EVP recording..."
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '10px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(34, 211, 238, 0.3)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '0.9rem',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationTools;
