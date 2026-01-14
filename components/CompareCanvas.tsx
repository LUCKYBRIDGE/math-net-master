import React, { useEffect, useMemo, useRef } from 'react';
import { Direction, Face, NetData } from '../types';
import { getNetAlignment } from '../utils/netAlignment';

type EdgeKind = 'solid' | 'fold';
type Side = 'left' | 'right';

interface EdgeUnit {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: EdgeKind;
}

interface CompareCanvasProps {
  leftNet: NetData;
  rightNet: NetData;
  scale: number;
  leftPan: { x: number; y: number };
  rightPan: { x: number; y: number };
  onLeftPanChange: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  onRightPanChange: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  canvasSize: { width: number; height: number };
  showGrid?: boolean;
  debug?: boolean;
  activeSide?: Side;
  onActiveSideChange?: (side: Side) => void;
}

const oppositeDir = (dir: Direction): Direction => {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
  }
};

const quantize = (value: number) => Math.round(value * 2) / 2;

const normalizeEdge = (edge: EdgeUnit): EdgeUnit => {
  if (edge.x1 < edge.x2 || (edge.x1 === edge.x2 && edge.y1 <= edge.y2)) return edge;
  return { ...edge, x1: edge.x2, y1: edge.y2, x2: edge.x1, y2: edge.y1 };
};

const edgeKey = (edge: EdgeUnit) => {
  const p1 = `${quantize(edge.x1)},${quantize(edge.y1)}`;
  const p2 = `${quantize(edge.x2)},${quantize(edge.y2)}`;
  return p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;
};

const buildEdges = (net: NetData) => {
  const rootFace = net.faces.find(face => face.id === 0) ?? net.faces[0];
  if (!rootFace) return new Map<string, EdgeUnit>();

  const rootCenter = {
    x: rootFace.x + rootFace.width / 2,
    y: rootFace.y + rootFace.height / 2
  };
  const childrenByParent = new Map<number, Face[]>();
  net.faces.forEach(face => {
    if (face.parentId === undefined) return;
    const list = childrenByParent.get(face.parentId) ?? [];
    list.push(face);
    childrenByParent.set(face.parentId, list);
  });

  const isFoldLine = (face: Face, dir: Direction) => {
    const touchingParent = face.attachDir ? oppositeDir(face.attachDir) : null;
    if (touchingParent && dir === touchingParent) return true;
    const children = childrenByParent.get(face.id) ?? [];
    return children.some(child => child.attachDir === dir);
  };

  const edges = new Map<string, EdgeUnit>();
  net.faces.forEach(face => {
    const left = face.x;
    const top = face.y;
    const right = face.x + face.width;
    const bottom = face.y + face.height;

    const faceEdges: { dir: Direction; x1: number; y1: number; x2: number; y2: number }[] = [
      { dir: 'up', x1: left, y1: top, x2: right, y2: top },
      { dir: 'right', x1: right, y1: top, x2: right, y2: bottom },
      { dir: 'down', x1: right, y1: bottom, x2: left, y2: bottom },
      { dir: 'left', x1: left, y1: bottom, x2: left, y2: top }
    ];

    faceEdges.forEach(edge => {
      const kind: EdgeKind = isFoldLine(face, edge.dir) ? 'fold' : 'solid';
      const relEdge: EdgeUnit = normalizeEdge({
        x1: edge.x1 - rootCenter.x,
        y1: edge.y1 - rootCenter.y,
        x2: edge.x2 - rootCenter.x,
        y2: edge.y2 - rootCenter.y,
        kind
      });
      const key = edgeKey(relEdge);
      const existing = edges.get(key);
      if (!existing || (existing.kind === 'solid' && kind === 'fold')) {
        edges.set(key, relEdge);
      }
    });
  });

  return edges;
};

const translateEdges = (edges: Map<string, EdgeUnit>, offsetUnits: { x: number; y: number }) => {
  const translated = new Map<string, EdgeUnit>();
  edges.forEach(edge => {
    const moved = normalizeEdge({
      ...edge,
      x1: edge.x1 + offsetUnits.x,
      y1: edge.y1 + offsetUnits.y,
      x2: edge.x2 + offsetUnits.x,
      y2: edge.y2 + offsetUnits.y
    });
    translated.set(edgeKey(moved), moved);
  });
  return translated;
};

export const CompareCanvas: React.FC<CompareCanvasProps> = ({
  leftNet,
  rightNet,
  scale,
  leftPan,
  rightPan,
  onLeftPanChange,
  onRightPanChange,
  canvasSize,
  showGrid = true,
  debug = false,
  activeSide = 'left',
  onActiveSideChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragSide = useRef<Side | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  const leftAlignment = useMemo(() => getNetAlignment(leftNet, scale), [leftNet, scale]);
  const rightAlignment = useMemo(() => getNetAlignment(rightNet, scale), [rightNet, scale]);

  const leftEdges = useMemo(() => buildEdges(leftNet), [leftNet]);
  const rightEdges = useMemo(() => buildEdges(rightNet), [rightNet]);

  const leftOffsetUnits = {
    x: (leftAlignment.baseOffset.x + leftPan.x) / scale,
    y: (leftAlignment.baseOffset.y + leftPan.y) / scale
  };
  const rightOffsetUnits = {
    x: (rightAlignment.baseOffset.x + rightPan.x) / scale,
    y: (rightAlignment.baseOffset.y + rightPan.y) / scale
  };

  const leftWorldEdges = useMemo(
    () => translateEdges(leftEdges, leftOffsetUnits),
    [leftEdges, leftOffsetUnits]
  );
  const rightWorldEdges = useMemo(
    () => translateEdges(rightEdges, rightOffsetUnits),
    [rightEdges, rightOffsetUnits]
  );

  const { overlapEdges, leftOnlyEdges, rightOnlyEdges } = useMemo(() => {
    const overlap: EdgeUnit[] = [];
    const leftOnly: EdgeUnit[] = [];
    const rightOnly: EdgeUnit[] = [];

    leftWorldEdges.forEach((edge, key) => {
      const other = rightWorldEdges.get(key);
      if (other) {
        overlap.push({
          ...edge,
          kind: edge.kind === 'solid' || other.kind === 'solid' ? 'solid' : 'fold'
        });
      } else {
        leftOnly.push(edge);
      }
    });

    rightWorldEdges.forEach((edge, key) => {
      if (!leftWorldEdges.has(key)) rightOnly.push(edge);
    });

    return { overlapEdges: overlap, leftOnlyEdges: leftOnly, rightOnlyEdges: rightOnly };
  }, [leftWorldEdges, rightWorldEdges]);

  const canvasCenter = {
    x: canvasSize.width / 2,
    y: canvasSize.height / 2
  };
  const leftRootCenterPx = {
    x: canvasCenter.x + leftAlignment.baseOffset.x + leftPan.x,
    y: canvasCenter.y + leftAlignment.baseOffset.y + leftPan.y
  };
  const rightRootCenterPx = {
    x: canvasCenter.x + rightAlignment.baseOffset.x + rightPan.x,
    y: canvasCenter.y + rightAlignment.baseOffset.y + rightPan.y
  };

  const snapToGrid = (value: number) => Math.round(value / scale) * scale;

  const getBounds = (net: NetData, alignment: ReturnType<typeof getNetAlignment>, pan: { x: number; y: number }) => {
    if (!alignment.rootFace) return null;
    const originX = canvasCenter.x + alignment.baseOffset.x + pan.x;
    const originY = canvasCenter.y + alignment.baseOffset.y + pan.y;
    const rootCenter = alignment.rootCenter;
    return {
      left: originX + (0 - rootCenter.x) * scale,
      right: originX + (net.totalWidth - rootCenter.x) * scale,
      top: originY + (0 - rootCenter.y) * scale,
      bottom: originY + (net.totalHeight - rootCenter.y) * scale
    };
  };

  const leftBounds = useMemo(
    () => getBounds(leftNet, leftAlignment, leftPan),
    [leftNet, leftAlignment, leftPan, scale, canvasCenter.x, canvasCenter.y]
  );
  const rightBounds = useMemo(
    () => getBounds(rightNet, rightAlignment, rightPan),
    [rightNet, rightAlignment, rightPan, scale, canvasCenter.x, canvasCenter.y]
  );

  const hitTest = (x: number, y: number) => {
    const leftHit = leftBounds
      ? x >= leftBounds.left && x <= leftBounds.right && y >= leftBounds.top && y <= leftBounds.bottom
      : false;
    const rightHit = rightBounds
      ? x >= rightBounds.left && x <= rightBounds.right && y >= rightBounds.top && y <= rightBounds.bottom
      : false;
    if (leftHit && rightHit) return activeSide;
    if (leftHit) return 'left';
    if (rightHit) return 'right';
    return null;
  };

  const handlePointerStart = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const side = hitTest(localX, localY);
    if (!side) return;
    isDragging.current = true;
    dragSide.current = side;
    lastPos.current = { x: clientX, y: clientY };
    onActiveSideChange?.(side);
  };

  useEffect(() => {
    const handleMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging.current || !dragSide.current) return;
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      const deltaX = clientX - lastPos.current.x;
      const deltaY = clientY - lastPos.current.y;

      if (dragSide.current === 'left') {
        onLeftPanChange(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      } else {
        onRightPanChange(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      }

      lastPos.current = { x: clientX, y: clientY };
    };

    const handleEnd = () => {
      if (!isDragging.current || !dragSide.current) return;
      const side = dragSide.current;
      if (side === 'left') {
        onLeftPanChange(prev => {
          const next = { x: snapToGrid(prev.x), y: snapToGrid(prev.y) };
          if (debug) console.info('compare snap', { side: 'left', before: prev, after: next });
          return next;
        });
      } else {
        onRightPanChange(prev => {
          const next = { x: snapToGrid(prev.x), y: snapToGrid(prev.y) };
          if (debug) console.info('compare snap', { side: 'right', before: prev, after: next });
          return next;
        });
      }
      isDragging.current = false;
      dragSide.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [debug, onLeftPanChange, onRightPanChange, scale]);

  const renderEdges = (edges: EdgeUnit[], color: string) => {
    const sw = Math.max(0.5, scale / 40);
    const foldWidth = 1.5 * sw;
    const solidWidth = 3.5 * sw;
    const dashSize = Math.max(4, 6 * sw);
    const gapSize = Math.max(2, 4 * sw);

    return edges.map((edge, idx) => {
      const x1 = canvasCenter.x + edge.x1 * scale;
      const y1 = canvasCenter.y + edge.y1 * scale;
      const x2 = canvasCenter.x + edge.x2 * scale;
      const y2 = canvasCenter.y + edge.y2 * scale;
      const isFold = edge.kind === 'fold';
      return (
        <line
          key={`${color}-${idx}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={isFold ? foldWidth : solidWidth}
          strokeDasharray={isFold ? `${dashSize} ${gapSize}` : undefined}
          strokeLinecap="square"
          shapeRendering="crispEdges"
        />
      );
    });
  };

  const gridLineOffset = 0.5;
  const gridBackgroundPosition = canvasSize.width > 0 && canvasSize.height > 0
    ? `${Math.round(canvasSize.width / 2 - gridLineOffset)}px ${Math.round(canvasSize.height / 2 - gridLineOffset)}px`
    : `calc(50% - ${gridLineOffset}px) calc(50% - ${gridLineOffset}px)`;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center overflow-hidden bg-white touch-none"
      onMouseDown={(event) => handlePointerStart(event.clientX, event.clientY)}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        handlePointerStart(touch.clientX, touch.clientY);
      }}
    >
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
            backgroundPosition: gridBackgroundPosition
          }}
        />
      )}

      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        width={canvasSize.width || 0}
        height={canvasSize.height || 0}
        viewBox={`0 0 ${canvasSize.width || 0} ${canvasSize.height || 0}`}
        preserveAspectRatio="none"
      >
        {debug && canvasSize.width > 0 && canvasSize.height > 0 && (
          <>
            <line
              x1={canvasCenter.x}
              y1={0}
              x2={canvasCenter.x}
              y2={canvasSize.height}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <line
              x1={0}
              y1={canvasCenter.y}
              x2={canvasSize.width}
              y2={canvasCenter.y}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <circle cx={leftRootCenterPx.x} cy={leftRootCenterPx.y} r={4} fill="#ef4444" />
            <circle cx={rightRootCenterPx.x} cy={rightRootCenterPx.y} r={4} fill="#3b82f6" />
          </>
        )}
        {renderEdges(leftOnlyEdges, '#ef4444')}
        {renderEdges(rightOnlyEdges, '#3b82f6')}
        {renderEdges(overlapEdges, '#a855f7')}
      </svg>

      {debug && (
        <div className="absolute left-3 top-3 rounded-lg bg-white/90 p-2 text-[10px] font-mono text-slate-600 shadow">
          <div>scale: {scale}px</div>
          <div>left offset: {leftAlignment.baseOffset.x.toFixed(1)}, {leftAlignment.baseOffset.y.toFixed(1)}</div>
          <div>left pan: {leftPan.x.toFixed(1)}, {leftPan.y.toFixed(1)}</div>
          <div>right offset: {rightAlignment.baseOffset.x.toFixed(1)}, {rightAlignment.baseOffset.y.toFixed(1)}</div>
          <div>right pan: {rightPan.x.toFixed(1)}, {rightPan.y.toFixed(1)}</div>
          <div>active: {activeSide}</div>
        </div>
      )}
    </div>
  );
};
