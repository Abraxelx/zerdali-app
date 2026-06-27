export type Direction = "up" | "down" | "left" | "right";

export type Game2048State = {
  grid: number[][];
  score: number;
  maxTile: number;
  moves: number;
  gameOver: boolean;
  wonTile: boolean;
};

const SIZE = 4;

function emptyGrid(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

function gridMaxTile(grid: number[][]): number {
  return grid.reduce((max, row) => Math.max(max, ...row), 0);
}

function randomEmptyCell(grid: number[][]): [number, number] | null {
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (!empty.length) return null;
  return empty[Math.floor(Math.random() * empty.length)];
}

export function spawnTile(grid: number[][]): number[][] {
  const next = cloneGrid(grid);
  const cell = randomEmptyCell(next);
  if (!cell) return next;
  const [r, c] = cell;
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function createInitialState(): Game2048State {
  let grid = emptyGrid();
  grid = spawnTile(grid);
  grid = spawnTile(grid);
  return {
    grid,
    score: 0,
    maxTile: gridMaxTile(grid),
    moves: 0,
    gameOver: false,
    wonTile: false,
  };
}

/** Sıfır olmayan karoları sola yasla ve birleştir. */
function mergeLine(line: number[]): { line: number[]; gained: number; changed: boolean } {
  const filtered = line.filter((v) => v !== 0);
  const merged: number[] = [];
  let gained = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const value = filtered[i] * 2;
      merged.push(value);
      gained += value;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i += 1;
    }
  }
  while (merged.length < line.length) merged.push(0);
  const changed = merged.some((v, idx) => v !== line[idx]);
  return { line: merged, gained, changed };
}

function shiftRow(row: number[], toLeft: boolean): { row: number[]; gained: number; changed: boolean } {
  const working = toLeft ? [...row] : [...row].reverse();
  const result = mergeLine(working);
  return {
    row: toLeft ? result.line : result.line.reverse(),
    gained: result.gained,
    changed: result.changed,
  };
}

function shiftColumn(grid: number[][], col: number, towardTop: boolean): {
  column: number[];
  gained: number;
  changed: boolean;
} {
  const column = grid.map((row) => row[col]);
  const result = shiftRow(column, towardTop);
  return { column: result.row, gained: result.gained, changed: result.changed };
}

export function move(state: Game2048State, direction: Direction): Game2048State | null {
  if (state.gameOver) return null;

  let changed = false;
  let gained = 0;
  const grid = cloneGrid(state.grid);

  if (direction === "left" || direction === "right") {
    const toLeft = direction === "left";
    for (let r = 0; r < SIZE; r++) {
      const result = shiftRow(grid[r], toLeft);
      if (result.changed) changed = true;
      gained += result.gained;
      grid[r] = result.row;
    }
  } else {
    const towardTop = direction === "up";
    for (let c = 0; c < SIZE; c++) {
      const result = shiftColumn(grid, c, towardTop);
      if (result.changed) changed = true;
      gained += result.gained;
      for (let r = 0; r < SIZE; r++) {
        grid[r][c] = result.column[r];
      }
    }
  }

  if (!changed) return null;

  const withTile = spawnTile(grid);
  const maxTile = Math.max(state.maxTile, gridMaxTile(withTile));
  const next: Game2048State = {
    grid: withTile,
    score: state.score + gained,
    maxTile,
    moves: state.moves + 1,
    gameOver: false,
    wonTile: state.wonTile || maxTile >= 2048,
  };
  if (!canMove(next.grid)) {
    next.gameOver = true;
  }
  return next;
}

export function canMove(grid: number[][]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = grid[r][c];
      if (value === 0) return true;
      if (c + 1 < SIZE && grid[r][c + 1] === value) return true;
      if (r + 1 < SIZE && grid[r + 1][c] === value) return true;
    }
  }
  return false;
}

export function tileColor(value: number): { bg: string; text: string } {
  const palette: Record<number, { bg: string; text: string }> = {
    0: { bg: "rgba(120, 113, 108, 0.15)", text: "transparent" },
    2: { bg: "#eee4da", text: "#776e65" },
    4: { bg: "#ede0c8", text: "#776e65" },
    8: { bg: "#f2b179", text: "#f9f6f2" },
    16: { bg: "#f59563", text: "#f9f6f2" },
    32: { bg: "#f67c5f", text: "#f9f6f2" },
    64: { bg: "#f65e3b", text: "#f9f6f2" },
    128: { bg: "#edcf72", text: "#f9f6f2" },
    256: { bg: "#edcc61", text: "#f9f6f2" },
    512: { bg: "#edc850", text: "#f9f6f2" },
    1024: { bg: "#edc53f", text: "#f9f6f2" },
    2048: { bg: "#edc22e", text: "#f9f6f2" },
    4096: { bg: "#3c3a32", text: "#f9f6f2" },
    8192: { bg: "#3c3a32", text: "#f9f6f2" },
    16384: { bg: "#3c3a32", text: "#f9f6f2" },
    32768: { bg: "#3c3a32", text: "#f9f6f2" },
    65536: { bg: "#3c3a32", text: "#f9f6f2" },
    131072: { bg: "#3c3a32", text: "#f9f6f2" },
  };
  return palette[value] || { bg: "#3c3a32", text: "#f9f6f2" };
}

export function formatTile(value: number): string {
  if (value === 0) return "";
  if (value >= 1024) return String(value);
  return String(value);
}
