import GameCard from "../components/GameCard";

const games = [
  {
    title: "Tic Tac Toe",
    image: "/tic_tac_toe.png",
    link: "/tic-tac-toe",
  },
  {
    title: "Quantum Tetris",
    image: "/q_tetris.png",
    link: "/qtetris",
  },
  {
    title: "Flappy Bird",
    image: "/flappy_bird.png",
    link: "/flappy",
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
