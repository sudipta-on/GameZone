// ===============================
// QUANTUM CHESS — PART 1 / 4
// ===============================

import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getDatabase, ref, set, get, onValue, update
} from "firebase/database";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "firebase/auth";

// ------------------------------
// 🔥 Firebase Config
// ------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyB5f19sPqkcFxFfMPXETsOtFoaMldnfxJ8",
  authDomain: "chess-4a43e.firebaseapp.com",
  databaseURL: "https://chess-4a43e-default-rtdb.firebaseio.com",
  projectId: "chess-4a43e",
  storageBucket: "chess-4a43e.firebasestorage.app",
  messagingSenderId: "107484841064",
  appId: "1:107484841064:web:8d5e5b39cc8acf77f927dd",
  measurementId: "G-18VSPV0W9J"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ------------------------------
// 🎨 PREMIUM UI STYLE
// ------------------------------
const neonText = {
  fontFamily: "Science Gothic, Orbitron, sans-serif",
  backgroundImage: "linear-gradient(90deg,#00eaff,#7d5bff,#ff4fff,#00eaff)",
  WebkitBackgroundClip: "text",
  color: "transparent",
  textShadow: "0 0 15px rgba(0,200,255,0.4)"
};

const panel = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: 20,
  backdropFilter: "blur(6px)"
};

const btn = {
  width: "100%",
  padding: "12px 16px",
  marginTop: 8,
  background: "rgba(255,255,255,0.08)",
  color: "#d0eaff",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  cursor: "pointer",
  fontWeight: 600,
  transition: "0.15s"
};

const btnActive = {
  ...btn,
  background: "linear-gradient(135deg,#0af,#c0f)",
  boxShadow: "0 0 12px rgba(0,180,255,0.6)",
  border: "2px solid #7cf1ff",
  color: "#fff"
};

// ------------------------------
// ♟ Chess960 Generator
// ------------------------------
function generate960() {
  let squares = ["R","N","B","Q","K","B","N","R"];
  let valid = false;

  while (!valid) {
    squares = ["R","N","B","Q","K","B","N","R"].sort(() => Math.random() - 0.5);

    let b = squares.map((p,i)=>p==="B"?i:null).filter(v=>v!==null);
    let dark = [1,3,5,7];
    if (dark.includes(b[0]) !== dark.includes(b[1])) {
      let k = squares.indexOf("K");
      let r = squares.map((p,i)=>p==="R"?i:null).filter(v=>v!==null);
      if (r[0] < k && k < r[1]) valid = true;
    }
  }

  return squares;
}

// ------------------------------
// 🟦 Board Setup
// ------------------------------
function createStandard() {
  return {
    board: [
      ["R","N","B","Q","K","B","N","R"],
      Array(8).fill("P"),
      ...Array(4).fill(Array(8).fill("")),
      Array(8).fill("p"),
      ["r","n","b","q","k","b","n","r"]
    ],
    turn: "white"
  };
}

function create960Board() {
  const back = generate960();
  return {
    board: [
      back.map(c=>c),
      Array(8).fill("P"),
      ...Array(4).fill(Array(8).fill("")),
      Array(8).fill("p"),
      back.map(c=>c.toLowerCase())
    ],
    turn: "white"
  };
}

// ------------------------------
// 🔐 Firebase Auth Hook
// ------------------------------
function useFirebaseAuth() {
  const [uid, setUid] = useState(null);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    onAuthStateChanged(auth, user => user && setUid(user.uid));
  }, []);

  return uid;
}

// ------------------------------
// 🧠 Move Validation (simple engine)
// ------------------------------
function inside(r,c){ return r>=0 && r<8 && c>=0 && c<8; }
function typeOf(p){
  let u=p.toUpperCase();
  return u==="P"?"pawn":
         u==="R"?"rook":
         u==="N"?"knight":
         u==="B"?"bishop":
         u==="Q"?"queen":
         u==="K"?"king":"";
}

const DIR = {
  rook:[[1,0],[-1,0],[0,1],[0,-1]],
  bishop:[[1,1],[1,-1],[-1,1],[-1,-1]],
  queen:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
};

function canMove(board,r1,c1,r2,c2,turn){
  let p=board[r1][c1]; if(!p) return false;
  let isW = p===p.toUpperCase();
  if((turn==="white"&&!isW)||(turn==="black"&&isW)) return false;

  let t=board[r2][c2];
  if(t && (t===t.toUpperCase())===isW) return false;

  let type=typeOf(p);

  // Pawn
  if(type==="pawn"){
    let dir=isW?-1:1;
    let start=isW?6:1;

    if(c1===c2 && board[r2][c2]===""){
      if(r2===r1+dir) return true;
      if(r1===start && r2===r1+2*dir && board[r1+dir][c1]==="") return true;
    }
    if(Math.abs(c1-c2)===1 && r2===r1+dir && t!=="") return true;
    return false;
  }

  // Knight
  if(type==="knight"){
    return [
      [1,2],[1,-2],[-1,2],[-1,-2],
      [2,1],[2,-1],[-2,1],[-2,-1]
    ].some(([dr,dc]) => r1+dr===r2 && c1+dc===c2);
  }

  // King + pseudo-castling
  if(type==="king"){
    if(Math.abs(r1-r2)<=1 && Math.abs(c1-c2)<=1) return true;

    // Castling (simplified for 960)
    if(r1===r2){
      if(c2<c1){ // left
        for(let c=c2;c<c1;c++) if(board[r1][c]!=="" && c!==c2) return false;
        return true;
      }
      if(c2>c1){ // right
        for(let c=c1;c<c2;c++) if(board[r1][c]!=="" && c!==c1) return false;
        return true;
      }
    }
    return false;
  }

  // Sliding pieces
  let d = type==="rook"?DIR.rook:type==="bishop"?DIR.bishop:DIR.queen;
  for(let [dr,dc] of d){
    let rr=r1+dr, cc=c1+dc;
    while(inside(rr,cc)){
      if(rr===r2 && cc===c2) return true;
      if(board[rr][cc] !== "") break;
      rr+=dr; cc+=dc;
    }
  }
  return false;
}
// ============================================
// QUANTUM CHESS — PART 2 / 4
// Create/Join Screen + Board Renderer UI
// ============================================

// ---------- CREATE / JOIN LOBBY ----------
function CreateOrJoin({ onStart }) {
  const [mode, setMode] = useState("single");
  const [variant, setVariant] = useState("standard");
  const [timer, setTimer] = useState("timeless");
  const [difficulty, setDifficulty] = useState("easy");
  const [joinCode, setJoinCode] = useState("");

  async function createRoom() {
    const id = Math.random().toString(36).substring(2, 7);

    const initial = variant === "standard"
      ? createStandard()
      : create960Board();

    await set(ref(db, "rooms/" + id), {
      mode,
      variant,
      timer,
      difficulty,
      state: initial,
      players: {},
      created: Date.now(),
    });

    onStart(id, true);
  }

  async function joinRoom() {
    if (!joinCode) return;
    const snap = await get(ref(db, "rooms/" + joinCode));
    if (!snap.exists()) {
      alert("Room not found!");
      return;
    }
    onStart(joinCode, false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      color: "white",
      textAlign: "center",
      paddingTop: 40,
      background: "radial-gradient(circle at top,#030b18,#000)",
    }}>
      <h1 style={{ ...neonText, fontSize: 52 }}>QUANTUM CHESS</h1>
      <p style={{ opacity: 0.7, marginBottom: 20 }}>
        Online • Chess960 • AI • Timers
      </p>

      <div style={{ ...panel, width: 420, margin: "0 auto" }}>
        {/* Mode */}
        <h3>Game Mode</h3>
        <button
          style={mode === "single" ? btnActive : btn}
          onClick={() => setMode("single")}
        >
          Single Player
        </button>

        <button
          style={mode === "multi" ? btnActive : btn}
          onClick={() => setMode("multi")}
        >
          Multiplayer
        </button>

        <hr style={{ opacity: 0.2, margin: "18px 0" }} />

        {/* Variant */}
        <h3>Variant</h3>
        <button
          style={variant === "standard" ? btnActive : btn}
          onClick={() => setVariant("standard")}
        >
          Standard Chess
        </button>

        <button
          style={variant === "960" ? btnActive : btn}
          onClick={() => setVariant("960")}
        >
          Chess960
        </button>

        <hr style={{ opacity: 0.2, margin: "18px 0" }} />

        {/* Timer */}
        <h3>Timer</h3>
        <button
          style={timer === "timeless" ? btnActive : btn}
          onClick={() => setTimer("timeless")}
        >
          Timeless
        </button>

        <button
          style={timer === "5min" ? btnActive : btn}
          onClick={() => setTimer("5min")}
        >
          5-Min Blitz
        </button>

        {/* Difficulty only for single player */}
        {mode === "single" && (
          <>
            <hr style={{ opacity: 0.2, margin: "18px 0" }} />
            <h3>AI Difficulty</h3>

            <button
              style={difficulty === "easy" ? btnActive : btn}
              onClick={() => setDifficulty("easy")}
            >
              Easy
            </button>

            <button
              style={difficulty === "medium" ? btnActive : btn}
              onClick={() => setDifficulty("medium")}
            >
              Medium
            </button>

            <button
              style={difficulty === "hard" ? btnActive : btn}
              onClick={() => setDifficulty("hard")}
            >
              Hard
            </button>
          </>
        )}

        <hr style={{ opacity: 0.2, margin: "18px 0" }} />

        {/* Create */}
        <button
          style={btnActive}
          onClick={createRoom}
        >
          Create Game
        </button>

        {/* Join (only shown for multiplayer mode) */}
        {mode === "multi" && (
          <>
            <input
              placeholder="Room Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{
                width: "100%",
                marginTop: 14,
                padding: 10,
                borderRadius: 8,
              }}
            />

            <button
              onClick={joinRoom}
              style={btn}
            >
              Join Game
            </button>
          </>
        )}
      </div>
    </div>
  );
}


// --------------------------------------------------
// CHESS BOARD RENDERER
// --------------------------------------------------
function ChessBoard({ state, canPlay, onMove }) {
  const { board, turn } = state;
  const [selected, setSelected] = useState(null);

  function click(r, c) {
    if (!selected) {
      const p = board[r][c];
      if (!p) return;

      const white = p === p.toUpperCase();
      if ((turn === "white" && white && canPlay) ||
          (turn === "black" && !white && canPlay)) {
        setSelected({ r, c });
      }
      return;
    }

    // Try move
    if (canMove(board, selected.r, selected.c, r, c, turn)) {
      onMove(selected.r, selected.c, r, c);
      setSelected(null);
    } else {
      setSelected(null);
    }
  }

  return (
    <div style={{ display: "inline-block" }}>
      {board.map((row, r) => (
        <div key={r} style={{ display: "flex" }}>
          {row.map((sq, c) => (
            <div
              key={c}
              onClick={() => click(r, c)}
              style={{
                width: 70,
                height: 70,
                border: selected?.r === r && selected?.c === c
                  ? "3px solid #00eaff"
                  : "1px solid rgba(255,255,255,0.1)",
                background:
                  (r + c) % 2 === 0
                    ? "#1d2a38"
                    : "#15202c",
                color: "white",
                fontSize: 34,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: canPlay ? "pointer" : "default",
              }}
            >
              {sq}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export { CreateOrJoin, ChessBoard };
// ==============================================
// QUANTUM CHESS — PART 3 / 4
// Realtime Multiplayer Engine + Game Screen
// ==============================================


// -------------------------------
// Firebase Auth Hook
// -------------------------------
function useChessAuth() {
  const [uid, setUid] = useState(null);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);

    return onAuthStateChanged(auth, (u) => {
      if (u) setUid(u.uid);
    });
  }, []);

  return uid;
}


// -------------------------------
// MULTIPLAYER GAME SCREEN
// -------------------------------
function MultiplayerGame({ roomId, isCreator }) {
  const uid = useChessAuth();

  const [state, setState] = useState(null);
  const [side, setSide] = useState(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [timer, setTimer] = useState(null);

  // subscribe to room updates
  useEffect(() => {
    if (!uid) return;

    const roomRef = ref(db, "rooms/" + roomId);

    return onValue(roomRef, (snap) => {
      const data = snap.val();
      if (!data) return;

      setState(data.state);
      setTimer(data.timer);

      // Assign player sides
      if (data.players) {
        const players = data.players;
        const entries = Object.entries(players);

        // Current player's side
        if (players[uid]) {
          setSide(players[uid]);
        }

        // Check if both players present
        setOpponentReady(entries.length === 2);
      }
    });
  }, [uid]);


  // Assign side (white for creator, black for joiner)
  useEffect(() => {
    if (!uid) return;

    const playerRef = ref(db, "rooms/" + roomId + "/players");

    if (isCreator) {
      update(playerRef, { [uid]: "white" });
    } else {
      update(playerRef, { [uid]: "black" });
    }
  }, [uid]);


  // ----- Move execution -----
  async function sendMove(r1, c1, r2, c2) {
    const newBoard = state.board.map((r) => [...r]);
    newBoard[r2][c2] = newBoard[r1][c1];
    newBoard[r1][c1] = "";

    const nextTurn = state.turn === "white" ? "black" : "white";

    await update(ref(db, "rooms/" + roomId + "/state"), {
      board: newBoard,
      turn: nextTurn,
    });
  }


  // ========== UI STATES ==========

  if (!state || !side) {
    return (
      <div style={{ color: "white", textAlign: "center", marginTop: 100 }}>
        Loading game…
      </div>
    );
  }

  if (!opponentReady) {
    return (
      <div style={{
        color: "white",
        textAlign: "center",
        paddingTop: 80,
        background: "radial-gradient(circle at top,#030b18,#000)",
        minHeight: "100vh",
      }}>
        <h1 style={{ ...neonText, fontSize: 44 }}>Waiting for Opponent…</h1>
        <p>
          Share this link:<br />
          <span style={{
            fontSize: 14,
            opacity: 0.7,
          }}>
            {window.location.origin + "/?join=" + roomId}
          </span>
        </p>
        <p style={{ marginTop: 30, opacity: 0.6 }}>
          Room Code: <b>{roomId}</b>
        </p>
      </div>
    );
  }

  // Player's turn?
  const canPlay = side === state.turn;


  // ========== MAIN GAME UI ==========
  return (
    <div style={{
      minHeight: "100vh",
      color: "white",
      background: "radial-gradient(circle at top,#030b18,#000)",
      textAlign: "center",
      paddingTop: 30,
    }}>
      <h1 style={{ ...neonText, fontSize: 50 }}>
        QUANTUM CHESS — ONLINE
      </h1>

      {/* Side indicator */}
      <h3>
        You are:{" "}
        <span style={{ color: side === "white" ? "#fff" : "#666" }}>
          White
        </span>{" "}
        /{" "}
        <span style={{ color: side === "black" ? "#fff" : "#666" }}>
          Black
        </span>
      </h3>

      {/* Turn indicator */}
      <h3 style={{ marginTop: 10 }}>
        Turn:{" "}
        <span style={{ color: "#0ff" }}>{state.turn}</span>
      </h3>

      {/* Timer */}
      {timer === "5min" && (
        <h3 style={{ marginTop: 10, color: "#ffdd88" }}>
          5-Minute Blitz Mode Enabled
        </h3>
      )}

      {/* Board */}
      <div style={{ marginTop: 40 }}>
        <ChessBoard
          state={state}
          canPlay={canPlay}
          onMove={sendMove}
        />
      </div>
    </div>
  );
}

export { MultiplayerGame };
function createBoard(is960) {
  let back = is960
    ? generateChess960Row()
    : ["R","N","B","Q","K","B","N","R"];

  return [
    back.map((x) => x.toUpperCase()),
    Array(8).fill("P"),
    ...Array(4).fill(Array(8).fill("")),
    Array(8).fill("p"),
    back.map((x) => x.toLowerCase()),
  ];
}

// =====================================================
// QUANTUM CHESS — PART 4 / 4
// App Wrapper + Home Screen + Single Player + Export
// =====================================================


// -----------------------------------------------------
// Simple Bot (Random AI) — upgradeable later
// -----------------------------------------------------
function botMove(board, turn) {
  let moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!board[r][c]) continue;

      const isWhite = board[r][c] === board[r][c].toUpperCase();
      if ((turn === "white" && !isWhite) || (turn === "black" && isWhite))
        continue;

      for (let rr = 0; rr < 8; rr++) {
        for (let cc = 0; cc < 8; cc++) {
          if (canMove(board, r, c, rr, cc, turn)) {
            moves.push([r, c, rr, cc]);
          }
        }
      }
    }
  }

  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}


// -----------------------------------------------------
// Single Player Screen
// -----------------------------------------------------
function SinglePlayerScreen({ difficulty, timer, variant }) {
  const [board, setBoard] = useState(
    createBoard(variant === "960")
  );
  const [turn, setTurn] = useState("white");
  const [winner, setWinner] = useState(null);

  function makeMove(r1, c1, r2, c2) {
    const b = board.map((row) => [...row]);
    b[r2][c2] = b[r1][c1];
    b[r1][c1] = "";

    setBoard(b);
    setTurn((t) => (t === "white" ? "black" : "white"));
  }

  // Bot move (only black)
  useEffect(() => {
    if (turn === "black" && !winner) {
      setTimeout(() => {
        const mv = botMove(board, "black");
        if (!mv) {
          setWinner("White Wins");
          return;
        }
        makeMove(...mv);
      }, 500);
    }
  }, [turn]);


  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top,#030b18,#000)",
      color: "white",
      textAlign: "center",
      paddingTop: 30,
    }}>
      <h1 style={{ ...neonText, fontSize: 50 }}>Single Player</h1>

      <p style={{ marginTop: 5 }}>
        Variant: <b>{variant === "960" ? "Chess960" : "Standard"}</b>
      </p>

      <p>
        Difficulty:{" "}
        <b>{["Beginner", "Easy", "Medium", "Hard"][difficulty]}</b>
      </p>

      <p>
        Mode: <b>{timer === "5min" ? "5-Min Blitz" : "Timeless"}</b>
      </p>

      {winner && (
        <h2 style={{ marginTop: 20, color: "#0ff" }}>{winner}</h2>
      )}

      <div style={{ marginTop: 35 }}>
        <ChessBoard
          state={{ board, turn }}
          canPlay={turn === "white" && !winner}
          onMove={makeMove}
        />
      </div>

      <button
        style={{
          marginTop: 30,
          padding: "10px 20px",
          fontSize: 18,
          borderRadius: 10,
          cursor: "pointer",
          background: "rgba(255,255,255,0.2)",
          border: "1px solid #0ff",
          color: "white",
        }}
        onClick={() => window.location.reload()}
      >
        Back to Home
      </button>
    </div>
  );
}



// -----------------------------------------------------
// HOME SCREEN
// -----------------------------------------------------
export default function QuantumChessApp() {
  const [screen, setScreen] = useState("home");

  // Single-player options
  const [spVariant, setSpVariant] = useState("standard");
  const [spTimer, setSpTimer] = useState("timeless");
  const [spDifficulty, setSpDifficulty] = useState(0);

  // Multiplayer room ID
  const [roomId, setRoomId] = useState(null);
  const [isCreator, setIsCreator] = useState(false);


  // Auto-join multiplayer via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const join = params.get("join");
    if (join) {
      setRoomId(join);
      setIsCreator(false);
      setScreen("multi");
    }
  }, []);


  // Create Multiplayer Room
  async function createMultiplayer(variant, timer) {
    const id = Math.random().toString(36).substring(2, 7);

    await update(ref(db, "rooms/" + id), {
      state: {
        board: createBoard(variant === "960"),
        turn: "white",
      },
      timer,
      players: {},
    });

    setRoomId(id);
    setIsCreator(true);
    setScreen("multi");
  }


  // ---------- RENDERING LOGIC ----------

  if (screen === "single") {
    return (
      <SinglePlayerScreen
        difficulty={spDifficulty}
        timer={spTimer}
        variant={spVariant}
      />
    );
  }

  if (screen === "multi") {
    return (
      <MultiplayerGame
        roomId={roomId}
        isCreator={isCreator}
      />
    );
  }


  // -----------------------------------------------------
  // HOME SCREEN UI
  // -----------------------------------------------------
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top,#030b18,#000)",
      color: "white",
      textAlign: "center",
      paddingTop: 40,
    }}>
      <h1 style={{ ...neonText, fontSize: 60 }}>
        QUANTUM CHESS
      </h1>

      {/* ---------------- Single Player ---------------- */}
      <h2 style={{ marginTop: 40 }}>Single Player</h2>

      <p>Variant:</p>
      <button onClick={() => setSpVariant("standard")} style={selBtn(spVariant === "standard")}>Standard</button>
      <button onClick={() => setSpVariant("960")} style={selBtn(spVariant === "960")}>Chess960</button>

      <p style={{ marginTop: 20 }}>Game Mode:</p>
      <button onClick={() => setSpTimer("timeless")} style={selBtn(spTimer === "timeless")}>Timeless</button>
      <button onClick={() => setSpTimer("5min")} style={selBtn(spTimer === "5min")}>5-Min Blitz</button>

      <p style={{ marginTop: 20 }}>Difficulty:</p>
      {[0,1,2,3].map((lvl) => (
        <button
          key={lvl}
          onClick={() => setSpDifficulty(lvl)}
          style={selBtn(spDifficulty === lvl)}
        >
          {["Beginner","Easy","Medium","Hard"][lvl]}
        </button>
      ))}

      <button
        onClick={() => setScreen("single")}
        style={playBtn}
      >
        ▶ Start Single Player
      </button>


      {/* ---------------- Multiplayer ---------------- */}
      <h2 style={{ marginTop: 60 }}>Multiplayer</h2>

      <p>Select Variant:</p>

      <button
        onClick={() => createMultiplayer("standard", "timeless")}
        style={playBtn}
      >
        Classic Chess
      </button>

      <button
        onClick={() => createMultiplayer("960", "timeless")}
        style={playBtn}
      >
        Chess960
      </button>

      <button
        onClick={() => createMultiplayer("standard", "5min")}
        style={playBtn}
      >
        Blitz (5-Minute)
      </button>
    </div>
  );
}



// -----------------------------------------------------
// Shared UI Button Styles
// -----------------------------------------------------
function selBtn(active) {
  return {
    padding: "10px 18px",
    margin: "6px",
    borderRadius: 10,
    border: active ? "2px solid #00eaff" : "1px solid #444",
    background: active ? "rgba(0,200,255,0.25)" : "rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer",
    fontSize: 16,
  };
}

const playBtn = {
  marginTop: 20,
  padding: "14px 28px",
  background: "linear-gradient(90deg,#00eaff,#7d5bff)",
  border: "none",
  borderRadius: 12,
  color: "black",
  fontSize: 20,
  cursor: "pointer",
  fontWeight: 800,
  letterSpacing: "1px",
};
