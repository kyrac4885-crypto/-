import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GestureState, HandPosition } from '../types';

// Vertex Shader
const vertexShader = `
  uniform float uTime;
  uniform float uFormRatio;
  uniform float uSpreadRatio;
  uniform float uRainRatio;
  uniform float uWaveRatio;
  uniform vec3 uBaseColor;
  
  // Hand Interactions
  uniform vec3 uLeftHandPos;
  uniform float uLeftHandActive;
  uniform vec3 uRightHandPos;
  uniform float uRightHandActive;

  attribute vec3 aRandom;
  attribute vec3 aTreePos;
  attribute float aIsLeaf; // 0.0 for trunk, 1.0 for leaf
  
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position; 
    vec3 target = aTreePos; // Start with tree shape
    
    // --- 1. Base Form Logic (Trees) ---
    // Wind / Sway Logic for Trees
    if (uFormRatio > 0.01) {
        float swayIntensity = aIsLeaf > 0.5 ? 0.5 : 0.1;
        float swaySpeed = 1.0;
        float wind = sin(uTime * swaySpeed + target.x * 0.5) * (target.y * 0.05);
        target.x += wind * swayIntensity * uFormRatio;
        target.z += cos(uTime * swaySpeed * 0.8 + target.z * 0.5) * (target.y * 0.05) * swayIntensity * uFormRatio;
    }

    // --- 2. Spreading Roots Logic (Modified) ---
    // GOAL: Keep the Tree Canopy (Leaves) intact, but melt the Trunks into spreading roots.
    if (uSpreadRatio > 0.0) {
       
       if (aIsLeaf > 0.5) {
           // --- LEAF LOGIC during SPREAD ---
           // Leaves stay as trees! Do NOT flatten them.
           // Just add a slight "floating/energy" effect to show they are active
           target.y += sin(uTime * 2.0 + target.x) * 0.5 * uSpreadRatio;
           // Slight expansion of canopy to feel "fuller"
           target.x += (target.x - 0.0) * 0.1 * uSpreadRatio;
           target.z += (target.z - 0.0) * 0.1 * uSpreadRatio;
       } else {
           // --- TRUNK LOGIC during SPREAD ---
           // Trunks morph into roots on the ground
           vec3 rootTarget = target;
           
           // A. Flatten to ground
           float groundLevel = -5.0 + aRandom.y * 1.5; 
           rootTarget.y = groundLevel;
           
           // B. Organic Radial Expansion (Vein pattern)
           vec2 flatPos = target.xz;
           float angle = atan(flatPos.y, flatPos.x); 
           float dist = length(flatPos);
           
           // Vein/Root Noise
           float tendrilNoise = sin(angle * 12.0) + sin(angle * 23.0 + aRandom.x * 10.0);
           float tendrilStrength = smoothstep(-1.0, 1.0, tendrilNoise); 
           
           // Expansion
           float expansionBase = 2.0 + (uSpreadRatio * 15.0); 
           float jagged = 1.0 + tendrilStrength * 0.5 + aRandom.z * 0.5;
           
           float newDist = dist * (1.0 + uSpreadRatio * 2.5) + (expansionBase * jagged * uSpreadRatio);
           
           rootTarget.x = cos(angle) * newDist;
           rootTarget.z = sin(angle) * newDist;

           // Pulse along roots
           if (uSpreadRatio > 0.8) {
             float pulse = sin(newDist * 0.5 - uTime * 5.0);
             rootTarget.y += pulse * 0.5; 
           }

           // Blend Trunk -> Root
           target = mix(target, rootTarget, uSpreadRatio);
       }
    } 

    // Mix Chaos -> Target (Tree/Root Hybrid)
    // When Spreading, we assume we are fully formed (uFormRatio is high implicitly or explicitly)
    float formationFactor = max(uFormRatio, uSpreadRatio);
    
    vec3 mixedPos = mix(pos, target, smoothstep(0.0, 1.0, formationFactor));

    // Sea/Wave Logic (Overlays on top)
    if (uWaveRatio > 0.0) {
      float waveHeight = 0.5 + (uWaveRatio * 2.0); 
      float waveSpeed = 1.0 + (uWaveRatio * 3.0);
      float wave = sin(mixedPos.x * 0.5 + uTime * waveSpeed) * cos(mixedPos.z * 0.3 + uTime * waveSpeed * 0.8);
      
      // "Waves under the Forest" Logic
      // If we are formed as Trees, we want the waves to flood the base/bob the trees, 
      // NOT flatten them into a sea surface.
      
      float isTreeForm = smoothstep(0.2, 0.8, uFormRatio);
      
      // 1. Chaos Behavior: Flatten to Wave
      vec3 wavePosChaos = mixedPos;
      wavePosChaos.y = wave * waveHeight;
      
      // 2. Tree Behavior: Add Wave to Y (Floating Forest)
      vec3 wavePosTree = mixedPos;
      wavePosTree.y += wave * waveHeight; 
      
      // Blend target Y based on whether we are trees or chaos
      vec3 targetWavePos = mix(wavePosChaos, wavePosTree, isTreeForm);
      
      // Apply Wave Intensity
      mixedPos = mix(mixedPos, targetWavePos, uWaveRatio);
    }

    // Rain Logic
    float isRain = step(0.95, aRandom.x) * uRainRatio; 
    if (isRain > 0.0) {
      float fallSpeed = 15.0 + aRandom.y * 10.0;
      float yOffset = mod(uTime * fallSpeed, 40.0);
      mixedPos.y = 20.0 - yOffset;
      mixedPos.x = target.x + (aRandom.y - 0.5) * 30.0; 
      mixedPos.z = target.z + (aRandom.z - 0.5) * 30.0;
    }

    // --- Interaction Logic ---
    vec3 interactOffset = vec3(0.0);
    float interactGlow = 0.0;
    float radius = 8.0; 
    
    // Left Hand
    if (uLeftHandActive > 0.5) {
      float dist = distance(mixedPos, uLeftHandPos);
      if (dist < radius) {
        float factor = smoothstep(radius, 0.0, dist); 
        vec3 attraction = (uLeftHandPos - mixedPos) * 0.9;
        vec3 dir = normalize(mixedPos - uLeftHandPos);
        vec3 swirl = cross(vec3(0.0, 1.0, 0.0), dir) * 4.0;
        interactOffset += (attraction + swirl) * factor * 0.6;
        interactGlow += factor;
      }
    }

    // Right Hand
    if (uRightHandActive > 0.5) {
      float dist = distance(mixedPos, uRightHandPos);
      if (dist < radius) {
        float factor = smoothstep(radius, 0.0, dist);
        vec3 attraction = (uRightHandPos - mixedPos) * 0.9;
        vec3 dir = normalize(mixedPos - uRightHandPos);
        vec3 swirl = cross(vec3(0.0, 1.0, 0.0), dir) * 4.0;
        interactOffset += (attraction - swirl) * factor * 0.6; 
        interactGlow += factor;
      }
    }

    mixedPos += interactOffset;

    vec4 mvPosition = modelViewMatrix * vec4(mixedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size calculation
    float sizeBase = 25.0;
    
    // Dense Trees need slightly smaller, sharper points to look defined
    if (uFormRatio > 0.5 && aIsLeaf > 0.5) sizeBase = 35.0; 
    if (uFormRatio > 0.5 && aIsLeaf < 0.5) sizeBase = 40.0; // Trunks slightly thicker
    
    // Roots logic size
    if (uSpreadRatio > 0.5 && aIsLeaf < 0.5) sizeBase = 20.0; // Roots are finer
    
    gl_PointSize = (sizeBase * aRandom.z + 5.0) * (1.0 / -mvPosition.z);

    // --- Coloring ---
    vec3 colorChaos = uBaseColor + aRandom * 0.3;
    
    // Tree Colors
    vec3 colorTrunk = mix(vec3(0.5, 0.3, 0.2), vec3(0.2, 0.1, 0.05), aRandom.x) * 0.9;
    vec3 lushGreen = vec3(0.2, 0.9, 0.4);
    vec3 deepTeal = vec3(0.0, 0.3, 0.4);
    vec3 colorLeaf = mix(deepTeal, lushGreen, aRandom.y + 0.3) + vec3(0.0, aTreePos.y * 0.03, 0.0);
    
    // Determine Base Tree Color
    vec3 colorTree = (aIsLeaf < 0.5) ? colorTrunk : colorLeaf;

    // Root Colors (Golden / Earthy / Energy) for Trunks becoming roots
    vec3 colorRoot = mix(vec3(0.6, 0.4, 0.1), vec3(0.9, 0.7, 0.3), aRandom.z); 
    // Add pulsing energy to roots
    float pulse = sin(length(mixedPos.xz) * 0.2 - uTime * 3.0);
    if (pulse > 0.5) colorRoot += vec3(0.2, 0.2, 0.0);

    vec3 finalColor;
    
    if (isRain > 0.0) {
      finalColor = vec3(0.8, 0.9, 1.0); 
      vAlpha = 0.9;
    } else {
      // Blend Logic: Chaos -> Tree
      vec3 step1 = mix(colorChaos, colorTree, uFormRatio);
      
      // Blend Logic: Tree -> Root (Only for Trunks)
      if (aIsLeaf < 0.5) {
          finalColor = mix(step1, colorRoot, uSpreadRatio);
      } else {
          // Leaves stay as Step1 (Tree Color), maybe get brighter
          finalColor = step1;
          if (uSpreadRatio > 0.0) finalColor += vec3(0.1, 0.1, 0.0) * uSpreadRatio; // Golden tint on leaves
      }
      
      vAlpha = 0.7 + (sin(uTime * aRandom.x * 5.0) * 0.3); 
      
      // Make trees slightly more opaque
      if (uFormRatio > 0.8) vAlpha = 0.9 + (sin(uTime * 2.0) * 0.1);
    }

    if (interactGlow > 0.0) {
       finalColor = mix(finalColor, vec3(1.0, 1.0, 1.2), interactGlow * 0.8);
       vAlpha += interactGlow * 0.4;
    }

    vColor = finalColor;
  }
`;

// Fragment Shader
const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 2.0); // Sharper falloff
    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

interface CosmicParticlesProps {
  gestureState: GestureState;
  isRaining: boolean;
  isStormy: boolean;
  baseColor: string;
  hands: { left: HandPosition, right: HandPosition };
}

export const CosmicParticles: React.FC<CosmicParticlesProps> = ({ gestureState, isRaining, isStormy, baseColor, hands }) => {
  const mesh = useRef<THREE.Points>(null);
  // INCREASED PARTICLE COUNT for denser trees
  const count = 200000;

  const { positions, randoms, treePositions, isLeaf } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 3);
    const treePositions = new Float32Array(count * 3);
    const isLeaf = new Float32Array(count);

    // INCREASED numTrees to 20 for a denser forest
    const numTrees = 20;
    const treeCenters: {x: number, z: number, height: number, scale: number}[] = [];
    
    for(let t=0; t<numTrees; t++) {
        // Distribute trees in a wider area (Radius ~25) to create a forest feeling
        // Use square root of random to distribute evenly in a circle, avoiding center clumping
        const r = Math.sqrt(Math.random()) * 25; 
        const theta = Math.random() * 2 * Math.PI;

        treeCenters.push({
            x: Math.cos(theta) * r,
            z: Math.sin(theta) * r - 5, // Keep slightly offset in Z to center the view
            height: 12 + Math.random() * 8, // Varying heights
            scale: 0.7 + Math.random() * 0.6 // Varying thickness
        });
    }

    for (let i = 0; i < count; i++) {
      // Chaos Positions
      const r = 45 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      randoms[i * 3] = Math.random();
      randoms[i * 3 + 1] = Math.random();
      randoms[i * 3 + 2] = Math.random();

      // Tree Logic
      const treeIdx = i % numTrees;
      const tree = treeCenters[treeIdx];
      
      const typeRand = Math.random();
      const isTrunk = typeRand < 0.2; // Slightly more trunk particles
      
      let tx, ty, tz;

      if (isTrunk) {
        const hRatio = Math.random();
        const currentHeight = hRatio * tree.height;
        // TIGHTER TRUNKS: Reduced radius multiplier to make them clearer
        const baseRadius = 0.7 * tree.scale; 
        const topRadius = 0.15 * tree.scale;
        const currentRadius = THREE.MathUtils.lerp(baseRadius, topRadius, hRatio);
        const angle = Math.random() * Math.PI * 2;
        // Concentrate particles on the surface of the trunk for definition
        const rPos = Math.sqrt(Math.random()) * currentRadius; 
        
        tx = tree.x + Math.cos(angle) * rPos;
        ty = currentHeight - 5.0;
        tz = tree.z + Math.sin(angle) * rPos;
        isLeaf[i] = 0.0;
      } else {
        const numClusters = 7; // More clusters
        const clusterIdx = Math.floor(Math.random() * numClusters);
        const clusterAngle = (clusterIdx / numClusters) * Math.PI * 2 + (Math.random()*0.5);
        const clusterHeightOffset = (Math.random() - 0.5) * (tree.height * 0.5); 
        const clusterOutward = Math.random() * (tree.height * 0.25) + 0.5;
        const cx = Math.cos(clusterAngle) * clusterOutward;
        const cy = tree.height * 0.85 + clusterHeightOffset; 
        const cz = Math.sin(clusterAngle) * clusterOutward;
        
        // TIGHTER CLUSTERS: Reduced cluster radius to avoid "puffiness"
        const clusterRadius = (1.5 + Math.random() * 1.5) * tree.scale; 
        
        const u = Math.random();
        const v = Math.random();
        const theta_s = 2 * Math.PI * u;
        const phi_s = Math.acos(2 * v - 1);
        const r_s = Math.cbrt(Math.random()) * clusterRadius;
        
        tx = tree.x + cx + (r_s * Math.sin(phi_s) * Math.cos(theta_s));
        ty = cy - 5.0 + (r_s * Math.sin(phi_s) * Math.sin(theta_s));
        tz = tree.z + cz + (r_s * Math.cos(phi_s));
        isLeaf[i] = 1.0;
      }

      treePositions[i * 3] = tx;
      treePositions[i * 3 + 1] = ty;
      treePositions[i * 3 + 2] = tz;
    }
    return { positions, randoms, treePositions, isLeaf };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFormRatio: { value: 0 },
    uSpreadRatio: { value: 0 },
    uRainRatio: { value: 0 },
    uWaveRatio: { value: 0 },
    uBaseColor: { value: new THREE.Color(baseColor) },
    uLeftHandPos: { value: new THREE.Vector3(0,0,0) },
    uLeftHandActive: { value: 0 },
    uRightHandPos: { value: new THREE.Vector3(0,0,0) },
    uRightHandActive: { value: 0 },
  }), []);

  useFrame(() => {
    if (mesh.current) {
        const material = mesh.current.material as THREE.ShaderMaterial;
        material.uniforms.uBaseColor.value.set(baseColor);
    }
  });

  useFrame((state) => {
    const { clock } = state;
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = clock.getElapsedTime();
      
      const dt = 0.04;
      
      // State transition logic
      let targetForm = 0;
      let targetSpread = 0;

      // Force Tree Form if currently in STORM mode (Thumb Up), 
      // ensuring waves appear "under the forest".
      if (gestureState === GestureState.TREES || isStormy) {
          targetForm = 1;
          targetSpread = 0;
      } else if (gestureState === GestureState.SPREAD) {
          targetForm = 1; 
          targetSpread = 1;
      } else {
          // IDLE / CHAOS
          targetForm = 0;
          targetSpread = 0;
      }

      material.uniforms.uFormRatio.value = THREE.MathUtils.lerp(material.uniforms.uFormRatio.value, targetForm, dt);
      material.uniforms.uSpreadRatio.value = THREE.MathUtils.lerp(material.uniforms.uSpreadRatio.value, targetSpread, dt);

      const targetRain = isRaining ? 1 : 0;
      material.uniforms.uRainRatio.value = THREE.MathUtils.lerp(material.uniforms.uRainRatio.value, targetRain, dt);

      const targetWave = isStormy ? 1 : 0;
      material.uniforms.uWaveRatio.value = THREE.MathUtils.lerp(material.uniforms.uWaveRatio.value, targetWave, dt);

      if (hands.left.active) {
        const targetL = new THREE.Vector3(hands.left.x, hands.left.y, 5.0);
        material.uniforms.uLeftHandPos.value.lerp(targetL, 0.2);
        material.uniforms.uLeftHandActive.value = THREE.MathUtils.lerp(material.uniforms.uLeftHandActive.value, 1, 0.1);
      } else {
        material.uniforms.uLeftHandActive.value = THREE.MathUtils.lerp(material.uniforms.uLeftHandActive.value, 0, 0.1);
      }

      if (hands.right.active) {
        const targetR = new THREE.Vector3(hands.right.x, hands.right.y, 5.0);
        material.uniforms.uRightHandPos.value.lerp(targetR, 0.2);
        material.uniforms.uRightHandActive.value = THREE.MathUtils.lerp(material.uniforms.uRightHandActive.value, 1, 0.1);
      } else {
        material.uniforms.uRightHandActive.value = THREE.MathUtils.lerp(material.uniforms.uRightHandActive.value, 0, 0.1);
      }
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={randoms.length / 3} array={randoms} itemSize={3} />
        <bufferAttribute attach="attributes-aTreePos" count={treePositions.length / 3} array={treePositions} itemSize={3} />
        <bufferAttribute attach="attributes-aIsLeaf" count={isLeaf.length} array={isLeaf} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};