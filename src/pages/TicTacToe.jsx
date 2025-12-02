import React, { useEffect, useRef, useState } from "react";

/* --------------------------
   Constants
   -------------------------- */
const WIN_PATTERNS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export default function TicTacToe() {
  /* --------------------------
     State: Game & Settings
     -------------------------- */
  const [board, setBoard] = useState(Array(9).fill(""));
  const [isXTurn, setIsXTurn] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winningTiles, setWinningTiles] = useState([]);
  // winning line coords (fix for previous ReferenceError)
  const [lineCoords, setLineCoords] = useState({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const [showLine, setShowLine] = useState(false);

  const [aiThinking, setAiThinking] = useState(false);
  const [isSinglePlayer, setIsSinglePlayer] = useState(true);
  const [aiSymbol, setAiSymbol] = useState("O"); // AI plays 'O' by default
  const [difficulty, setDifficulty] = useState("hard"); // 'easy' or 'hard'
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Scoreboard persisted
  const [score, setScore] = useState(() => {
    try {
      const s = localStorage.getItem("tictactoe-score");
      return s ? JSON.parse(s) : { wins: 0, losses: 0, draws: 0 };
    } catch {
      return { wins: 0, losses: 0, draws: 0 };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("tictactoe-score", JSON.stringify(score));
    } catch {}
  }, [score]);

  /* --------------------------
     Refs: canvases, tiles, board
     -------------------------- */
  const particlesRef = useRef(null);
  const confettiRef = useRef(null);
  const sparksCanvasRef = useRef(null);
  const tileRefs = useRef([]);
  const boardRef = useRef(null);

  /* --------------------------
     Audio helpers
     -------------------------- */
  const audioRef = useRef({ ctx: null });
  const ensureAudio = () => {
    if (!audioRef.current.ctx) {
      try {
        audioRef.current.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        audioRef.current.ctx = null;
      }
    }
  };
  const tone = (freq = 440, dur = 0.08, type = "sine") => {
    if (!audioEnabled) return;
    try {
      ensureAudio();
      const ctx = audioRef.current.ctx;
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.stop(ctx.currentTime + dur + 0.02);
    } catch {}
  };
  const playPlaceSound = () => tone(520, 0.06, "triangle");
  const playAiSound = () => tone(320, 0.06, "sine");
  const playWinSound = () => {
    tone(880, 0.08, "sine");
    setTimeout(() => tone(660, 0.09, "sine"), 80);
    setTimeout(() => tone(990, 0.10, "sine"), 160);
  };
  const playDrawSound = () => tone(240, 0.18, "sawtooth");

  /* --------------------------
     Background particles (subtle)
     -------------------------- */
  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let parts = [];
    const init = (n = 80) => {
      parts = [];
      for (let i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.8 + Math.random() * 1.8,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          a: 0.12 + Math.random() * 0.4,
        });
      }
    };
    init();
    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      init(45);
    };
    window.addEventListener("resize", resize);

    let raf = null;
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* --------------------------
     Confetti engine
     -------------------------- */
  useEffect(() => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let pieces = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (x, y, count = 100) => {
      for (let i = 0; i < count; i++) {
        pieces.push({
          x,
          y,
          w: 6 + Math.random() * 6,
          h: 6 + Math.random() * 6,
          vx: (Math.random() - 0.5) * 8,
          vy: Math.random() * -8 - 3,
          ang: Math.random() * Math.PI * 2,
          va: (Math.random() - 0.5) * 0.2,
          color: `hsl(${Math.floor(Math.random() * 360)} 70% 60%)`,
          life: 0,
        });
      }
    };

    confettiRef.current.spawn = spawn;

    let raf = null;
    let last = performance.now();
    const draw = (t) => {
      const dt = (t - last) / 1000;
      last = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.vy += 18 * dt;
        p.x += p.vx;
        p.y += p.vy;
        p.ang += p.va;
        p.life += dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        if (p.y > canvas.height + 50 || p.life > 6) {
          pieces.splice(i, 1);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* --------------------------
     Sparks engine for hit effects
     -------------------------- */
  useEffect(() => {
    const canvas = sparksCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let sparks = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (x, y, color = "#fff", count = 18) => {
      for (let i = 0; i < count; i++) {
        sparks.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 1.5) * 6,
          life: 0,
          ttl: 40 + Math.random() * 30,
          color,
          size: 1 + Math.random() * 2,
        });
      }
    };

    sparksCanvasRef.current.spawn = spawn;

    let raf = null;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vy += 0.25;
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        ctx.globalAlpha = Math.max(0, 1 - s.life / s.ttl);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        if (s.life > s.ttl) sparks.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* --------------------------
     Utility: winner detection
     -------------------------- */
  const getWinnerPattern = (b) => {
    for (const p of WIN_PATTERNS) {
      const [a, b0, c] = p;
      if (b[a] && b[a] === b[b0] && b[a] === b[c]) return p;
    }
    return null;
  };

  /* --------------------------
     AI: Minimax + Easy
     -------------------------- */
  const emptyIndices = (b) => b.map((v, i) => (v === "" ? i : null)).filter((x) => x != null);

  const terminalResult = (b) => {
    const p = getWinnerPattern(b);
    if (p) return { winner: b[p[0]] };
    if (!b.includes("")) return { winner: "Draw" };
    return null;
  };

  const minimax = (b, player, ai, human) => {
    const tr = terminalResult(b);
    if (tr) {
      if (tr.winner === ai) return { score: 10 };
      if (tr.winner === human) return { score: -10 };
      return { score: 0 };
    }
    const moves = [];
    for (const i of emptyIndices(b)) {
      b[i] = player;
      const res = minimax(b, player === ai ? human : ai, ai, human);
      moves.push({ index: i, score: res.score });
      b[i] = "";
    }
    if (player === ai) {
      return moves.reduce((a, b) => (a.score > b.score ? a : b));
    } else {
      return moves.reduce((a, b) => (a.score < b.score ? a : b));
    }
  };

  const computeAiMove = (b) => {
    if (difficulty === "easy") {
      const moves = emptyIndices(b);
      return moves[Math.floor(Math.random() * moves.length)];
    } else {
      if (b.every((x) => x === "")) {
        return 4; // center
      }
      const human = aiSymbol === "X" ? "O" : "X";
      const best = minimax([...b], aiSymbol, aiSymbol, human);
      return best ? best.index : null;
    }
  };

  /* --------------------------
     Effects: Sparks + Confetti triggers
     -------------------------- */
  const triggerSparks = (clientX, clientY, color = "#fff") => {
    const c = sparksCanvasRef.current;
    if (c && c.spawn) c.spawn(clientX, clientY, color, 18);
  };

  const triggerConfetti = (count = 120) => {
    const c = confettiRef.current;
    if (!c || !c.spawn) return;
    const br = boardRef.current.getBoundingClientRect();
    const cx = br.left + br.width / 2 + (Math.random() - 0.5) * 80;
    const cy = br.top + br.height / 2 + (Math.random() - 0.5) * 40;
    c.spawn(cx, cy, count);
  };

  /* --------------------------
     End game handling
     -------------------------- */
  const endGameWithPattern = (pattern, finalBoard) => {
    setWinner(finalBoard[pattern[0]]);
    setWinningTiles(pattern);
    // draw line
    setTimeout(() => drawWinningLine(pattern), 30);
    // sounds + confetti
    playWinSound();
    triggerConfetti(140);

    const humanSymbol = aiSymbol === "X" ? "O" : "X";
    if (finalBoard[pattern[0]] === humanSymbol) {
      setScore((s) => ({ ...s, wins: s.wins + 1 }));
    } else {
      setScore((s) => ({ ...s, losses: s.losses + 1 }));
    }
  };

  const declareDraw = () => {
    setWinner("Draw");
    playDrawSound();
    triggerConfetti(40);
    setScore((s) => ({ ...s, draws: s.draws + 1 }));
  };

  /* --------------------------
     Draw winning line
     -------------------------- */
  const drawWinningLine = (pattern) => {
    try {
      const rects = pattern.map((i) => {
        const el = tileRefs.current[i];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      });
      if (rects.some((r) => r == null)) return;

      const boardRect = boardRef.current.getBoundingClientRect();
      const s = { x: rects[0].cx - boardRect.left, y: rects[0].cy - boardRect.top };
      const e = { x: rects[2].cx - boardRect.left, y: rects[2].cy - boardRect.top };

      setLineCoords({ x1: s.x, y1: s.y, x2: e.x, y2: e.y });
      setTimeout(() => setShowLine(true), 60);
    } catch {}
  };

  /* --------------------------
     Handle tile click
     -------------------------- */
  const handleTileClick = (index, ev) => {
    if (winner || aiThinking) return;
    if (board[index] !== "") return;

    const playerSymbol = isXTurn ? "X" : "O";

    // if single-player and it's AI's turn → block
    if (isSinglePlayer && playerSymbol === aiSymbol) return;

    // Play
    const next = [...board];
    next[index] = playerSymbol;
    setBoard(next);

    triggerSparks(ev?.clientX || window.innerWidth / 2, ev?.clientY || window.innerHeight / 2,
      playerSymbol === "X" ? "#00eaff" : "#ff6b6b"
    );
    playPlaceSound();

    // check win or draw
    const winPattern = getWinnerPattern(next);
    if (winPattern) return endGameWithPattern(winPattern, next);
    if (!next.includes("")) return declareDraw();

    // toggle turn
    setIsXTurn(!isXTurn);

    /* --------------------------
       Single-player AI turn
       -------------------------- */
    if (isSinglePlayer) {
      const humanSymbol = playerSymbol;
      const aiShouldPlay = aiSymbol !== humanSymbol;

      if (aiShouldPlay) {
        setAiThinking(true);
        setTimeout(() => {
          const move = computeAiMove(next);
          if (move != null) {
            const afterAi = [...next];
            afterAi[move] = aiSymbol;
            setBoard(afterAi);

            const el = tileRefs.current[move];
            if (el) {
              const r = el.getBoundingClientRect();
              triggerSparks(r.left + r.width / 2, r.top + r.height / 2,
                aiSymbol === "X" ? "#00eaff" : "#ff6b6b"
              );
            }
            playAiSound();

            const wp = getWinnerPattern(afterAi);
            if (wp) endGameWithPattern(wp, afterAi);
            else if (!afterAi.includes("")) declareDraw();
            else setIsXTurn(aiSymbol === "O"); 
          }
          setAiThinking(false);
        }, difficulty === "easy" ? 300 + Math.random() * 300 : 550 + Math.random() * 300);
      }
    }
  };

  /* --------------------------
     Reset game
     -------------------------- */
  const resetGame = () => {
    setBoard(Array(9).fill(""));
    setWinner(null);
    setWinningTiles([]);
    setShowLine(false);
    setLineCoords({ x1: 0, y1: 0, x2: 0, y2: 0 });
    setIsXTurn(true);
    setAiThinking(false);

    // If AI is X, AI starts
    if (isSinglePlayer && aiSymbol === "X") {
      setAiThinking(true);
      setTimeout(() => {
        const move = computeAiMove(Array(9).fill(""));
        if (move != null) {
          const b = Array(9).fill("");
          b[move] = aiSymbol;
          setBoard(b);
          playAiSound();
          setIsXTurn(false);
        }
        setAiThinking(false);
      }, 320);
    }
  };

  /* --------------------------
     First AI move if AI starts
     -------------------------- */
  useEffect(() => {
    if (isSinglePlayer && aiSymbol === "X") {
      setTimeout(() => {
        const move = computeAiMove(Array(9).fill(""));
        if (move != null) {
          const b = Array(9).fill("");
          b[move] = aiSymbol;
          setBoard(b);
          playAiSound();
          setIsXTurn(false);
        }
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------
     Recompute winning line on resize
     -------------------------- */
  useEffect(() => {
    const handler = () => {
      if (winner && winningTiles.length === 3) drawWinningLine(winningTiles);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, winningTiles]);

  /* --------------------------
     Animated SVG Symbols (X/O)
     -------------------------- */
  const SVG_X = ({ animate = true }) => (
    <svg viewBox="0 0 100 100" className="svg-x" style={{ width: "64%", height: "64%" }}>
      <path
        d="M20 20 L80 80"
        stroke="#00eaff"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        style={{
          strokeDasharray: 100,
          strokeDashoffset: animate ? 100 : 0,
          transition: "stroke-dashoffset 220ms ease-out",
        }}
      />
      <path
        d="M80 20 L20 80"
        stroke="#00eaff"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        style={{
          strokeDasharray: 100,
          strokeDashoffset: animate ? 100 : 0,
          transition: "stroke-dashoffset 220ms 70ms ease-out",
        }}
      />
    </svg>
  );

  const SVG_O = ({ animate = true }) => (
    <svg viewBox="0 0 100 100" className="svg-o" style={{ width: "64%", height: "64%" }}>
      <circle
        cx="50"
        cy="50"
        r="28"
        stroke="#ff6b6b"
        strokeWidth="9"
        fill="none"
        style={{
          strokeDasharray: 200,
          strokeDashoffset: animate ? 200 : 0,
          transition: "stroke-dashoffset 320ms ease-out",
        }}
      />
    </svg>
  );

  /* Smaller versions */
  const SVG_X_small = () => (
    <svg viewBox="0 0 100 100" style={{ width: "58%", height: "58%" }}>
      <path d="M20 20 L80 80" stroke="#00eaff" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M80 20 L20 80" stroke="#00eaff" strokeWidth="9" strokeLinecap="round" fill="none" />
    </svg>
  );

  const SVG_O_small = () => (
    <svg viewBox="0 0 100 100" style={{ width: "58%", height: "58%" }}>
      <circle cx="50" cy="50" r="28" stroke="#ff6b6b" strokeWidth="9" fill="none" />
    </svg>
  );

  /* --------------------------
     Engaging Button Helper
     -------------------------- */
  const EngagingButton = ({ onClick, active, children, style = {} }) => (
    <button
        onClick={onClick}
        className="engage-btn"
        style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.1)",

        /* Premium Neon Blue */
        background: active
            ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
            : "rgba(255,255,255,0.08)",

        color: active ? "#fff" : "#d0eaff",

        /* Glow only when active */
        boxShadow: active
            ? "0 0 12px rgba(90,160,255,0.8), 0 0 24px rgba(120,80,255,0.5)"
            : "0 0 4px rgba(255,255,255,0.15)",

        transform: active ? "translateY(-2px)" : "translateY(0)",
        transition: "all 220ms ease",
        cursor: "pointer",

        ...style,
        }}
    >
        {children}
    </button>
    );

  /* --------------------------
     Ensure tileRefs length 9
     -------------------------- */
  if (!tileRefs.current || tileRefs.current.length !== 9) {
    tileRefs.current = Array(9).fill().map((_, i) => tileRefs.current[i] || null);
  }

  /* --------------------------
     UI Return JSX begins...
     -------------------------- */
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "white", display: "flex", flexDirection: "column", alignItems: "center", padding: 18, overflowX: "hidden" }}>
      {/* CANVASES */}
      <canvas ref={particlesRef} style={{ position: "fixed", left: 0, top: 0, zIndex: 0, pointerEvents: "none" }} />
      <canvas ref={confettiRef} style={{ position: "fixed", left: 0, top: 0, zIndex: 60, pointerEvents: "none" }} />
      <canvas ref={sparksCanvasRef} style={{ position: "fixed", left: 0, top: 0, zIndex: 61, pointerEvents: "none" }} />

      {/* HEADER */}
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
      <header style={{ width: "100%", maxWidth: 1100, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, zIndex: 10 }}>
        <h1 style={{width: "100%", textAlign: "center", fontSize: 48, margin: "0 auto", padding: 0, letterSpacing: "2px", fontFamily: "Science Gothic, sans-serif", textShadow: "0 0 12px rgba(255,255,255,0.3)",}}>Tic Tac Toe</h1>
      </header>

      {/* MAIN CONTENT: Scoreboard + Board */}
      <main style={{ width: "100%", maxWidth: 1100, display: "flex", gap: 100, alignItems: "flex-start", justifyContent: "center", zIndex: 10 }}>
        {/* LEFT PANEL — Scoreboard */}
        <aside style={{ width: "260px", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", }}>
          <div style={{ width: "100%",
                        padding: 14,
                        borderRadius: 18,
                        position: "relative",

                        /* GLASS + NEON BLUE */
                        background:
                        "linear-gradient(145deg, rgba(20,25,40,0.45), rgba(10,14,22,0.55))",
                        backdropFilter: "blur(14px) saturate(180%)",
                        WebkitBackdropFilter: "blur(14px) saturate(180%)",

                        /* NEON BLUE BORDER */
                        border: "1.5px solid rgba(0,180,255,0.45)",
                        boxShadow:
                        "0 0 25px rgba(0,150,255,0.25), inset 0 0 22px rgba(0,150,255,0.18), 0 12px 38px rgba(0,0,0,0.7)",

                        /* SCANLINE LIGHT TEXTURE */
                        backgroundImage:
                        "linear-gradient(180deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                        backgroundSize: "100% 3px",
                        backgroundBlendMode: "overlay",

                        /* Hover glow */
                        transition: "all 300ms ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                        "0 0 35px rgba(0,175,255,0.35), inset 0 0 28px rgba(0,175,255,0.22), 0 16px 48px rgba(0,0,0,0.8)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                        "0 0 25px rgba(0,150,255,0.25), inset 0 0 22px rgba(0,150,255,0.18), 0 12px 38px rgba(0,0,0,0.7)";
                    }}
                    >
            <div className="text-blue-400 text-lg text-center font-semibold tracking-wide drop-shadow-[0_0_6px_rgba(255,191,0,0.7)]">  Scoreboard</div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, color: "#9be15d", fontWeight: 700 }}>{score.wins}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Wins</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, color: "#ffd166", fontWeight: 700 }}>{score.draws}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Draws</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, color: "#ff7b7b", fontWeight: 700 }}>{score.losses}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Losses</div>
              </div>
            </div>
          </div>

          {/* Status Panel */}
          <div style={{ width: "100%", padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", textAlign: "center", fontSize: 14 }}>
            <div style={{ marginBottom: 6 }}>Status</div>
            {!winner && !aiThinking && (
              <div>Turn: <span style={{ color: isXTurn ? "#00eaff" : "#ff6b6b", fontWeight: 700 }}>{isXTurn ? "X" : "O"}</span></div>
            )}
            {aiThinking && <div style={{ color: "#a0a0a0" }}>AI is thinking...</div>}
            {winner === "Draw" && <div style={{ color: "#ffd166" }}>It's a draw!</div>}
            {winner && winner !== "Draw" && <div style={{ color: "#9be15d" }}>{winner} Wins!</div>}
          </div>

          {/* RESET BUTTON */}
        <div style={{ width: "100%", display: "flex", gap: 8 }}>
        <EngagingButton
            onClick={() => setScore({ wins: 0, losses: 0, draws: 0 })}
            active={false}
            style={{ flex: 1 }}
        >
            Reset Scores
        </EngagingButton>
        </div>

        {/* PREMIUM GLASS CONTROL PANEL */}
        <div
        className="controls-panel"
        style={{
            width: "100%",
            padding: "16px 12px",
            borderRadius: 16,

            /* GLASS BACKGROUND */
            background: "rgba(20,20,30,0.35)",
            backdropFilter: "blur(14px) saturate(180%)",
            WebkitBackdropFilter: "blur(14px) saturate(180%)",

            /* NEON BORDER + SHADOW */
            border: "1px solid rgba(0,200,255,0.25)",
            boxShadow:
            "0 0 25px rgba(0,200,255,0.25), inset 0 0 18px rgba(255,255,255,0.05)",

            display: "flex",
            flexDirection: "column",
            gap: 14,
        }}
        >
        {/* ONE CONTROL ROW (Label + Buttons) */}
        {[
            {
            label: "Mode",
            content: (
                <>
                <EngagingButton onClick={() => { setIsSinglePlayer(true); resetGame(); }} active={isSinglePlayer}>
                    Single
                </EngagingButton>
                <EngagingButton onClick={() => { setIsSinglePlayer(false); resetGame(); }} active={!isSinglePlayer}>
                    Local 2P
                </EngagingButton>
                </>
            ),
            },
            {
            label: "User Label",
            content: (
                <>
                <EngagingButton onClick={() => { setAiSymbol("O"); resetGame(); }} active={aiSymbol === "O"}>
                    X
                </EngagingButton>
                <EngagingButton onClick={() => { setAiSymbol("X"); resetGame(); }} active={aiSymbol === "X"}>
                    O
                </EngagingButton>
                </>
            ),
            },
            isSinglePlayer && {
            label: "Difficulty",
            content: (
                <>
                <EngagingButton onClick={() => setDifficulty("easy")} active={difficulty === "easy"}>
                    Easy
                </EngagingButton>
                <EngagingButton onClick={() => setDifficulty("hard")} active={difficulty === "hard"}>
                    Hard
                </EngagingButton>
                </>
            ),
            },
            {
            label: "Audio",
            content: (
                <>
                <EngagingButton onClick={() => setAudioEnabled(v => !v)} active={audioEnabled}>
                    {audioEnabled ? "On" : "Off"}
                </EngagingButton>
                </>
            ),
            },
        ].map(
            (item, idx) =>
            item && (
                <div
                key={idx}
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                }}
                >
                <div
                    style={{
                    fontSize: 14,
                    color: "#a8e8ff",
                    textShadow: "0 0 8px rgba(0,200,255,0.5)",
                    minWidth: 70,
                    }}
                >
                    {item.label}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {item.content}
                </div>
                </div>
            )
        )}

        {/* Restart Button */}
        <EngagingButton
            onClick={() => resetGame()}
            active={false}
            style={{
            width: "100%",
            marginTop: 6,
            fontWeight: 600,
            background: "linear-gradient(90deg, #0f172a, #132a3c)",
            borderRadius: 12,
            }}
        >
            Restart
        </EngagingButton>
        </div>
        </aside>

        {/* --------------------------
            Tic Tac Toe Board
           -------------------------- */}
        <section ref={boardRef} style={{ position: "relative", padding: 18, borderRadius: 18, background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
          {/* WINNING LINE DRAWING */}
          <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 20 }}>
            <line x1={lineCoords.x1} y1={lineCoords.y1} x2={lineCoords.x2} y2={lineCoords.y2} stroke="#ffe66d" strokeWidth={8} strokeLinecap="round"
              style={{ opacity: showLine ? 1 : 0, strokeDasharray: 1000, strokeDashoffset: showLine ? 0 : 1000, transition: "stroke-dashoffset 700ms cubic-bezier(.2,.9,.2,1), opacity 200ms", filter: "drop-shadow(0 6px 20px rgba(255,230,109,0.08))" }} />
          </svg>

          {/* GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, width: "min(540px, 78vw)", height: "min(540px, 78vw)", zIndex: 10 }}>
            {board.map((v, i) => (
              <div key={i} style={{ height: "100%", display: "flex" }}>
                <div onClick={(ev) => handleTileClick(i, ev)} ref={(el) => (tileRefs.current[i] = el)}
                  style={{
                    flex: 1,
                    aspectRatio: "1 / 1",
                    borderRadius: 18,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    /* --- ULTRA GLASS EFFECT --- */
                    background: v
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px) saturate(180%)",
                    WebkitBackdropFilter: "blur(12px) saturate(180%)",

                    /* Glass border */
                    border: "1.5px solid rgba(255,255,255,0.22)",
                    boxShadow:
                        v
                        ? "inset 0 0 25px rgba(255,255,255,0.25), 0 0 25px rgba(0,255,255,0.15), 0 8px 25px rgba(0,0,0,0.6)"
                        : "0 6px 18px rgba(0,0,0,0.45)",

                    /* Reflection layer */
                    backgroundImage:
                        "linear-gradient(145deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 40%, rgba(0,0,0,0.15) 100%)",

                    /* Idle floating effect */
                    transform: "translateZ(0)",
                    transition:
                        "box-shadow 260ms ease, background 260ms ease, transform 300ms cubic-bezier(.2,.9,.2,1)",
                    cursor: v || winner || aiThinking ? "default" : "pointer",/* Lift on hover */
                    ...(v === ""
                        ? {
                            ":hover": {
                            boxShadow:
                                "0 0 28px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.75)",
                            transform: "translateY(-3px)",
                            },
                        }
                        : {}),
                    }}>
                  {/* Tile content with 3D flip animation */}
                  <div style={{ transform: v ? "rotateY(180deg)" : "rotateY(0deg)", transition: "transform 420ms cubic-bezier(.2,.9,.2,1)", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                    {v === "X" && <SVG_X_small />}
                    {v === "O" && <SVG_O_small />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    {/* ELEGANT MINIMAL FOOTER */}
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

      {/* INLINE STYLES & MEDIA QUERIES */}
      <style>{`
        .engage-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 640px) {
          header {
            flex-direction: column !important;
            gap: 8px;
            align-items: flex-start !important;
          }

          main {
            flex-direction: column !important;
            align-items: center !important;
          }

          aside {
            width: 100% !important;
          }
        .controls-panel {
            width: 100% !important;
            padding: 14px !important;
        }

        .controls-panel > div {
            flex-direction: column !important;
            align-items: center !important;
            gap: 8px !important;
        }
        }

        .svg-x path,
        .svg-o circle {
          filter: drop-shadow(0 6px 20px rgba(0,0,0,0.6));
        }
      `}</style>
    </div>
  );
} // ← END OF COMPONENT
