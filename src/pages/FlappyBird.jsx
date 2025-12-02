import React, { useEffect, useRef, useState } from "react";

export default function FlappyBird() {
  /* ===============================
        GAME STATE
  =============================== */
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("fb_best") || 0));
  const [gameOver, setGameOver] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const [showCountdown, setShowCountdown] = useState(true);
  const [count, setCount] = useState(3);

  const [fadeOut, setFadeOut] = useState(false);
  const [difficulty, setDifficulty] = useState("normal");

  const [navHeight, setNavHeight] = useState(90);
  const navbarRef = useRef(null);

  /* NEW: paused state */
  const [paused, setPaused] = useState(false);

  /* ===============================
        BIRD & PHYSICS
  =============================== */
  const birdEmoji = "🐤";
  const birdSize = 52;
  const birdWidth = birdSize * 0.85;
  const birdX = Math.floor(window.innerWidth * 0.25);

  const gravity = 0.45;
  const flapPower = -9.8;
  let pipeSpeed = 8;
  let gap = 210;

  /* ===============================
        REFS
  =============================== */
  const birdY = useRef(260);
  const velocity = useRef(0);
  const tilt = useRef(0);
  const pipes = useRef([]);
  const animationFrame = useRef(null);
  const pipeTimer = useRef(0);
  const started = useRef(false);

  /* AUDIO refs */
  const flapSound = useRef(null);
  const hitSound = useRef(null);
  const pointSound = useRef(null);
  const bgm = useRef(null);

  const [, forceRerender] = useState(0);

  /* ===============================
        LOAD AUDIO (bgm optional)
  =============================== */
  useEffect(() => {
    flapSound.current = new Audio("/audio/flap.mp3");
    flapSound.current.volume = 0.6;

    hitSound.current = new Audio("/audio/flappy-bird-hit-sound.mp3");
    hitSound.current.volume = 0.9;

    pointSound.current = new Audio("/audio/point.mp3");
    pointSound.current.volume = 0.6;

    // Optional background music
    fetch("/audio/bg.mp3")
      .then((res) => {
        if (!res.ok) throw new Error("no bg music");
        bgm.current = new Audio("/audio/bg.mp3");
        bgm.current.loop = true;
        bgm.current.volume = 0.35;
        if (audioEnabled) bgm.current.play();
      })
      .catch(() => {
        bgm.current = null; // no bg music found
      });
  }, []);

  /* ===============================
        MUTE / UNMUTE AUDIO
  =============================== */
  const toggleAudio = () => {
    setAudioEnabled((prev) => {
      const newState = !prev;

      if (flapSound.current) flapSound.current.muted = !newState;
      if (hitSound.current) hitSound.current.muted = !newState;
      if (pointSound.current) pointSound.current.muted = !newState;

      if (bgm.current) {
        bgm.current.muted = !newState;
        if (newState && !paused) bgm.current.play();
      }

      return newState;
    });
  };

  /* ===============================
        RESET WHEN DIFFICULTY CHANGES
  =============================== */
  const resetDifficultyGame = () => {
    setScore(0);
    setGameOver(false);

    birdY.current = 260;
    velocity.current = 0;
    tilt.current = 0;

    pipes.current = [];
    pipeTimer.current = 0;

    setShowCountdown(true);
    started.current = false;
    setPaused(false);
  };

  /* ===============================
        CONFETTI
  =============================== */
  const confettiBurst = (x, y) => {
    const colors = ["#3fb9ff", "#a78bfa", "#38f27a", "#ffdd55"];
    for (let i = 0; i < 12; i++) {
      const el = document.createElement("div");
      el.style.position = "fixed";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = "6px";
      el.style.height = "6px";
      el.style.background = colors[i % colors.length];
      el.style.borderRadius = "3px";
      el.style.zIndex = "99999";
      document.body.appendChild(el);

      let vx = (Math.random() - 0.5) * 5;
      let vy = (Math.random() - 1) * 6;
      let life = 0;

      const tick = () => {
        life++;
        vy += 0.15;
        el.style.left = `${parseFloat(el.style.left) + vx}px`;
        el.style.top = `${parseFloat(el.style.top) + vy}px`;

        if (life < 40) requestAnimationFrame(tick);
        else el.remove();
      };

      requestAnimationFrame(tick);
    }
  };

  /* ===============================
        PIPE THEMES
  =============================== */
  const themes = ["classic", "neon", "glass"];
  const randomTheme = () => themes[Math.floor(Math.random() * themes.length)];

  const pipeColor = (theme) => {
    switch (theme) {
      case "neon": return { bg: "#38bdf8", border: "none" };
      case "glass": return { bg: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" };
      default: return { bg: "#22c55e", border: "none" };
    }
  };

  /* ===============================
        SPAWN PIPE
  =============================== */
  const spawnPipe = () => {
    const topHeight = 100 + Math.random() * 230;
    const bottomHeight = Math.max(80, window.innerHeight - navHeight - topHeight - gap);
    const theme = randomTheme();

    pipes.current.push({
      x: window.innerWidth,
      top: topHeight,
      bottom: bottomHeight,
      passed: false,
      theme
    });
  };

  /* ===============================
        NAVBAR HEIGHT FOR RESPONSIVE GAME AREA
  =============================== */
  useEffect(() => {
    const updateHeight = () => {
      if (navbarRef.current) setNavHeight(navbarRef.current.offsetHeight);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  /* ===============================
        COUNTDOWN
  =============================== */
  useEffect(() => {
    if (!showCountdown) {
      started.current = true;
      // start loop if not paused
      if (!paused) animationFrame.current = requestAnimationFrame(loop);
      return;
    }

    setCount(3);
    const t = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(t);
          setShowCountdown(false);
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCountdown]); // do not add loop/paused here

  /* ===============================
        GAME LOOP
        (checks paused and gameOver)
  =============================== */
  const loop = () => {
    // if countdown still showing, keep looping but don't update physics
    if (showCountdown) {
      animationFrame.current = requestAnimationFrame(loop);
      return;
    }

    // If paused or gameOver, do not update; keep frame reference so resume works
    if (paused || gameOver) {
      // stop updating but keep reference cleared
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      return;
    }

    let spawnRate = 90;

    if (difficulty === "easy") { gap = 270; pipeSpeed = 7; spawnRate = 120; }
    if (difficulty === "normal") { gap = 210; pipeSpeed = 8; spawnRate = 90; }
    if (difficulty === "hard") { gap = 170; pipeSpeed = 9; spawnRate = 80; }
    if (difficulty === "extreme") { gap = 140; pipeSpeed = 11; spawnRate = 65; }

    velocity.current += gravity;
    birdY.current += velocity.current;

    tilt.current =
      velocity.current < -2 ? -25 :
      velocity.current > 8 ? 50 :
      velocity.current * 3;

    pipeTimer.current++;
    if (pipeTimer.current > spawnRate) {
      spawnPipe();
      pipeTimer.current = 0;
    }

    pipes.current = pipes.current
      .map((p) => ({ ...p, x: p.x - pipeSpeed }))
      .filter((p) => p.x > -120);

    /* COLLISION */
    const birdTop = birdY.current;
    const birdBottom = birdY.current + birdSize;
    const birdLeft = birdX;
    const birdRight = birdX + birdWidth;

    if (birdTop < 0 || birdBottom > window.innerHeight - navHeight) {
      return triggerGameOver();
    }

    for (const p of pipes.current) {
      const pipeLeft = p.x;
      const pipeRight = p.x + 80;
      const horizontal = birdRight > pipeLeft && birdLeft < pipeRight;

      if (horizontal) {
        const hitTop = birdTop < p.top;
        const hitBottom = birdBottom > window.innerHeight - navHeight - p.bottom;
        if (hitTop || hitBottom) return triggerGameOver();
      }

      if (!p.passed && pipeRight < birdLeft) {
        p.passed = true;

        if (pointSound.current) {
          pointSound.current.currentTime = 0;
          pointSound.current.play();
        }

        setScore((s) => s + 1);
        confettiBurst(birdX + 25, birdY.current + 25);
      }
    }

    forceRerender((x) => x + 1);
    animationFrame.current = requestAnimationFrame(loop);
  };

  /* ===============================
        GAME OVER
  =============================== */
  const triggerGameOver = () => {
    cancelAnimationFrame(animationFrame.current);

    if (hitSound.current) {
      hitSound.current.currentTime = 0;
      hitSound.current.play();
    }

    started.current = false;
    setGameOver(true);

    setBest((b) => {
      if (score > b) {
        localStorage.setItem("fb_best", score);
        return score;
      }
      return b;
    });
  };

  /* ===============================
        FLAP
        (ignore while paused or gameOver)
  =============================== */
  const flap = () => {
    if (gameOver || !started.current || paused) return;
    velocity.current = flapPower;

    if (flapSound.current) {
      flapSound.current.currentTime = 0;
      flapSound.current.play();
    }
  };

  /* ===============================
        SPACE KEY (flap)
  =============================== */
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [gameOver, paused]); // re-register if paused or gameOver changes

  /* ===============================
        ESC to toggle pause
  =============================== */
  useEffect(() => {
    const escHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // toggle pause
        setPaused((p) => {
          const newP = !p;

          if (newP) {
            // pausing: stop animation and pause bgm
            if (animationFrame.current) {
              cancelAnimationFrame(animationFrame.current);
              animationFrame.current = null;
            }
            if (bgm.current) bgm.current.pause();
          } else {
            // resuming: restart loop (unless countdown or gameOver)
            if (!showCountdown && !gameOver) {
              // small delay to ensure state updates
              animationFrame.current = requestAnimationFrame(loop);
              if (bgm.current && audioEnabled) bgm.current.play();
            }
          }

          return newP;
        });
      }
    };

    window.addEventListener("keydown", escHandler);
    return () => window.removeEventListener("keydown", escHandler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCountdown, gameOver, audioEnabled]);

  /* ===============================
        CLOUDS
  =============================== */
  const [cloudX, setCloudX] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCloudX((c) => c - 0.24);
    }, 20);
    return () => clearInterval(id);
  }, []);

  /* ===============================
        NAVBAR Pause button behavior
  =============================== */
  const togglePauseFromButton = () => {
    setPaused((p) => {
      const newP = !p;
      if (newP) {
        if (animationFrame.current) {
          cancelAnimationFrame(animationFrame.current);
          animationFrame.current = null;
        }
        if (bgm.current) bgm.current.pause();
      } else {
        if (!showCountdown && !gameOver) {
          animationFrame.current = requestAnimationFrame(loop);
          if (bgm.current && audioEnabled) bgm.current.play();
        }
      }
      return newP;
    });
  };

  /* ===============================
        UI RENDER
  =============================== */
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>

      {/* NAVBAR */}
      <div
        ref={navbarRef}
        style={{
          width: "100%",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "10px 16px",

          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        {/* HOME */}
        <button
          onClick={() => window.history.back()}
          style={{
            padding: "8px 14px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.25)",
            color: "white",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Home
        </button>

        {/* TITLE + DIFFICULTY */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 auto" }}>
          <div
            style={{
              color: "white",
              fontSize: "clamp(20px, 3vw, 30px)",
              fontWeight: 800,
              letterSpacing: "2px",
              textShadow: "0 0 12px rgba(255,255,255,0.6)",
              fontFamily: "Science Gothic, sans-serif"
            }}
          >
            FLAPPY BIRD
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ color: "#ccc", fontSize: 14, fontFamily: "PT serif" }}>Difficulty:</span>

            {["Easy", "Normal", "Hard", "Extreme"].map((name) => {
              const active = difficulty === name.toLowerCase();
              const colors = {
                Easy: "#7dd3fc",
                Normal: "#38bdf8",
                Hard: "#fb923c",
                Extreme: "#ef4444",
              };
              return (
                <button
                  key={name}
                  onClick={() => {
                    setDifficulty(name.toLowerCase());
                    resetDifficultyGame();
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    background: active ? colors[name] : "rgba(255,255,255,0.12)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.25)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: active ? `0 0 12px ${colors[name]}88` : "none",
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* SCORE & SOUND & PAUSE */}
        <div
          style={{
            padding: "6px 12px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: 12,
            backdropFilter: "blur(10px)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            fontSize: 16,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Score: {score}
          <span style={{ opacity: 0.6 }}>|</span>
          Best: {best}

          <button
            onClick={toggleAudio}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              border: "none",
              background: audioEnabled ? "green" : "crimson",
              color: "white",
              cursor: "pointer",
            }}
          >
            {audioEnabled ? "🔊" : "🔇"}
          </button>

          {/* Pause/Resume button */}
          <button
            onClick={togglePauseFromButton}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "none",
              background: paused ? "#38bdf8" : "rgba(255,255,255,0.12)",
              color: paused ? "#000" : "#fff",
              cursor: "pointer",
              marginLeft: 6,
              fontWeight: 800,
            }}
            title="Pause (Esc)"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* GAME FIELD */}
      <div
        onClick={flap}
        style={{
          position: "absolute",
          top: navHeight,
          width: "100%",
          height: `calc(100% - ${navHeight}px)`,
          overflow: "hidden",
          background: "linear-gradient(#0a0f1f, #000)",
          zIndex: 1,
        }}
      >
        {/* CLOUDS */}
        <div
          style={{
            position: "absolute",
            left: cloudX % window.innerWidth,
            top: 120,
            opacity: 0.18,
            fontSize: 95,
          }}
        >
          ☁️
        </div>

        <div
          style={{
            position: "absolute",
            left: (cloudX + 500) % window.innerWidth,
            top: 190,
            opacity: 0.12,
            fontSize: 115,
          }}
        >
          ☁️
        </div>

        {/* BIRD (png sprite) */}
        <img
          src="/flappy.png"
          alt="bird"
          style={{
            position: "absolute",
            left: birdX,
            top: birdY.current,
            width: birdSize,
            height: "auto",
            transform: `rotate(${tilt.current}deg)`,
            transformOrigin: "center",
            transition: "transform 0.08s linear",
            zIndex: 10,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />


        {/* PIPES */}
        {pipes.current.map((p, idx) => {
          const { bg, border } = pipeColor(p.theme);
          return (
            <React.Fragment key={idx}>
              <div
                style={{
                  position: "absolute",
                  left: p.x,
                  top: 0,
                  width: 80,
                  height: p.top,
                  background: bg,
                  border,
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: p.x,
                  bottom: 0,
                  width: 80,
                  height: p.bottom,
                  background: bg,
                  border,
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                }}
              />
            </React.Fragment>
          );
        })}

        {/* PAUSE OVERLAY */}
        {paused && !gameOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
              color: "white",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 900 }}>PAUSED</div>
            <div style={{ opacity: 0.8 }}>Press <b>Esc</b> or click Resume</div>
            <button
              onClick={togglePauseFromButton}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "#38bdf8",
                border: "none",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Resume
            </button>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: 16,
                padding: "28px 22px",
                textAlign: "center",
                color: "white",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(14px)",
              }}
            >
              <h1 style={{ fontSize: 32 }}>💥 Game Over</h1>
              <p style={{ fontSize: 20 }}>Score: {score}</p>
              <p style={{ fontSize: 18, opacity: 0.8 }}>Best: {best}</p>

              <button
                onClick={() => {
                  const savedBest = parseInt(localStorage.getItem("fb_best") || 0);
                  if (score > savedBest) localStorage.setItem("fb_best", score);

                  setFadeOut(true);
                  setTimeout(() => window.location.reload(), 650);
                }}
                style={{
                  marginTop: 16,
                  padding: "10px",
                  width: "100%",
                  fontSize: 20,
                  background: "linear-gradient(90deg,#38bdf8,#a78bfa)",
                  borderRadius: 10,
                  border: "none",
                  color: "white",
                }}
              >
                Restart
              </button>
            </div>
          </div>
        )}

        {/* COUNTDOWN */}
        {showCountdown && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(4px)",
              color: "white",
              fontSize: 80,
              fontWeight: "700",
            }}
          >
            {count > 0 ? count : "Go!"}
          </div>
        )}

        {/* TOUCH SCREEN FLAP BUTTON */}
        <div
          onClick={flap}
          style={{
            position: "absolute",
            bottom: 25,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "16px 26px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 20,
            color: "white",
            fontSize: 22,
            fontWeight: "700",
            border: "1px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(10px)",
            cursor: "pointer",
            zIndex: 50,
            userSelect: "none",
          }}
        >
          👆 TAP TO FLAP
        </div>
      </div>

      {/* FADE OUT */}
      {fadeOut && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "black",
            opacity: fadeOut ? 1 : 0,
            transition: "opacity 0.6s ease",
            zIndex: 999999,
          }}
        />
      )}

      {/* FOOTER */}
      <div
        style={{
          position: "fixed",
          bottom: "14px",
          right: "16px",
          zIndex: 9999,

          /* Typography */
          fontSize: "14px",
          letterSpacing: "0.5px",
          color: "#cbd5e1",
          opacity: 0.7,

          /* Subtle glowing fade */
          textShadow: "0 0 6px rgba(255,255,255,0.18)",

          /* Smooth UI */
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        © 2025 — Sudipta Majumder
      </div>
    </div>
  );
}
