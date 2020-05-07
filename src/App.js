import React, { useEffect, useState, useRef } from 'react';
import { SimpleWebRtc } from './jitsi-config';
import './App.scss';
const { JitsiMeetJS } = window;

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function App() {
  const [localTracks, setLocalTracks] = useState([]);
  const [sharingScreen, setShringScreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [video, setVideo] = useState(true);
  const [mainVideoIsLocal, setMainVideoIsLocal] = useState(true);
  const localVideosRef = useRef();
  const remoteVideosRef = useRef();
  const webrtcRef = useRef();
  const mainVideoRef = useRef();

  useEffect(() => {
    const webrtc = new SimpleWebRtc({
      localVideoEl: localVideosRef.current,
      remoteVideosEl: remoteVideosRef.current,
    });

    webrtcRef.current = webrtc;

    webrtc.on('readyToCall', () => {
      webrtc.joinRoom('lexisroom');
    });

    webrtc.on('mute', () => {
      console.log('mute uwu');
      setMuted(true);
    });

    webrtc.on('unmute', () => {
      console.log('unmute uwu');
      setMuted(false);
    });

    webrtc.on('mainVideo', ({ track }) => {
      mainVideoRef.current.srcObject = track.stream;
      setMainVideoIsLocal(track.isLocal());
    });

    return () => {
      webrtc.unload();
    };
  }, []);

  function handleShareScheen() {
    if (localTracks[1]) {
      localTracks[1].dispose();
    }
    JitsiMeetJS.createLocalTracks({
      devices: [sharingScreen ? 'video' : 'desktop'],
    }).then(([track]) => {
      setLocalTracks((localTracks) => [localTracks[0], track]);
      setShringScreen((sharingScreen) => !sharingScreen);
    });
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
    console.log(video);

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
        }
      </div>
    </div>
  );
}

export default App;
