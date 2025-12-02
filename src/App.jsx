import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GameZone from "./pages/GameZone.jsx";
import TicTacToe from "./pages/TicTacToe";
import QuantumTetris from "./pages/QuantumTetris.jsx";
import QuantumChessApp from "./pages/QChess.jsx";
import FlappyBird from "./pages/FlappyBird.jsx";
// import Snake from "./pages/Snake";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GameZone />} />
        <Route path="/tic-tac-toe" element={<TicTacToe />} />
        <Route path="/qtetris" element={<QuantumTetris />} />
        <Route path="/flappy" element={<FlappyBird />} />
      </Routes>
    </Router>
  );
}
