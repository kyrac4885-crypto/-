import * as THREE from 'three';

export enum GestureState {
  IDLE = 'IDLE',        // Default: Starfield / Chaos
  TREES = 'TREES',      // Hands brought together: Trees form
  SPREAD = 'SPREAD',    // Hands open: Roots diffuse / Dissipate
  RAIN = 'RAIN',        // OK Sign: Rain starts
  STORM = 'STORM',      // Two Hands Open: Sea waves intensify
}

export interface HandPosition {
  x: number;
  y: number;
  active: boolean;
}

export interface Uniforms {
  uTime: { value: number };
  uStateInfo: { value: number };
  uRainIntensity: { value: number };
  uWaveIntensity: { value: number };
  uColor1: { value: THREE.Color };
  uColor2: { value: THREE.Color };
}

// Global JSX augmentation to fix R3F type errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      color: any;
      fog: any;
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      shaderMaterial: any;
    }
  }

  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        color: any;
        fog: any;
        points: any;
        bufferGeometry: any;
        bufferAttribute: any;
        shaderMaterial: any;
      }
    }
  }
}