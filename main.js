import './style.css';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import firebase from 'firebase/app';
import 'firebase/firestore';
import {getDatabase, ref, child, get , set ,update, remove} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
const firebaseConfig = {
  apiKey: "AIzaSyDvvM6v5KTT5AWn0W1_xEU7WmYb32ycD08",
  authDomain: "came-54f87.firebaseapp.com",
  databaseURL: "https://came-54f87-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "came-54f87",
  storageBucket: "came-54f87.appspot.com",
  messagingSenderId: "806978345562",
  appId: "1:806978345562:web:6290b3bb8812268e2d9663",
  measurementId: "G-EDHCEV8KX5"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const callNameInput = document.getElementById('callNameInput');

// 1. Setup media sources

// 2. Create an offer
callButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;
  // Reference Firestore collections for signaling
  const callName = callNameInput.value;
  const callDoc = firestore.collection('calls').doc(callName);
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  var v = document.getElementsByClassName('videos');

  for (var i = 0; i < v.length; i ++) {
      v[i].style.display = 'flex';
  }
  var b = document.getElementsByClassName('but');

  for (var i = 0; i < b.length; i ++) {
      b[i].style.display = 'none';
  }
};

// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;
  const callId = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
  var v = document.getElementsByClassName('videos');

  for (var i = 0; i < v.length; i ++) {
      v[i].style.display = 'flex';
  }
  var b = document.getElementsByClassName('but');

  for (var i = 0; i < b.length; i ++) {
      b[i].style.display = 'none';
  }
  var c = document.getElementsById('container');
  c.style.display = 'flex';
};



let toggleMic = async () => {
  let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')

  if(audioTrack.enabled){
      audioTrack.enabled = false
      document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  }else{
      audioTrack.enabled = true
      document.getElementById('mic-btn').style.backgroundColor = 'white'
  }
}
document.getElementById('mic-btn').addEventListener('click', toggleMic)
let toggleCamera = async () => {
  let videoTrack = localStream.getTracks().find(track => track.kind === 'video')

  if(videoTrack.enabled){
      videoTrack.enabled = false
      document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  }else{
      videoTrack.enabled = true
      document.getElementById('camera-btn').style.backgroundColor = 'white'
  }
}
document.getElementById('camera-btn').addEventListener('click', toggleCamera)




const app = initializeApp(firebaseConfig);
const db = getDatabase();
let x = 0;
let y = 0;

 const upBtn = document.getElementById('upBtn');
 const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
 const rightBtn = document.getElementById('rightBtn');
function resetValues() {
  set(ref(db, 'position'),{
    xpos : 0,
    ypos : 0
  })  
}
 // Event listeners for mousedown and mouseup events
  upBtn.addEventListener('mousedown', function() {
    set(ref(db, 'position'),{
      xpos : 0,
      ypos : 1
    }) 
   });
    downBtn.addEventListener('mousedown', function() {
      set(ref(db, 'position'),{
        xpos : 0,
        ypos : -1
      })  
 });
  leftBtn.addEventListener('mousedown', function() {
    set(ref(db, 'position'),{
      xpos : -1,
      ypos : 0
    }) 
  });
 rightBtn.addEventListener('mousedown', function() {
  set(ref(db, 'position'),{
    xpos : 1,
    ypos : 0
  }) 
 });
      upBtn.addEventListener('mouseup', resetValues);
      downBtn.addEventListener('mouseup', resetValues);
      leftBtn.addEventListener('mouseup', resetValues);
      rightBtn.addEventListener('mouseup', resetValues);




      let services = null;

      document.getElementById("connect").onclick = async () => {
          try {
              const device = await microbit.requestMicrobit(window.navigator.bluetooth);
              if (device) {
                  services = await microbit.getServices(device);
              }
          } catch (error) {
              log(`Error connecting`);
          }
      };
