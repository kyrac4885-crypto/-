import React from 'react';
import { GestureState } from '../types';

interface InterfaceProps {
  currentGesture: GestureState;
  isRaining: boolean;
  isStormy: boolean;
  isPlayingMusic: boolean;
  detectedGestureName: string;
  baseColor: string;
  onSetColor: (color: string) => void;
  onToggleAudio: () => void;
  handsActive: boolean;
}

export const Interface: React.FC<InterfaceProps> = ({
  currentGesture,
  isRaining,
  isStormy,
  isPlayingMusic,
  detectedGestureName,
  baseColor,
  onSetColor,
  onToggleAudio,
  handsActive
}) => {
  
  const colors = [
    { name: 'Cosmic Blue', value: '#1a4dcc' },
    { name: 'Nebula Purple', value: '#8a2be2' },
    { name: 'Starlight Gold', value: '#ffd700' },
    { name: 'Void Red', value: '#dc143c' },
    { name: 'Aurora Green', value: '#00fa9a' },
  ];

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-6">
      
      {/* Header & Controls */}
      <header className="flex justify-between items-start pointer-events-auto">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400 drop-shadow-lg">
            寰宇 · 粒子森林
          </h1>
          <p className="text-xs text-cyan-200/60 mt-1 max-w-[300px]">
            AI手势控制实验。请允许摄像头权限以开启体验。
          </p>
          {handsActive && (
             <div className="mt-2 text-[10px] text-green-400 border border-green-500/30 bg-green-900/20 px-2 py-1 inline-block rounded animate-pulse">
               ● Hands Tracking Active
             </div>
          )}
        </div>
        
        <div className="flex flex-col gap-3 items-end">
          <button 
            onClick={onToggleAudio}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${isPlayingMusic ? 'border-green-400/50 text-green-300 bg-green-900/20' : 'border-gray-600 text-gray-500 hover:border-gray-400'}`}
          >
            <span className="text-xl">{isPlayingMusic ? '🔊' : '🔇'}</span>
            <span className="text-xs font-mono">{isPlayingMusic ? 'ON' : 'OFF'}</span>
          </button>

          {/* Color Picker */}
          <div className="bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/10 flex flex-col gap-1 items-end">
             <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Theme Color</span>
             <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onSetColor(c.value)}
                    className={`w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-125 ${baseColor === c.value ? 'ring-2 ring-white scale-110' : ''}`}
                    style={{ backgroundColor: c.value, boxShadow: `0 0 10px ${c.value}40` }}
                    title={c.name}
                  />
                ))}
             </div>
          </div>
        </div>
      </header>

      {/* Main Status Display */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-80 flex flex-col items-center">
        {currentGesture === GestureState.IDLE && <div className="text-5xl text-blue-200/20 font-light tracking-[0.5em] blur-[1px]">CHAOS</div>}
        {currentGesture === GestureState.TREES && <div className="text-5xl text-green-200/20 font-light tracking-[0.5em] blur-[1px]">FOREST</div>}
        {currentGesture === GestureState.SPREAD && <div className="text-5xl text-purple-200/20 font-light tracking-[0.5em] blur-[1px]">EXPANSION</div>}
        
        <div className="mt-4 flex gap-4">
           {isRaining && <div className="text-xl text-blue-300 font-mono tracking-widest animate-pulse">RAINING</div>}
           {isStormy && <div className="text-xl text-yellow-300 font-mono tracking-widest animate-pulse">STORM</div>}
        </div>
      </div>

      {/* Gesture Guide (Bottom) */}
      <div className="pointer-events-auto bg-gradient-to-t from-black via-black/80 to-transparent pt-10 pb-4 px-4 w-full flex flex-col items-center">
        
        {/* Detection Feedback */}
        <div className="mb-4 text-center">
           <span className="text-[10px] uppercase text-gray-500 tracking-widest">Detected Gesture</span>
           <div className={`text-xl font-bold font-mono mt-1 ${detectedGestureName !== 'None' ? 'text-cyan-400' : 'text-gray-600'}`}>
             {detectedGestureName === 'None' ? '---' : detectedGestureName}
           </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 max-w-4xl mx-auto text-center">
           <div className="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
              <span className="text-2xl mb-1">☝️</span>
              <span className="text-xs text-gray-300 font-bold">Pointing Up</span>
              <span className="text-[10px] text-gray-500">Reset / Chaos</span>
           </div>
           <div className="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
              <span className="text-2xl mb-1">✊</span>
              <span className="text-xs text-gray-300 font-bold">Closed Fist</span>
              <span className="text-[10px] text-gray-500">Form Trees</span>
           </div>
           <div className="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
              <span className="text-2xl mb-1">✋</span>
              <span className="text-xs text-gray-300 font-bold">Open Palm</span>
              <span className="text-[10px] text-gray-500">Spread Roots</span>
           </div>
           <div className="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
              <span className="text-2xl mb-1">✌️</span>
              <span className="text-xs text-gray-300 font-bold">Victory</span>
              <span className="text-[10px] text-gray-500">Make Rain</span>
           </div>
           <div className="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
              <span className="text-2xl mb-1">👍</span>
              <span className="text-xs text-gray-300 font-bold">Thumb Up</span>
              <span className="text-[10px] text-gray-500">Summon Storm</span>
           </div>
        </div>
      </div>
    </div>
  );
};