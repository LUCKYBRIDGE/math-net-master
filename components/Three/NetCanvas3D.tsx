import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { NetData, Face, Direction } from '../../types';

interface NetCanvas3DProps {
    net: NetData;
    scale?: number;
    foldProgress?: number;
    transparency?: number;
    activeParallelPairs?: Set<number>;
    faceColors?: Record<number, string>;
    diceStyle?: 'none' | 'number' | 'dot';
    showEdgeMatches?: boolean;
    showArea?: boolean;
    gridUnitValue?: number;
    gridUnitType?: string;
    gridOpacity?: number;
    showGrid?: boolean;
}

const SIDE_COLORS = [
    '#ef4444', '#3b82f6', '#22c55e'
];
const MATCH_COLORS = [
    '#ff0055', '#ff8800', '#ffcc00', '#00dd88', '#00aaff', '#8800ff', '#ff00ff', '#aaff00', '#0055ff'
];

const DICE_MAP: Record<number, number> = {
    0: 1, 1: 6,
    2: 2, 3: 5,
    4: 3, 5: 4
};

const FoldableFace3D: React.FC<{
    face: Face;
    allFaces: Face[];
    foldAngle: number;
    faceColors?: Record<number, string>;
    activeParallelPairs?: Set<number>;
    diceStyle?: 'none' | 'number' | 'dot';
    transparency: number;
    showEdgeMatches?: boolean;
    showArea?: boolean;
    gridUnitValue?: number;
    gridUnitType?: string;
    isRoot?: boolean;
    scaleMult: number;
}> = ({
    face, allFaces, foldAngle, faceColors, activeParallelPairs, diceStyle,
    transparency, showEdgeMatches, showArea, gridUnitValue = 1, gridUnitType = 'cm', isRoot = false, scaleMult = 1
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

        const w = face.width * scaleMult;
        const h = face.height * scaleMult;

        const diceValue = face.sideId !== undefined ? (DICE_MAP[face.sideId] || face.id + 1) : face.id + 1;

        // Dice Dots Rendering
        const renderDiceDots = (value: number) => {
            const dotSize = Math.max(0.05, Math.min(w, h) * 0.18);
            let color = '#334155';
            let ds = dotSize;

            if (value === 1) {
                ds = dotSize * 2;
                color = '#ef4444';
            }

            const pos = {
                tl: [-w * 0.25, h * 0.25, 0],
                tr: [w * 0.25, h * 0.25, 0],
                ml: [-w * 0.25, 0, 0],
                mm: [0, 0, 0],
                mr: [w * 0.25, 0, 0],
                bl: [-w * 0.25, -h * 0.25, 0],
                br: [w * 0.25, -h * 0.25, 0],
            };

            const dots: number[][] = [];
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
                <mesh key={i} position={new THREE.Vector3(p[0], p[1], 0.02)}>
                    <circleGeometry args={[ds / 2, 32]} />
                    <meshBasicMaterial color={color} depthTest={false} transparent />
                </mesh>
            ));
        };

        const getChildTransform = (child: Face) => {
            const cw = child.width * scaleMult;
            const ch = child.height * scaleMult;

            let hingePos: [number, number, number] = [0, 0, 0];
            let childOffset: [number, number, number] = [0, 0, 0];
            let rotation: [number, number, number] = [0, 0, 0];

            const currentAngle = foldAngle; // radians

            switch (child.attachDir) {
                case 'right':
                    hingePos = [w / 2, 0, 0];
                    childOffset = [cw / 2, 0, 0];
                    rotation = [0, currentAngle, 0]; // Fold right flap away
                    break;
                case 'left':
                    hingePos = [-w / 2, 0, 0];
                    childOffset = [-cw / 2, 0, 0];
                    rotation = [0, -currentAngle, 0]; // Fold left flap away
                    break;
                case 'up':
                    // CSS 'up' goes to smaller Y. In ThreeJS +Y is up.
                    hingePos = [0, h / 2, 0];
                    childOffset = [0, ch / 2, 0];
                    rotation = [-currentAngle, 0, 0]; // Fold up flap away
                    break;
                case 'down':
                    // CSS 'down' goes to larger Y. In ThreeJS -Y is down.
                    hingePos = [0, -h / 2, 0];
                    childOffset = [0, -ch / 2, 0];
                    rotation = [currentAngle, 0, 0]; // Fold down flap away
                    break;
            }

            return { hingePos, childOffset, rotation };
        };

        return (
            <group>
                {/* The Face Itself */}
                <mesh>
                    <planeGeometry args={[w, h]} />
                    <meshStandardMaterial color={bgFill} opacity={1 - transparency} transparent side={THREE.DoubleSide} depthWrite={false} polygonOffset polygonOffsetFactor={1} />
                </mesh>

                {/* Wireframe edges (Solid for outline) */}
                <Line points={[[-w / 2, h / 2, 0], [w / 2, h / 2, 0], [w / 2, -h / 2, 0], [-w / 2, -h / 2, 0], [-w / 2, h / 2, 0]]} color="#0f172a" lineWidth={2} position={[0, 0, 0.01]} depthTest={false} />

                {/* Edge matching visualizer using internal borders */}
                {showEdgeMatches && ['up', 'down', 'left', 'right'].map((dir) => {
                    const matchId = (face.edgeMatchIds as any)?.[dir];
                    if (matchId !== undefined) {
                        const color = MATCH_COLORS[matchId % MATCH_COLORS.length];
                        const hw = w / 2;
                        const hh = h / 2;
                        const eW = hw * 0.9;
                        const eH = hh * 0.9;
                        let pts: [number, number, number][] = [];
                        if (dir === 'up') pts = [[-eW, hh, 0.02], [eW, hh, 0.02]];
                        if (dir === 'down') pts = [[-eW, -hh, 0.02], [eW, -hh, 0.02]];
                        if (dir === 'left') pts = [[-hw, eH, 0.02], [-hw, -eH, 0.02]];
                        if (dir === 'right') pts = [[hw, eH, 0.02], [hw, -eH, 0.02]];
                        return <Line key={dir} points={pts} color={color} lineWidth={8} depthTest={false} />;
                    }
                    return null;
                })}

                {/* Dice Style */}
                {diceStyle === 'number' && (
                    <Text position={[0, 0, 0.02]} fontSize={Math.min(w, h) * 0.5} color={diceValue === 1 ? '#ef4444' : '#334155'} anchorX="center" anchorY="middle" depthTest={false}>
                        {diceValue}
                    </Text>
                )}
                {diceStyle === 'dot' && renderDiceDots(diceValue)}

                {/* Area Text */}
                {showArea && (
                    <Text position={[0, 0, 0.02]} fontSize={Math.min(w * 0.15, h * 0.15, 0.8)} color="#0f172a" anchorX="center" anchorY="middle" depthTest={false}>
                        {`${face.width * gridUnitValue}${gridUnitType} x ${face.height * gridUnitValue}${gridUnitType}\n= ${face.width * face.height * gridUnitValue * gridUnitValue}${gridUnitType}²`}
                    </Text>
                )}

                {/* Children Foldable Faces */}
                {children.map(child => {
                    const { hingePos, childOffset, rotation } = getChildTransform(child);
                    return (
                        <group key={child.id} position={new THREE.Vector3(...hingePos)} rotation={new THREE.Euler(...rotation)}>
                            <group position={new THREE.Vector3(...childOffset)}>
                                <FoldableFace3D
                                    face={child}
                                    allFaces={allFaces}
                                    foldAngle={foldAngle}
                                    faceColors={faceColors}
                                    activeParallelPairs={activeParallelPairs}
                                    diceStyle={diceStyle}
                                    transparency={transparency}
                                    showEdgeMatches={showEdgeMatches}
                                    showArea={showArea}
                                    gridUnitValue={gridUnitValue}
                                    gridUnitType={gridUnitType}
                                    scaleMult={scaleMult}
                                />
                            </group>
                        </group>
                    );
                })}
            </group>
        );
    };

export const NetCanvas3D: React.FC<NetCanvas3DProps> = ({
    net, scale = 1, foldProgress = 0, transparency = 0.2, activeParallelPairs, faceColors, diceStyle = 'none', showEdgeMatches = false, showArea = false, gridUnitValue = 1, gridUnitType = 'cm', showGrid = true
}) => {
    const rootFace = net.faces.find(f => f.parentId === undefined) || net.faces[0];
    const foldAngle = (foldProgress / 100) * (Math.PI / 2); // 0 to 90 degrees in radians

    // We should scale the whole thing so it fits in the view. A cube has unit size ~1. Let's make scaleMult = 1.0.
    const scaleMult = 2.0 * Math.max(0.1, scale / 40); // Base normalization step compared to 2D

    // Calculate center of the net to position camera properly
    const centerX = (net.minX + net.totalWidth / 2);
    const centerY = (net.minY + net.totalHeight / 2);

    return (
        <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 20, 15]} intensity={0.8} />
            <directionalLight position={[-10, -20, -15]} intensity={0.4} />

            <OrbitControls makeDefault enablePan={true} enableZoom={true} />

            {showGrid && (
                <gridHelper args={[50, 50, '#e2e8f0', '#f8fafc']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.01]} />
            )}

            <group rotation={[-Math.PI / 6, Math.PI / 4, 0]}>
                {/* Shift the root face into the center of the world approx */}
                <group position={[0, 0, 0]}>
                    <FoldableFace3D
                        face={rootFace}
                        allFaces={net.faces}
                        foldAngle={foldAngle}
                        faceColors={faceColors}
                        activeParallelPairs={activeParallelPairs}
                        diceStyle={diceStyle}
                        transparency={transparency}
                        showEdgeMatches={showEdgeMatches}
                        showArea={showArea}
                        gridUnitValue={gridUnitValue}
                        gridUnitType={gridUnitType}
                        isRoot={true}
                        scaleMult={scaleMult}
                    />
                </group>
            </group>
        </Canvas>
    );
};
