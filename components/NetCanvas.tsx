
import React from 'react';
import { NetData, Face, Direction } from '../types';

interface NetCanvasProps {
  net: NetData;
  scale?: number;
  interactive?: boolean;
  foldProgress?: number;
  transparency?: number;
  activeParallelPairs?: Set<number>; 
  showGrid?: boolean;
  rotation?: { x: number; y: number };
  panOffset?: { x: number; y: number };
  isAnimatingRotation?: boolean;
  isRotating?: boolean;
  faceColors?: Record<number, string>;
  onFaceClick?: (faceId: number) => void;
  isPaintingMode?: boolean;
  showEdgeMatches?: boolean;
  diceStyle?: 'none' | 'number' | 'dot';
  animationDuration?: number;
}

const SIDE_COLORS = [
  '#ef4444', // 쌍 0 (빨강)
  '#3b82f6', // 쌍 1 (파랑)
  '#22c55e'  // 쌍 2 (초록)
];

const MATCH_COLORS = [
  '#ff0055', '#ff8800', '#ffcc00', '#00dd88', '#00aaff', '#8800ff', '#ff00ff', '#aaff00', '#0055ff'
];

const DICE_MAP: Record<number, number> = {
  0: 1, 1: 6,
  2: 2, 3: 5,
  4: 3, 5: 4
};

const PerspectiveWireframe: React.FC<{ 
  face: Face;
  isFoldLine: (dir: Direction) => boolean;
  foldProgress: number;
  skinType: 'outward' | 'inward'; 
  showEdgeMatches?: boolean;
  scale: number;
  diceStyle?: 'none' | 'number' | 'dot';
}> = ({ face, isFoldLine, foldProgress, skinType, showEdgeMatches, scale, diceStyle }) => {
  const isInward = skinType === 'inward';
  const isFlat = foldProgress === 0;
  const directions: Direction[] = ['up', 'down', 'left', 'right'];

  // 배율에 따른 선 두께 비율 (기준 40px)
  const sw = Math.max(0.5, scale / 40);

  const layerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: isInward ? 'translateZ(0.1px)' : 'rotateY(180deg) translateZ(0.05px)',
    backfaceVisibility: 'hidden',
    pointerEvents: 'none',
    transformStyle: 'preserve-3d'
  };

  const diceValue = face.sideId !== undefined ? (DICE_MAP[face.sideId] || face.id + 1) : face.id + 1;

  const renderDiceDots = (value: number) => {
    const faceSize = Math.min(face.width, face.height) * scale;
    let sizeRatio = 0.18;
    let color = '#334155';
    
    if (value === 1) {
      sizeRatio = 0.35;
      color = '#ef4444'; 
    }

    const dotSize = Math.max(2, faceSize * sizeRatio);
    const dotBaseStyle: React.CSSProperties = {
        position: 'absolute',
        width: dotSize,
        height: dotSize,
        backgroundColor: color,
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
    };

    const pos = {
        tl: { top: '25%', left: '25%' },
        tr: { top: '25%', left: '75%' },
        ml: { top: '50%', left: '25%' },
        mm: { top: '50%', left: '50%' },
        mr: { top: '50%', left: '75%' },
        bl: { top: '75%', left: '25%' },
        br: { top: '75%', left: '75%' },
    };

    const dots: React.CSSProperties[] = [];
    switch (value) {
        case 1: dots.push(pos.mm); break;
        case 2: dots.push(pos.tl, pos.br); break;
        case 3: dots.push(pos.tl, pos.mm, pos.br); break;
        case 4: dots.push(pos.tl, pos.tr, pos.bl, pos.br); break;
        case 5: dots.push(pos.tl, pos.tr, pos.mm, pos.bl, pos.br); break;
        case 6: dots.push(pos.tl, pos.tr, pos.ml, pos.mr, pos.bl, pos.br); break;
        default: dots.push(pos.mm); break;
    }

    return dots.map((p, i) => (
        <div key={i} style={{ ...dotBaseStyle, ...p }} />
    ));
  };

  return (
    <div style={layerStyle}>
      {directions.map(dir => {
        let queryDir = dir;
        if (!isInward) { 
          if (dir === 'left') queryDir = 'right';
          else if (dir === 'right') queryDir = 'left';
        }

        const fold = isFoldLine(queryDir);
        const matchId = (face.edgeMatchIds as any)?.[queryDir];
        const isMatched = showEdgeMatches && matchId !== undefined;

        let borderStyle: 'solid' | 'dashed' = 'solid';
        let weight = isFlat ? (2.0 * sw) : (1.0 * sw); 
        let color = '#000000';

        if (isFlat) {
          borderStyle = fold ? 'dashed' : 'solid';
          // 테두리는 굵게, 접는 선은 중간 굵기로 표현
          weight = fold ? (1.5 * sw) : (3.5 * sw); 
        } else {
          borderStyle = isInward ? 'solid' : 'dashed';
          weight = isInward ? (1.2 * sw) : (1.0 * sw); 
          color = isInward ? '#000000' : '#bbbbbb';
        }

        if (isMatched) {
          borderStyle = 'solid';
          weight = 5 * sw; 
          color = MATCH_COLORS[matchId % MATCH_COLORS.length];
        }

        const offset = -weight / 2;
        const edgeStyle: React.CSSProperties = {
          position: 'absolute',
          pointerEvents: 'none',
          boxSizing: 'border-box',
          zIndex: isMatched ? 10 : (borderStyle === 'solid' ? 5 : 1)
        };

        if (dir === 'up' || dir === 'down') {
            edgeStyle.height = `${weight}px`;
            edgeStyle.left = `${offset}px`; 
            edgeStyle.right = `${offset}px`;
            if (dir === 'up') edgeStyle.top = `${offset}px`;
            else edgeStyle.bottom = `${offset}px`;
        } else {
            edgeStyle.width = `${weight}px`;
            edgeStyle.top = `${offset}px`;
            edgeStyle.bottom = `${offset}px`;
            if (dir === 'left') edgeStyle.left = `${offset}px`;
            else edgeStyle.right = `${offset}px`;
        }

        if (borderStyle === 'dashed') {
          const dashSize = Math.max(4, 6 * sw);
          const gapSize = Math.max(2, 4 * sw);
          if (dir === 'up' || dir === 'down') {
            edgeStyle.backgroundImage = `linear-gradient(to right, ${color} ${dashSize}px, transparent ${gapSize}px)`;
            edgeStyle.backgroundSize = `${dashSize + gapSize}px ${weight}px`;
          } else {
            edgeStyle.backgroundImage = `linear-gradient(to bottom, ${color} ${dashSize}px, transparent ${gapSize}px)`;
            edgeStyle.backgroundSize = `${weight}px ${dashSize + gapSize}px`;
          }
        } else {
           edgeStyle.backgroundColor = color;
        }
        
        return <div key={dir} style={edgeStyle} />;
      })}

      {diceStyle && diceStyle !== 'none' && isInward && scale > 10 && (
        <div style={{ position: 'absolute', inset: 0, transform: `translateZ(1px)`, backfaceVisibility: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {diceStyle === 'number' ? (
                 <span style={{ 
                    fontSize: `${Math.min(face.width, face.height) * scale * 0.5}px`, 
                    fontWeight: 900, 
                    color: diceValue === 1 ? '#ef4444' : '#334155',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                 }}>
                    {diceValue}
                </span>
            ) : (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>{renderDiceDots(diceValue)}</div>
            )}
        </div>
      )}
    </div>
  );
};

const FoldableFace: React.FC<{
  face: Face;
  allFaces: Face[];
  scale: number;
  foldAngle: number;
  faceOpacity: number;
  interactive: boolean;
  isFlat: boolean;
  activeParallelPairs?: Set<number>;
  faceColors?: Record<number, string>;
  onFaceClick?: (faceId: number) => void;
  isPaintingMode?: boolean;
  showEdgeMatches?: boolean;
  foldProgress: number;
  diceStyle?: 'none' | 'number' | 'dot';
}> = ({ 
  face, allFaces, scale, foldAngle, faceOpacity, 
  interactive, isFlat, activeParallelPairs,
  faceColors, onFaceClick, isPaintingMode, showEdgeMatches, foldProgress, diceStyle
}) => {
  const children = allFaces.filter(f => f.parentId === face.id);
  
  let bgFill = faceColors?.[face.id];
  if (!bgFill && activeParallelPairs && face.sideId !== undefined) {
    const pairId = Math.floor(face.sideId / 2);
    if (activeParallelPairs.has(pairId)) {
      bgFill = SIDE_COLORS[pairId];
    }
  }
  if (!bgFill) bgFill = '#ffffff';

  const isFoldLine = (dir: Direction) => {
    const sideTouchingParent: Direction | null = 
        face.attachDir === 'right' ? 'left' :
        face.attachDir === 'left' ? 'right' :
        face.attachDir === 'up' ? 'down' :
        face.attachDir === 'down' ? 'up' : null;
    return dir === sideTouchingParent || children.some(c => c.attachDir === dir);
  };

  return (
    <div 
        className="net-face-target"
        style={{
            position: 'absolute', top: 0, left: 0,
            width: face.width * scale, height: face.height * scale,
            transformStyle: 'preserve-3d',
            cursor: isPaintingMode ? 'copy' : 'default',
            pointerEvents: 'auto',
        }} 
        onClick={(e) => { 
            e.stopPropagation(); 
            if (interactive) onFaceClick?.(face.id); 
        }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundColor: bgFill, opacity: faceOpacity, backfaceVisibility: 'visible' }} />
      <PerspectiveWireframe face={face} isFoldLine={isFoldLine} foldProgress={foldProgress} skinType="inward" showEdgeMatches={showEdgeMatches} scale={scale} diceStyle={diceStyle} />
      <PerspectiveWireframe face={face} isFoldLine={isFoldLine} foldProgress={foldProgress} skinType="outward" showEdgeMatches={showEdgeMatches} scale={scale} diceStyle={'none'} />
      
      {children.map(child => {
        let origin = '', transform = '', pos: React.CSSProperties = {};
        const isFolded = !isFlat;
        const currentAngle = foldProgress >= 100 ? 90 : foldAngle;
        switch (child.attachDir) {
          case 'right': pos = { left: '100%' }; origin = 'left center'; transform = isFolded ? `rotateY(${currentAngle}deg)` : 'none'; break;
          case 'left': pos = { right: '100%' }; origin = 'right center'; transform = isFolded ? `rotateY(${-currentAngle}deg)` : 'none'; break;
          case 'down': pos = { top: '100%' }; origin = 'top center'; transform = isFolded ? `rotateX(${-currentAngle}deg)` : 'none'; break;
          case 'up': pos = { bottom: '100%' }; origin = 'bottom center'; transform = isFolded ? `rotateX(${currentAngle}deg)` : 'none'; break;
        }
        return (
          <div key={child.id} style={{
              position: 'absolute', width: child.width * scale, height: child.height * scale,
              transformOrigin: origin, transform: transform, transformStyle: 'preserve-3d',
              transition: isFlat ? 'none' : 'transform 0.1s linear', ...pos
            }}>
            <FoldableFace face={child} allFaces={allFaces} scale={scale} foldAngle={foldAngle} faceOpacity={faceOpacity} interactive={interactive} isFlat={isFlat} activeParallelPairs={activeParallelPairs} faceColors={faceColors} onFaceClick={onFaceClick} isPaintingMode={isPaintingMode} showEdgeMatches={showEdgeMatches} foldProgress={foldProgress} diceStyle={diceStyle} />
          </div>
        );
      })}
    </div>
  );
};

export const NetCanvas: React.FC<NetCanvasProps> = ({ 
    net, scale = 40, interactive = false, foldProgress = 0, 
    transparency = 0.2, activeParallelPairs, showGrid = true, 
    rotation = { x: 0, y: 0 }, panOffset = { x: 0, y: 0 },
    isAnimatingRotation = false,
    isRotating = false, faceColors, onFaceClick, isPaintingMode, showEdgeMatches,
    diceStyle = 'none',
    animationDuration = 1.5
}) => {
  const isFlat = foldProgress === 0;
  const faceOpacity = 1 - transparency;
  const zShift = scale * (foldProgress / 100) * -1.5; 
  
  const rootFace = net.faces.find(f => f.id === 0);
  const netCenter = { x: net.totalWidth / 2, y: net.totalHeight / 2 };
  const rootCenter = rootFace
    ? { x: rootFace.x + rootFace.width / 2, y: rootFace.y + rootFace.height / 2 }
    : { x: 0, y: 0 };
  const centerDelta = {
    x: rootCenter.x - netCenter.x,
    y: rootCenter.y - netCenter.y
  };
  const snappedDelta = {
    x: Math.round(centerDelta.x),
    y: Math.round(centerDelta.y)
  };
  const baseOffset = {
    x: snappedDelta.x * scale,
    y: snappedDelta.y * scale
  };
  const gridOffset = {
    x: baseOffset.x + panOffset.x - rootCenter.x * scale,
    y: baseOffset.y + panOffset.y - rootCenter.y * scale
  };
  const sceneTransform = `translate(${panOffset.x + baseOffset.x}px, ${panOffset.y + baseOffset.y}px) translateZ(${zShift}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`;

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-white" style={{ perspective: '6000px' }}>
      
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px),
              linear-gradient(to right, #cbd5e1 1px, transparent 1px),
              linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
            `,
            backgroundSize: `${scale}px ${scale}px, ${scale}px ${scale}px, ${scale * 5}px ${scale * 5}px, ${scale * 5}px ${scale * 5}px`,
            backgroundPosition: `calc(50% + ${gridOffset.x}px) calc(50% + ${gridOffset.y}px)`
          }}
        />
      )}

      <div className="absolute w-0 h-0" style={{ transformStyle: 'preserve-3d' }}>
         <div style={{
                position: 'absolute',
                transform: sceneTransform, 
                transformStyle: 'preserve-3d', 
                transition: isAnimatingRotation ? `transform ${animationDuration}s cubic-bezier(0.1, 0.7, 0.1, 1)` : (isRotating ? 'none' : 'transform 0.1s linear'),
            }}>
             {rootFace && (
               <div style={{ position: 'absolute', left: -rootFace.width * scale / 2, top: -rootFace.height * scale / 2, transformStyle: 'preserve-3d' }}>
                 <FoldableFace 
                  face={rootFace} allFaces={net.faces} scale={scale} 
                  foldAngle={foldProgress * 0.9} faceOpacity={faceOpacity} 
                  interactive={interactive} isFlat={isFlat} activeParallelPairs={activeParallelPairs}
                  faceColors={faceColors} onFaceClick={onFaceClick}
                  isPaintingMode={isPaintingMode} showEdgeMatches={showEdgeMatches}
                  foldProgress={foldProgress}
                  diceStyle={diceStyle}
                />
               </div>
             )}
         </div>
      </div>
    </div>
  );
};
