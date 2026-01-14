
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dimensions, NetData } from './types';
import { generateAllNets } from './utils/netGenerator';
import { NetCanvas } from './components/NetCanvas';
import { CompareCanvas } from './components/CompareCanvas';

const DEFAULT_ROTATION = { x: 0, y: 0 }; 
const ISO_ROTATION = { x: -25, y: 45 }; 
const PAINT_PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#fde047', '#a855f7', '#ffffff'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');
  const [mode, setMode] = useState<'cube' | 'cuboid'>('cube');
  const [cubeSize] = useState(3);
  const [cuboidDims, setCuboidDims] = useState<Dimensions>({ l: 2, w: 3, h: 4 });
  const [selectedNet, setSelectedNet] = useState<NetData | null>(null);
  const [foldProgress, setFoldProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0); 
  const [transparency, setTransparency] = useState(0.4); 
  const [activePairs, setActivePairs] = useState<Set<number>>(new Set());
  const [showGrid, setShowGrid] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isClassroomMode, setIsClassroomMode] = useState(false);
  const [showEdgeMatches, setShowEdgeMatches] = useState(false);
  const [diceStyle, setDiceStyle] = useState<'none' | 'number' | 'dot'>('none');
  const [faceColors, setFaceColors] = useState<Record<number, string>>({});
  const [selectedPaintColor, setSelectedPaintColor] = useState<string | null>(null);
  
  const [activeTool, setActiveTool] = useState<'smart' | 'move'>('smart');
  const [interactionMode, setInteractionMode] = useState<'rotate' | 'move'>('rotate');
  
  const [viewRotation, setViewRotation] = useState(DEFAULT_ROTATION);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); 
  const [isCanvasInteracting, setIsCanvasInteracting] = useState(false); 
  const [isAnimatingRotation, setIsAnimatingRotation] = useState(false); 
  const lastMousePos = useRef({ x: 0, y: 0 });
  const isDraggingNet = useRef(false);
  const [animDuration, setAnimDuration] = useState(1.5); 
  const lastScaleRef = useRef<number | null>(null);
  const compareScaleRef = useRef<number | null>(null);
  const [compareLeftDims, setCompareLeftDims] = useState<Dimensions>({ l: 2, w: 3, h: 4 });
  const [compareRightDims, setCompareRightDims] = useState<Dimensions>({ l: 2, w: 3, h: 4 });
  const [compareLeftNet, setCompareLeftNet] = useState<NetData | null>(null);
  const [compareRightNet, setCompareRightNet] = useState<NetData | null>(null);
  const [compareZoomLevel, setCompareZoomLevel] = useState(1.0);
  const [comparePanLeft, setComparePanLeft] = useState({ x: 0, y: 0 });
  const [comparePanRight, setComparePanRight] = useState({ x: 0, y: 0 });
  const [compareActiveSide, setCompareActiveSide] = useState<'left' | 'right'>('left');
  const [showCompareDebug, setShowCompareDebug] = useState(false);
  const [comparePanelPos, setComparePanelPos] = useState({
    left: { x: 24, y: 24 },
    right: { x: 24, y: 24 }
  });
  const [isComparePanelDragging, setIsComparePanelDragging] = useState<'left' | 'right' | null>(null);
  const comparePanelPosRef = useRef({ left: { x: 24, y: 24 }, right: { x: 24, y: 24 } });
  const comparePanelDragOffset = useRef({ x: 0, y: 0 });
  const comparePanelMoved = useRef({ left: false, right: false });
  const compareLeftPanelRef = useRef<HTMLDivElement>(null);
  const compareRightPanelRef = useRef<HTMLDivElement>(null);
  const comparePanInitialized = useRef(false);

  const layoutRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const compareWorkspaceRef = useRef<HTMLDivElement>(null);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });
  const [compareWorkspaceSize, setCompareWorkspaceSize] = useState({ width: 0, height: 0 });
  const [controlPos, setControlPos] = useState({ x: 0, y: 0 }); 
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [hasMovedManually, setHasMovedManually] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 280, height: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 280, height: 0 });
  const controlPosRef = useRef({ x: 0, y: 0 });
  const controlRef = useRef<HTMLDivElement>(null);
  const hasResizedPanel = useRef(false);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const updateSize = () => {
      const { clientWidth, clientHeight } = workspace;
      if (clientWidth > 0 && clientHeight > 0) setWorkspaceSize({ width: clientWidth, height: clientHeight });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(workspace);
    updateSize();
    return () => observer.disconnect();
  }, [selectedNet]);

  useEffect(() => {
    const workspace = compareWorkspaceRef.current;
    if (!workspace) return;
    const updateSize = () => {
      const { clientWidth, clientHeight } = workspace;
      if (clientWidth > 0 && clientHeight > 0) setCompareWorkspaceSize({ width: clientWidth, height: clientHeight });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(workspace);
    updateSize();
    return () => observer.disconnect();
  }, [compareLeftNet, compareRightNet, activeTab]);

  useEffect(() => {
    comparePanelPosRef.current = comparePanelPos;
  }, [comparePanelPos]);

  useEffect(() => {
    if (!layoutRef.current || !controlRef.current) return;
    if (!hasMovedManually) {
      const layoutWidth = layoutRef.current.offsetWidth;
      const controlWidth = panelSize.width;
      const maxX = Math.max(0, layoutWidth - controlWidth - 24);
      const sidebarWidth = isSidebarOpen ? 320 : 0;
      const sidebarMaxX = sidebarWidth > 0 ? Math.max(0, sidebarWidth - controlWidth - 24) : maxX;
      const x = Math.max(0, Math.min(24, Math.min(maxX, sidebarMaxX)));
      setControlPos({ x, y: 24 });
    }
  }, [workspaceSize, hasMovedManually, isSidebarOpen, panelSize.width]);

  useEffect(() => {
    controlPosRef.current = controlPos;
    if (controlRef.current) {
      controlRef.current.style.transform = `translate3d(${controlPos.x}px, ${controlPos.y}px, 0)`;
    }
  }, [controlPos]);

  const applyDragPosition = (pos: { x: number; y: number }) => {
    controlPosRef.current = pos;
    if (controlRef.current) {
      controlRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.header-slider') || target.closest('.toggle-btn') || target.closest('input') || target.closest('.palette-btn') || target.closest('.action-btn') || target.closest('.panel-resize-handle')) return;
    if (!controlRef.current || !layoutRef.current || isResizing) return;
    setIsDragging(true);
    setHasMovedManually(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const rect = controlRef.current.getBoundingClientRect();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!controlRef.current || !layoutRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setHasMovedManually(true);
    hasResizedPanel.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const rect = controlRef.current.getBoundingClientRect();
    resizeStart.current = { x: clientX, y: clientY, width: rect.width, height: rect.height };
  };

  useEffect(() => {
    if (isPanelCollapsed || hasResizedPanel.current || panelSize.height !== 0 || workspaceSize.height === 0) return;
    const defaultHeight = Math.max(220, Math.min(600, workspaceSize.height - 48));
    setPanelSize(prev => ({ ...prev, height: defaultHeight }));
  }, [isPanelCollapsed, panelSize.height, workspaceSize.height]);

  useEffect(() => {
    if (activeTab !== 'compare' || !layoutRef.current) return;
    const layoutRect = layoutRef.current.getBoundingClientRect();
    const leftRect = compareLeftPanelRef.current?.getBoundingClientRect();
    const rightRect = compareRightPanelRef.current?.getBoundingClientRect();
    if (leftRect && !comparePanelMoved.current.left) {
      setComparePanelPos(prev => ({
        ...prev,
        left: { x: 24, y: 24 }
      }));
    }
    if (rightRect && !comparePanelMoved.current.right) {
      const rightX = Math.max(24, layoutRect.width - rightRect.width - 24);
      setComparePanelPos(prev => ({
        ...prev,
        right: { x: rightX, y: 24 }
      }));
    }
  }, [activeTab, compareWorkspaceSize.width, compareWorkspaceSize.height]);

  const handleComparePanelDragStart = (
    side: 'left' | 'right',
    e: React.MouseEvent | React.TouchEvent
  ) => {
    if (!layoutRef.current) return;
    const panel = side === 'left' ? compareLeftPanelRef.current : compareRightPanelRef.current;
    if (!panel) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const rect = panel.getBoundingClientRect();
    comparePanelDragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    comparePanelMoved.current[side] = true;
    setIsComparePanelDragging(side);
  };

  const computedScale = useMemo(() => {
    const baseScale = 40;
    return Math.max(5, Math.round(baseScale * zoomLevel));
  }, [zoomLevel]);

  const compareScale = useMemo(() => {
    const baseScale = 40;
    return Math.max(5, Math.round(baseScale * compareZoomLevel));
  }, [compareZoomLevel]);

  useEffect(() => {
    if (lastScaleRef.current === null) {
      lastScaleRef.current = computedScale;
      return;
    }
    if (lastScaleRef.current !== computedScale) {
      const ratio = computedScale / lastScaleRef.current;
      setPanOffset(prev => ({
        x: Math.round(prev.x * ratio),
        y: Math.round(prev.y * ratio)
      }));
      lastScaleRef.current = computedScale;
    }
  }, [computedScale]);

  useEffect(() => {
    if (compareScaleRef.current === null) {
      compareScaleRef.current = compareScale;
      return;
    }
    if (compareScaleRef.current !== compareScale) {
      const ratio = compareScale / compareScaleRef.current;
      setComparePanLeft(prev => ({
        x: Math.round(prev.x * ratio),
        y: Math.round(prev.y * ratio)
      }));
      setComparePanRight(prev => ({
        x: Math.round(prev.x * ratio),
        y: Math.round(prev.y * ratio)
      }));
      compareScaleRef.current = compareScale;
    }
  }, [compareScale]);

  useEffect(() => {
    if (activeTab !== 'compare') {
      comparePanInitialized.current = false;
      return;
    }
    if (!compareLeftNet || !compareRightNet || comparePanInitialized.current) return;
    const gapUnits = 2;
    const leftOffsetUnits = compareLeftNet.totalWidth / 2 + gapUnits;
    const rightOffsetUnits = compareRightNet.totalWidth / 2 + gapUnits;
    setComparePanLeft({ x: -Math.round(leftOffsetUnits * compareScale), y: 0 });
    setComparePanRight({ x: Math.round(rightOffsetUnits * compareScale), y: 0 });
    comparePanInitialized.current = true;
  }, [activeTab, compareLeftNet, compareRightNet, compareScale]);

  const handleCanvasDown = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.tool-panel')) return;
    
    const hitFace = target.closest('.net-face-target');
    if (activeTool === 'move') {
      setInteractionMode('move');
    } else {
      setInteractionMode(hitFace ? 'rotate' : 'move');
    }
    
    setIsCanvasInteracting(true);
    setIsAnimatingRotation(false);
    isDraggingNet.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    lastMousePos.current = { x: clientX, y: clientY };
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      if (isResizing && layoutRef.current) {
        const layoutRect = layoutRef.current.getBoundingClientRect();
        const minWidth = 220;
        const minHeight = 220;
        const maxWidth = Math.max(minWidth, layoutRect.width - controlPosRef.current.x - 16);
        const maxHeight = Math.max(minHeight, layoutRect.height - controlPosRef.current.y - 16);
        const nextWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.current.width + (clientX - resizeStart.current.x)));
        const nextHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.current.height + (clientY - resizeStart.current.y)));
        setPanelSize({ width: nextWidth, height: nextHeight });
        return;
      }

      if (isDragging && layoutRef.current && controlRef.current) {
        const layoutRect = layoutRef.current.getBoundingClientRect();
        const ctrlRect = controlRef.current.getBoundingClientRect();
        let newX = clientX - layoutRect.left - dragOffset.current.x;
        let newY = clientY - layoutRect.top - dragOffset.current.y;
        newX = Math.max(0, Math.min(newX, layoutRect.width - ctrlRect.width));
        newY = Math.max(0, Math.min(newY, layoutRect.height - ctrlRect.height));
        applyDragPosition({ x: newX, y: newY });
      }

      if (isCanvasInteracting) {
        const deltaX = clientX - lastMousePos.current.x;
        const deltaY = clientY - lastMousePos.current.y;
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) isDraggingNet.current = true;
        
        if (interactionMode === 'rotate') {
            setViewRotation(prev => ({ x: prev.x - deltaY * 0.5, y: prev.y + deltaX * 0.5 }));
        } else {
            setPanOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        }
        lastMousePos.current = { x: clientX, y: clientY };
      }
    };

    const handleGlobalEnd = () => {
      if (isDragging) setControlPos(controlPosRef.current);
      setIsDragging(false);
      setIsResizing(false);
      if (isCanvasInteracting && interactionMode === 'move') {
        setPanOffset(prev => ({
          x: snapToGrid(prev.x, computedScale),
          y: snapToGrid(prev.y, computedScale)
        }));
      }
      setIsCanvasInteracting(false);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalEnd);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDragging, isResizing, isCanvasInteracting, interactionMode, computedScale]);

  useEffect(() => {
    setFoldProgress(0);
    setViewRotation(DEFAULT_ROTATION);
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1.0);
    setActivePairs(new Set());
    setFaceColors({});
    setSelectedPaintColor(null);
    setShowEdgeMatches(false);
    setDiceStyle('none');
    if (window.innerWidth < 1024 && selectedNet) setIsSidebarOpen(false);
  }, [mode]); 

  const currentNets = useMemo(() => 
    mode === 'cube' 
      ? generateAllNets({ l: cubeSize, w: cubeSize, h: cubeSize }, true) 
      : generateAllNets(cuboidDims, false)
  , [mode, cubeSize, cuboidDims]);

  const compareLeftNets = useMemo(
    () => generateAllNets(compareLeftDims, false),
    [compareLeftDims]
  );
  const compareRightNets = useMemo(
    () => generateAllNets(compareRightDims, false),
    [compareRightDims]
  );

  useEffect(() => {
    if (!selectedNet || currentNets.length === 0) return;
    const match = currentNets.find(net =>
      net.patternId === selectedNet.patternId && net.variantIndex === selectedNet.variantIndex
    );
    if (match && match !== selectedNet) {
      setSelectedNet(match);
    } else if (!match) {
      setSelectedNet(currentNets[0]);
    }
  }, [currentNets, selectedNet]);

  useEffect(() => {
    if (compareLeftNets.length === 0) return;
    if (!compareLeftNet) {
      setCompareLeftNet(compareLeftNets[0]);
      return;
    }
    const match = compareLeftNets.find(net =>
      net.patternId === compareLeftNet.patternId && net.variantIndex === compareLeftNet.variantIndex
    );
    if (match && match !== compareLeftNet) {
      setCompareLeftNet(match);
    } else if (!match) {
      setCompareLeftNet(compareLeftNets[0]);
    }
  }, [compareLeftNets, compareLeftNet]);

  useEffect(() => {
    if (compareRightNets.length === 0) return;
    if (!compareRightNet) {
      setCompareRightNet(compareRightNets[0]);
      return;
    }
    const match = compareRightNets.find(net =>
      net.patternId === compareRightNet.patternId && net.variantIndex === compareRightNet.variantIndex
    );
    if (match && match !== compareRightNet) {
      setCompareRightNet(match);
    } else if (!match) {
      setCompareRightNet(compareRightNets[0]);
    }
  }, [compareRightNets, compareRightNet]);

  const handleFaceClick = (faceId: number) => {
    if (isDraggingNet.current) return;
    if (selectedPaintColor) {
      setFaceColors(prev => ({ ...prev, [faceId]: selectedPaintColor === '#ffffff' ? '' : selectedPaintColor }));
    }
  };

  const setQuickView = (type: 'front' | 'top' | 'side' | 'iso') => {
    setIsAnimatingRotation(true);
    setAnimDuration(0.8);
    switch(type) {
      case 'front': setViewRotation({ x: 0, y: 0 }); break;
      case 'top': setViewRotation({ x: 90, y: 0 }); break;
      case 'side': setViewRotation({ x: 0, y: 90 }); break;
      case 'iso': setViewRotation(ISO_ROTATION); break;
    }
    setTimeout(() => setIsAnimatingRotation(false), 800);
  };

  const adjustZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(0.1, Math.min(5.0, Math.round((prev + delta) * 10) / 10)));
  };
  const adjustCompareZoom = (delta: number) => {
    setCompareZoomLevel(prev => Math.max(0.1, Math.min(5.0, Math.round((prev + delta) * 10) / 10)));
  };
  const snapToGrid = (value: number, grid: number) => Math.round(value / grid) * grid;

  const clampDim = (value: number) => Math.max(1, Math.min(10, Math.round(value)));

  const updateCuboidDim = (key: keyof Dimensions, value: number) => {
    setCuboidDims(prev => ({ ...prev, [key]: clampDim(value) }));
  };

  const updateCompareDim = (side: 'left' | 'right', key: keyof Dimensions, value: number) => {
    if (side === 'left') {
      setCompareLeftDims(prev => ({ ...prev, [key]: clampDim(value) }));
    } else {
      setCompareRightDims(prev => ({ ...prev, [key]: clampDim(value) }));
    }
  };

  useEffect(() => {
    if (!isComparePanelDragging || !layoutRef.current) return;

    const handleMove = (event: MouseEvent | TouchEvent) => {
      const panel = isComparePanelDragging === 'left' ? compareLeftPanelRef.current : compareRightPanelRef.current;
      if (!panel || !layoutRef.current) return;
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      const layoutRect = layoutRef.current.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      let nextX = clientX - layoutRect.left - comparePanelDragOffset.current.x;
      let nextY = clientY - layoutRect.top - comparePanelDragOffset.current.y;
      nextX = Math.max(0, Math.min(nextX, layoutRect.width - panelRect.width));
      nextY = Math.max(0, Math.min(nextY, layoutRect.height - panelRect.height));
      setComparePanelPos(prev => ({
        ...prev,
        [isComparePanelDragging]: { x: nextX, y: nextY }
      }));
    };

    const handleEnd = () => {
      setIsComparePanelDragging(null);
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
  }, [isComparePanelDragging]);

  const stepFold = (delta: number) => {
    setFoldProgress(prev => Math.max(0, Math.min(100, prev + delta)));
  };

  const togglePair = (pairId: number) => {
    setActivePairs(prev => {
      const next = new Set(prev);
      if (next.has(pairId)) next.delete(pairId);
      else next.add(pairId);
      return next;
    });
  };

  const renderNetItem = (net: NetData, idx: number) => {
    const scale = Math.min(150 / Math.max(net.totalWidth, 1), 80 / Math.max(net.totalHeight, 1), 25);
    return (
        <button key={`${net.id}-${idx}`} onClick={() => setSelectedNet(net)}
            className={`w-full flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${selectedNet?.id === net.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-blue-300'}`}>
            <div className="w-full h-28 relative pointer-events-none overflow-hidden rounded-lg border bg-slate-50/50 border-slate-100">
                <NetCanvas net={net} scale={scale} interactive={false} foldProgress={0} rotation={{ x: 0, y: 0 }} transparency={0} panOffset={{x:0, y:0}} showGrid={false} />
            </div>
            <span className="mt-2 text-[10px] font-bold text-slate-500 uppercase">유형 {net.patternId}</span>
        </button>
    );
  };

  const foldSliderOnly = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-slate-500">접기 제어</span>
        <span className="text-[9px] font-black text-slate-400">{foldProgress}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={foldProgress}
        onChange={e => setFoldProgress(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-blue-600"
      />
    </div>
  );

  const foldControls = (
    <div className="space-y-3">
      <span className="text-[10px] font-bold block uppercase text-slate-500">접기 제어</span>
      <div className="flex gap-2">
        <button onClick={() => stepFold(-25)} className="flex-1 py-2 rounded-xl bg-slate-100 font-black text-xs">-25%</button>
        <button onClick={() => stepFold(25)} className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-black text-xs">+25%</button>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={foldProgress}
        onChange={e => setFoldProgress(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-blue-600"
      />
    </div>
  );

  return (
    <div className={`flex flex-col h-screen overflow-hidden font-sans select-none transition-all duration-700 ${isClassroomMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
      <header className={`flex-none border-b px-4 py-3 shadow-sm z-40 flex items-center justify-between transition-all duration-500 ${isClassroomMode ? 'bg-black/40 backdrop-blur-md border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <h1 className="text-lg font-black tracking-tighter uppercase">전개도 마스터</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => { setActiveTab('single'); setMode('cube'); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'single' && mode === 'cube' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  정육면체
                </button>
                <button
                  onClick={() => { setActiveTab('single'); setMode('cuboid'); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'single' && mode === 'cuboid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  직육면체
                </button>
                <button
                  onClick={() => setActiveTab('compare')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'compare' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  비교모드
                </button>
            </div>
            <button onClick={() => setIsClassroomMode(!isClassroomMode)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${isClassroomMode ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'}`}>교실 모드</button>
        </div>
      </header>

      <div ref={layoutRef} className="flex-1 overflow-hidden flex flex-row relative">
        {activeTab === 'single' && selectedNet && (
          <div
            ref={controlRef}
            style={{
              left: 0,
              top: 0,
              width: panelSize.width,
              height: isPanelCollapsed ? undefined : (panelSize.height ? panelSize.height : undefined),
              minWidth: 220,
              minHeight: isPanelCollapsed ? 0 : 220,
              transform: `translate3d(${controlPos.x}px, ${controlPos.y}px, 0)`
            }}
            className={`tool-panel absolute z-[60] flex flex-col rounded-2xl shadow-2xl border bg-white/95 backdrop-blur-xl border-slate-100 ${isDragging || isResizing ? '' : 'transition-all duration-300'}`}>
            <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="px-3 py-3 border-b flex items-center justify-between cursor-grab active:cursor-grabbing bg-slate-50/80">
                <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">수업 도구</span>
                <button onClick={() => setIsPanelCollapsed(!isPanelCollapsed)} className="p-1.5 rounded-lg hover:bg-slate-200">
                    <svg className={`w-4 h-4 transition-transform ${isPanelCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </button>
            </div>
            {isPanelCollapsed ? (
              <div className="p-3">{foldSliderOnly}</div>
            ) : (
              <div className="p-4 space-y-6 panel-scroll flex-1">
                  {/* 확대 및 모드 */}
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">배율</span>
                          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                              <button onClick={() => adjustZoom(-0.1)} className="w-8 h-8 font-bold">-</button>
                              <div className="flex-1 text-center text-[10px] font-black">{Math.round(zoomLevel * 100)}%</div>
                              <button onClick={() => adjustZoom(0.1)} className="w-8 h-8 font-bold">+</button>
                          </div>
                      </div>
                      <div className="space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">드래그</span>
                          <div className="flex p-1 bg-slate-100 rounded-xl">
                              <button onClick={() => setActiveTool('smart')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTool === 'smart' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>회전</button>
                              <button onClick={() => setActiveTool('move')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTool === 'move' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>이동</button>
                          </div>
                      </div>
                  </div>

                  {mode === 'cuboid' && (
                    <div className="space-y-3 pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-bold block uppercase text-slate-500">직육면체 크기</span>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: 'l', label: '가로' },
                          { key: 'w', label: '세로' },
                          { key: 'h', label: '높이' },
                        ] as const).map(({ key, label }) => (
                          <div key={key} className="space-y-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase">{label}</span>
                            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                              <button onClick={() => updateCuboidDim(key, cuboidDims[key] - 1)} className="w-7 h-7 font-bold">-</button>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={cuboidDims[key]}
                                onChange={e => updateCuboidDim(key, Number(e.target.value))}
                                className="w-10 text-center text-[10px] font-black bg-transparent outline-none"
                              />
                              <button onClick={() => updateCuboidDim(key, cuboidDims[key] + 1)} className="w-7 h-7 font-bold">+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 단계별 접기 */}
                  {foldControls}

                  {/* 면 투명도 조절 */}
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-bold block uppercase text-slate-500">면 투명도</span>
                      <input 
                          type="range" 
                          min="0" 
                          max="0.9" 
                          step="0.05"
                          value={transparency} 
                          onChange={e => setTransparency(Number(e.target.value))} 
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-blue-600" 
                      />
                      <div className="flex justify-between text-[8px] font-bold text-slate-400">
                          <span>불투명</span>
                          <span>투명</span>
                      </div>
                  </div>

                  {/* 주사위 설정 */}
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-bold block uppercase text-slate-500">주사위 눈 (합=7)</span>
                      <div className="flex p-1 bg-slate-100 rounded-xl">
                          <button onClick={() => setDiceStyle('none')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${diceStyle === 'none' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>없음</button>
                          <button onClick={() => setDiceStyle('number')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${diceStyle === 'number' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>숫자</button>
                          <button onClick={() => setDiceStyle('dot')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${diceStyle === 'dot' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>눈</button>
                      </div>
                  </div>

                  {/* 평행한 면 강조 */}
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-bold block uppercase text-slate-500">평행한 면 (같은 색칠)</span>
                      <div className="flex gap-2">
                          {[0, 1, 2].map(id => (
                              <button key={id} onClick={() => togglePair(id)} className={`flex-1 py-2 rounded-xl font-black text-[10px] border-2 transition-all ${activePairs.has(id) ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}>쌍 {id + 1}</button>
                          ))}
                      </div>
                  </div>

                  {/* 맞물리는 모서리 강조 */}
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-bold block uppercase text-slate-500">모서리 분석</span>
                      <button onClick={() => setShowEdgeMatches(!showEdgeMatches)} className={`w-full py-2.5 rounded-xl font-black text-xs transition-all border-2 ${showEdgeMatches ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-100'}`}>
                          {showEdgeMatches ? '모서리 매칭 OFF' : '맞물리는 모서리 표시'}
                      </button>
                  </div>

                  {/* 색칠 도구 */}
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-bold block uppercase text-slate-500">색칠하기</span>
                      <div className="flex flex-wrap gap-2">
                          {PAINT_PALETTE.map(color => (
                              <button key={color} onClick={() => setSelectedPaintColor(selectedPaintColor === color ? null : color)} className={`w-8 h-8 rounded-full border-2 ${selectedPaintColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} style={{ backgroundColor: color }} />
                          ))}
                      </div>
                  </div>

                  {/* 관찰 시점 */}
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-bold block uppercase text-slate-500">관찰 시점</span>
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setQuickView('front')} className="py-2 text-[10px] font-black rounded-xl border bg-slate-50">앞면</button>
                          <button onClick={() => setQuickView('top')} className="py-2 text-[10px] font-black rounded-xl border bg-slate-50">윗면</button>
                          <button onClick={() => setQuickView('side')} className="py-2 text-[10px] font-black rounded-xl border bg-slate-50">옆면</button>
                          <button onClick={() => setQuickView('iso')} className="py-2 text-[10px] font-black rounded-xl border bg-blue-50 text-blue-600">입체</button>
                      </div>
                  </div>
              </div>
            )}
            <div
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
              className="panel-resize-handle absolute bottom-2 right-2 h-4 w-4 cursor-se-resize"
            >
              <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-slate-300" />
            </div>
          </div>
        )}
        {activeTab === 'single' && (
          <aside className={`absolute lg:relative z-20 h-full transition-all duration-300 border-r bg-white border-slate-200 ${isSidebarOpen ? 'w-[320px] translate-x-0' : '-translate-x-full lg:w-0'}`}>
              <div className="flex flex-col h-full p-4 overflow-y-auto no-scrollbar space-y-6">
                  <div className="flex justify-between items-center">
                      <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">전개도 탐색</h2>
                      <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-slate-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">{currentNets.map((n, i) => renderNetItem(n, i))}</div>
              </div>
          </aside>
        )}

        <main className="flex-1 relative flex flex-col min-w-0">
            <div className={`flex-1 flex flex-col p-4 sm:p-6 lg:p-10 min-h-0 ${isClassroomMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                {activeTab === 'single' ? (
                  selectedNet ? (
                      <div className="flex-1 flex flex-col rounded-[3rem] overflow-hidden relative border-4 bg-white border-slate-200 shadow-xl">
                          <div ref={workspaceRef} onMouseDown={handleCanvasDown} onTouchStart={handleCanvasDown} 
                            className={`flex-1 flex items-center justify-center relative overflow-hidden touch-none ${isCanvasInteracting ? (interactionMode === 'rotate' ? 'cursor-grabbing' : 'cursor-move') : (activeTool === 'move' ? 'cursor-move' : (selectedPaintColor ? 'cursor-copy' : 'cursor-grab'))}`}>
                               <NetCanvas net={selectedNet} scale={computedScale} interactive={true} foldProgress={foldProgress} transparency={transparency} activeParallelPairs={activePairs} showGrid={showGrid} rotation={viewRotation} panOffset={panOffset} canvasSize={workspaceSize} isAnimatingRotation={isAnimatingRotation} isRotating={isCanvasInteracting && interactionMode === 'rotate'} faceColors={faceColors} onFaceClick={handleFaceClick} isPaintingMode={!!selectedPaintColor} showEdgeMatches={showEdgeMatches} diceStyle={diceStyle} animationDuration={animDuration} />
                          </div>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                          <p className="text-2xl font-black mb-4">학습할 전개도를 선택하세요</p>
                      </div>
                  )
                ) : (
                  <div className="flex-1 flex flex-col rounded-[3rem] overflow-hidden relative border-4 bg-white border-slate-200 shadow-xl">
                      <div ref={compareWorkspaceRef} className="absolute inset-0">
                        {compareLeftNet && compareRightNet ? (
                          <CompareCanvas
                            leftNet={compareLeftNet}
                            rightNet={compareRightNet}
                            scale={compareScale}
                            leftPan={comparePanLeft}
                            rightPan={comparePanRight}
                            onLeftPanChange={setComparePanLeft}
                            onRightPanChange={setComparePanRight}
                            canvasSize={compareWorkspaceSize}
                            showGrid={showGrid}
                            debug={showCompareDebug}
                            activeSide={compareActiveSide}
                            onActiveSideChange={setCompareActiveSide}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">전개도를 선택하세요</div>
                        )}
                      </div>

                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-2 text-[10px] font-black shadow">
                          <span className="uppercase text-slate-400">공통 배율</span>
                          <button onClick={() => adjustCompareZoom(-0.1)} className="w-7 h-7 rounded-lg bg-slate-100">-</button>
                          <span className="min-w-[48px] text-center">{Math.round(compareZoomLevel * 100)}%</span>
                          <button onClick={() => adjustCompareZoom(0.1)} className="w-7 h-7 rounded-lg bg-slate-100">+</button>
                          <button
                            onClick={() => {
                              setCompareZoomLevel(1.0);
                              setComparePanLeft({ x: 0, y: 0 });
                              setComparePanRight({ x: 0, y: 0 });
                            }}
                            className="rounded-lg bg-slate-800 px-3 py-1 text-white"
                          >
                            초기화
                          </button>
                          <button
                            onClick={() => setShowCompareDebug(prev => !prev)}
                            className={`rounded-lg px-3 py-1 ${showCompareDebug ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                          >
                            디버그
                          </button>
                      </div>

                      {compareLeftNet && (
                        <div
                          ref={compareLeftPanelRef}
                          style={{ left: 0, top: 0, transform: `translate3d(${comparePanelPos.left.x}px, ${comparePanelPos.left.y}px, 0)` }}
                          className={`absolute z-40 w-64 rounded-2xl border bg-white/95 shadow-xl ${compareActiveSide === 'left' ? 'ring-2 ring-red-300' : 'border-red-100'}`}
                        >
                          <div
                            onMouseDown={(e) => handleComparePanelDragStart('left', e)}
                            onTouchStart={(e) => handleComparePanelDragStart('left', e)}
                            className="flex cursor-grab items-center justify-between border-b px-3 py-2 active:cursor-grabbing"
                          >
                            <span className="text-[10px] font-black uppercase text-red-500">빨강 전개도</span>
                            <span className="text-[9px] font-bold text-slate-400">좌측</span>
                          </div>
                          <div className="panel-scroll max-h-[70vh] space-y-4 p-3">
                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase">전개도 선택</span>
                              <select
                                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[10px] font-black"
                                value={compareLeftNet.id}
                                onChange={e => {
                                  const next = compareLeftNets.find(net => net.id === e.target.value);
                                  if (next) setCompareLeftNet(next);
                                }}
                              >
                                {compareLeftNets.map(net => (
                                  <option key={net.id} value={net.id}>
                                    유형 {net.patternId}-{net.variantIndex}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                              <span className="text-[9px] font-black text-slate-400 uppercase">직육면체 크기</span>
                              <div className="grid grid-cols-3 gap-2">
                                {([
                                  { key: 'l', label: '가로' },
                                  { key: 'w', label: '세로' },
                                  { key: 'h', label: '높이' }
                                ] as const).map(({ key, label }) => (
                                  <div key={key} className="space-y-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{label}</span>
                                    <div className="flex items-center rounded-xl bg-slate-100 p-1">
                                      <button onClick={() => updateCompareDim('left', key, compareLeftDims[key] - 1)} className="w-7 h-7 font-bold">-</button>
                                      <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={compareLeftDims[key]}
                                        onChange={e => updateCompareDim('left', key, Number(e.target.value))}
                                        className="w-10 bg-transparent text-center text-[10px] font-black outline-none"
                                      />
                                      <button onClick={() => updateCompareDim('left', key, compareLeftDims[key] + 1)} className="w-7 h-7 font-bold">+</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {compareRightNet && (
                        <div
                          ref={compareRightPanelRef}
                          style={{ left: 0, top: 0, transform: `translate3d(${comparePanelPos.right.x}px, ${comparePanelPos.right.y}px, 0)` }}
                          className={`absolute z-40 w-64 rounded-2xl border bg-white/95 shadow-xl ${compareActiveSide === 'right' ? 'ring-2 ring-blue-300' : 'border-blue-100'}`}
                        >
                          <div
                            onMouseDown={(e) => handleComparePanelDragStart('right', e)}
                            onTouchStart={(e) => handleComparePanelDragStart('right', e)}
                            className="flex cursor-grab items-center justify-between border-b px-3 py-2 active:cursor-grabbing"
                          >
                            <span className="text-[10px] font-black uppercase text-blue-500">파랑 전개도</span>
                            <span className="text-[9px] font-bold text-slate-400">우측</span>
                          </div>
                          <div className="panel-scroll max-h-[70vh] space-y-4 p-3">
                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase">전개도 선택</span>
                              <select
                                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[10px] font-black"
                                value={compareRightNet.id}
                                onChange={e => {
                                  const next = compareRightNets.find(net => net.id === e.target.value);
                                  if (next) setCompareRightNet(next);
                                }}
                              >
                                {compareRightNets.map(net => (
                                  <option key={net.id} value={net.id}>
                                    유형 {net.patternId}-{net.variantIndex}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                              <span className="text-[9px] font-black text-slate-400 uppercase">직육면체 크기</span>
                              <div className="grid grid-cols-3 gap-2">
                                {([
                                  { key: 'l', label: '가로' },
                                  { key: 'w', label: '세로' },
                                  { key: 'h', label: '높이' }
                                ] as const).map(({ key, label }) => (
                                  <div key={key} className="space-y-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{label}</span>
                                    <div className="flex items-center rounded-xl bg-slate-100 p-1">
                                      <button onClick={() => updateCompareDim('right', key, compareRightDims[key] - 1)} className="w-7 h-7 font-bold">-</button>
                                      <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={compareRightDims[key]}
                                        onChange={e => updateCompareDim('right', key, Number(e.target.value))}
                                        className="w-10 bg-transparent text-center text-[10px] font-black outline-none"
                                      />
                                      <button onClick={() => updateCompareDim('right', key, compareRightDims[key] + 1)} className="w-7 h-7 font-bold">+</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;
