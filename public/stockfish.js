// stockfishWorker.js
let engine = new Worker("/stockfish.js");

let callback = () => {};

engine.onmessage = (e) => {
  if (e.data.includes("bestmove")) {
    let move = e.data.split("bestmove ")[1].split(" ")[0];
    callback(move);
  }
};

self.onmessage = (msg) => {
  const { fen, level } = msg.data;

  engine.postMessage("uci");
  engine.postMessage("setoption name Skill Level value " + level);
  engine.postMessage("position fen " + fen);
  engine.postMessage("go movetime 1000");

  callback = (move) => {
    self.postMessage({ move });
  };
};

