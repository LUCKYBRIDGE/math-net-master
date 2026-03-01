import React, { useMemo } from 'react';

interface CircleCanvasProps {
    radius?: number;
    segments?: number;
    foldProgress?: number;
    transparency?: number;
    scale?: number;
    canvasSize?: { width: number; height: number };
    lineColor?: string;
    transparentBackground?: boolean;
    showGrid?: boolean;
    gridOpacity?: number;
    displayMode?: 'split' | 'roll' | 'onion' | 'none';
    usePiSymbol?: boolean;
    useSymbolNotation?: boolean;
}

export const CircleCanvas: React.FC<CircleCanvasProps> = ({
    radius = 3,
    segments = 16,
    foldProgress = 0,
    transparency = 0.2,
    scale = 40,
    canvasSize,
    lineColor = '#000000',
    transparentBackground = false,
    showGrid = true,
    gridOpacity = 0.5,
    displayMode = 'split',
    usePiSymbol = false,
    useSymbolNotation = false
}) => {
    const N = Math.max(4, segments);
    const piLabel = usePiSymbol ? 'π' : '3.14';
    const piVal = usePiSymbol ? 'π' : (Math.PI).toFixed(2);
    const strokeW = Math.max(0.3, Math.min(1.5, 30 / N));
    const rLabel = useSymbolNotation ? 'r' : '반지름';
    const p = foldProgress / 100;
    const rScaled = radius * scale;
    const opacity = 1 - transparency;

    const width = canvasSize?.width || 800;
    const height = canvasSize?.height || 600;

    const centerX = width / 2;
    const centerY = height / 2;

    const gridBackgroundPosition = width > 0 && height > 0
        ? `${Math.round(width / 2)}px ${Math.round(height / 2)}px`
        : `50% 50%`;

    const L = (2 * Math.PI * rScaled) / N; // Arc length per piece
    const rectTotalWidth = (N / 2) * L;
    const actualLeftEdge = centerX - rectTotalWidth / 2;
    const rectLeftEdgeBase = actualLeftEdge - 0.5 * L;

    const theta = (2 * Math.PI) / N;
    // SVGs rotate around (0,0), our tip is at (0,0)
    const x1 = rScaled * Math.sin(-theta / 2);
    const y1 = rScaled * Math.cos(-theta / 2);
    const x2 = rScaled * Math.sin(theta / 2);
    const y2 = rScaled * Math.cos(theta / 2);

    const pathDFull = `M 0 0 L ${x1} ${y1} A ${rScaled} ${rScaled} 0 0 0 ${x2} ${y2} Z`;
    const pathDHalf1 = `M 0 0 L ${x1} ${y1} A ${rScaled} ${rScaled} 0 0 0 0 ${rScaled} Z`;
    const pathDHalf2 = `M 0 0 L 0 ${rScaled} A ${rScaled} ${rScaled} 0 0 0 ${x2} ${y2} Z`;

    const pieces = useMemo(() => {
        const arr = [];
        for (let i = 0; i < N; i++) {
            const startRot = i * (360 / N);
            const startX = centerX;
            const startY = centerY;

            const isEven = i % 2 === 0;
            let targetRot = isEven ? 180 : 0;

            while (targetRot - startRot > 180) targetRot -= 360;
            while (targetRot - startRot < -180) targetRot += 360;

            const targetX = rectLeftEdgeBase + (i * 0.5 + 0.5) * L;
            const targetY = isEven ? centerY + rScaled / 2 : centerY - rScaled / 2;

            if (i === 0) {
                // 완벽한 직사각형을 만들기 위해 첫 번째(기수) 조각을 두 개의 반쪽 조각으로 나눔
                arr.push({
                    startRot, targetRot, startX, startY, targetX, targetY, isEven, type: 'half1'
                });
                arr.push({
                    startRot, targetRot, startX, startY, targetX: targetX + (N / 2) * L, targetY, isEven, type: 'half2'
                });
            } else {
                arr.push({
                    startRot, targetRot, startX, startY, targetX, targetY, isEven, type: 'full'
                });
            }
        }
        return arr;
    }, [N, centerX, centerY, rectLeftEdgeBase, L, rScaled]);

    return (
        <div
            className={`w-full h-full relative overflow-hidden ${transparentBackground ? 'bg-transparent' : 'bg-white'}`}
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

            {/* 기본 상태: 도구 미선택 시 일반 원 표시 */}
            {displayMode === 'none' && (
                <svg width="100%" height="100%" className="absolute inset-0">
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={rScaled}
                        fill="rgba(59, 130, 246, 0.08)"
                        stroke="#334155"
                        strokeWidth="2"
                    />
                    {/* 반지름 선 */}
                    <line
                        x1={centerX} y1={centerY}
                        x2={centerX + rScaled} y2={centerY}
                        stroke="#ef4444" strokeWidth="2" strokeDasharray="6 3"
                    />
                    <text
                        x={centerX + rScaled / 2} y={centerY - 8}
                        fill="#ef4444" fontSize="14" fontWeight="900" textAnchor="middle"
                    >
                        {rLabel} = {radius}
                    </text>
                    {/* 원주 표시 (테두리 두껍게) */}
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={rScaled}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                        className="animate-[spin_20s_linear_infinite]"
                        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
                    />
                    <text
                        x={centerX} y={centerY - rScaled - 15}
                        fill="#3b82f6" fontSize="14" fontWeight="900" textAnchor="middle"
                    >
                        원주(원의 둘레) = 지름({radius * 2}) × {piLabel} = {usePiSymbol ? `${radius * 2}π` : (radius * Math.PI * 2).toFixed(2)}
                    </text>
                    {/* 중심점 */}
                    <circle cx={centerX} cy={centerY} r="4" fill="#334155" />
                    <text
                        x={centerX} y={centerY + 20}
                        fill="#334155" fontSize="11" fontWeight="bold" textAnchor="middle"
                    >
                        중심
                    </text>
                </svg>
            )}

            {displayMode === 'split' && (
                <svg width="100%" height="100%" className="absolute inset-0">
                    {pieces.map((piece, i) => {
                        const currentX = piece.startX * (1 - p) + piece.targetX * p;
                        const currentY = piece.startY * (1 - p) + piece.targetY * p;
                        const currentRot = piece.startRot * (1 - p) + piece.targetRot * p;

                        const transform = `translate(${currentX}, ${currentY}) rotate(${currentRot})`;

                        let d = pathDFull;
                        if (piece.type === 'half1') d = pathDHalf1;
                        else if (piece.type === 'half2') d = pathDHalf2;

                        return (
                            <path
                                key={i}
                                d={d}
                                fill={piece.isEven ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)'}
                                stroke={piece.isEven ? '#2563eb' : '#dc2626'}
                                strokeWidth={strokeW}
                                strokeLinejoin="round"
                                opacity={opacity}
                                transform={transform}
                                style={{ transition: 'none' }}
                            />
                        );
                    })}

                    {/* Annotation Lines (Fade in when p > 0.8) */}
                    <g style={{ opacity: Math.max(0, (p - 0.8) * 5), transition: 'opacity 0.2s' }}>
                        <line
                            x1={actualLeftEdge} y1={centerY + rScaled / 2 + 30}
                            x2={actualLeftEdge + rectTotalWidth} y2={centerY + rScaled / 2 + 30}
                            stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4"
                        />
                        <text
                            x={actualLeftEdge + rectTotalWidth / 2} y={centerY + rScaled / 2 + 50}
                            fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle"
                        >
                            원주의 ½ (반원) = {radius} × {piLabel} = {usePiSymbol ? `${radius}π` : (radius * Math.PI).toFixed(2)}
                        </text>

                        <line
                            x1={actualLeftEdge - 30} y1={centerY - rScaled / 2}
                            x2={actualLeftEdge - 30} y2={centerY + rScaled / 2}
                            stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4"
                        />
                        <text
                            x={actualLeftEdge - 40} y={centerY + 5}
                            fill="#22c55e" fontSize="14" fontWeight="bold" textAnchor="end"
                        >
                            {rLabel}({radius})
                        </text>

                        <text
                            x={actualLeftEdge + rectTotalWidth / 2} y={centerY - rScaled / 2 - 20}
                            fill="#334155" fontSize="16" fontWeight="900" textAnchor="middle"
                        >
                            원의 넓이 = ({radius} × {piLabel}) × {radius} = {usePiSymbol ? `${radius * radius}π` : (radius * radius * Math.PI).toFixed(2)}
                        </text>
                    </g>
                </svg>
            )}

            {displayMode === 'roll' && (() => {
                const startX = centerX - Math.PI * rScaled;
                const groundY = centerY + rScaled + 20;

                // 100% progress = 1 full rotation = 2 * PI * r
                const rollDist = p * 2 * Math.PI * rScaled;
                const currentX = startX + rollDist;
                const rotAngle = p * 360;

                return (
                    <svg width="100%" height="100%" className="absolute inset-0">
                        {/* Ground line */}
                        <line x1={startX - 50} y1={groundY} x2={startX + 2 * Math.PI * rScaled + 50} y2={groundY} stroke="#cbd5e1" strokeWidth="2" />

                        {/* Unrolled path */}
                        <line x1={startX} y1={groundY - 2} x2={currentX} y2={groundY - 2} stroke="#ef4444" strokeWidth="4" />

                        {/* The Rolling Circle */}
                        <g transform={`translate(${currentX}, ${groundY - rScaled - 2}) rotate(${rotAngle})`}>
                            <circle cx="0" cy="0" r={rScaled} fill="rgba(59, 130, 246, 0.1)" stroke={lineColor} strokeWidth="2" />
                            {/* Inner slices for visual rotation */}
                            <line x1="0" y1="-rScaled" x2="0" y2={rScaled} stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
                            <line x1="-rScaled" y1="0" x2={rScaled} y2="0" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
                            {/* The tracing point (red dot) at bottom initially */}
                            <circle cx="0" cy={rScaled} r="4" fill="#ef4444" />
                        </g>

                        {/* Text Annotations */}
                        <g style={{ opacity: Math.max(0, (p - 0.8) * 5), transition: 'opacity 0.2s' }}>
                            <path d={`M ${startX} ${groundY + 20} L ${startX} ${groundY + 30} L ${startX + 2 * Math.PI * rScaled} ${groundY + 30} L ${startX + 2 * Math.PI * rScaled} ${groundY + 20}`} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
                            <text x={startX + Math.PI * rScaled} y={groundY + 55} fill="#ef4444" fontSize="18" fontWeight="900" textAnchor="middle">
                                굴러간 거리 = 원의 둘레(원주) = 지름({radius * 2}) × {piLabel} = {usePiSymbol ? `${radius * 2}π` : (radius * 2 * Math.PI).toFixed(2)}
                            </text>
                            <text x={startX + Math.PI * rScaled} y={groundY + 75} fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">
                                ✨ 바퀴가 정확히 한 바퀴 굴러가면, 그 거리는 원의 둘레와 같습니다!
                            </text>
                        </g>
                    </svg>
                );
            })()}

            {displayMode === 'onion' && (() => {
                // Number of onion bands
                const M = Math.max(5, Math.ceil(segments / 2));
                const samples = 64;

                return (
                    <svg width="100%" height="100%" className="absolute inset-0" style={{ overflow: 'visible' }}>
                        {Array.from({ length: M }).map((_, j) => {
                            const R = ((j + 1) / M) * rScaled;
                            const prevR = (j / M) * rScaled;
                            const midR = (R + prevR) / 2;
                            const bandWidth = R - prevR;

                            // To make a triangle pointing right
                            // Unrolled lines stack horizontally or vertically. Let's stack vertically like a triangle Base=2piR, Height=R
                            // Center of triangle at bottom
                            const triBottom = centerY + rScaled + 50;
                            const lineY = triBottom - midR;

                            const points = [];
                            for (let k = 0; k <= samples; k++) {
                                const frac = k / samples;
                                // circle mode (p=0): open from bottom so it falls flat
                                const angle = 2 * Math.PI * frac; // 0 is top, pi is bottom

                                const cx0 = centerX + midR * Math.sin(angle);
                                const cy0 = centerY - midR * Math.cos(angle);

                                // line mode (p=1)
                                const lineLength = 2 * Math.PI * midR;
                                const cx1 = centerX + lineLength * (frac - 0.5);
                                const cy1 = lineY;

                                const px = cx0 * (1 - p) + cx1 * p;
                                const py = cy0 * (1 - p) + cy1 * p;
                                points.push(`${px},${py}`);
                            }

                            return (
                                <polyline
                                    key={j}
                                    points={points.join(' ')}
                                    fill="none"
                                    stroke={j % 2 === 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.6)'}
                                    strokeWidth={bandWidth}
                                    strokeLinecap="round"
                                />
                            );
                        })}

                        {/* Annotations */}
                        <g style={{ opacity: Math.max(0, (p - 0.8) * 5), transition: 'opacity 0.2s' }}>
                            {/* Base: 2 pi r */}
                            <line
                                x1={centerX - Math.PI * rScaled} y1={centerY + rScaled + 60}
                                x2={centerX + Math.PI * rScaled} y2={centerY + rScaled + 60}
                                stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4"
                            />
                            <text x={centerX} y={centerY + rScaled + 80} fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle">
                                밑변 = 원주 ({radius * 2}π)
                            </text>

                            {/* Height: r */}
                            <line
                                x1={centerX + Math.PI * rScaled + 20} y1={centerY + 50}
                                x2={centerX + Math.PI * rScaled + 20} y2={centerY + rScaled + 50}
                                stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4"
                            />
                            <text x={centerX + Math.PI * rScaled + 30} y={centerY + rScaled / 2 + 50} fill="#22c55e" fontSize="14" fontWeight="bold" textAnchor="start">
                                높이 = 반지름({radius})
                            </text>

                            {/* Area */}
                            <text x={centerX} y={centerY - 20} fill="#334155" fontSize="16" fontWeight="900" textAnchor="middle">
                                직각삼각형 넓이 = ½ × 밑변({radius * 2}π) × 높이({radius}) = {radius * radius}π
                            </text>
                        </g>
                    </svg>
                );
            })()}
        </div>
    );
};
