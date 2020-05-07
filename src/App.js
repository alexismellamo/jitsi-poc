import React, { useEffect, useState, useRef } from 'react';
import { SimpleWebRtc } from './jitsi-config';
import './App.scss';

function Modal({ active, onSubmit }) {
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState(
    window.location.pathname.split('/')[1] || ''
  );

  return (
    <div className={`modal ${active ? 'is-active' : ''}`}>
      <div className="modal-background"></div>
      <div className="modal-content">
        <form
          className="join-modal"
          onSubmit={(ev) => {
            ev.preventDefault();
            onSubmit({ name, roomName });
          }}
        >
          <h1 className="title is-1">Enter room</h1>
          <div className="field">
            <label className="label">Name</label>
            <div className="control">
              <input
                className="input is-primary"
                type="text"
                placeholder="John Smith"
                onChange={(ev) => setName(ev.target.value)}
                value={name}
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Room name</label>
            <div className="control">
              <input
                className="input is-primary"
                type="text"
                placeholder="Johnsroom"
                onChange={(ev) => setRoomName(ev.target.value)}
                value={roomName}
              />
            </div>
          </div>
          <div className="field is-grouped">
            <div className="control">
              <button className="button is-link">Enter room</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const [sharingScreen, setShringScreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [video, setVideo] = useState(true);
  const [mainVideoIsLocal, setMainVideoIsLocal] = useState(true);
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const localVideosRef = useRef();
  const remoteVideosRef = useRef();
  const webrtcRef = useRef();
  const mainVideoRef = useRef();
  const someoneSharingScreenRef = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    const webrtc = new SimpleWebRtc({
      localVideoEl: localVideosRef.current,
      remoteVideosEl: remoteVideosRef.current,
    });

    webrtcRef.current = webrtc;

    webrtc.on('readyToCall', () => {
      console.log('jajaja');
      webrtc.joinRoom(roomName);
    });

    webrtc.on('mute', ({ name, isLocal }) => {
      if (!isLocal) return;
      setMuted(true);
    });

    webrtc.on('unmute', ({ name, isLocal }) => {
      setMuted(false);
    });

    webrtc.on('sharingScreen', ({ track }) => {
      if (!track) return;

      someoneSharingScreenRef.current = true;
      mainVideoRef.current.srcObject = track.stream;
      setMainVideoIsLocal(false);
    });

    webrtc.on('stopSharingScreen', () => {
      someoneSharingScreenRef.current = false;
      mainVideoRef.current.srcObject = null;
    });

    return () => {
      webrtc.unload();
    };
  }, [isReady]);

  function handleShareScheen() {
    if (sharingScreen) {
      webrtcRef.current.stopShareScreen();
      setShringScreen(false);
    } else {
      webrtcRef.current.shareScreen();
      setShringScreen(true);
    }
  }

  async function handleMute() {
    if (muted) {
      webrtcRef.current.unmute();
    } else {
      webrtcRef.current.mute();
    }
  }

  async function handleToggleVideo() {
    const video = await webrtcRef.current.toggleVideo();

    setVideo(!video);
  }

  function handleEnterConf({ name, roomName }) {
    const roomNameFormatted = roomName
      .toLowerCase()
      .replace(/\s/g, '')
      .replace(/[\W_]+/g, '');

    window.history.pushState(
      null,
      'roomNameFormatted',
      `/${roomNameFormatted}`
    );
    setRoomName(roomNameFormatted);
    setName(name);
    setIsReady(true);
  }

  return (
    <div className="App">
      <Modal active={!isReady} onSubmit={handleEnterConf} />
      <div ref={localVideosRef} className="local-videos"></div>
      <div ref={remoteVideosRef} className="remote-videos"></div>

      <div className="controls">
        <button className="button is-danger is-rounded" onClick={handleMute}>
          {muted ? (
            <i className="fas fa-microphone-slash"></i>
          ) : (
            <i className="fas fa-microphone"></i>
          )}
        </button>
        <button
          className="button is-info is-rounded"
          onClick={handleToggleVideo}
        >
          {video ? (
            <i className="fas fa-video"></i>
          ) : (
            <i className="fas fa-video-slash"></i>
          )}
        </button>
        <button
          className="button is-success is-rounded"
          onClick={handleShareScheen}
        >
          {sharingScreen ? (
            <i className="fas fa-window-close"></i>
          ) : (
            <i className="fas fa-desktop"></i>
          )}
        </button>
      </div>

      <div className="main-video">
        <video
          ref={mainVideoRef}
          autoPlay
          playsInline
          className={mainVideoIsLocal ? 'mirror' : ''}
        />
      </div>
    </div>
  );
}

export default App;
