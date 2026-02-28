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
    actionMode?: 'none' | 'surface' | 'volume' | 'section' | 'rectify';
    sectionType?: 'horizontal' | 'vertical' | 'diagonal';
    usePiSymbol?: boolean;
    useSymbolNotation?: boolean;
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
    insideColor = '#e2e8f0',
    outsideColor = '#ffffff',
    actionMode = 'none',
    sectionType = 'horizontal',
    usePiSymbol = false,
    useSymbolNotation = false
}) => {
    const piLabel = usePiSymbol ? 'π' : '3.14';
    const fmtPi = (coeff: number) => usePiSymbol ? `${coeff}π` : (coeff * Math.PI).toFixed(2);
    const rLabel = useSymbolNotation ? 'r' : '반지름';
    const hLabel = useSymbolNotation ? 'h' : '높이';

    const actualFoldProgress = (actionMode === 'volume' || actionMode === 'section' || actionMode === 'rectify') ? 100 : foldProgress;
    const isFlat = actualFoldProgress === 0;
    const faceOpacity = 1 - transparency;
    const zShift = scale * (actualFoldProgress / 100) * -1.5;

    const progress = actualFoldProgress / 100;
    const w = 2 * Math.PI * radius;
    const N = Math.max(3, segments);
    const stripWidth = w / N;

    const sceneTransform = `translate(${panOffset.x}px, ${panOffset.y}px) translateZ(${zShift}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`;

    const gridBackgroundPosition = canvasSize && canvasSize.width > 0 && canvasSize.height > 0
        ? `${Math.round(canvasSize.width / 2)}px ${Math.round(canvasSize.height / 2)}px`
        : `50% 50%`;

    // 캡이 부착될 strip 인덱스
    const topCapIndex = 0;
    const bottomCapIndex = Math.floor(N / 2);

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

            {/* 오버레이 안내 텍스트 */}
            {actionMode === 'surface' && isFlat && (
                <div className="absolute top-8 text-center w-full z-10 pointer-events-none">
                    <div className="inline-block bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-lg border border-slate-200">
                        <div className="text-lg font-black text-slate-800">
                            원기둥 겉넓이 = 2 × 밑넓이({fmtPi(radius * radius)}) + 옆넓이({fmtPi(radius * 2 * height)}) = <span className="text-blue-600">{fmtPi(2 * radius * radius + radius * 2 * height)}</span>
                        </div>
                    </div>
                </div>
            )}
            {actionMode === 'volume' && (
                <div className="absolute top-8 text-center w-full z-10 pointer-events-none">
                    <div className="inline-block bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-lg border border-slate-200">
                        <div className="text-lg font-black text-slate-800">
                            부피 = 밑넓이({fmtPi(radius * radius)}) × 물{hLabel}({(height * (foldProgress / 100)).toFixed(1)}) = <span className="text-blue-600">{usePiSymbol ? `${(radius * radius * height * (foldProgress / 100)).toFixed(2)}π` : (radius * radius * Math.PI * height * (foldProgress / 100)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}
            {actionMode === 'section' && (
                <div className="absolute top-8 text-center w-full z-10 pointer-events-none">
                    <div className="inline-block bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-lg border border-slate-200">
                        <div className="text-lg font-black text-slate-800">
                            절단면 모양 = <span className="text-rose-600">{sectionType === 'horizontal' ? '원' : sectionType === 'vertical' ? '직사각형(또는 선분)' : '타원'}</span>
                        </div>
                    </div>
                </div>
            )}
            {actionMode === 'rectify' && (
                <div className="absolute top-8 text-center w-full z-10 pointer-events-none">
                    <div className="inline-block bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-lg border border-orange-200">
                        <div className="text-lg font-black text-slate-800">
                            {segments}조각으로 분할 &rarr; 직사각형 (가로 = <span className="text-orange-600">원주의 ½ ({fmtPi(radius)})</span>, 세로 = <span className="text-green-600">{rLabel}({radius})</span>)
                        </div>
                    </div>
                </div>
            )}

            {/* rectify 모드: 2D SVG 원→직사각형 변환 */}
            {actionMode === 'rectify' && (() => {
                const rp = foldProgress / 100;
                const M = N;
                const theta = (2 * Math.PI) / M;
                const L = (2 * Math.PI * radius * scale) / M;
                const rS = radius * scale;
                const rectW = (M / 2) * L;
                const cW = canvasSize?.width || 800;
                const cH = canvasSize?.height || 600;
                const svgCx = cW / 2;
                const svgCy = cH / 2;

                return (
                    <svg width={cW} height={cH} className="absolute inset-0 z-[5] pointer-events-none" style={{ overflow: 'visible' }}>
                        {Array.from({ length: M }).map((_, i) => {
                            const isEven = i % 2 === 0;
                            const startRotAngle = i * (360 / M);
                            let targetRot = isEven ? 180 : 0;
                            while (targetRot - startRotAngle > 180) targetRot -= 360;
                            while (targetRot - startRotAngle < -180) targetRot += 360;
                            const targetX = -rectW / 2 + (i * 0.5 + 0.5) * L + svgCx;
                            const targetY = isEven ? svgCy + rS / 2 : svgCy - rS / 2;
                            const curX = svgCx * (1 - rp) + targetX * rp;
                            const curY = svgCy * (1 - rp) + targetY * rp;
                            const curRot = startRotAngle * (1 - rp) + targetRot * rp;
                            const x1 = rS * Math.sin(-theta / 2);
                            const y1 = rS * Math.cos(-theta / 2);
                            const x2 = rS * Math.sin(theta / 2);
                            const y2 = rS * Math.cos(theta / 2);
                            const d = `M 0 0 L ${x1} ${y1} A ${rS} ${rS} 0 0 0 ${x2} ${y2} Z`;
                            return (
                                <path key={i} d={d}
                                    fill={isEven ? 'rgba(59, 130, 246, 0.15)' : 'rgba(251, 146, 60, 0.15)'}
                                    stroke="#334155" strokeWidth="1" strokeLinejoin="round"
                                    transform={`translate(${curX}, ${curY}) rotate(${curRot})`}
                                />
                            );
                        })}
                        <g style={{ opacity: Math.max(0, (rp - 0.8) * 5) }}>
                            <line x1={svgCx - rectW / 2} y1={svgCy + rS / 2 + 25} x2={svgCx + rectW / 2} y2={svgCy + rS / 2 + 25} stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
                            <text x={svgCx} y={svgCy + rS / 2 + 42} fill="#ef4444" fontSize="13" fontWeight="bold" textAnchor="middle">
                                가로 = 원주의 ½ = {fmtPi(radius)}
                            </text>
                            <line x1={svgCx - rectW / 2 - 20} y1={svgCy - rS / 2} x2={svgCx - rectW / 2 - 20} y2={svgCy + rS / 2} stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" />
                            <text x={svgCx - rectW / 2 - 30} y={svgCy + 4} fill="#22c55e" fontSize="13" fontWeight="bold" textAnchor="end">
                                세로 = {rLabel}({radius})
                            </text>
                            <text x={svgCx} y={svgCy - rS / 2 - 15} fill="#334155" fontSize="15" fontWeight="900" textAnchor="middle">
                                넓이 = ({radius} × {piLabel}) × {radius} = {fmtPi(radius * radius)}
                            </text>
                        </g>
                    </svg>
                );
            })()}

            <div className="absolute w-0 h-0" style={{ transformStyle: 'preserve-3d' }}>
                <div style={{
                    position: 'absolute',
                    transform: sceneTransform,
                    transformStyle: 'preserve-3d',
                    transition: isAnimatingRotation ? `transform ${animationDuration}s cubic-bezier(0.1, 0.7, 0.1, 1)` : (isRotating ? 'none' : 'transform 0.1s linear'),
                }}>

                    {/* 원기둥 본체 */}
                    <div style={{ transformStyle: 'preserve-3d' }}>
                        {Array.from({ length: N }).map((_, i) => {
                            const angleDeg = (i / N) * 360;
                            const angleRad = (angleDeg * Math.PI) / 180;

                            const flatX = (i - N / 2 + 0.5) * stripWidth;

                            // 뒤쪽(Z-)으로 말림 → 앞쪽에서 바라봤을 때 자연스러운 원기둥
                            const rolledZ = -radius * Math.cos(angleRad);
                            const rolledX = radius * Math.sin(angleRad);

                            const currentX = flatX * (1 - progress) + rolledX * progress;
                            const currentZ = 0 * (1 - progress) + rolledZ * progress;
                            const currentYRot = 0 * (1 - progress) + angleDeg * progress;

                            const isTopCapHost = (i === topCapIndex);
                            const isBottomCapHost = (i === bottomCapIndex);

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
                                    {/* 안쪽면 (flat일 때 보이는 면) */}
                                    <div className="absolute inset-0" style={{
                                        backfaceVisibility: 'hidden',
                                        backgroundColor: insideColor,
                                        borderTop: `1px solid ${lineColor}`,
                                        borderBottom: `1px solid ${lineColor}`,
                                        borderLeft: i === 0 ? `1px solid ${lineColor}` : 'none',
                                        borderRight: (i === N - 1) ? `1px solid ${lineColor}` : (showSegments ? `1px dashed rgba(0,0,0,0.15)` : 'none'),
                                        boxSizing: 'border-box'
                                    }} />
                                    {/* 겉면 (말렸을때 바깥에서 보이는 면) */}
                                    <div className="absolute inset-0" style={{
                                        backfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)',
                                        backgroundColor: showSegments ? (i % 2 === 0 ? outsideColor : '#f8fafc') : outsideColor,
                                        borderTop: highlightPerimeter ? '3px solid #ef4444' : `1px solid ${lineColor}`,
                                        borderBottom: highlightPerimeter ? '3px solid #3b82f6' : `1px solid ${lineColor}`,
                                        borderRight: i === 0 ? `1px solid ${lineColor}` : 'none',
                                        borderLeft: (i === N - 1) ? `1px solid ${lineColor}` : (showSegments ? `1px dashed rgba(0,0,0,0.15)` : 'none'),
                                        boxSizing: 'border-box'
                                    }} />

                                    {/* 위쪽 캡 (strip 0에 부착) */}
                                    {isTopCapHost && (
                                        <div style={{
                                            position: 'absolute',
                                            width: `${radius * 2 * scale}px`,
                                            height: `${radius * 2 * scale}px`,
                                            left: `${(stripWidth * scale / 2) - (radius * scale)}px`,
                                            top: `${-(radius * 2 * scale)}px`,
                                            transformOrigin: '50% 100%',
                                            transform: `rotateX(${90 * progress}deg)`,
                                            transformStyle: 'preserve-3d'
                                        }}>
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
                                                        {Array.from({ length: N }).map((_, si) => {
                                                            const a1 = (si / N) * 2 * Math.PI;
                                                            const a2 = ((si + 1) / N) * 2 * Math.PI;
                                                            return (
                                                                <polygon key={si}
                                                                    points={`0,0 ${Math.cos(a1)},${Math.sin(a1)} ${Math.cos(a2)},${Math.sin(a2)}`}
                                                                    fill={si % 2 === 0 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.15)'}
                                                                    stroke={lineColor} strokeWidth={0.01} strokeDasharray="0.05, 0.05"
                                                                />
                                                            );
                                                        })}
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="absolute inset-0" style={{
                                                backgroundColor: insideColor,
                                                border: `2px solid ${lineColor}`,
                                                borderRadius: '50%',
                                                backfaceVisibility: 'hidden',
                                                transform: 'rotateX(180deg)',
                                                boxSizing: 'border-box'
                                            }} />
                                            {actionMode === 'surface' && progress === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center font-black text-slate-700 text-lg bg-white/50 rounded-full" style={{ transform: 'translateZ(1px)' }}>
                                                    밑넓이 = {fmtPi(radius * radius)}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 아래쪽 캡 (strip N/2에 부착) */}
                                    {isBottomCapHost && (
                                        <div style={{
                                            position: 'absolute',
                                            width: `${radius * 2 * scale}px`,
                                            height: `${radius * 2 * scale}px`,
                                            left: `${(stripWidth * scale / 2) - (radius * scale)}px`,
                                            top: `${height * scale}px`,
                                            transformOrigin: '50% 0%',
                                            transform: `rotateX(${-90 * progress}deg)`,
                                            transformStyle: 'preserve-3d'
                                        }}>
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
                                                        {Array.from({ length: N }).map((_, si) => {
                                                            const a1 = (si / N) * 2 * Math.PI;
                                                            const a2 = ((si + 1) / N) * 2 * Math.PI;
                                                            return (
                                                                <polygon key={si}
                                                                    points={`0,0 ${Math.cos(a1)},${Math.sin(a1)} ${Math.cos(a2)},${Math.sin(a2)}`}
                                                                    fill={si % 2 === 0 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.15)'}
                                                                    stroke={lineColor} strokeWidth={0.01} strokeDasharray="0.05, 0.05"
                                                                />
                                                            );
                                                        })}
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="absolute inset-0" style={{
                                                backgroundColor: insideColor,
                                                border: `2px solid ${lineColor}`,
                                                borderRadius: '50%',
                                                backfaceVisibility: 'hidden',
                                                transform: 'rotateX(180deg)',
                                                boxSizing: 'border-box'
                                            }} />
                                            {actionMode === 'surface' && progress === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center font-black text-slate-700 text-lg bg-white/50 rounded-full" style={{ transform: 'translateZ(1px)' }}>
                                                    밑넓이 = {fmtPi(radius * radius)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* 옆넓이 공식 오버레이 */}
                        {actionMode === 'surface' && isFlat && (
                            <div style={{
                                position: 'absolute', width: `${w * scale}px`, height: `${height * scale}px`,
                                left: `${(-w * scale) / 2}px`, top: `${(-height * scale) / 2}px`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                                transform: 'translateZ(1px)'
                            }}>
                                <span className="text-xl font-black text-slate-700 bg-white/80 px-4 py-2 rounded-xl backdrop-blur-sm">
                                    옆넓이 = 가로({fmtPi(radius * 2)}) × {hLabel}({height}) = {fmtPi(radius * 2 * height)}
                                </span>
                            </div>
                        )}

                        {/* 물 채우기 (volume 모드) */}
                        {actionMode === 'volume' && (() => {
                            const waterProg = foldProgress / 100;
                            const waterHeight = height * waterProg;
                            const waterCy = (height / 2) - (waterHeight / 2);
                            const waterColor = 'rgba(59, 130, 246, 0.4)';
                            const innerScale = scale * 0.99;

                            if (waterProg <= 0.01) return null;

                            return (
                                <div style={{ transformStyle: 'preserve-3d' }}>
                                    {Array.from({ length: 36 }).map((_, i) => {
                                        const angleDeg = (i / 36) * 360;
                                        const angleRad = (angleDeg * Math.PI) / 180;
                                        const rolledZ = -radius * Math.cos(angleRad) * innerScale;
                                        const rolledX = radius * Math.sin(angleRad) * innerScale;
                                        const stripW = (2 * Math.PI * radius / 36) * innerScale;
                                        const stripH = waterHeight * innerScale;

                                        return (
                                            <div key={i} style={{
                                                position: 'absolute', width: `${stripW}px`, height: `${stripH}px`,
                                                left: `${-stripW / 2}px`, top: `${waterCy * scale - stripH / 2}px`,
                                                backgroundColor: waterColor, transformOrigin: '50% 50%',
                                                transform: `translate3d(${rolledX}px, 0px, ${rolledZ}px) rotateY(${angleDeg}deg)`,
                                                transformStyle: 'preserve-3d', backfaceVisibility: 'visible'
                                            }} />
                                        );
                                    })}
                                    {/* 수면 */}
                                    <div style={{
                                        position: 'absolute', width: `${radius * 2 * innerScale}px`, height: `${radius * 2 * innerScale}px`,
                                        left: `${-radius * innerScale}px`, top: `${(waterCy * scale) - (waterHeight * innerScale / 2) - radius * innerScale}px`,
                                        backgroundColor: waterColor, borderRadius: '50%',
                                        transform: `rotateX(-90deg)`, transformStyle: 'preserve-3d'
                                    }} />
                                </div>
                            );
                        })()}

                        {/* 단면 자르기 (section 모드) */}
                        {actionMode === 'section' && (() => {
                            const prog = foldProgress / 100;
                            let planeTransform = '';
                            let planeW = radius * 4 * scale;
                            let planeH = height * 2 * scale;
                            let shape = null;

                            if (sectionType === 'horizontal') {
                                const yy = (0.5 - prog) * height * scale;
                                planeTransform = `translate3d(0, ${yy}px, 0) rotateX(90deg)`;
                                planeW = radius * 4 * scale;
                                planeH = radius * 4 * scale;
                                shape = <div style={{ width: radius * 2 * scale, height: radius * 2 * scale, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.4)', border: '2px solid red' }} />;
                            } else if (sectionType === 'vertical') {
                                const zz = (0.5 - prog) * radius * 2 * scale;
                                planeTransform = `translate3d(0, 0, ${zz}px)`;
                                planeW = radius * 3 * scale;
                                planeH = height * 1.5 * scale;
                                const Z = (0.5 - prog) * radius * 2;
                                const chord = 2 * Math.sqrt(Math.max(0, radius * radius - Z * Z));
                                if (chord > 0) {
                                    shape = <div style={{ width: chord * scale, height: height * scale, background: 'rgba(239, 68, 68, 0.4)', border: '2px solid red' }} />;
                                }
                            } else {
                                const xx = (prog - 0.5) * radius * 2 * scale;
                                planeTransform = `translate3d(${xx}px, 0, 0) rotateY(90deg) rotateX(45deg)`;
                                planeW = radius * 4 * scale;
                                planeH = height * 3 * scale;
                                shape = <div style={{ width: radius * 2 * scale, height: (radius * 2 / Math.cos(Math.PI / 4)) * scale, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.4)', border: '2px solid red' }} />;
                            }

                            return (
                                <div style={{
                                    position: 'absolute', width: planeW, height: planeH,
                                    left: -planeW / 2, top: -planeH / 2,
                                    background: 'rgba(255, 255, 255, 0.3)', border: '3px solid rgba(255,255,255,0.6)',
                                    transform: planeTransform, transformStyle: 'preserve-3d',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                                    backdropFilter: 'blur(1px)'
                                }}>
                                    {shape}
                                </div>
                            );
                        })()}
                    </div>

                </div>
            </div>
        </div>
    );
};
