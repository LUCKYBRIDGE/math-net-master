
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Face {
  id: number;
  width: number;
  height: number;
  x: number; 
  y: number; 
  isBase?: boolean;
  parentId?: number;
  attachDir?: Direction;
  sideId?: number; // 0-5 representing the 6 sides of a box
  edgeMatchIds?: {
    up?: number;
    down?: number;
    left?: number;
    right?: number;
  };
}

export interface EdgeMatch {
  face1Id: number;
  edge1: Direction;
  face2Id: number;
  edge2: Direction;
  matchId: number; // 0-6 (7 pairs of edges meet for a closed box)
}

export interface NetData {
  id: string;
  patternId: number;
  variantIndex: number;
  faces: Face[];
  totalWidth: number;
  totalHeight: number;
  minX: number;
  minY: number;
  edgeMatches: EdgeMatch[];
}

export interface Dimensions {
  l: number;
  w: number;
  h: number;
}

export interface NetPattern {
  id: number;
  structure: {
    from: number;
    to: number;
    dir: Direction;
  }[];
}
