import React, { useState, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Loader } from '@react-three/drei';
import * as THREE from 'three';
import { Experience } from './components/Experience';
import { Interface } from './components/Interface';
import { GestureDetector } from './components/GestureDetector';
import { GestureState, HandPosition } from './types';

const App: React.FC = () => {
  // State management for the visual effects
  const [gestureState, setGestureState] = useState<GestureState>(GestureState.IDLE);
  const [isRaining, setIsRaining] = useState(false);
  const [isStormy, setIsStormy] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [baseColor, setBaseColor] = useState('#1a4dcc'); // Default cosmic blue
  const [detectedGestureName, setDetectedGestureName] = useState("None");
  
  // Hand tracking state
  const [hands, setHands] = useState<{ left: HandPosition, right: HandPosition }>({
    left: { x: 0, y: 0, active: false },
    right: { x: 0, y: 0, active: false }
  });

  const handsActive = hands.left.active || hands.right.active;

  // Toggle handlers (can be called by UI or Gesture)
  const handleToggleState = (newState: GestureState) => {
    setGestureState(newState);
  };

  const toggleRain = (force?: boolean) => {
    setIsRaining(prev => force !== undefined ? force : !prev);
  };

  const toggleStorm = (force?: boolean) => {
    setIsStormy(prev => force !== undefined ? force : !prev);
  };
  
  // Audio handling
  const toggleAudio = useCallback(() => {
    const audio = document.getElementById('bg-music') as HTMLAudioElement;
    if (audio) {
      if (isPlayingMusic) {
        audio.pause();
      } else {
        audio.play().catch(e => console.error("Audio play failed", e));
      }
      setIsPlayingMusic(!isPlayingMusic);
    }
  }, [isPlayingMusic]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Background Music */}
      <audio id="bg-music" loop crossOrigin="anonymous">
        <source src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=meditation-impulse-3011.mp3" type="audio/mpeg" />
      </audio>

      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 5, 25], fov: 45 }}
        dpr={[1, 2]} 
        gl={{ antialias: false, alpha: false, stencil: false, depth: true }}
      >
        <color attach="background" args={['#000510']} />
        <Suspense fallback={null}>
          <Experience 
            gestureState={gestureState}
            isRaining={isRaining}
            isStormy={isStormy}
            baseColor={baseColor}
            hands={hands}
          />
        </Suspense>
        <OrbitControls 
          enabled={!handsActive} // Disable mouse control when hands are driving the camera
          enablePan={false} 
          enableZoom={true} 
          minDistance={2} 
          maxDistance={50} 
          maxPolarAngle={Math.PI / 2 - 0.1} 
        />
      </Canvas>

      <Loader />

      {/* AI Gesture Detection */}
      <GestureDetector 
        onGestureDetected={setDetectedGestureName}
        onStateChange={handleToggleState}
        onRainToggle={toggleRain}
        onStormToggle={toggleStorm}
        onHandsUpdate={setHands}
      />

      {/* User Interface */}
      <Interface 
        currentGesture={gestureState}
        isRaining={isRaining}
        isStormy={isStormy}
        isPlayingMusic={isPlayingMusic}
        detectedGestureName={detectedGestureName}
        baseColor={baseColor}
        onSetColor={setBaseColor}
        onToggleAudio={toggleAudio}
        handsActive={handsActive}
      />
    </div>
  );
};

export default App;