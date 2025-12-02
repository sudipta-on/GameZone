import GameCard from "../components/GameCard";

const games = [
  {
    title: "Tic Tac Toe",
    image: "src/assets/tic_tac_toe.png",
    link: "/tic-tac-toe",
  },
  {
    title: "Quantum Tetris",
    image: "src/assets/q_tetris.png",
    link: "/qtetris",
  },
  {
    title: "Snake Game",
    image: "https-i.imgur.com/k0Qp5L8.png",
    link: "/chess",
  },
];

export default function GameZone() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-10">
      <h1 className="text-4xl font-bold text-center mb-10" style={{fontFamily: "Science Gothic, sans-serif",}}>🎮 Game Zone</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {games.map((game) => (
          <GameCard
            key={game.title}
            title={game.title}
            image={game.image}
            link={game.link}
          />
        ))}
      </div>
    </div>
  );
}
