const { JitsiMeetJS } = window;

JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);

export const initOptions = {
  disableAudioLevels: true,

  // The ID of the jidesha extension for Chrome.
  desktopSharingChromeExtId: 'mbocklcggfhnbahlnepmldehdhpjfcjp',

  // Whether desktop sharing should be disabled on Chrome.
  desktopSharingChromeDisabled: false,

  // The media sources to use when using screen sharing with the Chrome
  // extension.
  desktopSharingChromeSources: ['screen', 'window'],

  // Required version of Chrome extension
  desktopSharingChromeMinExtVersion: '0.1',

  // Whether desktop sharing should be disabled on Firefox.
  desktopSharingFirefoxDisabled: true,
};

export const config = {
  hosts: {
    domain: 'beta.meet.jit.si',
    muc: 'conference.beta.meet.jit.si', // FIXME: use XEP-0030
  },
  bosh: 'https://beta.meet.jit.si/http-bind', // FIXME: use xep-0156 for that

  // The name of client node advertised in XEP-0115 'c' stanza
  clientNode: 'https://jitsi.org/jitsimeet',
};

export const confOptions = {
  openBridgeChannel: true,
};

function onConnectionFailed() {
  console.error('Connection Failed!');
}

function onDeviceListChanged(devices) {
  console.info('current devices', devices);
}

class SimpleWebRtc {
  localVideoEl = null;
  remoteVideosEl = null;
  localTracks = [];
  remoteTracks = {};
  callbacks = {};
  room = null;
  isJoined = false;

  constructor({ localVideoEl, remoteVideosEl }) {
    this.localVideoEl = localVideoEl;
    this.remoteVideosEl = remoteVideosEl;

    JitsiMeetJS.init(initOptions);
    const connection = new JitsiMeetJS.JitsiConnection(null, null, config);
    this.connection = connection;

    connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      this.onConnectionSuccess.bind(this)
    );
    connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_FAILED,
      onConnectionFailed
    );
    connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
      this.disconnect.bind(this)
    );

    JitsiMeetJS.mediaDevices.addEventListener(
      JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED,
      onDeviceListChanged
    );

    this.connection.connect();

    JitsiMeetJS.createLocalTracks({ devices: ['audio', 'video'] })
      .then(this.onLocalTracks)
      .catch((error) => {
        throw error;
      });
  }

  onConnectionSuccess = () => {
    this.emit('readyToCall');
  };

  disconnect = () => {
    console.log('disconnect!');
    this.connection.removeEventListener(
      JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      this.onConnectionSuccess
    );
    this.connection.removeEventListener(
      JitsiMeetJS.events.connection.CONNECTION_FAILED,
      onConnectionFailed
    );
    this.connection.removeEventListener(
      JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
      this.disconnect
    );
  };

  on = (event, cb) => {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(cb);
  };

  emit = (event, data) => {
    const cbs = this.callbacks[event];
    if (cbs) {
      cbs.forEach((cb) => cb(data));
    }
  };

  joinRoom = (roomName) => {
    console.log('connecting to: ', roomName);
    const room = this.connection.initJitsiConference(roomName, confOptions);
    this.room = room;

    room.on(JitsiMeetJS.events.conference.TRACK_ADDED, this.onRemoteTrack);
    room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
      this.chooseMainVideo();
      console.log(`track removed!!!${track}`);
      track.containers.forEach((videoElement) => {
        console.log('removing....:', videoElement);
        try {
          this.remoteVideosEl.removeChild(videoElement);
        } catch {}
      });
      track.dispose();
      this.chooseMainVideo();
    });
    room.on(
      JitsiMeetJS.events.conference.CONFERENCE_JOINED,
      this.onConferenceJoined
    );
    room.on(JitsiMeetJS.events.conference.USER_JOINED, (id) => {
      console.log('user join');
      this.remoteTracks[id] = [];
    });
    room.on(JitsiMeetJS.events.conference.USER_LEFT, this.onUserLeft);
    room.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, (track) => {
      console.log(`${track.getType()} - ${track.isMuted()}`);
      const event = track.isMuted() ? 'mute' : 'unmute';
      const type = track.getType();
      this.emit(event, {
        name: type,
        type,
      });
    });
    room.on(
      JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
      (userID, displayName) => console.log(`${userID} - ${displayName}`)
    );
    room.on(
      JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
      (userID, audioLevel) => console.log(`${userID} - ${audioLevel}`)
    );
    room.on(JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED, () =>
      console.log(`${room.getPhoneNumber()} - ${room.getPhonePin()}`)
    );

    room.join();
  };

  onLocalTracks = (localTracks) => {
    this.localTracks = localTracks;
    localTracks.forEach((track, i) => {
      track.addEventListener(
        JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
        (audioLevel) => console.log(`Audio Level local: ${audioLevel}`)
      );
      track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () =>
        console.log('local track stoped')
      );
      track.addEventListener(
        JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
        (deviceId) =>
          console.log(`track audio output device was changed to ${deviceId}`)
      );
      if (track.getType() === 'video') {
        const video = document.createElement('video');
        video.id = `localVideo`;
        video.autoplay = true;
        this.localVideoEl.append(video);
        track.attach(video);
        this.emit('mainVideo', {
          track,
        });
      } else {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.muted = true;
        audio.id = `localAudio`;
        this.localVideoEl.append(audio);
        track.attach(audio);
      }

      console.log(this.isJoined);
      if (this.isJoined) {
        this.room.addTrack(track);
      }
    });
  };

  onRemoteTrack = (track) => {
    if (track.isLocal()) {
      return;
    }

    const participant = track.getParticipantId();

    if (!this.remoteTracks[participant]) {
      this.remoteTracks[participant] = [];
    }

    this.remoteTracks[participant].push(track);

    track.addEventListener(
      JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
      (audioLevel) => console.log(`Audio Level remote: ${audioLevel}`)
    );
    track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () =>
      console.log('remote track muted')
    );
    track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () =>
      console.log('remote track stoped')
    );
    track.addEventListener(
      JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
      (deviceId) =>
        console.log(`track audio output device was changed to ${deviceId}`)
    );
    const id = 'remote' + participant + track.getType();

    console.log(this.remoteVideosEl);
    if (track.getType() === 'video') {
      const video = document.createElement('video');
      video.id = id;
      video.autoplay = true;
      this.remoteVideosEl.append(video);
      track.attach(video);
      this.emit('mainVideo', {
        track,
      });
    } else {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.id = id;
      this.remoteVideosEl.append(audio);
      track.attach(audio);
    }

    console.log('add the remote track');
  };

  onConferenceJoined = () => {
    if (this.isJoined) return;

    console.log('conference joined!');
    this.isJoined = true;
    this.localTracks.forEach((track) => {
      this.room.addTrack(track);
    });
  };

  onUserLeft = (id) => {
    console.log('user left:', id);
    if (!this.remoteTracks[id]) {
      return;
    }
    const tracks = this.remoteTracks[id];

    tracks.forEach((track) => {
      console.log('deleting track', id, track.getType());
      track.detach(document.querySelector(`#remote${id}${track.getType()}`));
    });

    this.remoteTracks[id] = [];
    this.chooseMainVideo();
  };

  unload = () => {
    this.localTracks.forEach((track) => {
      track.dispose();
    });
    this.room.leave();
    this.connection.disconnect();
  };

  mute = async () => {
    const audioTrack = this.localTracks[0];
    audioTrack.mute();
  };

  unmute = async () => {
    const audioTrack = this.localTracks[0];
    audioTrack.unmute();
  };

  toggleVideo = async () => {
    const videoTrack = this.localTracks[1];
    if (videoTrack) {
      videoTrack.dispose();
      this.localTracks.pop();
      this.room.removeTrack(videoTrack);
      return true;
    } else {
      const [track] = await JitsiMeetJS.createLocalTracks({
        devices: ['video'],
      });
      const video = document.querySelector('#localVideo');
      this.localTracks.push(track);
      track.attach(video);
      this.room.addTrack(track);
      return false;
    }
  };

  chooseMainVideo = () => {
    const someRemoteTrack = Object.values(this.remoteTracks)
      .flat()
      .find((track) => console.log(track) || track?.getType() === 'video');

    console.log(someRemoteTrack, 'lexiiiiodfjnioejriofjeirojfioerjfiojr');

    this.emit('mainVideo', {
      track: someRemoteTrack || this.localTracks[1],
    });
  };
}

export { SimpleWebRtc };
