import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CosmicParticles } from './CosmicParticles';
import { GestureState, HandPosition } from '../types';

interface ExperienceProps {
  gestureState: GestureState;
  isRaining: boolean;
  isStormy: boolean;
  baseColor: string;
  hands: { left: HandPosition, right: HandPosition };
}

// Internal component to handle Camera movement logic
const CameraRig: React.FC<{ hands: { left: HandPosition, right: HandPosition }, gestureState: GestureState }> = ({ hands, gestureState }) => {
  const { camera } = useThree();
  const vec = new THREE.Vector3();

  useFrame((state, delta) => {
    // 1. Calculate Hands Influence
    let targetX = 0;
    let targetY = 0;
    let handsCount = 0;

    if (hands.left.active) {
      targetX += hands.left.x;
      targetY += hands.left.y;
      handsCount++;
    }
    if (hands.right.active) {
      targetX += hands.right.x;
      targetY += hands.right.y;
      handsCount++;
    }

    // Only apply custom rig if hands are present
    if (handsCount > 0) {
      const avgX = targetX / handsCount;
      const avgY = targetY / handsCount;

      // 2. Rotation Logic (Orbit)
      // Map X (-15 to 15) to Angle (approx -1.5 rad to 1.5 rad)
      const targetAzimuth = (avgX / 15) * 1.5; 
      // Standard tilt: slightly above horizon
      let targetPolar = (Math.PI / 2) - 0.2 - (avgY / 20) * 0.5;

      // 3. Zoom/Dolly Logic
      // Default distance
      let targetRadius = 25;
      let zoomSpeed = 2.0;

      // If "Spread" gesture (Open Palm), zoom OUT and Look DOWN to see the roots map
      if (gestureState === GestureState.SPREAD) {
        targetRadius = 45; // Wide shot
        targetPolar = (Math.PI / 2) - 1.0; // High angle (looking down)
        zoomSpeed = 1.0;  // Majestic slow zoom
      }

      // 4. Calculate new Camera Position on Sphere
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);

      // Lerp angles
      spherical.theta = THREE.MathUtils.lerp(spherical.theta, targetAzimuth, delta * 2.0);
      spherical.phi = THREE.MathUtils.lerp(spherical.phi, targetPolar, delta * 2.0); 
      
      // Lerp radius (Zoom)
      spherical.radius = THREE.MathUtils.lerp(spherical.radius, targetRadius, delta * zoomSpeed);

      // Apply
      vec.setFromSpherical(spherical);
      camera.position.copy(vec);
      camera.lookAt(0, 0, 0);
    } else {
      // Optional: Slight auto-drift when idle could go here, 
      // but OrbitControls takes over in App.tsx when !handsActive
    }
  });

  return null;
};

export const Experience: React.FC<ExperienceProps> = ({ gestureState, isRaining, isStormy, baseColor, hands }) => {
  return (
    <>
      <fog attach="fog" args={['#000510', 5, 60]} />
      
      {/* Camera Controller */}
      <CameraRig hands={hands} gestureState={gestureState} />

      {/* The main particle system */}
      <CosmicParticles 
        gestureState={gestureState}
        isRaining={isRaining}
        isStormy={isStormy}
        baseColor={baseColor}
        hands={hands}
      />

      {/* Post-processing for the "Glow" and "Cosmic" feel */}
      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.2} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};