/**
 * NORTHSTAR Tools - Universal N x N Sliding Puzzle Solver Engine
 * Solves arbitrary N x N sliding puzzles (2x2 up to 8x8+) using reduction method and BFS.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SlidePuzzleSolver = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Direction definitions
  var DIRS = [
    { r: -1, c: 0, name: 'UP', desc: 'UP into the blank' },
    { r: 1, c: 0, name: 'DOWN', desc: 'DOWN into the blank' },
    { r: 0, c: -1, name: 'LEFT', desc: 'LEFT into the blank' },
    { r: 0, c: 1, name: 'RIGHT', desc: 'RIGHT into the blank' }
  ];

  function createSet() {
    if (typeof Set !== 'undefined') return new Set();
    var obj = {};
    return {
      add: function (val) { obj[val] = true; },
      has: function (val) { return !!obj[val]; }
    };
  }

  /**
   * Check if a board configuration is solvable
   * @param {number} n Grid size
   * @param {Array<number>} board Flat array of length n*n, tiles 1..(n*n-1) and blank (0)
   * @param {number} [blankVal=0]
   * @returns {{ solvable: boolean, inversions: number, blankRowFromBottom: number }}
   */
  function checkSolvability(n, board, blankVal) {
    if (blankVal === undefined) blankVal = 0;
    var inversions = 0;
    var flat = [];
    var blankIndex = -1;

    for (var i = 0; i < board.length; i++) {
      if (board[i] === blankVal) {
        blankIndex = i;
      } else {
        flat.push(board[i]);
      }
    }

    for (var i = 0; i < flat.length; i++) {
      for (var j = i + 1; j < flat.length; j++) {
        if (flat[i] > flat[j]) {
          inversions++;
        }
      }
    }

    var blankRow = Math.floor(blankIndex / n);
    var blankRowFromBottom = n - blankRow; // 1-based from bottom

    var solvable;
    if (n % 2 === 1) {
      // Odd grid (3x3, 5x5, 7x7): Solvable if inversions is even
      solvable = (inversions % 2 === 0);
    } else {
      // Even grid (4x4, 6x6, 8x8):
      // If blank is on odd row from bottom (1, 3, 5...), inversions must be even.
      // If blank is on even row from bottom (2, 4, 6...), inversions must be odd.
      if (blankRowFromBottom % 2 === 1) {
        solvable = (inversions % 2 === 0);
      } else {
        solvable = (inversions % 2 === 1);
      }
    }

    return {
      solvable: solvable,
      inversions: inversions,
      blankRowFromBottom: blankRowFromBottom,
      blankIndex: blankIndex
    };
  }

  /**
   * Fix unsolvable parity by swapping two adjacent non-blank tiles
   * @param {number} n
   * @param {Array<number>} board
   * @param {number} [blankVal=0]
   * @returns {Array<number>} New board copy with parity swapped
   */
  function fixParity(n, board, blankVal) {
    if (blankVal === undefined) blankVal = 0;
    var copy = board.slice();
    var idx1 = -1, idx2 = -1;
    for (var i = 0; i < copy.length - 1; i++) {
      if (copy[i] !== blankVal && copy[i + 1] !== blankVal) {
        idx1 = i;
        idx2 = i + 1;
        break;
      }
    }
    if (idx1 !== -1) {
      var tmp = copy[idx1];
      copy[idx1] = copy[idx2];
      copy[idx2] = tmp;
    }
    return copy;
  }

  /**
   * Solver instance
   */
  function Solver(n, initialBoard, blankVal) {
    this.n = n;
    this.blankVal = blankVal !== undefined ? blankVal : 0;
    this.board = initialBoard.slice();
    this.initialBoard = initialBoard.slice();
    this.moves = [];
    this.locked = typeof Uint8Array !== 'undefined' ? new Uint8Array(n * n) : new Array(n * n);
    if (!this.locked.fill) {
      for (var i = 0; i < n * n; i++) this.locked[i] = 0;
    }
    this.currentPhase = "Starting";
  }

  Solver.prototype.get = function (r, c) {
    return this.board[r * this.n + c];
  };

  Solver.prototype.set = function (r, c, v) {
    this.board[r * this.n + c] = v;
  };

  Solver.prototype.find = function (val) {
    for (var r = 0; r < this.n; r++) {
      for (var c = 0; c < this.n; c++) {
        if (this.get(r, c) === val) return { r: r, c: c };
      }
    }
    return null;
  };

  Solver.prototype.isLocked = function (r, c) {
    return this.locked[r * this.n + c] === 1;
  };

  Solver.prototype.lock = function (r, c) {
    this.locked[r * this.n + c] = 1;
  };

  Solver.prototype.unlock = function (r, c) {
    this.locked[r * this.n + c] = 0;
  };

  /**
   * Slide the blank space to adjacent coordinate (r, c)
   */
  Solver.prototype.slideBlankTo = function (r, c) {
    var b = this.find(this.blankVal);
    var dr = r - b.r;
    var dc = c - b.c;
    if (Math.abs(dr) + Math.abs(dc) !== 1) {
      throw new Error("Invalid move from blank (" + b.r + "," + b.c + ") to (" + r + "," + c + ")");
    }

    var movedTile = this.get(r, c);
    var dir, dirDesc;

    // Movement direction of the TILE that slides into the blank
    if (dr === 1 && dc === 0) {
      dir = "UP"; // tile at (b.r+1, b.c) moves UP into blank
      dirDesc = "Slide UP";
    } else if (dr === -1 && dc === 0) {
      dir = "DOWN"; // tile at (b.r-1, b.c) moves DOWN into blank
      dirDesc = "Slide DOWN";
    } else if (dr === 0 && dc === 1) {
      dir = "LEFT"; // tile at (b.r, b.c+1) moves LEFT into blank
      dirDesc = "Slide LEFT";
    } else if (dr === 0 && dc === -1) {
      dir = "RIGHT"; // tile at (b.r, b.c-1) moves RIGHT into blank
      dirDesc = "Slide RIGHT";
    }

    this.set(b.r, b.c, movedTile);
    this.set(r, c, this.blankVal);

    this.moves.push({
      step: this.moves.length + 1,
      tile: movedTile,
      from: { r: r, c: c },
      to: { r: b.r, c: b.c },
      blankFrom: { r: b.r, c: b.c },
      blankTo: { r: r, c: c },
      dir: dir,
      dirDesc: dirDesc,
      phase: this.currentPhase,
      boardState: this.board.slice() // snapshot of board after this move
    });
  };

  /**
   * Move the blank to target coordinate (tr, tc) avoiding locked cells
   */
  Solver.prototype.routeBlank = function (tr, tc) {
    var b = this.find(this.blankVal);
    if (b.r === tr && b.c === tc) return true;

    var n = this.n;
    var queue = [{ r: b.r, c: b.c, path: [] }];
    var visited = typeof Uint8Array !== 'undefined' ? new Uint8Array(n * n) : {};
    visited[b.r * n + b.c] = 1;

    var dirs = [
      { r: -1, c: 0 },
      { r: 1, c: 0 },
      { r: 0, c: -1 },
      { r: 0, c: 1 }
    ];

    while (queue.length > 0) {
      var curr = queue.shift();
      if (curr.r === tr && curr.c === tc) {
        for (var i = 0; i < curr.path.length; i++) {
          this.slideBlankTo(curr.path[i].r, curr.path[i].c);
        }
        return true;
      }

      for (var d = 0; d < 4; d++) {
        var nr = curr.r + dirs[d].r;
        var nc = curr.c + dirs[d].c;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
          var idx = nr * n + nc;
          if (visited[idx] === 0 && !this.isLocked(nr, nc)) {
            visited[idx] = 1;
            var np = curr.path.slice();
            np.push({ r: nr, c: nc });
            queue.push({ r: nr, c: nc, path: np });
          }
        }
      }
    }
    return false;
  };

  /**
   * Move single tile to target (targetR, targetC) using joint BFS (tile, blank)
   */
  Solver.prototype.moveTile = function (val, targetR, targetC) {
    var tPos = this.find(val);
    var bPos = this.find(this.blankVal);
    if (tPos.r === targetR && tPos.c === targetC) return true;

    var n = this.n;
    var queue = [{ tr: tPos.r, tc: tPos.c, br: bPos.r, bc: bPos.c, moves: [] }];
    var visited = createSet();
    visited.add((tPos.r << 12) | (tPos.c << 8) | (bPos.r << 4) | bPos.c);

    var dirs = [
      { r: -1, c: 0 },
      { r: 1, c: 0 },
      { r: 0, c: -1 },
      { r: 0, c: 1 }
    ];

    var solutionMoves = null;
    while (queue.length > 0) {
      var curr = queue.shift();
      if (curr.tr === targetR && curr.tc === targetC) {
        solutionMoves = curr.moves;
        break;
      }

      for (var d = 0; d < 4; d++) {
        var nbr = curr.br + dirs[d].r;
        var nbc = curr.bc + dirs[d].c;
        if (nbr >= 0 && nbr < n && nbc >= 0 && nbc < n && !this.isLocked(nbr, nbc)) {
          var ntr = curr.tr;
          var ntc = curr.tc;
          if (nbr === curr.tr && nbc === curr.tc) {
            ntr = curr.br;
            ntc = curr.bc;
          }
          var key = (ntr << 12) | (ntc << 8) | (nbr << 4) | nbc;
          if (!visited.has(key)) {
            visited.add(key);
            var nm = curr.moves.slice();
            nm.push({ br: nbr, bc: nbc });
            queue.push({ tr: ntr, tc: ntc, br: nbr, bc: nbc, moves: nm });
          }
        }
      }
    }

    if (!solutionMoves) return false;

    for (var i = 0; i < solutionMoves.length; i++) {
      this.slideBlankTo(solutionMoves[i].br, solutionMoves[i].bc);
    }
    return true;
  };

  /**
   * Move pair of tiles (valA, valB) simultaneously into (tAr, tAc) and (tBr, tBc)
   */
  Solver.prototype.movePair = function (valA, valB, tAr, tAc, tBr, tBc) {
    var pA = this.find(valA);
    var pB = this.find(valB);
    var bPos = this.find(this.blankVal);

    if (pA.r === tAr && pA.c === tAc && pB.r === tBr && pB.c === tBc) {
      return true;
    }

    var n = this.n;
    var queue = [{
      ar: pA.r, ac: pA.c,
      br: pB.r, bc: pB.c,
      kr: bPos.r, kc: bPos.c,
      moves: []
    }];

    // Bit-packing key: 6 coordinates in [0..15] = 24 bits
    var visited = createSet();
    var startKey = (pA.r << 20) | (pA.c << 16) | (pB.r << 12) | (pB.c << 8) | (bPos.r << 4) | bPos.c;
    visited.add(startKey);

    var dirs = [
      { r: -1, c: 0 },
      { r: 1, c: 0 },
      { r: 0, c: -1 },
      { r: 0, c: 1 }
    ];

    var solutionMoves = null;
    while (queue.length > 0) {
      var curr = queue.shift();
      if (curr.ar === tAr && curr.ac === tAc && curr.br === tBr && curr.bc === tBc) {
        solutionMoves = curr.moves;
        break;
      }

      for (var d = 0; d < 4; d++) {
        var nkr = curr.kr + dirs[d].r;
        var nkc = curr.kc + dirs[d].c;
        if (nkr >= 0 && nkr < n && nkc >= 0 && nkc < n && !this.isLocked(nkr, nkc)) {
          var nar = curr.ar, nac = curr.ac;
          var nbr = curr.br, nbc = curr.bc;

          if (nkr === curr.ar && nkc === curr.ac) {
            nar = curr.kr; nac = curr.kc;
          } else if (nkr === curr.br && nkc === curr.bc) {
            nbr = curr.kr; nbc = curr.kc;
          }

          var key = (nar << 20) | (nac << 16) | (nbr << 12) | (nbc << 8) | (nkr << 4) | nkc;
          if (!visited.has(key)) {
            visited.add(key);
            var nm = curr.moves.slice();
            nm.push({ r: nkr, c: nkc });
            queue.push({
              ar: nar, ac: nac,
              br: nbr, bc: nbc,
              kr: nkr, kc: nkc,
              moves: nm
            });
          }
        }
      }
    }

    if (!solutionMoves) return false;

    for (var i = 0; i < solutionMoves.length; i++) {
      this.slideBlankTo(solutionMoves[i].r, solutionMoves[i].c);
    }
    return true;
  };

  /**
   * Full solve execution
   */
  Solver.prototype.solve = function () {
    var n = this.n;

    // Check 2x2 base case
    if (n === 2) {
      this.currentPhase = "Solving 2×2 Puzzle";
      this.solve2x2(0, 0);
      return this.moves;
    }

    // Solve rows 0 to n-3
    for (var r = 0; r < n - 2; r++) {
      this.currentPhase = "Solving Row " + (r + 1);

      // Place tiles (r, 0) to (r, n-3)
      for (var c = 0; c < n - 2; c++) {
        var targetVal = r * n + c + 1;
        var ok = this.moveTile(targetVal, r, c);
        if (!ok) throw new Error("Could not route tile #" + targetVal + " to (" + (r + 1) + ", " + (c + 1) + ")");
        this.lock(r, c);
      }

      // Last two tiles of row r
      var valA = r * n + (n - 2) + 1; // belongs at (r, n-2)
      var valB = r * n + (n - 1) + 1; // belongs at (r, n-1)

      var okPair = this.movePair(valA, valB, r, n - 2, r, n - 1);
      if (!okPair) throw new Error("Could not solve row " + (r + 1) + " corner tiles");

      this.lock(r, n - 2);
      this.lock(r, n - 1);
    }

    // Columns 0 to n-3 for the remaining 2 rows (n-2, n-1)
    for (var col = 0; col < n - 2; col++) {
      this.currentPhase = "Solving Column " + (col + 1);

      var valTop = (n - 2) * n + col + 1; // belongs at (n-2, col)
      var valBot = (n - 1) * n + col + 1; // belongs at (n-1, col)

      var okCol = this.movePair(valTop, valBot, n - 2, col, n - 1, col);
      if (!okCol) throw new Error("Could not solve column " + (col + 1) + " tiles");

      this.lock(n - 2, col);
      this.lock(n - 1, col);
    }

    // Final 2x2 block at bottom-right
    this.currentPhase = "Solving Final 2×2 Block";
    this.solve2x2(n - 2, n - 2);

    return this.moves;
  };

  /**
   * Solve the 2x2 block rooted at (topR, topC)
   */
  Solver.prototype.solve2x2 = function (topR, topC) {
    var n = this.n;
    var t11 = topR * n + topC + 1;
    var t12 = topR * n + (topC + 1) + 1;
    var t21 = (topR + 1) * n + topC + 1;
    var goal2x2 = [t11, t12, t21, this.blankVal];

    var b2x2Start = [
      this.get(topR, topC), this.get(topR, topC + 1),
      this.get(topR + 1, topC), this.get(topR + 1, topC + 1)
    ];

    function isGoal(arr) {
      for (var i = 0; i < 4; i++) {
        if (arr[i] !== goal2x2[i]) return false;
      }
      return true;
    }

    if (isGoal(b2x2Start)) return;

    var q = [{ state: b2x2Start.slice(), moves: [] }];
    var vis = createSet();
    vis.add(b2x2Start.join(","));

    var adj = [
      [1, 2],
      [0, 3],
      [0, 3],
      [1, 2]
    ];

    var sol2x2 = null;
    while (q.length > 0) {
      var c2 = q.shift();
      if (isGoal(c2.state)) {
        sol2x2 = c2.moves;
        break;
      }
      var blankIdx = -1;
      for (var i = 0; i < 4; i++) {
        if (c2.state[i] === this.blankVal) { blankIdx = i; break; }
      }
      var neighbors = adj[blankIdx];
      for (var ni = 0; ni < neighbors.length; ni++) {
        var nIdx = neighbors[ni];
        var nextState = c2.state.slice();
        nextState[blankIdx] = nextState[nIdx];
        nextState[nIdx] = this.blankVal;
        var key2 = nextState.join(",");
        if (!vis.has(key2)) {
          vis.add(key2);
          var nMoves = c2.moves.slice();
          nMoves.push(nIdx);
          q.push({ state: nextState, moves: nMoves });
        }
      }
    }

    if (!sol2x2) {
      throw new Error("Final 2×2 block is unsolvable! Parity error detected.");
    }

    var coords = [
      { r: topR, c: topC },
      { r: topR, c: topC + 1 },
      { r: topR + 1, c: topC },
      { r: topR + 1, c: topC + 1 }
    ];

    for (var m = 0; m < sol2x2.length; m++) {
      var targetCoord = coords[sol2x2[m]];
      this.slideBlankTo(targetCoord.r, targetCoord.c);
    }
  };

  return {
    Solver: Solver,
    checkSolvability: checkSolvability,
    fixParity: fixParity
  };
}));
