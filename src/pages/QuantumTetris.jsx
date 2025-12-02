import React, { useEffect, useRef, useState } from "react";

/* ======================================================
   CONFIG
======================================================*/
const ROWS = 20;
const COLS = 10;
const CELL = 30;

const COLORS = [
  "#00e5ff","#ff4081","#76ff03","#ffd740","#ff3d00","#b388ff",
  "#00bcd4","#ff9800","#ff1744","#c6ff00","#536dfe","#00e676",
  "#651fff","#f50057","#ffea00","#18ffff","#ff9100","#ff3d00",
  "#7c4dff","#64ffda","#ff6e40","#2979ff","#69f0ae","#ff5252",
];

const SHAPES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};

const SHAPE_KEYS = Object.keys(SHAPES);

/* ======================================================
   HELPERS
======================================================*/
const clone = (b) => b.map((r) => r.slice());
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

const emptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const rotateMatrix = (mat) => {
  const R = mat.length;
  const C = mat[0].length;
  const out = Array.from({ length: C }, () => Array(R).fill(0));
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      out[c][R - 1 - r] = mat[r][c];
  return out;
};

const generatePiece = () => {
  const type = rand(SHAPE_KEYS);
  const shape = SHAPES[type].map((r) => r.slice());
  return {
    type,
    shape,
    row: -2,
    col: Math.floor((COLS - shape[0].length) / 2),
    color: rand(COLORS),
  };
};

/* ======================================================
   SFX (Oscillator)
======================================================*/
function useSFX(enabled) {
  const ctxRef = useRef(null);

  const play = (pitch = 440) => {
    if (!enabled) return;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);

    o.frequency.value = pitch;
    o.type = "square";

    g.gain.value = 0.001;
    g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

    o.start();
    o.stop(ctx.currentTime + 0.3);
  };

  return { play };
}

/* ======================================================
   PREMIUM UI COMPONENTS
======================================================*/
const FancyButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "12px 16px",
      borderRadius: 10,
      width: "100%",
      background: active
        ? "linear-gradient(135deg, #0af, #c0f)"
        : "rgba(255,255,255,0.08)",
      border: active
        ? "2px solid #7cf1ff"
        : "1px solid rgba(255,255,255,0.15)",
      color: active ? "white" : "#d0eaff",
      boxShadow: active
        ? "0 0 14px rgba(0,180,255,0.6)"
        : "0 0 5px rgba(255,255,255,0.1)",
      fontWeight: 600,
      cursor: "pointer",
      transition: "all .2s",
    }}
  >
    {children}
  </button>
);

function clearLeaderboard() {
  const confirmClear = window.confirm("Clear all leaderboard history?");
  if (!confirmClear) return;

  localStorage.removeItem("qteris-lb");
  setLeaderboard([]);
}


const ScoreBox = ({ score, level }) => (
  <div
    style={{
      padding: 18,
      borderRadius: 12,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      backdropFilter: "blur(6px)",
      textAlign: "center",
      marginBottom: 28,
      boxShadow: "0 0 18px rgba(0,255,255,0.08)",
    }}
  >
    <div style={{ fontSize: 18 }}>Score</div>
    <div style={{ fontSize: 38, fontWeight: 700, color: "#7cff9b" }}>
      {score}
    </div>

    <div style={{ marginTop: 15, fontSize: 18 }}>Level</div>
    <div style={{ fontSize: 32, fontWeight: 700, color: "#ffda6b" }}>
      {level}
    </div>
  </div>
);

const LBCard = ({ rank, score, time }) => (
  <div
    style={{
      padding: "10px 14px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.1)",
      backdropFilter: "blur(4px)",
      marginBottom: 10,
      color: "#ccf",
      fontSize: 14,
      display: "flex",
      justifyContent: "space-between",
    }}
  >
    <div>
      <b style={{ color: "#8be" }}>#{rank}</b> – {time}
    </div>
    <div style={{ color: "#7cff9b" }}>{score}</div>
  </div>
);

/* ======================================================
   MAIN COMPONENT
======================================================*/
export default function QuantumTetris() {
  /* State */
  const [board, setBoard] = useState(emptyBoard());
  const [piece, setPiece] = useState(generatePiece());
  const [next, setNext] = useState(generatePiece());

  const [mode, setMode] = useState("classical");
  const [teleportSec, setTeleportSec] = useState(3);

  const [running, setRunning] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);

  const [leaderboard, setLeaderboard] = useState([]);

  const { play } = useSFX(soundOn);

  const fallInterval = useRef(750);
  const lastFallRef = useRef(0);
  const teleportRef = useRef(0);
  const raf = useRef(null);

  /* Load leaderboard */
  useEffect(() => {
    const lb = JSON.parse(localStorage.getItem("qteris-lb") || "[]");
    setLeaderboard(lb);
  }, []);

  /* Recalculate gravity when level changes */
  useEffect(() => {
    fallInterval.current = Math.max(120, 900 - level * 70);
  }, [level]);

  /* Valid move */
  function valid(col, row, shape, brd = board) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (!shape[r][c]) continue;

        const rr = row + r;
        const cc = col + c;

        if (cc < 0 || cc >= COLS) return false;
        if (rr >= ROWS) return false;
        if (rr >= 0 && brd[rr][cc]) return false;
      }
    }
    return true;
  }

  /* Quantum teleport */
  function teleportPiece() {
    if (!piece) return;
    const shape = piece.shape;

    let validColumns = [];
    for (let c = 0; c < COLS; c++) {
      if (valid(c, piece.row, shape)) validColumns.push(c);
    }
    if (!validColumns.length) return;

    const target = rand(validColumns);
    setPiece((p) => ({ ...p, col: target }));
    play(900);
  }

  /* Gravity + teleport loop */
  function loop(time) {
    if (!lastFallRef.current) lastFallRef.current = time;
    if (!teleportRef.current) teleportRef.current = time;

    if (running && !gameOver) {
      if (time - lastFallRef.current > fallInterval.current) {
        dropStep();
        lastFallRef.current = time;
      }

      if (mode === "quantum" && time - teleportRef.current > teleportSec * 1000) {
        teleportPiece();
        teleportRef.current = time;
      }
    }

    raf.current = requestAnimationFrame(loop);
  }

  useEffect(() => {
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  });

  /* Drop step */
  function dropStep() {
    if (valid(piece.col, piece.row + 1, piece.shape))
      setPiece((p) => ({ ...p, row: p.row + 1 }));
    else lockPiece();
  }

  /* Lock piece */
  function lockPiece() {
    const nb = clone(board);
    let overflow = false;

    piece.shape.forEach((r, ri) =>
      r.forEach((v, ci) => {
        if (!v) return;
        const rr = piece.row + ri;
        const cc = piece.col + ci;

        if (rr < 0) overflow = true;
        else nb[rr][cc] = { color: piece.color };
      })
    );

    if (overflow) return gameOverTrigger();

    const { cleared, newBoard } = clearLines(nb);
    if (cleared) {
      play(1000);
      setScore((s) => s + cleared * 100);
      setLevel((l) => Math.floor((score + cleared * 100) / 600) + 1);
    }

    setBoard(newBoard);
    setPiece(next);
    setNext(generatePiece());
  }

  /* Clear rows */
  function clearLines(b) {
    let cleared = 0;
    let kept = [];

    for (let r = 0; r < ROWS; r++) {
      if (b[r].every((c) => c !== null)) cleared++;
      else kept.push(b[r]);
    }

    while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));

    return { cleared, newBoard: kept };
  }

  /* Game over */
  function gameOverTrigger() {
    setGameOver(true);
    setRunning(false);
    play(120);

    const entry = { score, level, time: new Date().toLocaleString() };
    const updated = [entry, ...leaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    localStorage.setItem("qteris-lb", JSON.stringify(updated));
    setLeaderboard(updated);
  }

  /* Keyboard controls */
  useEffect(() => {
    const key = (e) => {
      if (gameOver) return;

      if (e.key === "ArrowLeft") {
        if (valid(piece.col - 1, piece.row, piece.shape))
          setPiece((p) => ({ ...p, col: p.col - 1 }));
      }

      if (e.key === "ArrowRight") {
        if (valid(piece.col + 1, piece.row, piece.shape))
          setPiece((p) => ({ ...p, col: p.col + 1 }));
      }

      if (e.key === "ArrowDown") dropStep();

      if (e.key === "ArrowUp") {
        const rot = rotateMatrix(piece.shape);
        if (valid(piece.col, piece.row, rot)) {
          setPiece((p) => ({ ...p, shape: rot }));
          play(600);
        }
      }
    };

    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  /* Composite board (ghost + piece) */
  function composite() {
    const b = clone(board);

    // Ghost
    let ghostRow = piece.row;
    while (valid(piece.col, ghostRow + 1, piece.shape)) ghostRow++;

    piece.shape.forEach((r, ri) =>
      r.forEach((v, ci) => {
        if (!v) return;
        const gr = ghostRow + ri;
        const gc = piece.col + ci;
        if (gr >= 0)
          b[gr][gc] = { color: piece.color + "55" };
      })
    );

    // Actual piece
    piece.shape.forEach((r, ri) =>
      r.forEach((v, ci) => {
        if (!v) return;
        const rr = piece.row + ri;
        const cc = piece.col + ci;
        if (rr >= 0)
          b[rr][cc] = { color: piece.color };
      })
    );

    return b;
  }

  /* Render */
  return (
    <div style={{
        minHeight: "90vh",
        background: "radial-gradient(circle at top, #030b18, #000)",
        color: "white",
        display: "flex",
        justifyContent: "center",
        padding: 20,
        gap: 20,
        flexWrap: "wrap",
      }}>
    {/* ================= HEADER ================ */}
<div 
  style={{
    width: "100%",
    textAlign: "center",
    marginBottom: 5,
    marginTop: -10,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  }}
>
  {/* Back Button */}
  <button
    onClick={() => window.history.back()}
    style={{
      position: "absolute",
      left: 20,
      padding: "8px 14px",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#fff",
      borderRadius: 8,
      fontSize: 14,
      cursor: "pointer",
      backdropFilter: "blur(4px)",
      boxShadow: "0 0 8px rgba(0,0,0,0.3)"
    }}
  >
 Home
  </button>

  {/* Title */}
  <h1
    style={{
      fontFamily: "Science Gothic, Orbitron, sans-serif",
      fontSize: 36,
      fontWeight: 900,
      letterSpacing: "3px",
      color: "transparent",
      backgroundImage:
        "linear-gradient(90deg, #00eaff, #7d5bff, #ff4fff, #00eaff)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      textShadow: "0 0 20px rgba(0,180,255,0.5)",
      animation: "quantumGlow 5s linear infinite"
    }}
  >
    QUANTUM TETRIS
  </h1>

</div>
    <div
    style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #030b18, #000)",
        color: "white",
        transform: "scale(0.90)",
    transformOrigin: "top center",
        display: "flex",
        justifyContent: "center",
        padding: 10,
        gap: 30,
        flexWrap: "wrap",
      }}>

      {/* LEFT CONTROLS PANEL */}
      <div
        style={{
          width: 240,
          minWidth: 240,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <h2 className="text-blue-400 text-center text-3xl" style={{ textAlign: "center", fontFamily:"Science Gothic" }}>Controls</h2>

        {/* Mode */}
        <div>
          <div className="text-amber-400 text-center text-xl" style={{ marginBottom: 8, fontFamily:"Science Gothic"}}>Mode</div>
          <FancyButton
            active={mode === "classical"}
            onClick={() => setMode("classical")}
          >
            Classical
          </FancyButton>

          <div style={{ height: 10 }} />

          <FancyButton
            active={mode === "quantum"}
            onClick={() => setMode("quantum")}
          >
            Quantum
          </FancyButton>
        </div>

        {/* Teleport input */}
        {mode === "quantum" && (
          <div>
            <div>Teleport every (seconds)</div>
            <input
              type="number"
              min="1"
              value={teleportSec}
              onChange={(e) => setTeleportSec(Number(e.target.value))}
              style={{
                width: "100%",
                marginTop: 6,
                padding: 8,
                background: "#000",
                color: "#0ff",
                border: "1px solid #0ff",
                borderRadius: 8,
              }}
            />
          </div>
        )}

        {/* Sound */}
        <FancyButton
          active={soundOn}
          onClick={() => setSoundOn((s) => !s)}
        >
          Sound: {soundOn ? "On" : "Off"}
        </FancyButton>

        {/* Pause */}
        <FancyButton onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Resume"}
        </FancyButton>

        {/* Restart */}
        <FancyButton onClick={() => window.location.reload()}>
          Restart
        </FancyButton>

        {/* Next piece */}
        <div style={{ marginTop: 20 }}>
          <div className="text-amber-400 text-xl text-center" style={{fontFamily:"Science Gothic"}}>Next</div>
          <div
            style={{
              marginTop: 10,
              marginLeft:55,
              background: "#111",
              width: 130,
              height: 130,
              borderRadius: 12,
              padding: 10,
            }}
          >
            {next.shape.map((r, ri) => (
              <div key={ri} style={{ display: "flex" }}>
                {r.map((v, ci) => (
                  <div
                    key={ci}
                    style={{
                      width: 20,
                      height: 20,
                      background: v ? next.color : "transparent",
                      margin: 2,
                      boxShadow: v ? `0 0 8px ${next.color}` : "none",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER BOARD */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          padding: 20,
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,200,255,0.07)",
          position: "relative",
        }}
      >
        {/* Grid */}
        <div
          style={{
            width: COLS * (CELL + 2),
            height: ROWS * (CELL + 2),
            background: "#111216",
            borderRadius: 12,
            padding: 8,
          }}
        >
          {composite().map((row, ri) => (
            <div key={ri} style={{ display: "flex" }}>
              {row.map((cell, ci) => (
                <div
                  key={ci}
                  style={{
                    width: CELL,
                    height: CELL,
                    margin: 1,
                    borderRadius: 4,
                    background: cell ? cell.color : "#111",
                    boxShadow: cell
                      ? `0 0 8px ${cell.color}`
                      : "inset 0 0 0 1px #000",
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Game Over Overlay */}
        {gameOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              borderRadius: 16,
            }}
          >
            <div
              style={{
                fontSize: 48,
                marginBottom: 10,
                fontWeight: 900,
                color: "#ff5c5c",
                textShadow: "0 0 20px red",
              }}
            >
              GAME OVER
            </div>
            <div style={{ fontSize: 20, marginBottom: 20, opacity: 0.8 }}>
              Score: {score}
            </div>
            <FancyButton onClick={() => window.location.reload()}>
              Restart
            </FancyButton>
          </div>
        )}

        {/* MOBILE CONTROLS */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "center",
            gap: 15,
          }}
        >
          <FancyButton onClick={() => {
            if (valid(piece.col - 1, piece.row, piece.shape))
              setPiece((p) => ({ ...p, col: p.col - 1 }));
          }}>←</FancyButton>

          <FancyButton onClick={() => {
            const rot = rotateMatrix(piece.shape);
            if (valid(piece.col, piece.row, rot))
              setPiece((p) => ({ ...p, shape: rot }));
          }}>⟳</FancyButton>

          <FancyButton onClick={() => {
            if (valid(piece.col + 1, piece.row, piece.shape))
              setPiece((p) => ({ ...p, col: p.col + 1 }));
          }}>→</FancyButton>

          <FancyButton onClick={() => dropStep()}>
            ↓
          </FancyButton>
        </div>
      </div>

      {/* RIGHT PANEL — SCOREBOARD & LEADERBOARD */}
      <div
        style={{
          width: 260,
          minWidth: 260,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ScoreBox score={score} level={level} />

        <h2 className="text-blue-400 text-2xl text-center font-semibold tracking-wide" style={{ marginBottom: 10, fontFamily: "Science Gothic, sans-serif"}}>Leaderboard</h2>

        {leaderboard.length === 0 ? (
          <div style={{ opacity: 0.6 }}>No scores yet</div>
        ) : (
          leaderboard.map((e, i) => (
            <LBCard
              key={i}
              rank={i + 1}
              score={e.score}
              time={e.time}
            />
          ))
        )}
        <button
  onClick={clearLeaderboard}
  style={{
    padding: "8px 12px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#ff6e6e",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 12,
    width: "100%",
    boxShadow: "0 0 8px rgba(255,60,60,0.3)",
    transition: ".2s",
  }}
>
  🗑 Clear Leaderboard
</button>

<footer
  style={{
    marginTop: "40px",
    marginBottom: "20px",
    width: "100%",
    textAlign: "center",

    /* Minimal but premium look */
    fontSize: "14px",
    letterSpacing: "0.5px",
    opacity: 0.7,
    color: "#cbd5e1",

    /* glowing subtle fade */
    textShadow: "0 0 6px rgba(255,255,255,0.18)",
  }}
>
  © 2025 — Sudipta Majumder
</footer>

        <style>
{`
  /* Desktop & large devices — NO SCROLLING */
  @media (min-width: 900px) {
    html, body {
      overflow: hidden !important;
      height: 100%;
    }
  }

  /* Mobile — scroll allowed */
  @media (max-width: 899px) {
    html, body {
      overflow-y: auto !important;
      height: auto;
    }
  }
`}
</style>

      </div>
    </div>
    </div>
  );
}
