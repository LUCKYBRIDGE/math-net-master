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
    gridOpacity = 0.5
}) => {
    const N = Math.max(4, segments);
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
                            fill={piece.isEven ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.2)'}
                            stroke={lineColor}
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                            opacity={opacity}
                            transform={transform}
                            style={{ transition: 'none' }}
                        />
                    );
                })}

                {/* Annotation Lines (Fade in when p > 0.8) */}
                <g style={{ opacity: Math.max(0, (p - 0.8) * 5), transition: 'opacity 0.2s' }}>
                    {/* Width label: πr */}
                    <line
                        x1={actualLeftEdge} y1={centerY + rScaled / 2 + 30}
                        x2={actualLeftEdge + rectTotalWidth} y2={centerY + rScaled / 2 + 30}
                        stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4"
                    />
                    <text
                        x={actualLeftEdge + rectTotalWidth / 2} y={centerY + rScaled / 2 + 50}
                        fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle"
                    >
                        원주의 ½ (반원) = {radius} × π
                    </text>

                    {/* Height label: r */}
                    <line
                        x1={actualLeftEdge - 30} y1={centerY - rScaled / 2}
                        x2={actualLeftEdge - 30} y2={centerY + rScaled / 2}
                        stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4"
                    />
                    <text
                        x={actualLeftEdge - 40} y={centerY + 5}
                        fill="#22c55e" fontSize="14" fontWeight="bold" textAnchor="end"
                    >
                        반지름({radius})
                    </text>

                    {/* Area label */}
                    <text
                        x={actualLeftEdge + rectTotalWidth / 2} y={centerY - rScaled / 2 - 20}
                        fill="#334155" fontSize="16" fontWeight="900" textAnchor="middle"
                    >
                        원의 넓이 = ({radius} × π) × {radius} = {radius * radius}π
                    </text>
                </g>
            </svg>
        </div>
    );
};
