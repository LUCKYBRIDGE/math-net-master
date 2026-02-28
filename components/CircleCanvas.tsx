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
    const rectLeftEdge = centerX - rectTotalWidth / 2;

    const theta = (2 * Math.PI) / N;
    // SVGs rotate around (0,0), our tip is at (0,0)
    // Points down by default (angle 0 is +Y axis if we use x=sin, y=cos)
    const x1 = rScaled * Math.sin(-theta / 2);
    const y1 = rScaled * Math.cos(-theta / 2);
    const x2 = rScaled * Math.sin(theta / 2);
    const y2 = rScaled * Math.cos(theta / 2);

    // Ensure A command sweep flag is correct: from negative X to positive X in +Y space
    // For SVG, Y goes down. Top-left is 0,0.
    // Tip at (0,0). x1 is negative, y1 is positive.
    // x2 is positive, y2 is positive.
    // So we sweep counter-clockwise visually, which in SVG with +Y down means sweep-flag=0.
    const pathD = `M 0 0 L ${x1} ${y1} A ${rScaled} ${rScaled} 0 0 0 ${x2} ${y2} Z`;

    const pieces = useMemo(() => {
        const arr = [];
        for (let i = 0; i < N; i++) {
            // Circle state (p=0)
            const startRot = i * (360 / N);
            const startX = centerX;
            const startY = centerY;

            // Rectangle state (p=1)
            const isEven = i % 2 === 0;
            // Even pieces point UP (rotate 180), odd point DOWN (rotate 0)
            // But if startRot is e.g. 270, and we want 180, we want the shortest path?
            // Let's just hardcode target rotation
            let targetRot = isEven ? 180 : 0;

            // To prevent weird spinning: find equivalent targetRot modulo 360 that is closest to startRot
            // e.g., if startRot = 270, targetRot = 180 (diff = -90). 
            while (targetRot - startRot > 180) targetRot -= 360;
            while (targetRot - startRot < -180) targetRot += 360;

            const targetX = rectLeftEdge + (i * 0.5 + 0.5) * L;
            const targetY = isEven ? centerY + rScaled / 2 : centerY - rScaled / 2;

            arr.push({
                startRot, targetRot, startX, startY, targetX, targetY, isEven
            });
        }
        return arr;
    }, [N, centerX, centerY, rectLeftEdge, L, rScaled]);

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

                    return (
                        <path
                            key={i}
                            d={pathD}
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
                        x1={rectLeftEdge} y1={centerY + rScaled / 2 + 30}
                        x2={rectLeftEdge + rectTotalWidth} y2={centerY + rScaled / 2 + 30}
                        stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4"
                    />
                    <text
                        x={rectLeftEdge + rectTotalWidth / 2} y={centerY + rScaled / 2 + 50}
                        fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle"
                    >
                        원주의 ½ (반원) = r × π
                    </text>

                    {/* Height label: r */}
                    <line
                        x1={rectLeftEdge - 30} y1={centerY - rScaled / 2}
                        x2={rectLeftEdge - 30} y2={centerY + rScaled / 2}
                        stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4"
                    />
                    <text
                        x={rectLeftEdge - 40} y={centerY + 5}
                        fill="#22c55e" fontSize="14" fontWeight="bold" textAnchor="end"
                    >
                        반지름(r)
                    </text>

                    {/* Area label */}
                    <text
                        x={rectLeftEdge + rectTotalWidth / 2} y={centerY - rScaled / 2 - 20}
                        fill="#334155" fontSize="16" fontWeight="900" textAnchor="middle"
                    >
                        원의 넓이 = (r × π) × r = πr²
                    </text>
                </g>
            </svg>
        </div>
    );
};
