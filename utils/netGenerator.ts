
import { NET_PATTERNS } from '../constants';
import { NetData, Face, Dimensions, Direction, EdgeMatch } from '../types';

type Vec3 = [number, number, number];

const addVec = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scaleVec = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];

const getOppositeDir = (dir: Direction): Direction => {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
  }
};

interface FaceState {
  origin: Vec3;  // 전개도 2D상의 (0,0)에 해당하는 3D 좌표
  right: Vec3;   // 전개도 2D상의 오른쪽(+x) 방향 3D 벡터
  down: Vec3;    // 전개도 2D상의 아래쪽(+y) 방향 3D 벡터
  normal: Vec3;  // 면의 바깥쪽을 향하는 법선 벡터
  w: number;     // 현재 면의 2D 가로 길이 (3D상 right 방향 거리)
  h: number;     // 현재 면의 2D 세로 길이 (3D상 down 방향 거리)
  d: number;     // 현재 면의 두께 (3D상 normal 방향 거리)
}

const generateNet = (
  patternId: number, 
  patternStruct: { from: number; to: number; dir: Direction }[],
  dims: Dimensions,
  startPermutation: [number, number, number],
  variantIndex: number
): NetData | null => {
  
  const faces: Face[] = [];
  const faceStates: FaceState[] = [];
  const foldEdges = new Set<string>();

  const [L, W, H] = startPermutation;

  // Face 0: 바닥면 (Floor)
  const f0State: FaceState = {
    origin: [0, 0, 0],
    right: [1, 0, 0],
    down: [0, 1, 0],
    normal: [0, 0, -1],
    w: L, h: W, d: H
  };
  
  const f0: Face = {
    id: 0, x: 0, y: 0,
    width: L, height: W,
    isBase: true,
    sideId: 0 
  };
  
  faces.push(f0);
  faceStates[0] = f0State;

  for (const link of patternStruct) {
    const p = faces.find(f => f.id === link.from);
    const ps = faceStates[link.from];
    if (!p || !ps) return null;
    
    let ns: FaceState;
    let newX = p.x;
    let newY = p.y;

    // 전개 로직: 90도 회전 변환을 통한 좌표계 전파
    switch (link.dir) {
      case 'right':
        ns = {
          origin: addVec(ps.origin, scaleVec(ps.right, ps.w)),
          right: ps.normal,
          down: ps.down,
          normal: scaleVec(ps.right, -1),
          w: ps.d, h: ps.h, d: ps.w
        };
        newX += p.width;
        break;
      case 'left':
        ns = {
          right: scaleVec(ps.normal, -1),
          down: ps.down,
          normal: ps.right,
          w: ps.d, h: ps.h, d: ps.w,
          origin: [0, 0, 0] // 아래에서 재계산
        };
        ns.origin = addVec(ps.origin, scaleVec(ns.right, -ns.w));
        newX -= ns.w;
        break;
      case 'down':
        ns = {
          origin: addVec(ps.origin, scaleVec(ps.down, ps.h)),
          right: ps.right,
          down: ps.normal,
          normal: scaleVec(ps.down, -1),
          w: ps.w, h: ps.d, d: ps.h
        };
        newY += p.height;
        break;
      case 'up':
        ns = {
          right: ps.right,
          down: scaleVec(ps.normal, -1),
          normal: ps.down,
          w: ps.w, h: ps.d, d: ps.h,
          origin: [0, 0, 0] // 아래에서 재계산
        };
        ns.origin = addVec(ps.origin, scaleVec(ns.down, -ns.h));
        newY -= ns.h;
        break;
      default: return null;
    }

    const newFace: Face = {
      id: link.to, x: newX, y: newY,
      width: ns.w, height: ns.h,
      parentId: link.from, attachDir: link.dir,
      sideId: -1
    };
    
    // 2D 평면 중복 방지
    if (faces.some(f => f.x < newFace.x + newFace.width - 0.05 && f.x + f.width > newFace.x + 0.05 && f.y < newFace.y + newFace.height - 0.05 && f.y + f.height > newFace.y + 0.05)) {
        return null;
    }

    foldEdges.add(`${link.from}|${link.dir}`);
    foldEdges.add(`${link.to}|${getOppositeDir(link.dir)}`);

    faces.push(newFace);
    faceStates[link.to] = ns;
  }

  const edgeMap = new Map<string, {faceId: number, dir: Direction}[]>();

  faces.forEach((face, i) => {
    const s = faceStates[i];
    const c0 = s.origin; // 2D상 Top-Left (3D 좌표)
    const c1 = addVec(c0, scaleVec(s.right, s.w)); // 2D상 Top-Right (3D 좌표)
    const c2 = addVec(c1, scaleVec(s.down, s.h));  // 2D상 Bottom-Right (3D 좌표)
    const c3 = addVec(c0, scaleVec(s.down, s.h));  // 2D상 Bottom-Left (3D 좌표)
    
    const faceEdges: {dir: Direction, pts: [Vec3, Vec3]}[] = [
      {dir: 'up', pts: [c0, c1]},
      {dir: 'right', pts: [c1, c2]},
      {dir: 'down', pts: [c2, c3]},
      {dir: 'left', pts: [c3, c0]}
    ];

    faceEdges.forEach(fe => {
      // 3D 좌표 비교를 위한 정밀도 처리
      const p1 = fe.pts[0].map(v => Math.abs(v) < 0.001 ? 0 : Math.round(v * 1000) / 1000);
      const p2 = fe.pts[1].map(v => Math.abs(v) < 0.001 ? 0 : Math.round(v * 1000) / 1000);
      const key = [p1, p2].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]).map(p => p.join(',')).join('|');
      
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key)!.push({faceId: face.id, dir: fe.dir});
    });
  });

  let matchIdCounter = 0;
  faces.forEach(f => f.edgeMatchIds = {});
  const edgeMatches: EdgeMatch[] = [];

  edgeMap.forEach((matches) => {
    if (matches.length === 2) {
      const [m1, m2] = matches;
      if (!foldEdges.has(`${m1.faceId}|${m1.dir}`) && !foldEdges.has(`${m2.faceId}|${m2.dir}`)) {
        edgeMatches.push({
          face1Id: m1.faceId, edge1: m1.dir,
          face2Id: m2.faceId, edge2: m2.dir,
          matchId: matchIdCounter
        });
        
        const f1 = faces.find(f => f.id === m1.faceId)!;
        const f2 = faces.find(f => f.id === m2.faceId)!;
        (f1.edgeMatchIds as any)[m1.dir] = matchIdCounter;
        (f2.edgeMatchIds as any)[m2.dir] = matchIdCounter;
        matchIdCounter++;
      }
    }
  });

  const minX = Math.min(...faces.map(f => f.x));
  const minY = Math.min(...faces.map(f => f.y));
  const maxX = Math.max(...faces.map(f => f.x + f.width));
  const maxY = Math.max(...faces.map(f => f.y + f.height));

  return {
    id: `${patternId}-${variantIndex}`,
    patternId, variantIndex,
    faces: faces.map((f, i) => {
      const s = faceStates[i];
      const n = s.normal;
      let sideId = 0;
      if (Math.abs(n[2]) > 0.1) sideId = n[2] > 0 ? 0 : 1;
      else if (Math.abs(n[1]) > 0.1) sideId = n[1] > 0 ? 2 : 3;
      else if (Math.abs(n[0]) > 0.1) sideId = n[0] > 0 ? 4 : 5;
      return {...f, x: f.x - minX, y: f.y - minY, sideId};
    }),
    totalWidth: maxX - minX,
    totalHeight: maxY - minY,
    minX, minY,
    edgeMatches
  };
};

export const generateAllNets = (dims: Dimensions, isCube: boolean): NetData[] => {
  const results: NetData[] = [];
  if (isCube) {
    const perm: [number, number, number] = [dims.l, dims.l, dims.l];
    NET_PATTERNS.forEach(pattern => {
      const net = generateNet(pattern.id, pattern.structure, dims, perm, 1);
      if (net) results.push(net);
    });
  } else {
    const d = [dims.l, dims.w, dims.h];
    const startConfigs: [number, number, number][] = [
      [d[0], d[1], d[2]], [d[0], d[2], d[1]], [d[1], d[0], d[2]], 
      [d[1], d[2], d[0]], [d[2], d[0], d[1]], [d[2], d[1], d[0]]
    ];
    NET_PATTERNS.forEach(pattern => {
      startConfigs.forEach((config, idx) => {
        const net = generateNet(pattern.id, pattern.structure, dims, config, idx + 1);
        if (net) results.push(net);
      });
    });
  }
  return results.sort((a, b) => a.patternId - b.patternId || a.variantIndex - b.variantIndex);
};
