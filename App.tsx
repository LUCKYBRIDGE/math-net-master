
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Dimensions, NetData } from './types';
import { generateAllNets } from './utils/netGenerator';
import { NetCanvas } from './components/NetCanvas';
import { CylinderCanvas } from './components/CylinderCanvas';
import { CircleCanvas } from './components/CircleCanvas';
import { CompareCanvas } from './components/CompareCanvas';
import { NetCanvas3D } from './components/Three/NetCanvas3D';

const DEFAULT_ROTATION = { x: 0, y: 0 };
const ISO_ROTATION = { x: -25, y: 45 };
const PAINT_PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#fde047', '#a855f7', '#ffffff'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');
  const [mode, setMode] = useState<'cube' | 'cuboid' | 'cube3d' | 'cuboid3d' | 'prism' | 'pyramid' | 'cylinder' | 'cone' | 'circle'>('cube');
  const [prismSides, setPrismSides] = useState(3); // 3~6
  const [pyramidSides, setPyramidSides] = useState(4); // 3~6
  const [prismSubtype, setPrismSubtype] = useState<'regular' | 'right' | 'iso' | 'rect'>('regular');
  const [pyramidSubtype, setPyramidSubtype] = useState<'regular' | 'right' | 'iso' | 'rect'>('regular');
  const [prismTriangleType, setPrismTriangleType] = useState<'30-60-90' | '45-45-90' | '60-60-60'>('60-60-60');
  const [pyramidBaseType, setPyramidBaseType] = useState<'triangle' | 'square' | 'pentagon'>('triangle');
  const [cylinderRadius, setCylinderRadius] = useState(2);
  const [cylinderHeight, setCylinderHeight] = useState(4);
  const [cylinderSegments, setCylinderSegments] = useState(36);
  const [showCylinderSegments, setShowCylinderSegments] = useState(false);
  const [highlightPerimeter, setHighlightPerimeter] = useState(false);
  const [cylinderActionMode, setCylinderActionMode] = useState<'none' | 'surface' | 'volume' | 'section' | 'rectify'>('none');
  const [cylinderSectionType, setCylinderSectionType] = useState<'horizontal' | 'vertical' | 'diagonal'>('horizontal');

  const [circleRadius, setCircleRadius] = useState(3);
  const [circleSegments, setCircleSegments] = useState(16);
  const [circleDisplayMode, setCircleDisplayMode] = useState<'split' | 'roll' | 'onion' | 'none'>('none');
  const [usePiSymbol, setUsePiSymbol] = useState(false);
  const [useSymbolNotation, setUseSymbolNotation] = useState(false); // false=반지름/높이, true=r/h
  const [cubeSize] = useState(3);
  const [cuboidDims, setCuboidDims] = useState<Dimensions>({ l: 2, w: 3, h: 4 });
  const [selectedNet, setSelectedNet] = useState<NetData | null>(null);
  const [foldProgress, setFoldProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [transparency, setTransparency] = useState(0.4);
  const [activePairs, setActivePairs] = useState<Set<number>>(new Set());
  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.5);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showEdgeMatches, setShowEdgeMatches] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [showBasePerimeter, setShowBasePerimeter] = useState(false);
  const [basePerimeterFaceId, setBasePerimeterFaceId] = useState<number | null>(null);
  const [gridUnitValue, setGridUnitValue] = useState(1);
  const [gridUnitType, setGridUnitType] = useState('cm');
  const [diceStyle, setDiceStyle] = useState<'none' | 'number' | 'dot'>('none');
  const [faceColors, setFaceColors] = useState<Record<number, string>>({});
  const [selectedPaintColor, setSelectedPaintColor] = useState<string | null>(null);

  const [activeTool, setActiveTool] = useState<'move' | 'rotate'>('move');
  const [interactionMode, setInteractionMode] = useState<'rotate' | 'move'>('move');

  const [viewRotation, setViewRotation] = useState(DEFAULT_ROTATION);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isCanvasInteracting, setIsCanvasInteracting] = useState(false);
  const [isAnimatingRotation, setIsAnimatingRotation] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const isDraggingNet = useRef(false);
  const [animDuration, setAnimDuration] = useState(1.5);
  const lastScaleRef = useRef<number | null>(null);
  const compareScaleRef = useRef<number | null>(null);
  const compareZoomInitialized = useRef(false);
  const [compareLeftDims, setCompareLeftDims] = useState<Dimensions>({ l: 2, w: 3, h: 4 });
  const [compareRightDims, setCompareRightDims] = useState<Dimensions>({ l: 2, w: 3, h: 4 });
  const [compareLeftNet, setCompareLeftNet] = useState<NetData | null>(null);
  const [compareRightNet, setCompareRightNet] = useState<NetData | null>(null);
  const [compareZoomLevel, setCompareZoomLevel] = useState(1.0);
  const [compareFoldLeft, setCompareFoldLeft] = useState(0);
  const [compareFoldRight, setCompareFoldRight] = useState(0);
  const [comparePanLeft, setComparePanLeft] = useState({ x: 0, y: 0 });
  const [comparePanRight, setComparePanRight] = useState({ x: 0, y: 0 });
  const [compareRotation, setCompareRotation] = useState({
    left: DEFAULT_ROTATION,
    right: DEFAULT_ROTATION
  });
  const [compareActiveSide, setCompareActiveSide] = useState<'left' | 'right'>('left');
  const [comparePanelPos, setComparePanelPos] = useState({
    left: { x: 24, y: 24 },
    right: { x: 24, y: 24 }
  });
  const [comparePanelCollapsed, setComparePanelCollapsed] = useState({ left: false, right: false });
  const [compareHeaderCollapsed, setCompareHeaderCollapsed] = useState(false);
  const [compareHeaderPos, setCompareHeaderPos] = useState({ x: 0, y: 0 });
  const [compareInteractionMode, setCompareInteractionMode] = useState<{ left: 'move' | 'rotate'; right: 'move' | 'rotate' }>({
    left: 'move',
    right: 'move'
  });
  const compareHeaderRef = useRef<HTMLDivElement>(null);
  const compareHeaderDragOffset = useRef({ x: 0, y: 0 });
  const compareHeaderPointerId = useRef<number | null>(null);
  const compareHeaderDraggingRef = useRef(false);
  const compareHeaderMoved = useRef(false);
  const [isComparePanelDragging, setIsComparePanelDragging] = useState<'left' | 'right' | null>(null);
  const comparePanelPosRef = useRef({ left: { x: 24, y: 24 }, right: { x: 24, y: 24 } });
  const comparePanelDragOffset = useRef({ x: 0, y: 0 });
  const comparePanelMoved = useRef({ left: false, right: false });
  const compareInitialPanRef = useRef({
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 }
  });
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
      const layoutRect = layoutRef.current.getBoundingClientRect();
      const topOffset = layoutRect.top;
      const x = 24;
      const y = topOffset + 24;
      setControlPos({ x, y });
    }
  }, [workspaceSize, hasMovedManually]);

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
    if (!controlRef.current || isResizing) return;
    setIsDragging(true);
    setHasMovedManually(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const rect = controlRef.current.getBoundingClientRect();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!controlRef.current) return;
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
    if (!compareHeaderMoved.current && compareHeaderRef.current) {
      const headerRect = compareHeaderRef.current.getBoundingClientRect();
      const headerX = Math.max(24, (layoutRect.width - headerRect.width) / 2);
      setCompareHeaderPos({ x: headerX, y: layoutRect.top + 16 });
    }
  }, [activeTab, compareWorkspaceSize.width, compareWorkspaceSize.height]);

  const handleComparePanelDragStart = (
    side: 'left' | 'right',
    e: React.MouseEvent | React.TouchEvent
  ) => {
    setCompareActiveSide(side);
    const panel = side === 'left' ? compareLeftPanelRef.current : compareRightPanelRef.current;
    if (!panel) return;
    if ('touches' in e) {
      e.preventDefault();
    }
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const rect = panel.getBoundingClientRect();
    comparePanelDragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    comparePanelMoved.current[side] = true;
    setIsComparePanelDragging(side);
  };

  const logCompareCommon = (...args: unknown[]) => {
    if (typeof window === 'undefined') return;
    console.log('[compare-common-panel]', ...args);
  };

  const handleCommonPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab !== 'compare') return;
    const panel = compareHeaderRef.current;
    if (!panel) {
      logCompareCommon('pointerdown:panel-missing');
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target?.closest('input[type="range"]')) {
      logCompareCommon('pointerdown:skip-range');
      return;
    }
    const rect = panel.getBoundingClientRect();
    compareHeaderDragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    compareHeaderMoved.current = true;
    compareHeaderDraggingRef.current = true;
    compareHeaderPointerId.current = e.pointerId;
    panel.setPointerCapture(e.pointerId);
    logCompareCommon('pointerdown', { x: e.clientX, y: e.clientY }, rect);
    e.preventDefault();
  };

  const handleCommonPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!compareHeaderDraggingRef.current || !compareHeaderRef.current) return;
    const panel = compareHeaderRef.current;
    const rect = panel.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    let nextX = e.clientX - compareHeaderDragOffset.current.x;
    let nextY = e.clientY - compareHeaderDragOffset.current.y;
    nextX = Math.max(0, Math.min(nextX, viewportWidth - rect.width));
    nextY = Math.max(0, Math.min(nextY, viewportHeight - rect.height));
    setCompareHeaderPos({ x: nextX, y: nextY });
  };

  const handleCommonPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!compareHeaderRef.current) return;
    if (compareHeaderPointerId.current === e.pointerId) {
      compareHeaderDraggingRef.current = false;
      compareHeaderPointerId.current = null;
      compareHeaderRef.current.releasePointerCapture(e.pointerId);
      logCompareCommon('pointerup');
    }
  };

  useEffect(() => {
    if (activeTab !== 'compare') return;
    if (!compareHeaderRef.current) {
      logCompareCommon('panel-ref-missing');
      return;
    }
    logCompareCommon('panel-mounted', compareHeaderRef.current.getBoundingClientRect());
  }, [activeTab]);

  const resetCompareView = () => {
    compareZoomInitialized.current = false;
    comparePanInitialized.current = false;
    setCompareZoomLevel(1.0);
    setComparePanLeft({ x: 0, y: 0 });
    setComparePanRight({ x: 0, y: 0 });
    setCompareRotation({ left: DEFAULT_ROTATION, right: DEFAULT_ROTATION });
    setCompareFoldLeft(0);
    setCompareFoldRight(0);
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
    const nextLeftPan = { x: -Math.round(leftOffsetUnits * compareScale), y: 0 };
    const nextRightPan = { x: Math.round(rightOffsetUnits * compareScale), y: 0 };
    setComparePanLeft(nextLeftPan);
    setComparePanRight(nextRightPan);
    compareInitialPanRef.current = { left: nextLeftPan, right: nextRightPan };
    comparePanInitialized.current = true;
  }, [activeTab, compareLeftNet, compareRightNet, compareScale]);

  const handleCanvasDown = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.tool-panel')) return;

    setInteractionMode(activeTool);

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

      if (isResizing) {
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const minWidth = 220;
        const minHeight = 220;
        const maxWidth = Math.max(minWidth, viewportWidth - controlPosRef.current.x - 16);
        const maxHeight = Math.max(minHeight, viewportHeight - controlPosRef.current.y - 16);
        const nextWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.current.width + (clientX - resizeStart.current.x)));
        const nextHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.current.height + (clientY - resizeStart.current.y)));
        setPanelSize({ width: nextWidth, height: nextHeight });
        return;
      }

      if (isDragging && controlRef.current) {
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const ctrlRect = controlRef.current.getBoundingClientRect();
        let newX = clientX - dragOffset.current.x;
        let newY = clientY - dragOffset.current.y;
        newX = Math.max(0, Math.min(newX, viewportWidth - ctrlRect.width));
        newY = Math.max(0, Math.min(newY, viewportHeight - ctrlRect.height));
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
    setShowArea(false);
    setShowBasePerimeter(false);
    setBasePerimeterFaceId(null);
    setDiceStyle('none');

    // 원 / 원기둥 보조 도구 모드 초기화
    setCircleDisplayMode('none');
    setCylinderActionMode('none');
    setShowCylinderSegments(false);
    setHighlightPerimeter(false);

    // 모드(도형 탭)가 바뀔 때 육면체 계열이 아니면 명확히 null로 초기화하여 이전 렌더링 내역을 없앰
    if (mode !== 'cube' && mode !== 'cuboid') {
      setSelectedNet(null);
    }

    if (window.innerWidth < 1024 && selectedNet) setIsSidebarOpen(false);
  }, [mode]);

  const currentNets = useMemo(() => {
    if (mode === 'cube' || mode === 'cube3d') return generateAllNets({ l: cubeSize, w: cubeSize, h: cubeSize }, true);
    if (mode === 'cuboid' || mode === 'cuboid3d') return generateAllNets(cuboidDims, false);
    return []; // 삼각기둥 등 아직 미구현
  }, [mode, cubeSize, cuboidDims, prismTriangleType, pyramidBaseType]);

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
    if (showBasePerimeter) {
      setBasePerimeterFaceId(faceId);
      return;
    }
    if (selectedPaintColor) {
      setFaceColors(prev => ({ ...prev, [faceId]: selectedPaintColor === '#ffffff' ? '' : selectedPaintColor }));
    }
  };

  useEffect(() => {
    setBasePerimeterFaceId(null);
  }, [selectedNet]);

  const setQuickView = (type: 'front' | 'top' | 'side' | 'iso') => {
    setIsAnimatingRotation(true);
    setAnimDuration(0.8);
    switch (type) {
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
    compareZoomInitialized.current = true;
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

  const resetCompareRotation = (side: 'left' | 'right') => {
    setCompareRotation(prev => ({ ...prev, [side]: DEFAULT_ROTATION }));
  };

  const resetComparePosition = (side: 'left' | 'right') => {
    const initial = compareInitialPanRef.current[side];
    if (side === 'left') {
      setComparePanLeft(initial);
    } else {
      setComparePanRight(initial);
    }
  };

  const compareFoldSynced = compareFoldLeft === compareFoldRight;
  const compareFoldCommon = compareFoldSynced ? compareFoldLeft : 0;
  const compareModeSynced = compareInteractionMode.left === compareInteractionMode.right;
  const compareModeCommon = compareModeSynced ? compareInteractionMode.left : null;

  useEffect(() => {
    if (activeTab !== 'compare') {
      compareZoomInitialized.current = false;
      return;
    }
    if (compareZoomInitialized.current) return;
    if (!compareLeftNet || !compareRightNet) return;
    if (compareWorkspaceSize.width === 0 || compareWorkspaceSize.height === 0) return;
    const gapUnits = 4;
    const totalWidth = compareLeftNet.totalWidth + compareRightNet.totalWidth + gapUnits;
    const totalHeight = Math.max(compareLeftNet.totalHeight, compareRightNet.totalHeight);
    const padding = 120;
    const availW = Math.max(compareWorkspaceSize.width - padding, 100);
    const availH = Math.max(compareWorkspaceSize.height - padding, 100);
    const fitScale = Math.min(availW / Math.max(totalWidth, 1), availH / Math.max(totalHeight, 1));
    const baseScale = 40;
    const nextZoom = Math.max(0.1, Math.min(5.0, Math.round((fitScale / baseScale) * 10) / 10));
    setCompareZoomLevel(nextZoom);
    comparePanInitialized.current = false;
    compareZoomInitialized.current = true;
  }, [activeTab, compareLeftNet, compareRightNet, compareWorkspaceSize.width, compareWorkspaceSize.height]);

  useEffect(() => {
    if (activeTab !== 'compare') return;
    compareZoomInitialized.current = false;
    comparePanInitialized.current = false;
  }, [activeTab, compareLeftNet?.id, compareRightNet?.id]);

  useEffect(() => {
    if (activeTab !== 'compare') return;
    setCompareRotation({ left: DEFAULT_ROTATION, right: DEFAULT_ROTATION });
  }, [activeTab, compareLeftNet?.id, compareRightNet?.id]);

  useEffect(() => {
    if (!isComparePanelDragging) return;

    const handleMove = (event: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;

      const panel = isComparePanelDragging === 'left' ? compareLeftPanelRef.current : compareRightPanelRef.current;
      if (!panel) return;
      const panelRect = panel.getBoundingClientRect();
      let nextX = clientX - comparePanelDragOffset.current.x;
      let nextY = clientY - comparePanelDragOffset.current.y;
      nextX = Math.max(0, Math.min(nextX, viewportWidth - panelRect.width));
      nextY = Math.max(0, Math.min(nextY, viewportHeight - panelRect.height));
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

  // common panel drag handled in compare panel drag effect

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
      <button key={`${net.id}-${idx}`} onClick={() => { setSelectedNet(net); setIsSidebarOpen(false); }}
        className={`w-full flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${selectedNet?.id === net.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-blue-300'}`}>
        <div className="w-full h-28 relative pointer-events-none overflow-hidden rounded-lg border bg-slate-50/50 border-slate-100">
          <NetCanvas net={net} scale={scale} interactive={false} foldProgress={0} rotation={{ x: 0, y: 0 }} transparency={0} panOffset={{ x: 0, y: 0 }} showGrid={false} />
        </div>
        <span className="mt-2 text-[10px] font-bold text-slate-500 uppercase">
          {mode === 'cube' ? `유형 ${net.patternId}` : `유형 ${net.patternId}-${net.variantIndex}`}
        </span>
      </button>
    );
  };

  const getComparePreviewScale = (net: NetData, maxWidth = 120, maxHeight = 60, cap = 18) => {
    const raw = Math.min(maxWidth / Math.max(net.totalWidth, 1), maxHeight / Math.max(net.totalHeight, 1), cap);
    return Math.max(4, Math.floor(raw * 0.9));
  };

  const foldLabel = (mode === 'prism' || mode === 'pyramid') ? '💧 부피 물채우기'
    : (mode === 'circle' && circleDisplayMode === 'split') ? '🧩 조각 모아 직사각형 만들기'
      : (mode === 'circle' && circleDisplayMode === 'roll') ? '🔄 한 바퀴 굴리기'
        : '접기 제어';

  const foldSliderOnly = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-slate-500">{foldLabel}</span>
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
      <span className="text-[10px] font-bold block uppercase text-slate-500">{foldLabel}</span>
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

  const commonPanel = (
    <div
      ref={compareHeaderRef}
      style={{ left: 0, top: 0, transform: `translate3d(${compareHeaderPos.x}px, ${compareHeaderPos.y}px, 0)` }}
      className="fixed z-[9999] rounded-2xl border border-slate-200 bg-white/95 shadow-xl touch-none select-none pointer-events-auto"
    >
      <div
        className="flex cursor-grab items-center justify-between gap-2 border-b px-3 py-2 text-[10px] font-black text-slate-500 active:cursor-grabbing"
        onPointerDown={handleCommonPointerDown}
        onPointerMove={handleCommonPointerMove}
        onPointerUp={handleCommonPointerUp}
        onPointerCancel={handleCommonPointerUp}
      >
        <span>공통 제어</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCompareHeaderCollapsed(prev => !prev);
          }}
          className="rounded-md p-1 hover:bg-slate-100"
          aria-label="공통 패널 접기/펼치기"
        >
          <svg className={`h-4 w-4 transition-transform ${compareHeaderCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <div className={`${compareHeaderCollapsed ? 'px-2 py-2' : 'p-3'} text-[10px] font-black`}>
        {compareHeaderCollapsed ? (
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase text-slate-400">배율</span>
            <button onClick={() => adjustCompareZoom(-0.1)} className="w-6 h-6 rounded-lg bg-slate-100">-</button>
            <span className="min-w-[40px] text-center text-[9px]">{Math.round(compareZoomLevel * 100)}%</span>
            <button onClick={() => adjustCompareZoom(0.1)} className="w-6 h-6 rounded-lg bg-slate-100">+</button>
            <button onClick={resetCompareView} className="ml-auto rounded-md bg-slate-800 px-2 py-1 text-[9px] text-white">초기화</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="uppercase text-slate-400">조작 모드</span>
              <div className="flex items-center gap-2">
                {!compareModeSynced && <span className="text-[9px] text-slate-400">개별</span>}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setCompareInteractionMode({ left: 'move', right: 'move' })}
                    className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${compareModeCommon === 'move' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                  >
                    이동
                  </button>
                  <button
                    onClick={() => setCompareInteractionMode({ left: 'rotate', right: 'rotate' })}
                    className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${compareModeCommon === 'rotate' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                  >
                    각도
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="uppercase text-slate-400">공통 배율</span>
              <button onClick={() => adjustCompareZoom(-0.1)} className="w-7 h-7 rounded-lg bg-slate-100">-</button>
              <span className="min-w-[48px] text-center">{Math.round(compareZoomLevel * 100)}%</span>
              <button onClick={() => adjustCompareZoom(0.1)} className="w-7 h-7 rounded-lg bg-slate-100">+</button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="uppercase text-slate-400">공통 접기</span>
              <input
                type="range"
                min="0"
                max="100"
                value={compareFoldCommon}
                disabled={!compareFoldSynced}
                onChange={e => {
                  const next = Number(e.target.value);
                  setCompareFoldLeft(next);
                  setCompareFoldRight(next);
                }}
                className={`h-1.5 w-28 rounded-lg bg-slate-100 accent-blue-600 ${compareFoldSynced ? '' : 'opacity-40'}`}
              />
              <span className="min-w-[40px] text-right text-[9px] text-slate-500">
                {compareFoldSynced ? `${compareFoldCommon}%` : '개별'}
              </span>
            </div>
            <button onClick={resetCompareView} className="mt-3 rounded-lg bg-slate-800 px-3 py-1 text-white">
              초기화
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans select-none transition-all duration-700 bg-slate-100 text-slate-900">
      <header className="flex-none border-b px-4 py-3 shadow-sm z-40 flex items-center justify-between transition-all duration-500 bg-white border-slate-200">
        <div className="flex items-center gap-3">
          {activeTab === 'single' && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>{isSidebarOpen ? '목록 닫기' : '목록 열기'}</span>
              <svg className={`w-4 h-4 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
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
            {/*
            <div className="w-[1px] h-4 bg-slate-300 my-auto mx-1" />
            <button
              onClick={() => { setActiveTab('single'); setMode('cube3d'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'single' && mode === 'cube3d' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200' : 'text-indigo-400 opacity-80'}`}
            >
              정육면체(3D)
            </button>
            <button
              onClick={() => { setActiveTab('single'); setMode('cuboid3d'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'single' && mode === 'cuboid3d' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200' : 'text-indigo-400 opacity-80'}`}
            >
              직육면체(3D)
            </button>
            <div className="w-[1px] h-4 bg-slate-300 my-auto mx-1" />
           */}
            <button
              onClick={() => { setActiveTab('single'); setMode('prism'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'single' && mode === 'prism' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              각기둥
            </button>
            <button
              onClick={() => { setActiveTab('single'); setMode('pyramid'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'single' && mode === 'pyramid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              각뿔
            </button>
            <button
              onClick={() => { setActiveTab('single'); setMode('cylinder'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'single' && mode === 'cylinder' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              원기둥
            </button>

            <button
              onClick={() => { setActiveTab('single'); setMode('circle'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'single' && mode === 'circle' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              원
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'compare' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              비교모드(직육면체)
            </button>
          </div>
        </div>
      </header>

      <div ref={layoutRef} className="flex-1 overflow-hidden flex flex-row relative">
        {activeTab === 'single' && (selectedNet || mode === 'cylinder' || mode === 'circle') && (
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
            className={`tool-panel fixed z-[60] flex flex-col rounded-2xl shadow-2xl border bg-white/95 backdrop-blur-xl border-slate-100 ${isDragging || isResizing ? '' : 'transition-all duration-300'}`}>
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
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase">조작 모드</span>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button onClick={() => setActiveTool('move')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTool === 'move' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>이동</button>
                    <button onClick={() => setActiveTool('rotate')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTool === 'rotate' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>각도</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase">배율</span>
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                    <button onClick={() => adjustZoom(-0.1)} className="w-8 h-8 font-bold">-</button>
                    <div className="flex-1 text-center text-[10px] font-black">{Math.round(zoomLevel * 100)}%</div>
                    <button onClick={() => adjustZoom(0.1)} className="w-8 h-8 font-bold">+</button>
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

                {/* 각기둥 설정 */}
                {mode === 'prism' && (
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold block uppercase text-slate-500">각기둥 종류</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[3, 4, 5, 6].map(n => (
                        <button key={n} onClick={() => { setPrismSides(n); setPrismSubtype('regular'); }}
                          className={`py-2 rounded-lg text-[10px] font-black transition-all ${prismSides === n ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >{['삼', '사', '오', '육'][n - 3]}각기둥</button>
                      ))}
                    </div>
                    {prismSides === 3 && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                        <span className="text-[9px] font-bold text-slate-400">삼각형 밑면 세부 모양</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => setPrismSubtype('regular')} className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold border ${prismSubtype === 'regular' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}>정삼각형</button>
                          <button onClick={() => setPrismSubtype('right')} className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold border ${prismSubtype === 'right' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}>직각삼각형</button>
                          <button onClick={() => setPrismSubtype('iso')} className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold border ${prismSubtype === 'iso' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}>이등변삼각형</button>
                        </div>
                      </div>
                    )}
                    {prismSides === 4 && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                        <span className="text-[9px] font-bold text-slate-400">사각형 밑면 세부 모양</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => setPrismSubtype('regular')} className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold border ${prismSubtype === 'regular' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}>정사각형</button>
                          <button onClick={() => setPrismSubtype('rect')} className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold border ${prismSubtype === 'rect' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}>직사각형</button>
                        </div>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                      <div className="text-center mb-3">
                        <span className="text-lg font-black text-blue-700">{['삼', '사', '오', '육'][prismSides - 3]}각기둥</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                          <div className="text-[9px] font-bold text-slate-400">꼭짓점</div>
                          <div className="text-xl font-black text-blue-600">{prismSides * 2}</div>
                        </div>
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                          <div className="text-[9px] font-bold text-slate-400">모서리</div>
                          <div className="text-xl font-black text-emerald-600">{prismSides * 3}</div>
                        </div>
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                          <div className="text-[9px] font-bold text-slate-400">면</div>
                          <div className="text-xl font-black text-amber-600">{prismSides + 2}</div>
                        </div>
                      </div>
                    </div>
                    {/* 귀납적 탐구: 비교표 */}
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-[10px] text-center border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-bottom border-slate-200">
                            <th className="py-2 border-r border-slate-200 text-slate-500 font-bold">이름</th>
                            <th className="py-2 border-r border-slate-200 text-blue-600 font-bold">꼭짓점(2n)</th>
                            <th className="py-2 border-r border-slate-200 text-emerald-600 font-bold">모서리(3n)</th>
                            <th className="py-2 text-amber-600 font-bold">면(n+2)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[3, 4, 5, 6].map(n => (
                            <tr key={n} className={`border-t border-slate-100 ${prismSides === n ? 'bg-blue-50/50' : ''}`}>
                              <td className="py-2 border-r border-slate-200 font-black text-slate-700">{['삼', '사', '오', '육'][n - 3]}각기둥</td>
                              <td className={`py-2 border-r border-slate-200 ${prismSides === n ? 'font-black scale-110' : ''}`}>{n * 2}</td>
                              <td className={`py-2 border-r border-slate-200 ${prismSides === n ? 'font-black scale-110' : ''}`}>{n * 3}</td>
                              <td className={`py-2 ${prismSides === n ? 'font-black scale-110' : ''}`}>{n + 2}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-slate-50 p-2 text-center text-[9px] font-bold text-slate-600 border-t border-slate-200">
                        한 밑면의 변의 수(n)에 따른 규칙을 찾아보세요!
                      </div>
                    </div>
                  </div>
                )}

                {/* 각뿔 설정 */}
                {mode === 'pyramid' && (
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold block uppercase text-slate-500">각뿔 종류</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[3, 4, 5, 6].map(n => (
                        <button key={n} onClick={() => { setPyramidSides(n); setPyramidSubtype('regular'); }}
                          className={`py-2 rounded-lg text-[10px] font-black transition-all ${pyramidSides === n ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >{['삼', '사', '오', '육'][n - 3]}각뿔</button>
                      ))}
                    </div>
                    {pyramidSides === 3 && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                        <span className="text-[9px] font-bold text-slate-400">삼각형 밑면 세부 모양</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => setPyramidSubtype('regular')} className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold border ${pyramidSubtype === 'regular' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-slate-200 text-slate-500'}`}>정삼각형</button>
                          <button onClick={() => setPyramidSubtype('right')} className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold border ${pyramidSubtype === 'right' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-slate-200 text-slate-500'}`}>직각삼각형</button>
                        </div>
                      </div>
                    )}
                    {pyramidSides === 4 && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                        <span className="text-[9px] font-bold text-slate-400">사각형 밑면 세부 모양</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => setPyramidSubtype('regular')} className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold border ${pyramidSubtype === 'regular' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-slate-200 text-slate-500'}`}>정사각형</button>
                          <button onClick={() => setPyramidSubtype('rect')} className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold border ${pyramidSubtype === 'rect' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-slate-200 text-slate-500'}`}>직사각형</button>
                        </div>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                      <div className="text-center mb-3">
                        <span className="text-lg font-black text-purple-700">{['삼', '사', '오', '육'][pyramidSides - 3]}각뿔</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                          <div className="text-[9px] font-bold text-slate-400">꼭짓점</div>
                          <div className="text-xl font-black text-purple-600">{pyramidSides + 1}</div>
                        </div>
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                          <div className="text-[9px] font-bold text-slate-400">모서리</div>
                          <div className="text-xl font-black text-emerald-600">{pyramidSides * 2}</div>
                        </div>
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                          <div className="text-[9px] font-bold text-slate-400">면</div>
                          <div className="text-xl font-black text-amber-600">{pyramidSides + 1}</div>
                        </div>
                      </div>
                    </div>
                    {/* 귀납적 탐구: 비교표 */}
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-[10px] text-center border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-bottom border-slate-200">
                            <th className="py-2 border-r border-slate-200 text-slate-500 font-bold">이름</th>
                            <th className="py-2 border-r border-slate-200 text-purple-600 font-bold">꼭짓점(n+1)</th>
                            <th className="py-2 border-r border-slate-200 text-emerald-600 font-bold">모서리(2n)</th>
                            <th className="py-2 text-amber-600 font-bold">면(n+1)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[3, 4, 5, 6].map(n => (
                            <tr key={n} className={`border-t border-slate-100 ${pyramidSides === n ? 'bg-purple-50/50' : ''}`}>
                              <td className="py-2 border-r border-slate-200 font-black text-slate-700">{['삼', '사', '오', '육'][n - 3]}각뿔</td>
                              <td className={`py-2 border-r border-slate-200 ${pyramidSides === n ? 'font-black scale-110' : ''}`}>{n + 1}</td>
                              <td className={`py-2 border-r border-slate-200 ${pyramidSides === n ? 'font-black scale-110' : ''}`}>{n * 2}</td>
                              <td className={`py-2 ${pyramidSides === n ? 'font-black scale-110' : ''}`}>{n + 1}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-slate-50 p-2 text-center text-[9px] font-bold text-slate-600 border-t border-slate-200">
                        한 밑면의 변의 수(n)에 따른 규칙을 찾아보세요!
                      </div>
                    </div>
                  </div>
                )}

                {/* 원기둥 크기 및 원주 분할 설정 */}
                {mode === 'cylinder' && (
                  <div className="space-y-4 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold block uppercase text-slate-500">원기둥 상세 설정</span>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-100 rounded-xl px-3 py-2 flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400">반지름(r)</span>
                        <div className="flex items-center gap-2 mt-1 w-full justify-between">
                          <button onClick={() => setCylinderRadius(prev => Math.max(1, prev - 1))} className="w-5 h-5 bg-white rounded-md shadow-sm text-slate-600 font-bold leading-none">-</button>
                          <span className="font-black text-slate-700">{cylinderRadius}</span>
                          <button onClick={() => setCylinderRadius(prev => Math.min(6, prev + 1))} className="w-5 h-5 bg-white rounded-md shadow-sm text-slate-600 font-bold leading-none">+</button>
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-xl px-3 py-2 flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400">높이(h)</span>
                        <div className="flex items-center gap-2 mt-1 w-full justify-between">
                          <button onClick={() => setCylinderHeight(prev => Math.max(2, prev - 1))} className="w-5 h-5 bg-white rounded-md shadow-sm text-slate-600 font-bold leading-none">-</button>
                          <span className="font-black text-slate-700">{cylinderHeight}</span>
                          <button onClick={() => setCylinderHeight(prev => Math.min(10, prev + 1))} className="w-5 h-5 bg-white rounded-md shadow-sm text-slate-600 font-bold leading-none">+</button>
                        </div>
                      </div>
                    </div>
                    {/* 원 분할 및 직사각형 변환 */}
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => setShowCylinderSegments(!showCylinderSegments)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${showCylinderSegments ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          🔪 원 분할선
                        </button>
                        <button
                          onClick={() => setHighlightPerimeter(!highlightPerimeter)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${highlightPerimeter ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          맞닿는 선
                        </button>
                      </div>

                      {/* 원 분할선이 켜졌을 때 게이지 + 분할수 표시 + 직사각형 버튼 */}
                      {showCylinderSegments && (
                        <div className="space-y-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-3 border border-orange-100">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-orange-700 uppercase">원 분할 게이지</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[16px] font-black text-orange-600">{cylinderSegments}</span>
                              <span className="text-[9px] font-black text-orange-400">조각</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="3"
                            max="72"
                            step="1"
                            value={cylinderSegments}
                            onChange={e => setCylinderSegments(Number(e.target.value))}
                            className="w-full h-2 bg-orange-200 rounded-lg appearance-none accent-orange-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[8px] font-bold text-orange-400">
                            <span>적게 (3)</span>
                            <span>빽빽하게 (72)</span>
                          </div>
                          <div className="text-[9px] text-orange-600 font-bold text-center mt-1">
                            💡 분할을 많이 할수록, 조각들을 모으면 직사각형에 가까워져요!
                          </div>
                          <button
                            onClick={() => setCylinderActionMode(cylinderActionMode === 'rectify' ? 'none' : 'rectify')}
                            className={`w-full py-2 rounded-xl text-[10px] font-black transition-all ${cylinderActionMode === 'rectify' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'}`}
                          >
                            {cylinderActionMode === 'rectify' ? '📐 직사각형 보기 켜짐' : '📐 조각 → 직사각형으로 펼치기'}
                          </button>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-200">
                        <span className="text-[10px] font-bold block uppercase text-slate-500">도형 학습 도구</span>
                        <div className="flex gap-2">
                          <button onClick={() => setCylinderActionMode(cylinderActionMode === 'surface' ? 'none' : 'surface')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${cylinderActionMode === 'surface' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            겉넓이 합산
                          </button>
                          <button onClick={() => setCylinderActionMode(cylinderActionMode === 'volume' ? 'none' : 'volume')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${cylinderActionMode === 'volume' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            부피 물채우기
                          </button>
                          <button onClick={() => setCylinderActionMode(cylinderActionMode === 'section' ? 'none' : 'section')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${cylinderActionMode === 'section' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            단면 자르기
                          </button>
                        </div>
                        {cylinderActionMode === 'section' && (
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => setCylinderSectionType('horizontal')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${cylinderSectionType === 'horizontal' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>수평 단면</button>
                            <button onClick={() => setCylinderSectionType('vertical')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${cylinderSectionType === 'vertical' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>수직 단면</button>
                            <button onClick={() => setCylinderSectionType('diagonal')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${cylinderSectionType === 'diagonal' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>비스듬히</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 표기 방식 토글 */}
                    <div className="pt-3 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => setUsePiSymbol(!usePiSymbol)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${usePiSymbol ? 'bg-violet-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {usePiSymbol ? 'π 표기 ✓' : '3.14 → π'}
                      </button>
                      <button
                        onClick={() => setUseSymbolNotation(!useSymbolNotation)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${useSymbolNotation ? 'bg-teal-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {useSymbolNotation ? 'r/h 표기 ✓' : '반지름 → r'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 원 설정 */}
                {mode === 'circle' && (
                  <div className="space-y-4 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold block uppercase text-slate-500">원 상세 설정</span>
                    <div className="flex bg-slate-100 rounded-xl px-3 py-2 flex-col items-center">
                      <span className="text-[9px] font-black text-slate-400">반지름(r)</span>
                      <div className="flex items-center gap-2 mt-1 w-full justify-between">
                        <button onClick={() => setCircleRadius(prev => Math.max(1, prev - 1))} className="w-5 h-5 bg-white rounded-md shadow-sm text-slate-600 font-bold leading-none">-</button>
                        <span className="font-black text-slate-700">{circleRadius}</span>
                        <button onClick={() => setCircleRadius(prev => Math.min(6, prev + 1))} className="w-5 h-5 bg-white rounded-md shadow-sm text-slate-600 font-bold leading-none">+</button>
                      </div>
                    </div>
                    {/* 원 분할 조각 수 조절 UI */}
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      <span className="text-[10px] font-bold block uppercase text-slate-500">도형 학습 도구</span>
                      <div className="flex flex-col gap-2 mb-2">
                        <button
                          onClick={() => setCircleDisplayMode(circleDisplayMode === 'split' ? 'none' : 'split')}
                          className={`w-full py-2 rounded-lg text-[10px] font-black transition-all ${circleDisplayMode === 'split' ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          피자처럼 넓이 쪼개기 증명
                        </button>
                        <button
                          onClick={() => setCircleDisplayMode(circleDisplayMode === 'roll' ? 'none' : 'roll')}
                          className={`w-full py-2 rounded-lg text-[10px] font-black transition-all ${circleDisplayMode === 'roll' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          원주(원의 둘레) 굴리기 증명
                        </button>
                      </div>

                      {circleDisplayMode === 'split' && (
                        <div className="space-y-1 mt-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[9px] font-black text-slate-500">원주 조각내기 설정</span>
                            <span className="text-[9px] font-black text-blue-600">{circleSegments}조각</span>
                          </div>
                          <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-2 px-3">
                            <input
                              type="range"
                              min="4"
                              max="160"
                              step="4"
                              value={circleSegments}
                              onChange={e => setCircleSegments(Number(e.target.value))}
                              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none accent-blue-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* π 표기 방식 토글 */}
                    <div className="pt-3 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => setUsePiSymbol(!usePiSymbol)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${usePiSymbol ? 'bg-violet-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {usePiSymbol ? 'π 표기 ✓' : '3.14 → π'}
                      </button>
                      <button
                        onClick={() => setUseSymbolNotation(!useSymbolNotation)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${useSymbolNotation ? 'bg-teal-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {useSymbolNotation ? 'r/h 표기 ✓' : '반지름 → r'}
                      </button>
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

                {/* 모눈종이 진하기 조절 */}
                {showGrid && (
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-slate-500">모눈종이 눈금</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={gridOpacity}
                      onChange={e => setGridOpacity(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-slate-600"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-slate-400">
                      <span>연하게</span>
                      <span>진하게</span>
                    </div>
                  </div>
                )}

                {/* 주사위 설정 (정육면체만) */}
                {(mode === 'cube' || mode === 'cube3d') && (
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold block uppercase text-slate-500">주사위 눈 (합=7)</span>
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                      <button onClick={() => setDiceStyle('none')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${diceStyle === 'none' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>없음</button>
                      <button onClick={() => setDiceStyle('number')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${diceStyle === 'number' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>숫자</button>
                      <button onClick={() => setDiceStyle('dot')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${diceStyle === 'dot' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>눈</button>
                    </div>
                  </div>
                )}

                {/* 평행한 면 강조 (육면체 계열만) */}
                {(mode === 'cube' || mode === 'cuboid' || mode === 'cube3d' || mode === 'cuboid3d') && (
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold block uppercase text-slate-500">평행한 면 (같은 색칠)</span>
                    <div className="flex gap-2">
                      {[0, 1, 2].map(id => (
                        <button key={id} onClick={() => togglePair(id)} className={`flex-1 py-2 rounded-xl font-black text-[10px] border-2 transition-all ${activePairs.has(id) ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}>쌍 {id + 1}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 도형 분석 (모서리, 넓이) */}
                {(mode !== 'circle' && mode !== 'cylinder') && (
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold block uppercase text-slate-500">도형 분석</span>

                    {/* 모눈종이 기본 단위 설정 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap min-w-[3.5rem]">1눈금 단위</span>
                      <div className="flex items-center p-1 bg-slate-100 rounded-xl flex-1">
                        <button onClick={() => setGridUnitValue(prev => Math.max(1, prev - 1))} className="w-6 h-6 font-bold text-slate-600 flex items-center justify-center">-</button>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={gridUnitValue}
                          onChange={e => setGridUnitValue(Math.max(1, Number(e.target.value)))}
                          className="flex-1 text-center text-[11px] font-black bg-transparent outline-none w-full"
                        />
                        <button onClick={() => setGridUnitValue(prev => prev + 1)} className="w-6 h-6 font-bold text-slate-600 flex items-center justify-center">+</button>
                      </div>
                      <select
                        value={gridUnitType}
                        onChange={e => setGridUnitType(e.target.value)}
                        className="px-2 py-1.5 bg-slate-100 rounded-xl text-[11px] font-black text-slate-700 outline-none cursor-pointer border-r-[4px] border-r-transparent"
                      >
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="m">m</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setShowEdgeMatches(!showEdgeMatches)} className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all border-2 ${showEdgeMatches ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-100 hover:border-green-200'}`}>
                        모서리 매칭
                      </button>
                      <button onClick={() => setShowArea(!showArea)} className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all border-2 ${showArea ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-100 hover:border-blue-200'}`}>
                        겉넓이 보기
                      </button>
                      <button onClick={() => setShowBasePerimeter(!showBasePerimeter)} className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all border-2 ${showBasePerimeter ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-100 hover:border-amber-200'}`}>
                        밑면 둘레 증명
                      </button>
                    </div>
                  </div>
                )}

                {/* 색칠 도구 */}
                {(mode !== 'circle' && mode !== 'cylinder') && (
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold block uppercase text-slate-500">색칠하기</span>
                    <div className="flex flex-wrap gap-2">
                      {PAINT_PALETTE.map(color => (
                        <button key={color} onClick={() => setSelectedPaintColor(selectedPaintColor === color ? null : color)} className={`w-8 h-8 rounded-full border-2 ${selectedPaintColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 관찰 시점 (2D 기반에서만 표시) */}
                {(mode !== 'cube3d' && mode !== 'cuboid3d') && (
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold block uppercase text-slate-500">관찰 시점</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setQuickView('front')} className="py-2 text-[10px] font-black rounded-xl border bg-slate-50">앞면</button>
                      <button onClick={() => setQuickView('top')} className="py-2 text-[10px] font-black rounded-xl border bg-slate-50">윗면</button>
                      <button onClick={() => setQuickView('side')} className="py-2 text-[10px] font-black rounded-xl border bg-slate-50">옆면</button>
                      <button onClick={() => setQuickView('iso')} className="py-2 text-[10px] font-black rounded-xl border bg-blue-50 text-blue-600">입체</button>
                    </div>
                  </div>
                )}
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
          <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-10 min-h-0 bg-slate-50">
            {activeTab === 'single' ? (
              (mode === 'cube3d' || mode === 'cuboid3d') && selectedNet ? (
                <div className="flex-1 flex flex-col rounded-[3rem] overflow-hidden relative border-4 bg-white border-slate-200 shadow-xl">
                  <div ref={workspaceRef} className="flex-1 flex items-center justify-center relative overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing">
                    <NetCanvas3D
                      net={selectedNet}
                      scale={computedScale}
                      foldProgress={foldProgress}
                      transparency={transparency}
                      activeParallelPairs={activePairs}
                      showGrid={showGrid}
                      faceColors={faceColors}
                      diceStyle={diceStyle}
                      showEdgeMatches={showEdgeMatches}
                      showArea={showArea}
                      gridUnitValue={gridUnitValue}
                      gridUnitType={gridUnitType}
                    />
                  </div>
                </div>
              ) : selectedNet ? (
                <div className="flex-1 flex flex-col rounded-[3rem] overflow-hidden relative border-4 bg-white border-slate-200 shadow-xl">
                  <div ref={workspaceRef} onMouseDown={handleCanvasDown} onTouchStart={handleCanvasDown}
                    className={`flex-1 flex items-center justify-center relative overflow-hidden touch-none ${isCanvasInteracting ? (interactionMode === 'rotate' ? 'cursor-grabbing' : 'cursor-move') : (activeTool === 'move' ? 'cursor-move' : (selectedPaintColor ? 'cursor-copy' : 'cursor-grab'))}`}>
                    <NetCanvas net={selectedNet} scale={computedScale} interactive={true} foldProgress={foldProgress} transparency={transparency} activeParallelPairs={activePairs} showGrid={showGrid} gridOpacity={gridOpacity} rotation={viewRotation} panOffset={panOffset} canvasSize={workspaceSize} isAnimatingRotation={isAnimatingRotation} isRotating={isCanvasInteracting && interactionMode === 'rotate'} faceColors={faceColors} onFaceClick={handleFaceClick} isPaintingMode={!!selectedPaintColor} showEdgeMatches={showEdgeMatches} diceStyle={diceStyle} animationDuration={animDuration} showArea={showArea} showBasePerimeter={showBasePerimeter} basePerimeterFaceId={basePerimeterFaceId} gridUnitValue={gridUnitValue} gridUnitType={gridUnitType} />
                  </div>
                </div>
              ) : mode === 'cylinder' ? (
                <div className="flex-1 flex flex-col rounded-[3rem] overflow-hidden relative border-4 bg-white border-slate-200 shadow-xl">
                  <div ref={workspaceRef} onMouseDown={handleCanvasDown} onTouchStart={handleCanvasDown}
                    className={`flex-1 flex items-center justify-center relative overflow-hidden touch-none ${isCanvasInteracting ? (interactionMode === 'rotate' ? 'cursor-grabbing' : 'cursor-move') : (activeTool === 'move' ? 'cursor-move' : 'cursor-grab')}`}>
                    <CylinderCanvas
                      radius={cylinderRadius}
                      height={cylinderHeight}
                      scale={computedScale}
                      foldProgress={foldProgress}
                      transparency={transparency}
                      showGrid={showGrid}
                      gridOpacity={gridOpacity}
                      rotation={viewRotation}
                      panOffset={panOffset}
                      canvasSize={workspaceSize}
                      isAnimatingRotation={isAnimatingRotation}
                      isRotating={isCanvasInteracting && interactionMode === 'rotate'}
                      animationDuration={animDuration}
                      gridUnitValue={gridUnitValue}
                      gridUnitType={gridUnitType}
                      segments={cylinderSegments}
                      showSegments={showCylinderSegments}
                      highlightPerimeter={highlightPerimeter}
                      actionMode={cylinderActionMode}
                      sectionType={cylinderSectionType}
                      usePiSymbol={usePiSymbol}
                      useSymbolNotation={useSymbolNotation}
                    />
                  </div>
                </div>
              ) : mode === 'circle' ? (
                <div className="flex-1 flex flex-col rounded-[3rem] overflow-hidden relative border-4 bg-white border-slate-200 shadow-xl">
                  <div ref={workspaceRef} className="flex-1 flex items-center justify-center relative overflow-hidden touch-none">
                    <CircleCanvas
                      radius={circleRadius}
                      segments={circleSegments}
                      foldProgress={circleDisplayMode !== 'none' ? foldProgress : 0}
                      scale={computedScale}
                      transparency={transparency}
                      showGrid={showGrid}
                      gridOpacity={gridOpacity}
                      canvasSize={workspaceSize}
                      displayMode={circleDisplayMode}
                      usePiSymbol={usePiSymbol}
                      useSymbolNotation={useSymbolNotation}
                    />
                  </div>
                </div>
              ) : (mode === 'prism' || mode === 'pyramid') ? (
                <div className="flex-1 flex flex-col rounded-[3rem] overflow-hidden relative border-4 bg-white border-slate-200 shadow-xl">
                  {/* 중앙 캔버스 플로팅 컨트롤 */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none">
                    {/* 밑면 다각형 선택 */}
                    <div className="flex bg-slate-800/80 backdrop-blur-md rounded-2xl p-1 shadow-lg pointer-events-auto border border-slate-700/50">
                      {[3, 4, 5, 6].map(n => (
                        <button key={n}
                          onClick={() => {
                            if (mode === 'prism') { setPrismSides(n); setPrismSubtype('regular'); }
                            else { setPyramidSides(n); setPyramidSubtype('regular'); }
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${(mode === 'prism' ? prismSides === n : pyramidSides === n) ? (mode === 'prism' ? 'bg-blue-500 text-white shadow-md' : 'bg-purple-500 text-white shadow-md') : 'text-slate-200 hover:bg-slate-700 hover:text-white'}`}
                        >
                          {['삼', '사', '오', '육'][n - 3]}각{mode === 'prism' ? '기둥' : '뿔'}
                        </button>
                      ))}
                    </div>

                    {/* 세부 모양 선택 (삼/사각일 때만) */}
                    {((mode === 'prism' && prismSides === 3) || (mode === 'pyramid' && pyramidSides === 3)) && (
                      <div className="flex gap-1 p-1 bg-white/95 backdrop-blur-md rounded-xl shadow-lg pointer-events-auto border border-slate-200 animate-in fade-in slide-in-from-top-2">
                        <span className="flex items-center px-3 text-[11px] font-black text-slate-500">삼각형 모양</span>
                        <div className="w-[1px] h-6 bg-slate-200 my-auto mx-1" />
                        <button onClick={() => mode === 'prism' ? setPrismSubtype('regular') : setPyramidSubtype('regular')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${(mode === 'prism' ? prismSubtype : pyramidSubtype) === 'regular' ? 'bg-slate-800 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}>정삼각형</button>
                        <button onClick={() => mode === 'prism' ? setPrismSubtype('right') : setPyramidSubtype('right')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${(mode === 'prism' ? prismSubtype : pyramidSubtype) === 'right' ? 'bg-rose-500 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}>직각삼각형</button>
                        {mode === 'prism' && <button onClick={() => setPrismSubtype('iso')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${prismSubtype === 'iso' ? 'bg-amber-500 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}>이등변삼각형</button>}
                      </div>
                    )}

                    {((mode === 'prism' && prismSides === 4) || (mode === 'pyramid' && pyramidSides === 4)) && (
                      <div className="flex gap-1 p-1 bg-white/95 backdrop-blur-md rounded-xl shadow-lg pointer-events-auto border border-slate-200 animate-in fade-in slide-in-from-top-2">
                        <span className="flex items-center px-3 text-[11px] font-black text-slate-500">사각형 모양</span>
                        <div className="w-[1px] h-6 bg-slate-200 my-auto mx-1" />
                        <button onClick={() => mode === 'prism' ? setPrismSubtype('regular') : setPyramidSubtype('regular')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${(mode === 'prism' ? prismSubtype : pyramidSubtype) === 'regular' ? 'bg-slate-800 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}>정사각형</button>
                        <button onClick={() => mode === 'prism' ? setPrismSubtype('rect') : setPyramidSubtype('rect')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${(mode === 'prism' ? prismSubtype : pyramidSubtype) === 'rect' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}>직사각형</button>
                      </div>
                    )}
                  </div>
                  <div ref={workspaceRef} className="flex-1 flex items-center justify-center relative overflow-hidden">
                    {mode === 'prism' && (() => {
                      const n = prismSides;
                      const names = ['삼', '사', '오', '육'];
                      const cW = workspaceSize.width || 600;
                      const cH = workspaceSize.height || 500;
                      const cx = cW / 2;
                      const cy = cH / 2;
                      const R = Math.min(cW, cH) * 0.18;
                      const depthX = R * 0.7;
                      const depthY = R * 0.55;

                      // 밑면(앞면) 꼭짓점 계산
                      let frontBase: { x: number, y: number }[] = [];
                      if (n === 3 && prismSubtype === 'right') {
                        frontBase = [
                          { x: cx - R, y: cy + R * 0.5 },
                          { x: cx + R * 0.6, y: cy + R * 0.5 },
                          { x: cx - R, y: cy - R * 0.8 }
                        ];
                      } else if (n === 3 && prismSubtype === 'iso') {
                        frontBase = [
                          { x: cx - R * 0.9, y: cy + R * 0.5 },
                          { x: cx + R * 0.9, y: cy + R * 0.5 },
                          { x: cx, y: cy - R * 0.8 }
                        ];
                      } else if (n === 4 && prismSubtype === 'rect') {
                        frontBase = [
                          { x: cx - R * 1.2, y: cy + R * 0.5 },
                          { x: cx + R * 1.2, y: cy + R * 0.5 },
                          { x: cx + R * 1.2, y: cy - R * 0.5 },
                          { x: cx - R * 1.2, y: cy - R * 0.5 }
                        ];
                      } else {
                        frontBase = Array.from({ length: n }, (_, i) => {
                          const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
                          return { x: cx - depthX * 0.4 + R * Math.cos(angle), y: cy + depthY * 0.3 + R * Math.sin(angle) };
                        });
                      }
                      // 윗면(뒷면) 꼭짓점
                      const backTop = frontBase.map(p => ({ x: p.x + depthX, y: p.y - depthY }));

                      // 옆면 채우기 (각 옆면을 사각형으로)
                      const sideFaceColors = [
                        'rgba(251, 146, 60, 0.15)', 'rgba(52, 211, 153, 0.15)',
                        'rgba(129, 140, 248, 0.15)', 'rgba(251, 191, 36, 0.15)',
                        'rgba(244, 114, 182, 0.15)', 'rgba(34, 211, 238, 0.15)'
                      ];

                      // 각기둥 가려짐(점선) 판단
                      const isBackBaseEdge = (i: number) => {
                        if (n === 3 && prismSubtype === 'right') return i === 0 || i === 2;
                        if (n === 3 && prismSubtype === 'iso') return i === 0 || i === 2;
                        if (n === 4 && prismSubtype === 'rect') return i === 0 || i === 3;
                        const mx = (backTop[i].x + backTop[(i + 1) % n].x) / 2;
                        const my = (backTop[i].y + backTop[(i + 1) % n].y) / 2;
                        return mx < cx + R * 0.2 && my > cy - R * 0.2;
                      };

                      // 옆면 높이 모서리 점선 판단 (기둥)
                      const isBackSideEdge = (i: number) => {
                        if (n === 3 && prismSubtype === 'right') return i === 0;
                        if (n === 3 && prismSubtype === 'iso') return i === 0;
                        if (n === 4 && prismSubtype === 'rect') return i === 0;
                        return frontBase[i].x < cx && frontBase[i].y > cy;
                      };

                      // 물 채우기 연산
                      const waterProg = foldProgress / 100;
                      const waterTop = frontBase.map(p => ({ x: p.x + depthX * waterProg, y: p.y - depthY * waterProg }));

                      return (
                        <svg width={cW} height={cH} className="absolute inset-0">
                          {/* 옆면 채우기 */}
                          {frontBase.map((bp, i) => {
                            const ni = (i + 1) % n;
                            const pts = `${bp.x},${bp.y} ${frontBase[ni].x},${frontBase[ni].y} ${backTop[ni].x},${backTop[ni].y} ${backTop[i].x},${backTop[i].y}`;
                            return <polygon key={`sf-${i}`} points={pts} fill={sideFaceColors[i % 6]} stroke="none" />;
                          })}
                          {/* 밑면 */}
                          <polygon points={frontBase.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(59,130,246,0.12)" stroke="#334155" strokeWidth="2.5" />
                          {/* 윗면 */}
                          <polygon points={backTop.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(59,130,246,0.2)" stroke="#334155" strokeWidth="2.5" />

                          {/* 물 채우기 채색 */}
                          {waterProg > 0 && (
                            <g>
                              {frontBase.map((bp, i) => {
                                const ni = (i + 1) % n;
                                const pts = `${bp.x},${bp.y} ${frontBase[ni].x},${frontBase[ni].y} ${waterTop[ni].x},${waterTop[ni].y} ${waterTop[i].x},${waterTop[i].y}`;
                                return <polygon key={`water-side-${i}`} points={pts} fill="rgba(59, 130, 246, 0.4)" stroke="none" />;
                              })}
                              <polygon points={waterTop.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(59, 130, 246, 0.6)" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="1" />
                            </g>
                          )}

                          {/* 물 부피 공식 오버레이 (Prism) */}
                          {waterProg > 0 && (
                            <foreignObject x={cx - 150} y={Math.max(20, cy - 140 - 50 * waterProg)} width="300" height="80" className="pointer-events-none overflow-visible">
                              <div className="flex flex-col items-center justify-center bg-white/95 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border border-blue-200">
                                <span className="text-[11px] font-bold text-slate-500 mb-1">각기둥의 부피 = 밑넓이 × 높이</span>
                                <span className="text-xl font-black text-blue-600">물려 채워진 높이: {Math.round(waterProg * 100)}%</span>
                              </div>
                            </foreignObject>
                          )}

                          {/* 윗면 모서리(앞면)는 모두 무조건 실선 */}
                          {frontBase.map((bp, i) => {
                            const ni = (i + 1) % n;
                            return <line key={`fe-${i}`} x1={bp.x} y1={bp.y} x2={frontBase[ni].x} y2={frontBase[ni].y}
                              stroke="#ef4444" strokeWidth="2.5" />;
                          })}
                          {/* 밑면 모서리(뒷면) 점선 처리 */}
                          {backTop.map((tp, i) => {
                            const ni = (i + 1) % n;
                            return <line key={`be-${i}`} x1={tp.x} y1={tp.y} x2={backTop[ni].x} y2={backTop[ni].y}
                              stroke="#3b82f6" strokeWidth="2.5" strokeDasharray={isBackBaseEdge(i) ? '5 7' : 'none'} />;
                          })}
                          {/* 옆면 높이 기둥 모서리 점선 처리 */}
                          {frontBase.map((bp, i) => (
                            <line key={`se-${i}`} x1={bp.x} y1={bp.y} x2={backTop[i].x} y2={backTop[i].y}
                              stroke="#059669" strokeWidth="2.5"
                              strokeDasharray={isBackSideEdge(i) ? '5 7' : 'none'} />
                          ))}

                          {/* 꼭짓점 + 번호 */}
                          {frontBase.map((p, i) => (
                            <g key={`vb-${i}`}>
                              <circle cx={p.x} cy={p.y} r="7" fill="#ef4444" stroke="white" strokeWidth="2" />
                              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="white">{String.fromCharCode(65 + i)}</text>
                            </g>
                          ))}
                          {backTop.map((p, i) => (
                            <g key={`vt-${i}`}>
                              <circle cx={p.x} cy={p.y} r="7" fill="#3b82f6" stroke="white" strokeWidth="2" />
                              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="white">{String.fromCharCode(65 + i)}'</text>
                            </g>
                          ))}

                          {/* 제목 */}
                          <text x={cx} y={35} textAnchor="middle" fontSize="22" fontWeight="900" fill="#1e293b">
                            {names[n - 3]}각기둥
                          </text>

                          {/* 하단 정보 박스 */}
                          <rect x={cx - 200} y={cH - 75} width="400" height="55" rx="14" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                          <circle cx={cx - 155} cy={cH - 52} r="6" fill="#ef4444" />
                          <text x={cx - 143} y={cH - 47} fontSize="12" fontWeight="bold" fill="#334155">꼭짓점: {n * 2}개</text>
                          <circle cx={cx - 40} cy={cH - 52} r="6" fill="#059669" />
                          <text x={cx - 28} y={cH - 47} fontSize="12" fontWeight="bold" fill="#334155">모서리: {n * 3}개</text>
                          <circle cx={cx + 85} cy={cH - 52} r="6" fill="#d97706" />
                          <text x={cx + 97} y={cH - 47} fontSize="12" fontWeight="bold" fill="#334155">면: {n + 2}개</text>
                          <text x={cx} y={cH - 28} textAnchor="middle" fontSize="10" fill="#94a3b8">
                            밑면 모서리(빨강) {n}개 + 윗면 모서리(파랑) {n}개 + 옆면 모서리(초록) {n}개 = 총 {n * 3}개
                          </text>
                        </svg>
                      );
                    })()}
                    {mode === 'pyramid' && (() => {
                      const n = pyramidSides;
                      const names = ['삼', '사', '오', '육'];
                      const cW = workspaceSize.width || 600;
                      const cH = workspaceSize.height || 500;
                      const cx = cW / 2;
                      const cy = cH / 2;
                      const R = Math.min(cW, cH) * 0.22;

                      // 밑면 꼭짓점 (투영 효과)
                      let basePoints: { x: number, y: number }[] = [];
                      if (n === 3 && pyramidSubtype === 'right') {
                        basePoints = [
                          { x: cx - R, y: cy + R * 0.6 },
                          { x: cx + R, y: cy + R * 0.6 },
                          { x: cx - R, y: cy + R * 0.1 }
                        ];
                      } else if (n === 4 && pyramidSubtype === 'rect') {
                        basePoints = [
                          { x: cx - R * 1.2, y: cy + R * 0.6 },
                          { x: cx + R * 1.2, y: cy + R * 0.6 },
                          { x: cx + R * 1.2, y: cy + R * 0.1 },
                          { x: cx - R * 1.2, y: cy + R * 0.1 }
                        ];
                      } else {
                        basePoints = Array.from({ length: n }, (_, i) => {
                          const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
                          return {
                            x: cx + R * Math.cos(angle) * 1.05,
                            y: cy + R * 0.35 + R * Math.sin(angle) * 0.55
                          };
                        });
                      }
                      const apex = { x: cx + R * 0.1, y: cy - R * 0.85 };

                      // 옆면 채우기
                      const sideFaceColors = [
                        'rgba(251, 146, 60, 0.12)', 'rgba(52, 211, 153, 0.12)',
                        'rgba(129, 140, 248, 0.12)', 'rgba(251, 191, 36, 0.12)',
                        'rgba(244, 114, 182, 0.12)', 'rgba(34, 211, 238, 0.12)'
                      ];

                      // 각뿔 가려짐(점선) 판단
                      const isBackSideEdge = (i: number) => {
                        // 기본적으로 위에서 내려다보는 형태라 옆면 모서리는 대부분 실선
                        if (n === 4 && pyramidSubtype === 'rect') return false;
                        return false;
                      };
                      // 밑면 다각형 모서리
                      const isBackBaseEdge = (i: number) => {
                        if (n === 3 && pyramidSubtype === 'right') return i === 1; // 빗변(뒷면 통과) 점선
                        if (n === 4 && pyramidSubtype === 'rect') return i === 2 || i === 3; // 뒤쪽, 왼쪽 변 점선
                        const mx = (basePoints[i].x + basePoints[(i + 1) % n].x) / 2;
                        const my = (basePoints[i].y + basePoints[(i + 1) % n].y) / 2;
                        return my < cy + R * 0.1 && mx < cx + R * 0.5 && n > 3;
                      };

                      // 물 채우기 연산
                      const waterProg = foldProgress / 100;
                      const waterTop = basePoints.map(p => ({
                        x: p.x + (apex.x - p.x) * waterProg,
                        y: p.y + (apex.y - p.y) * waterProg
                      }));

                      return (
                        <svg width={cW} height={cH} className="absolute inset-0">
                          {/* 옆면 삼각형 채우기 */}
                          {basePoints.map((bp, i) => {
                            const ni = (i + 1) % n;
                            const pts = `${bp.x},${bp.y} ${basePoints[ni].x},${basePoints[ni].y} ${apex.x},${apex.y}`;
                            return <polygon key={`sf-${i}`} points={pts} fill={sideFaceColors[i % 6]} stroke="none" />;
                          })}
                          {/* 밑면 */}
                          <polygon points={basePoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(147,51,234,0.1)" stroke="#334155" strokeWidth="2" />

                          {/* 물 채우기 채색 */}
                          {waterProg > 0 && (
                            <g>
                              {basePoints.map((bp, i) => {
                                const ni = (i + 1) % n;
                                const pts = `${bp.x},${bp.y} ${basePoints[ni].x},${basePoints[ni].y} ${waterTop[ni].x},${waterTop[ni].y} ${waterTop[i].x},${waterTop[i].y}`;
                                return <polygon key={`water-py-side-${i}`} points={pts} fill="rgba(147, 51, 234, 0.4)" stroke="none" />;
                              })}
                              <polygon points={waterTop.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(147, 51, 234, 0.6)" stroke="inherit" strokeWidth="1" />
                            </g>
                          )}

                          {/* 물 부피 공식 오버레이 (Pyramid) */}
                          {waterProg > 0 && (
                            <foreignObject x={cx - 150} y={Math.max(20, cy - 110 - 50 * waterProg)} width="300" height="80" className="pointer-events-none overflow-visible">
                              <div className="flex flex-col items-center justify-center bg-white/95 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border border-purple-200">
                                <span className="text-[11px] font-bold text-slate-500 mb-1">각뿔의 부피 = 밑넓이 × 높이 × ⅓</span>
                                <span className="text-[15px] font-black text-purple-600">위로 갈수록 좁아지는 모양! 💧</span>
                              </div>
                            </foreignObject>
                          )}

                          {/* 밑면 모서리 (빨간) */}
                          {basePoints.map((bp, i) => {
                            const ni = (i + 1) % n;
                            return <line key={`be-${i}`} x1={bp.x} y1={bp.y} x2={basePoints[ni].x} y2={basePoints[ni].y}
                              stroke="#ef4444" strokeWidth="2.5"
                              strokeDasharray={isBackBaseEdge(i) ? '5 7' : 'none'} />;
                          })}
                          {/* 옆면 모서리 (초록) */}
                          {basePoints.map((bp, i) => (
                            <line key={`se-${i}`} x1={bp.x} y1={bp.y} x2={apex.x} y2={apex.y}
                              stroke="#059669" strokeWidth="2.5"
                              strokeDasharray={isBackSideEdge(i) ? '5 7' : 'none'} />
                          ))}

                          {/* 꼭짓점 + 번호 */}
                          {basePoints.map((p, i) => (
                            <g key={`v-${i}`}>
                              <circle cx={p.x} cy={p.y} r="7" fill="#9333ea" stroke="white" strokeWidth="2" />
                              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="white">{String.fromCharCode(65 + i)}</text>
                            </g>
                          ))}
                          <g>
                            <circle cx={apex.x} cy={apex.y} r="9" fill="#dc2626" stroke="white" strokeWidth="2" />
                            <text x={apex.x} y={apex.y + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="white">O</text>
                          </g>
                          <text x={apex.x + 16} y={apex.y + 5} fontSize="11" fontWeight="bold" fill="#dc2626">꼭대기 꼭짓점</text>

                          {/* 제목 */}
                          <text x={cx} y={35} textAnchor="middle" fontSize="22" fontWeight="900" fill="#1e293b">
                            {names[n - 3]}각뿔
                          </text>

                          {/* 하단 정보 박스 */}
                          <rect x={cx - 200} y={cH - 75} width="400" height="55" rx="14" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                          <circle cx={cx - 155} cy={cH - 52} r="6" fill="#9333ea" />
                          <text x={cx - 143} y={cH - 47} fontSize="12" fontWeight="bold" fill="#334155">꼭짓점: {n + 1}개</text>
                          <circle cx={cx - 40} cy={cH - 52} r="6" fill="#059669" />
                          <text x={cx - 28} y={cH - 47} fontSize="12" fontWeight="bold" fill="#334155">모서리: {n * 2}개</text>
                          <circle cx={cx + 85} cy={cH - 52} r="6" fill="#d97706" />
                          <text x={cx + 97} y={cH - 47} fontSize="12" fontWeight="bold" fill="#334155">면: {n + 1}개</text>
                          <text x={cx} y={cH - 28} textAnchor="middle" fontSize="10" fill="#94a3b8">
                            밑면 모서리(빨강) {n}개 + 옆면 모서리(초록) {n}개 = 총 {n * 2}개
                          </text>
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
                  <p className="text-2xl font-black mb-4 text-slate-500">학습할 전개도를 선택하세요</p>
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
                      leftFoldProgress={compareFoldLeft}
                      rightFoldProgress={compareFoldRight}
                      onLeftPanChange={setComparePanLeft}
                      onRightPanChange={setComparePanRight}
                      leftRotation={compareRotation.left}
                      rightRotation={compareRotation.right}
                      onLeftRotationChange={(value) => setCompareRotation(prev => ({ ...prev, left: value }))}
                      onRightRotationChange={(value) => setCompareRotation(prev => ({ ...prev, right: value }))}
                      canvasSize={compareWorkspaceSize}
                      showGrid={showGrid}
                      activeSide={compareActiveSide}
                      onActiveSideChange={setCompareActiveSide}
                      leftMode={compareInteractionMode.left}
                      rightMode={compareInteractionMode.right}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">전개도를 선택하세요</div>
                  )}
                </div>

                {typeof document !== 'undefined' ? createPortal(commonPanel, document.body) : commonPanel}

                {compareLeftNet && (
                  <div
                    ref={compareLeftPanelRef}
                    style={{ left: 0, top: 0, transform: `translate3d(${comparePanelPos.left.x}px, ${comparePanelPos.left.y}px, 0)` }}
                    className={`fixed z-[70] rounded-2xl border bg-white/95 shadow-xl ${compareActiveSide === 'left' ? 'ring-2 ring-red-300' : 'border-red-100'} ${comparePanelCollapsed.left ? 'w-[220px]' : 'w-64'}`}
                    onMouseDown={() => setCompareActiveSide('left')}
                    onTouchStart={() => setCompareActiveSide('left')}
                  >
                    <div
                      onMouseDown={(e) => handleComparePanelDragStart('left', e)}
                      onTouchStart={(e) => handleComparePanelDragStart('left', e)}
                      className={`flex cursor-grab items-center justify-between border-b active:cursor-grabbing ${comparePanelCollapsed.left ? 'px-2 py-0.5' : 'px-3 py-2'}`}
                    >
                      <span className={`${comparePanelCollapsed.left ? 'text-[9px]' : 'text-[10px]'} font-black uppercase text-red-500`}>빨강 전개도</span>
                      <div className="flex items-center gap-2">
                        {!comparePanelCollapsed.left && (
                          <span className="text-[9px] font-bold text-slate-400">좌측</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setComparePanelCollapsed(prev => ({ ...prev, left: !prev.left }));
                          }}
                          className="rounded-md p-1 hover:bg-slate-100"
                          aria-label="왼쪽 패널 접기/펼치기"
                        >
                          <svg className={`h-4 w-4 transition-transform ${comparePanelCollapsed.left ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {comparePanelCollapsed.left ? (
                      <div className="p-1.5 space-y-2">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase">조작 모드</span>
                          <div className="flex p-1 bg-slate-100 rounded-lg">
                            <button
                              onClick={() => setCompareInteractionMode(prev => ({ ...prev, left: 'move' }))}
                              className={`flex-1 py-1 rounded-md text-[9px] font-black transition-all ${compareInteractionMode.left === 'move' ? 'bg-red-500 text-white' : 'text-slate-400'}`}
                            >
                              이동
                            </button>
                            <button
                              onClick={() => setCompareInteractionMode(prev => ({ ...prev, left: 'rotate' }))}
                              className={`flex-1 py-1 rounded-md text-[9px] font-black transition-all ${compareInteractionMode.left === 'rotate' ? 'bg-red-500 text-white' : 'text-slate-400'}`}
                            >
                              각도
                            </button>
                          </div>
                        </div>
                        <select
                          className="w-full rounded-md border border-slate-200 bg-white p-1 text-[9px] font-black"
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
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={compareFoldLeft}
                          onChange={e => setCompareFoldLeft(Number(e.target.value))}
                          className="h-0.5 w-full rounded-lg bg-slate-100 accent-red-500"
                        />
                      </div>
                    ) : (
                      <div className="panel-scroll max-h-[70vh] space-y-4 p-3">
                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">조작 모드</span>
                          <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button
                              onClick={() => setCompareInteractionMode(prev => ({ ...prev, left: 'move' }))}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${compareInteractionMode.left === 'move' ? 'bg-red-500 text-white' : 'text-slate-400'}`}
                            >
                              이동
                            </button>
                            <button
                              onClick={() => setCompareInteractionMode(prev => ({ ...prev, left: 'rotate' }))}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${compareInteractionMode.left === 'rotate' ? 'bg-red-500 text-white' : 'text-slate-400'}`}
                            >
                              각도
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => resetCompareRotation('left')}
                            className="flex-1 rounded-lg bg-slate-100 py-1.5 text-[9px] font-black text-slate-500"
                          >
                            각도 초기화
                          </button>
                          <button
                            onClick={() => resetComparePosition('left')}
                            className="flex-1 rounded-lg bg-slate-100 py-1.5 text-[9px] font-black text-slate-500"
                          >
                            원위치
                          </button>
                        </div>
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
                          {compareLeftNet && (
                            <div className="mt-2 h-20 rounded-lg border border-slate-100 bg-slate-50/70 p-2 flex items-center justify-center">
                              <NetCanvas net={compareLeftNet} scale={getComparePreviewScale(compareLeftNet)} interactive={false} foldProgress={0} rotation={{ x: 0, y: 0 }} transparency={0} panOffset={{ x: 0, y: 0 }} showGrid={false} lineColor="#ef4444" foldLineColor="#ef4444" mutedLineColor="#fca5a5" />
                            </div>
                          )}
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
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase">접기 제어</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={compareFoldLeft}
                            onChange={e => setCompareFoldLeft(Number(e.target.value))}
                            className="h-1.5 w-full rounded-lg bg-slate-100 accent-red-500"
                          />
                          <div className="text-right text-[9px] font-bold text-slate-400">{compareFoldLeft}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {compareRightNet && (
                  <div
                    ref={compareRightPanelRef}
                    style={{ left: 0, top: 0, transform: `translate3d(${comparePanelPos.right.x}px, ${comparePanelPos.right.y}px, 0)` }}
                    className={`fixed z-[70] rounded-2xl border bg-white/95 shadow-xl ${compareActiveSide === 'right' ? 'ring-2 ring-blue-300' : 'border-blue-100'} ${comparePanelCollapsed.right ? 'w-[220px]' : 'w-64'}`}
                    onMouseDown={() => setCompareActiveSide('right')}
                    onTouchStart={() => setCompareActiveSide('right')}
                  >
                    <div
                      onMouseDown={(e) => handleComparePanelDragStart('right', e)}
                      onTouchStart={(e) => handleComparePanelDragStart('right', e)}
                      className={`flex cursor-grab items-center justify-between border-b active:cursor-grabbing ${comparePanelCollapsed.right ? 'px-2 py-0.5' : 'px-3 py-2'}`}
                    >
                      <span className={`${comparePanelCollapsed.right ? 'text-[9px]' : 'text-[10px]'} font-black uppercase text-blue-500`}>파랑 전개도</span>
                      <div className="flex items-center gap-2">
                        {!comparePanelCollapsed.right && (
                          <span className="text-[9px] font-bold text-slate-400">우측</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setComparePanelCollapsed(prev => ({ ...prev, right: !prev.right }));
                          }}
                          className="rounded-md p-1 hover:bg-slate-100"
                          aria-label="오른쪽 패널 접기/펼치기"
                        >
                          <svg className={`h-4 w-4 transition-transform ${comparePanelCollapsed.right ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {comparePanelCollapsed.right ? (
                      <div className="p-1.5 space-y-2">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase">조작 모드</span>
                          <div className="flex p-1 bg-slate-100 rounded-lg">
                            <button
                              onClick={() => setCompareInteractionMode(prev => ({ ...prev, right: 'move' }))}
                              className={`flex-1 py-1 rounded-md text-[9px] font-black transition-all ${compareInteractionMode.right === 'move' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
                            >
                              이동
                            </button>
                            <button
                              onClick={() => setCompareInteractionMode(prev => ({ ...prev, right: 'rotate' }))}
                              className={`flex-1 py-1 rounded-md text-[9px] font-black transition-all ${compareInteractionMode.right === 'rotate' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
                            >
                              각도
                            </button>
                          </div>
                        </div>
                        <select
                          className="w-full rounded-md border border-slate-200 bg-white p-1 text-[9px] font-black"
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
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={compareFoldRight}
                          onChange={e => setCompareFoldRight(Number(e.target.value))}
                          className="h-0.5 w-full rounded-lg bg-slate-100 accent-blue-500"
                        />
                      </div>
                    ) : (
                      <div className="panel-scroll max-h-[70vh] space-y-4 p-3">
                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">조작 모드</span>
                          <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button
                              onClick={() => setCompareInteractionMode(prev => ({ ...prev, right: 'move' }))}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${compareInteractionMode.right === 'move' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
                            >
                              이동
                            </button>
                            <button
                              onClick={() => setCompareInteractionMode(prev => ({ ...prev, right: 'rotate' }))}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${compareInteractionMode.right === 'rotate' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
                            >
                              각도
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => resetCompareRotation('right')}
                            className="flex-1 rounded-lg bg-slate-100 py-1.5 text-[9px] font-black text-slate-500"
                          >
                            각도 초기화
                          </button>
                          <button
                            onClick={() => resetComparePosition('right')}
                            className="flex-1 rounded-lg bg-slate-100 py-1.5 text-[9px] font-black text-slate-500"
                          >
                            원위치
                          </button>
                        </div>
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
                          {compareRightNet && (
                            <div className="mt-2 h-20 rounded-lg border border-slate-100 bg-slate-50/70 p-2 flex items-center justify-center">
                              <NetCanvas net={compareRightNet} scale={getComparePreviewScale(compareRightNet)} interactive={false} foldProgress={0} rotation={{ x: 0, y: 0 }} transparency={0} panOffset={{ x: 0, y: 0 }} showGrid={false} lineColor="#3b82f6" foldLineColor="#3b82f6" mutedLineColor="#93c5fd" />
                            </div>
                          )}
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
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase">접기 제어</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={compareFoldRight}
                            onChange={e => setCompareFoldRight(Number(e.target.value))}
                            className="h-1.5 w-full rounded-lg bg-slate-100 accent-blue-500"
                          />
                          <div className="text-right text-[9px] font-bold text-slate-400">{compareFoldRight}%</div>
                        </div>
                      </div>
                    )}
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
