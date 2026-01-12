import { NetPattern } from './types';

// The 11 canonical nets of a cube.
// Categorized by the length of the longest row (Center Strip).

export const NET_PATTERNS: NetPattern[] = [
  // ============================================================
  // TYPE 1: Center Row has 4 Faces (6 Patterns)
  // Structure: 1-4-1
  // Base Strip: 0-1-2-3 (Left to Right)
  // ============================================================
  
  // (1) The T (Previously 6)
  // Up at 0, Down at 0 (Both on the first face)
  // X
  // XXXX
  // X
  {
    id: 1,
    structure: [
      { from: 0, to: 1, dir: 'right' },
      { from: 1, to: 2, dir: 'right' },
      { from: 2, to: 3, dir: 'right' },
      { from: 0, to: 4, dir: 'up' },
      { from: 0, to: 5, dir: 'down' },
    ]
  },

  // (2) The Offset T (Previously 1) - Flipped
  // Up at 0, Down at 1
  // X
  // XXXX
  //   X
  {
    id: 2,
    structure: [
      { from: 0, to: 1, dir: 'right' },
      { from: 1, to: 2, dir: 'right' },
      { from: 2, to: 3, dir: 'right' },
      { from: 1, to: 4, dir: 'down' }, 
      { from: 0, to: 5, dir: 'up' },   
    ]
  },

  // (3) The Split (Rotated 180) - Unchanged
  // Up at 0, Down at 2
  // X
  // XXXX
  //   X
  {
    id: 3,
    structure: [
      { from: 0, to: 1, dir: 'right' },
      { from: 1, to: 2, dir: 'right' },
      { from: 2, to: 3, dir: 'right' },
      { from: 0, to: 4, dir: 'up' },   
      { from: 2, to: 5, dir: 'down' }, 
    ]
  },

  // (4) The Hooks - Unchanged
  // Up at 0, Down at 3
  // X
  // XXXX
  //    X
  {
    id: 4,
    structure: [
      { from: 0, to: 1, dir: 'right' },
      { from: 1, to: 2, dir: 'right' },
      { from: 2, to: 3, dir: 'right' },
      { from: 0, to: 4, dir: 'up' },
      { from: 3, to: 5, dir: 'down' },
    ]
  },

  // (5) The Cross - Unchanged
  // Up at 1, Down at 1
  //   X
  // XXXX
  //   X
  {
    id: 5,
    structure: [
      { from: 0, to: 1, dir: 'right' },
      { from: 1, to: 2, dir: 'right' },
      { from: 2, to: 3, dir: 'right' },
      { from: 1, to: 4, dir: 'up' },
      { from: 1, to: 5, dir: 'down' },
    ]
  },

  // (6) The Long Cross (Previously 2)
  // Up at 1, Down at 2
  //   X
  // XXXX
  //    X
  {
    id: 6,
    structure: [
      { from: 0, to: 1, dir: 'right' },
      { from: 1, to: 2, dir: 'right' },
      { from: 2, to: 3, dir: 'right' },
      { from: 1, to: 4, dir: 'up' },
      { from: 2, to: 5, dir: 'down' },
    ]
  },

  // ============================================================
  // TYPE 2: Center Row has 3 Faces (4 Patterns)
  // Structure: 2-3-1, 1-3-2, or 3-3
  // ============================================================

  // (7) S-Bone Custom (Moved here from 9)
  // Top: 2 faces (Left aligned relative to mid)
  // Mid: 3 faces
  // Bot: 1 face (Right aligned relative to mid)
  // XX
  //  XXX
  //    X
  {
    id: 7,
    structure: [
        // Root is Mid-Mid (1,1) of grid 1-2, 6-7-8, 12
        // Corresponds to '7' in user diagram
        { from: 0, to: 1, dir: 'left' },  // 6 (Left of 7)
        { from: 0, to: 2, dir: 'right' }, // 8 (Right of 7)
        { from: 1, to: 3, dir: 'up' },    // 2 (Above 6)
        { from: 3, to: 4, dir: 'left' },  // 1 (Left of 2)
        { from: 2, to: 5, dir: 'down' },  // 12 (Below 8)
    ]
  },

  // (8) Duck / Stacked Type (Moved here from 7)
  // Top: 2 faces, Mid: 3 faces, Bot: 1 face
  // Top-Right over Mid-Left. Bot under Mid-Left.
  // XX
  //  XXX
  //  X
  {
    id: 8,
    structure: [
        // Root is Mid-Left (1,1)
        { from: 0, to: 1, dir: 'right' }, // Mid-Mid (2,1)
        { from: 1, to: 2, dir: 'right' }, // Mid-Right (3,1)
        { from: 0, to: 3, dir: 'up' },    // Top-Right (1,0)
        { from: 3, to: 4, dir: 'left' },  // Top-Left (0,0)
        { from: 0, to: 5, dir: 'down' },  // Bot (1,2) - under Mid-Left
    ]
  },

  // (9) S-Bone Type 1 (Moved here from 8)
  // Top: 2 faces, Mid: 3 faces, Bot: 1 face
  // Top-Right over Mid-Left. Bot under Mid-Mid.
  // XX
  //  XXX
  //   X
  {
    id: 9,
    structure: [
        // Root is Mid-Left (1,1)
        { from: 0, to: 1, dir: 'right' }, // Mid-Mid (2,1)
        { from: 1, to: 2, dir: 'right' }, // Mid-Right (3,1)
        { from: 0, to: 3, dir: 'up' },    // Top-Right (1,0)
        { from: 3, to: 4, dir: 'left' },  // Top-Left (0,0)
        { from: 1, to: 5, dir: 'down' },  // Bot (2,2) - under Mid-Mid
    ]
  },

  // (10) Two Rows (Shifted)
  // Top: 3 faces, Bot: 3 faces
  // Overlap of 1 face (Rightmost of Top, Leftmost of Bot).
  // XXX
  //   XXX
  {
    id: 10,
    structure: [
        // Root is Top-Right (2,0) [Face 3 in diagram]
        { from: 0, to: 1, dir: 'left' },  // Top-Mid [Face 2]
        { from: 1, to: 2, dir: 'left' },  // Top-Left [Face 1]
        { from: 0, to: 3, dir: 'down' },  // Bot-Left of block [Face 8] (Under Face 3)
        { from: 3, to: 4, dir: 'right' }, // Bot-Mid [Face 9]
        { from: 4, to: 5, dir: 'right' }  // Bot-Right [Face 10]
    ]
  },

  // ============================================================
  // TYPE 3: Center Row has 2 Faces (1 Pattern)
  // Structure: 2-2-2
  // ============================================================

  // (11) The Stairs
  // Structure: 2-2-2
  // XX
  //  XX
  //   XX
  {
    id: 11,
    structure: [
        { from: 0, to: 1, dir: 'right' },
        { from: 1, to: 2, dir: 'down' },
        { from: 2, to: 3, dir: 'right' },
        { from: 3, to: 4, dir: 'down' },
        { from: 4, to: 5, dir: 'right' },
    ]
  }
];