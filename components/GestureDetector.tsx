import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { GestureState, HandPosition } from '../types';

interface GestureDetectorProps {
  onGestureDetected: (gesture: string) => void;
  onStateChange: (state: GestureState) => void;
  onRainToggle: (active: boolean) => void;
  onStormToggle: (active: boolean) => void;
  onHandsUpdate: (hands: { left: HandPosition, right: HandPosition }) => void;
}

export const GestureDetector: React.FC<GestureDetectorProps> = ({
  onGestureDetected,
  onStateChange,
  onRainToggle,
  onStormToggle,
  onHandsUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef<number>(0);

  // Constants for coordinate mapping (Screen 2D -> World 3D)
  // Assuming camera is at z=25 looking at 0,0,0. 
  // Visible range is roughly X: -15 to 15, Y: -10 to 10
  const WORLD_X_RANGE = 30; 
  const WORLD_Y_RANGE = 20;

  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        setLoaded(true);
        startWebcam();
      } catch (err) {
        console.error(err);
        setError("Failed to load gesture model");
      }
    };

    init();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startWebcam = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 320, 
            height: 240,
            frameRate: { ideal: 30 }
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictWebcam);
        }
      } catch (err) {
        setError("Camera access denied");
      }
    }
  };

  const predictWebcam = () => {
    if (!gestureRecognizerRef.current || !videoRef.current) return;

    const nowInMs = Date.now();
    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      
      try {
        const results = gestureRecognizerRef.current.recognizeForVideo(videoRef.current, nowInMs);

        if (results) {
          // --- 1. Gesture Logic ---
          let gestureFound = false;
          if (results.gestures && results.gestures.length > 0) {
            const firstHandGestures = results.gestures[0];
            if (firstHandGestures && firstHandGestures.length > 0) {
              const gesture = firstHandGestures[0];
              const name = gesture.categoryName;
              const score = gesture.score;

              if (score > 0.5) {
                onGestureDetected(name);
                handleGestureLogic(name);
                gestureFound = true;
              }
            }
          }
          
          if (!gestureFound) {
            onGestureDetected("None");
          }

          // --- 2. Hand Position Tracking Logic ---
          const newHands = {
            left: { x: 0, y: 0, active: false },
            right: { x: 0, y: 0, active: false }
          };

          if (results.landmarks && results.landmarks.length > 0) {
            results.landmarks.forEach((landmarks, index) => {
              // Robust Handedness Check
              let handedness = 'Left'; 
              
              // Ensure handedness array exists and has an entry for this index
              if (results.handedness && results.handedness.length > index) {
                const handInfoArray = results.handedness[index];
                // Ensure the entry at this index is an array and has at least one element
                if (handInfoArray && handInfoArray.length > 0) {
                  handedness = handInfoArray[0].categoryName;
                } else {
                  // Fallback based on index if data is empty
                  handedness = index === 0 ? 'Left' : 'Right';
                }
              } else {
                // Fallback if handedness array is missing entirely
                handedness = index === 0 ? 'Left' : 'Right';
              }
              
              const lm = landmarks[9]; // Middle Finger Knuckle
              
              const worldX = (0.5 - lm.x) * WORLD_X_RANGE;
              const worldY = (0.5 - lm.y) * WORLD_Y_RANGE; 

              const handData = { x: worldX, y: worldY, active: true };

              if (handedness === 'Right') {
                newHands.right = handData;
              } else {
                newHands.left = handData;
              }
            });
          }
          onHandsUpdate(newHands);
        }
      } catch (e) {
        console.warn("Prediction error:", e);
      }
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const handleGestureLogic = (gestureName: string) => {
    switch (gestureName) {
      case 'Closed_Fist':
        onStateChange(GestureState.TREES);
        break;
      case 'Open_Palm':
        onStateChange(GestureState.SPREAD);
        break;
      case 'Victory':
        onRainToggle(true);
        break;
      case 'Thumb_Up':
        onStormToggle(true);
        break;
      case 'Pointing_Up':
        onStateChange(GestureState.IDLE);
        onRainToggle(false);
        onStormToggle(false);
        break;
    }
  };

  return (
    <div className="webcam-container fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none opacity-80">
      {error && <div className="text-red-500 bg-black/50 p-2 text-xs mb-2 rounded">{error}</div>}
      {!loaded && !error && <div className="text-cyan-400 bg-black/50 p-2 text-xs mb-2 rounded">Loading AI Model...</div>}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="w-32 h-24 object-cover border border-cyan-500/30 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
      />
      <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider bg-black/40 px-2 py-1 rounded">
        Camera Input
      </div>
    </div>
  );
}