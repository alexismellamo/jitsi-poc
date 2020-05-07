import React, { useEffect, useState, useRef } from 'react';
import { SimpleWebRtc } from './jitsi-config';
import './App.scss';
const { JitsiMeetJS } = window;

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function App() {
  const [sharingScreen, setShringScreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [video, setVideo] = useState(true);
  const [mainVideoIsLocal, setMainVideoIsLocal] = useState(true);
  const localVideosRef = useRef();
  const remoteVideosRef = useRef();
  const webrtcRef = useRef();
  const mainVideoRef = useRef();
  const someoneSharingScreenRef = useRef(false);

  useEffect(() => {
    const webrtc = new SimpleWebRtc({
      localVideoEl: localVideosRef.current,
      remoteVideosEl: remoteVideosRef.current,
    });

    webrtcRef.current = webrtc;

    webrtc.on('readyToCall', () => {
      webrtc.joinRoom('thisismyroompleasedonotfuckingenter');
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
  }, []);

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

  return (
    <div className="App">
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
