import { NetData } from '../types';

export const getNetAlignment = (net: NetData, scale: number) => {
  const rootFace = net.faces.find(face => face.id === 0) ?? net.faces[0];
  if (!rootFace) {
    return {
      rootFace: undefined,
      rootCenter: { x: 0, y: 0 },
      netCenter: { x: 0, y: 0 },
      baseOffset: { x: 0, y: 0 },
      centerSnap: { x: 0, y: 0 }
    };
  }

  const netCenter = { x: net.totalWidth / 2, y: net.totalHeight / 2 };
  const rootCenter = {
    x: rootFace.x + rootFace.width / 2,
    y: rootFace.y + rootFace.height / 2
  };
  const centerSnap = {
    x: rootFace.width % 2 !== 0 ? scale / 2 : 0,
    y: rootFace.height % 2 !== 0 ? scale / 2 : 0
  };
  const baseOffsetRaw = {
    x: (rootCenter.x - netCenter.x) * scale,
    y: (rootCenter.y - netCenter.y) * scale
  };
  const baseOffset = {
    x: Math.round((baseOffsetRaw.x - centerSnap.x) / scale) * scale + centerSnap.x,
    y: Math.round((baseOffsetRaw.y - centerSnap.y) / scale) * scale + centerSnap.y
  };

  return {
    rootFace,
    rootCenter,
    netCenter,
    baseOffset,
    centerSnap
  };
};
