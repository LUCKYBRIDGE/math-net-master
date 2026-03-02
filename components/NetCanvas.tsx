
import React from 'react';
import { NetData, Face, Direction } from '../types';
import { getNetAlignment } from '../utils/netAlignment';

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
  canvasSize?: { width: number; height: number };
  lineColor?: string;
  foldLineColor?: string;
  mutedLineColor?: string;
  transparentBackground?: boolean;
  isAnimatingRotation?: boolean;
  isRotating?: boolean;
  faceColors?: Record<number, string>;
  onFaceClick?: (faceId: number) => void;
  isPaintingMode?: boolean;
  showEdgeMatches?: boolean;
  diceStyle?: 'none' | 'number' | 'dot';
  animationDuration?: number;
  showArea?: boolean;
  showBasePerimeter?: boolean;
  basePerimeterFaceId?: number | null;
  gridOpacity?: number;
  gridUnitValue?: number;
  gridUnitType?: string;
}

const BASE_EDGE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7']; // 빨, 파, 초, 보라

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
  linePalette: {
    solid: string;
    fold: string;
    muted: string;
  };
  showArea?: boolean;
  showBasePerimeter?: boolean;
  baseEdgeColors?: Record<Direction, string | null>;
  matchedEdgeColors?: Record<Direction, string | null>;
}> = ({ face, isFoldLine, foldProgress, skinType, showEdgeMatches, scale, diceStyle, linePalette, baseEdgeColors, matchedEdgeColors }) => {
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
        const isFullyFolded = foldProgress >= 100;

        let borderStyle: 'solid' | 'dashed' = 'solid';
        let weight = isFlat ? (2.0 * sw) : (1.0 * sw);
        let color = linePalette.solid;
        let isBaseEdgeSpecial = false;

        // 밑면 둘레-옆면 시각화 증명 모드
        if (baseEdgeColors?.[dir]) {
          color = baseEdgeColors[dir]!;
          weight = 5 * sw;
          borderStyle = 'solid';
          isBaseEdgeSpecial = true;
        } else if (matchedEdgeColors?.[queryDir]) { // 여기서 주의: matchId는 face.edgeMatchIds[queryDir]에 저장됨
          color = matchedEdgeColors[queryDir]!;
          weight = 5 * sw;
          borderStyle = 'solid';
          isBaseEdgeSpecial = true;
        }

        if (!isBaseEdgeSpecial) {
          if (isFlat) {
            borderStyle = fold ? 'dashed' : 'solid';
            // 테두리는 굵게, 접는 선은 중간 굵기로 표현
            weight = fold ? (1.5 * sw) : (3.5 * sw);
            color = fold ? linePalette.fold : linePalette.solid;
          } else {
            // 접힌 상태 (겨냥도)
            // 안쪽 면(inward)은 카메라에서 화면 반대로 향한 뒤쪽 면의 뒷면이므로 점선(숨은 선)으로 렌더링
            // 바깥쪽 면(outward)은 카메라를 향한 앞면이므로 실선으로 렌더링
            borderStyle = isInward ? 'dashed' : 'solid';
            weight = isInward ? (1.2 * sw) : (2.0 * sw);
            color = isInward ? linePalette.muted : linePalette.solid;
          }

          if (isMatched) {
            borderStyle = 'solid';
            weight = 5 * sw;
            color = MATCH_COLORS[matchId % MATCH_COLORS.length];
          }
        }

        const offset = -weight / 2;
        const edgeStyle: React.CSSProperties = {
          position: 'absolute',
          pointerEvents: 'none',
          boxSizing: 'border-box',
          zIndex: isBaseEdgeSpecial ? 40 : (isMatched ? 10 : (borderStyle === 'solid' ? 5 : 1))
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
  linePalette: {
    solid: string;
    fold: string;
    muted: string;
  };
  showArea?: boolean;
  showBasePerimeter?: boolean;
  baseEdgeConfig?: Record<number, string>; // matchId -> color
  baseFaceSideId?: number; // 밑면의 sideId (평행한 면을 찾기 위함)
  gridUnitValue?: number;
  gridUnitType?: string;
}> = ({
  face, allFaces, scale, foldAngle, faceOpacity,
  interactive, isFlat, activeParallelPairs,
  faceColors, onFaceClick, isPaintingMode, showEdgeMatches, foldProgress, diceStyle, linePalette, showArea, showBasePerimeter, baseFaceId, baseEdgeConfig, baseFaceSideId, gridUnitValue = 1, gridUnitType = 'cm'
}) => {
    const children = allFaces.filter(f => f.parentId === face.id);

    let bgFill = faceColors?.[face.id];
    // 밑면 둘레 증명 모드일 때: 내가 기준 밑면이거나 나와 마주보는 밑면(평행면)일 때 노란색 처리
    if (showBasePerimeter && (face.id === baseFaceId || (baseFaceSideId !== undefined && face.sideId !== undefined && Math.floor(face.sideId / 2) === Math.floor(baseFaceSideId / 2)))) {
      bgFill = '#fef08a'; // 밑면과 그 평행면은 연노랑색 강조
    } else if (!bgFill && activeParallelPairs && face.sideId !== undefined) {
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

    const baseEdgeColors: Record<Direction, string | null> = { up: null, down: null, left: null, right: null };
    const matchedEdgeColors: Record<Direction, string | null> = { up: null, down: null, left: null, right: null };

    if (showBasePerimeter) {
      if (face.id === baseFaceId) {
        (['up', 'right', 'down', 'left'] as Direction[]).forEach((dir, i) => {
          baseEdgeColors[dir] = BASE_EDGE_COLORS[i];
        });
      } else if (baseEdgeConfig && face.edgeMatchIds) {
        (['up', 'right', 'down', 'left'] as Direction[]).forEach(dir => {
          const mId = (face.edgeMatchIds as any)[dir];
          if (mId !== undefined && baseEdgeConfig[mId]) {
            matchedEdgeColors[dir] = baseEdgeConfig[mId];
          }
        });
      }
    }

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
        <PerspectiveWireframe face={face} isFoldLine={isFoldLine} foldProgress={foldProgress} skinType="inward" showEdgeMatches={showEdgeMatches} scale={scale} diceStyle={diceStyle} linePalette={linePalette} baseEdgeColors={baseEdgeColors} matchedEdgeColors={matchedEdgeColors} />
        <PerspectiveWireframe face={face} isFoldLine={isFoldLine} foldProgress={foldProgress} skinType="outward" showEdgeMatches={showEdgeMatches} scale={scale} diceStyle={'none'} linePalette={linePalette} baseEdgeColors={baseEdgeColors} matchedEdgeColors={matchedEdgeColors} />

        {showArea && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            transform: `translateZ(2px)`,
            fontSize: `${Math.min(face.width * scale / 7, face.height * scale / 3, 20)}px`,
            fontWeight: 900,
            color: '#0f172a',
            textAlign: 'center',
            lineHeight: 1.2,
            textShadow: '0px 0px 4px rgba(255,255,255,0.8), 0px 0px 2px rgba(255,255,255,1)',
            backfaceVisibility: 'visible',
            zIndex: 20
          }}>
            <div>{face.width * gridUnitValue}{gridUnitType} × {face.height * gridUnitValue}{gridUnitType}</div>
            <div>= {face.width * face.height * gridUnitValue * gridUnitValue}{gridUnitType}²</div>
          </div>
        )}

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
              <FoldableFace face={child} allFaces={allFaces} scale={scale} foldAngle={foldAngle} faceOpacity={faceOpacity} interactive={interactive} isFlat={isFlat} activeParallelPairs={activeParallelPairs} faceColors={faceColors} onFaceClick={onFaceClick} isPaintingMode={isPaintingMode} showEdgeMatches={showEdgeMatches} foldProgress={foldProgress} diceStyle={diceStyle} linePalette={linePalette} showArea={showArea} showBasePerimeter={showBasePerimeter} baseFaceId={baseFaceId} baseEdgeConfig={baseEdgeConfig} baseFaceSideId={baseFaceSideId} gridUnitValue={gridUnitValue} gridUnitType={gridUnitType} />
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
  canvasSize,
  lineColor,
  foldLineColor,
  mutedLineColor,
  transparentBackground = false,
  isAnimatingRotation = false,
  isRotating = false, faceColors, onFaceClick, isPaintingMode, showEdgeMatches,
  diceStyle = 'none',
  animationDuration = 1.5,
  showArea = false,
  showBasePerimeter = false,
  basePerimeterFaceId = null,
  gridOpacity = 0.5,
  gridUnitValue = 1,
  gridUnitType = 'cm'
}) => {
  const isFlat = foldProgress === 0;
  const faceOpacity = 1 - transparency;
  const zShift = scale * (foldProgress / 100) * -1.5;
  const { rootFace, baseOffset } = getNetAlignment(net, scale);
  const gridOffset = rootFace
    ? {
      x: baseOffset.x - (rootFace.width * scale) / 2,
      y: baseOffset.y - (rootFace.height * scale) / 2
    }
    : { x: 0, y: 0 };
  const sceneTransform = `translate(${panOffset.x + baseOffset.x}px, ${panOffset.y + baseOffset.y}px) translateZ(${zShift}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`;
  const gridLineOffset = 0.5;
  const gridBackgroundPosition = canvasSize && canvasSize.width > 0 && canvasSize.height > 0
    ? `${Math.round(canvasSize.width / 2 + gridOffset.x - gridLineOffset)}px ${Math.round(canvasSize.height / 2 + gridOffset.y - gridLineOffset)}px`
    : `calc(50% + ${gridOffset.x - gridLineOffset}px) calc(50% + ${gridOffset.y - gridLineOffset}px)`;
  const linePalette = {
    solid: lineColor ?? '#000000',
    fold: foldLineColor ?? (lineColor ?? '#000000'),
    muted: mutedLineColor ?? '#bbbbbb'
  };

  // Base Edge 매칭 준비 작업
  let baseFaceId: number | undefined;
  let baseFaceSideId: number | undefined;
  let baseEdgeConfig: Record<number, string> = {};
  let bFace: Face | undefined;
  if (showBasePerimeter && net.faces.length > 0) {
    // 사용자가 선택한 밑면이 없으면 가장 안쪽(0번) 면을 기본 밑면으로 잡음
    baseFaceId = basePerimeterFaceId !== null && basePerimeterFaceId !== undefined ? basePerimeterFaceId : net.faces[0].id;
    bFace = net.faces.find(f => f.id === baseFaceId);
    baseFaceSideId = bFace?.sideId;
    if (bFace && bFace.edgeMatchIds) {
      (['up', 'right', 'down', 'left'] as Direction[]).forEach((dir, i) => {
        const matchId = (bFace.edgeMatchIds as any)[dir];
        if (matchId !== undefined) {
          baseEdgeConfig[matchId] = BASE_EDGE_COLORS[i];
        }
      });
    }
  }

  return (
    <div
      className={`w-full h-full relative flex items-center justify-center overflow-hidden ${transparentBackground ? 'bg-transparent' : 'bg-white'}`}
      style={{ perspective: '6000px' }}
    >

      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(100, 116, 139, ${gridOpacity * 0.4}) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100, 116, 139, ${gridOpacity * 0.4}) 1px, transparent 1px),
              linear-gradient(to right, rgba(71, 85, 105, ${gridOpacity * 0.8}) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(71, 85, 105, ${gridOpacity * 0.8}) 1px, transparent 1px)
            `,
            backgroundSize: `${scale}px ${scale}px, ${scale}px ${scale}px, ${scale * 5}px ${scale * 5}px, ${scale * 5}px ${scale * 5}px`,
            backgroundPosition: gridBackgroundPosition
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
                linePalette={linePalette}
                showArea={showArea}
                showBasePerimeter={showBasePerimeter}
                baseFaceId={baseFaceId}
                baseEdgeConfig={baseEdgeConfig}
                baseFaceSideId={baseFaceSideId}
                gridUnitValue={gridUnitValue}
                gridUnitType={gridUnitType}
              />
            </div>
          )}
        </div>
      </div>

      {showBasePerimeter && bFace && (
        <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4 rounded-3xl shadow-2xl border-2 border-amber-300 z-50 pointer-events-none flex flex-col items-center gap-2 min-w-max transition-opacity duration-300">
          <span className="font-black text-amber-700 text-xs sm:text-sm mb-1 px-3 py-1 bg-amber-100 rounded-full inline-block shadow-sm tracking-tight">밑면 둘레 증명 모드</span>

          <div className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl font-black bg-slate-50 px-4 py-2 sm:px-5 sm:py-3 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-slate-700 mr-1 sm:mr-2 text-sm sm:text-base font-bold whitespace-nowrap">밑면 둘레 =</span>
            <span className="text-red-500 whitespace-nowrap" style={{ textShadow: '0 1px 2px rgba(239,68,68,0.2)' }}>{bFace.width * gridUnitValue}{gridUnitType}</span>
            <span className="text-slate-300 text-lg sm:text-xl font-medium">+</span>
            <span className="text-blue-500 whitespace-nowrap" style={{ textShadow: '0 1px 2px rgba(59,130,246,0.2)' }}>{bFace.height * gridUnitValue}{gridUnitType}</span>
            <span className="text-slate-300 text-lg sm:text-xl font-medium">+</span>
            <span className="text-green-500 whitespace-nowrap" style={{ textShadow: '0 1px 2px rgba(34,197,94,0.2)' }}>{bFace.width * gridUnitValue}{gridUnitType}</span>
            <span className="text-slate-300 text-lg sm:text-xl font-medium">+</span>
            <span className="text-purple-500 whitespace-nowrap" style={{ textShadow: '0 1px 2px rgba(168,85,247,0.2)' }}>{bFace.height * gridUnitValue}{gridUnitType}</span>
            <span className="text-slate-800 ml-2 sm:ml-4 whitespace-nowrap min-w-[3rem] tracking-tighter">= {(bFace.width * 2 + bFace.height * 2) * gridUnitValue}{gridUnitType}</span>
          </div>

          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-2 font-medium text-center leading-relaxed">
            원하는 면을 <span className="text-amber-600 font-bold px-1 text-[11px] sm:text-sm">클릭</span>하여 새로운 밑면으로 지정해보세요!<br />
            이 밑면의 테두리 총합이 옆면을 펼친 <span className="font-bold text-slate-700 border-b border-slate-400 pb-0.5">거대한 직사각형의 가로 길이</span>가 됩니다.
          </p>
        </div>
      )}
    </div>
  );
};
