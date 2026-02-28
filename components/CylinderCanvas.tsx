import React from 'react';

interface CylinderCanvasProps {
    radius?: number;
    height?: number;
    scale?: number;
    foldProgress?: number;
    transparency?: number;
    rotation?: { x: number; y: number };
    panOffset?: { x: number; y: number };
    canvasSize?: { width: number; height: number };
    lineColor?: string;
    transparentBackground?: boolean;
    isAnimatingRotation?: boolean;
    isRotating?: boolean;
    animationDuration?: number;
    showGrid?: boolean;
    gridOpacity?: number;
    gridUnitValue?: number;
    gridUnitType?: string;
    segments?: number;
    showSegments?: boolean;
    highlightPerimeter?: boolean;
    insideColor?: string;
    outsideColor?: string;
}

export const CylinderCanvas: React.FC<CylinderCanvasProps> = ({
    radius = 2,
    height = 4,
    scale = 40,
    foldProgress = 0,
    transparency = 0.2,
    rotation = { x: 0, y: 0 },
    panOffset = { x: 0, y: 0 },
    canvasSize,
    lineColor = '#000000',
    transparentBackground = false,
    isAnimatingRotation = false,
    isRotating = false,
    animationDuration = 1.5,
    showGrid = true,
    gridOpacity = 0.5,
    gridUnitValue = 1,
    gridUnitType = 'cm',
    segments = 36,
    showSegments = false,
    highlightPerimeter = false,
    insideColor = '#e2e8f0', // 안쪽면 색상 (약간 푸른빛 섞인 어두운 회색)
    outsideColor = '#ffffff' // 겉면 색상
}) => {
    const isFlat = foldProgress === 0;
    const faceOpacity = 1 - transparency;
    const zShift = scale * (foldProgress / 100) * -1.5;

    const w = 2 * Math.PI * radius; // 옆면의 총 가로 길이
    const N = Math.max(3, segments); // 면 분할 개수 (최소 3)
    const stripWidth = w / N;

    const sceneTransform = `translate(${panOffset.x}px, ${panOffset.y}px) translateZ(${zShift}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`;

    const gridBackgroundPosition = canvasSize && canvasSize.width > 0 && canvasSize.height > 0
        ? `${Math.round(canvasSize.width / 2)}px ${Math.round(canvasSize.height / 2)}px`
        : `50% 50%`;

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

                    {/* 원기둥 본체 렌더링 시작 */}
                    <div style={{ transformStyle: 'preserve-3d' }}>
                        {Array.from({ length: N }).map((_, i) => {
                            // 0 ~ N-1
                            const angleDeg = (i / N) * 360;
                            const angleRad = (angleDeg * Math.PI) / 180;

                            // Fold Progress에 따라 곡률 결정
                            // progress 0: 반듯하게 펴진 상태 (반지름 무한대)
                            // progress 100: 원래 반지름 r

                            const progress = foldProgress / 100;

                            // 펼쳐졌을때의 X 위치 (-w/2 부터 w/2 까지)
                            const flatX = (i - N / 2 + 0.5) * stripWidth;

                            // 말렸을 때의 위치 (Z축, X축 좌표계 계산)
                            const rolledZ = radius * Math.cos(angleRad);
                            const rolledX = radius * Math.sin(angleRad);

                            const currentX = flatX * (1 - progress) + rolledX * progress;
                            const currentZ = 0 * (1 - progress) + rolledZ * progress;
                            const currentYRot = 0 * (1 - progress) + angleDeg * progress;

                            return (
                                <div key={i} style={{
                                    position: 'absolute',
                                    width: `${stripWidth * scale}px`,
                                    height: `${height * scale}px`,
                                    left: `${(-stripWidth * scale) / 2}px`,
                                    top: `${(-height * scale) / 2}px`,
                                    opacity: faceOpacity,
                                    transformOrigin: '50% 50%',
                                    transform: `translate3d(${currentX * scale}px, 0px, ${currentZ * scale}px) rotateY(${currentYRot}deg)`,
                                    transformStyle: 'preserve-3d',
                                }}>
                                    {/* 겉면 */}
                                    <div className="absolute inset-0" style={{
                                        backfaceVisibility: 'hidden',
                                        backgroundColor: showSegments ? (i % 2 === 0 ? outsideColor : '#f8fafc') : outsideColor,
                                        borderTop: highlightPerimeter ? '3px solid #ef4444' : `1px solid ${lineColor}`,
                                        borderBottom: highlightPerimeter ? '3px solid #3b82f6' : `1px solid ${lineColor}`,
                                        borderLeft: i === 0 ? `1px solid ${lineColor}` : 'none',
                                        borderRight: (i === N - 1) ? `1px solid ${lineColor}` : (showSegments ? `1px dashed rgba(0,0,0,0.15)` : 'none'),
                                        boxSizing: 'border-box'
                                    }} />
                                    {/* 안쪽면 (flip) */}
                                    <div className="absolute inset-0" style={{
                                        backfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)',
                                        backgroundColor: insideColor,
                                        borderTop: highlightPerimeter ? '3px solid #ef4444' : `1px solid ${lineColor}`,
                                        borderBottom: highlightPerimeter ? '3px solid #3b82f6' : `1px solid ${lineColor}`,
                                        borderRight: i === 0 ? `1px solid ${lineColor}` : 'none',
                                        borderLeft: (i === N - 1) ? `1px solid ${lineColor}` : (showSegments ? `1px dashed rgba(0,0,0,0.15)` : 'none'),
                                        boxSizing: 'border-box'
                                    }} />
                                </div>
                            );
                        })}

                        {/* 밑면 (위쪽 원) */}
                        {(() => {
                            const progress = foldProgress / 100;
                            const rotateX = -90 * progress;

                            // 회전 축은 Y = -height/2,  X = 0, Z = 0
                            return (
                                <div style={{
                                    position: 'absolute',
                                    width: `${radius * 2 * scale}px`,
                                    height: `${radius * 2 * scale}px`,
                                    left: `${(-radius * scale)}px`,
                                    top: `${(-height * scale) / 2 - (radius * 2 * scale)}px`,
                                    opacity: faceOpacity,
                                    transformOrigin: '50% 100%',
                                    transform: `rotateX(${rotateX}deg)`,
                                    transformStyle: 'preserve-3d'
                                }}>
                                    {/* 겉면 */}
                                    <div className="absolute inset-0" style={{
                                        backgroundColor: outsideColor,
                                        border: highlightPerimeter ? `3px solid #ef4444` : `2px solid ${lineColor}`,
                                        borderRadius: '50%',
                                        backfaceVisibility: 'hidden',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                        boxSizing: 'border-box'
                                    }}>
                                        {showSegments && (
                                            <svg width="100%" height="100%" viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
                                                {Array.from({ length: N }).map((_, i) => {
                                                    const a1 = (i / N) * 2 * Math.PI;
                                                    const a2 = ((i + 1) / N) * 2 * Math.PI;
                                                    return (
                                                        <polygon
                                                            key={i}
                                                            points={`0,0 ${Math.cos(a1)},${Math.sin(a1)} ${Math.cos(a2)},${Math.sin(a2)}`}
                                                            fill={i % 2 === 0 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.15)'}
                                                            stroke={lineColor} strokeWidth={0.01} strokeDasharray="0.05, 0.05"
                                                        />
                                                    );
                                                })}
                                            </svg>
                                        )}
                                    </div>
                                    {/* 안쪽면 */}
                                    <div className="absolute inset-0" style={{
                                        backgroundColor: insideColor,
                                        border: highlightPerimeter ? `3px solid #ef4444` : `2px solid ${lineColor}`,
                                        borderRadius: '50%',
                                        backfaceVisibility: 'hidden',
                                        transform: 'rotateX(180deg)',
                                        boxSizing: 'border-box'
                                    }} />
                                </div>
                            );
                        })()}

                        {/* 밑면 (아래쪽 원) */}
                        {(() => {
                            const progress = foldProgress / 100;
                            const rotateX = 90 * progress;

                            return (
                                <div style={{
                                    position: 'absolute',
                                    width: `${radius * 2 * scale}px`,
                                    height: `${radius * 2 * scale}px`,
                                    left: `${(-radius * scale)}px`,
                                    top: `${(height * scale) / 2}px`,
                                    opacity: faceOpacity,
                                    transformOrigin: '50% 0%',
                                    transform: `rotateX(${rotateX}deg)`,
                                    transformStyle: 'preserve-3d'
                                }}>
                                    {/* 겉면 */}
                                    <div className="absolute inset-0" style={{
                                        backgroundColor: outsideColor,
                                        border: highlightPerimeter ? `3px solid #3b82f6` : `2px solid ${lineColor}`,
                                        borderRadius: '50%',
                                        backfaceVisibility: 'hidden',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                        boxSizing: 'border-box'
                                    }}>
                                        {showSegments && (
                                            <svg width="100%" height="100%" viewBox="-1 -1 2 2" style={{ transform: 'rotate(90deg)' }}>
                                                {Array.from({ length: N }).map((_, i) => {
                                                    const a1 = (i / N) * 2 * Math.PI;
                                                    const a2 = ((i + 1) / N) * 2 * Math.PI;
                                                    return (
                                                        <polygon
                                                            key={i}
                                                            points={`0,0 ${Math.cos(a1)},${Math.sin(a1)} ${Math.cos(a2)},${Math.sin(a2)}`}
                                                            fill={i % 2 === 0 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.15)'}
                                                            stroke={lineColor} strokeWidth={0.01} strokeDasharray="0.05, 0.05"
                                                        />
                                                    );
                                                })}
                                            </svg>
                                        )}
                                    </div>
                                    {/* 안쪽면 */}
                                    <div className="absolute inset-0" style={{
                                        backgroundColor: insideColor,
                                        border: highlightPerimeter ? `3px solid #3b82f6` : `2px solid ${lineColor}`,
                                        borderRadius: '50%',
                                        backfaceVisibility: 'hidden',
                                        transform: 'rotateX(180deg)',
                                        boxSizing: 'border-box'
                                    }} />
                                </div>
                            );
                        })()}
                    </div>

                </div>
            </div>
        </div>
    );
};
