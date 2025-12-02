import { useNavigate } from "react-router-dom";

export default function GameCard({ title, image, icon, link }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(link)}
      className="
        group cursor-pointer rounded-2xl bg-gradient-to-br from-[#111111] to-[#0c0c0c]
        border border-white/10 overflow-hidden relative
        transition-all duration-300
        hover:scale-[1.04] hover:shadow-[0_0_28px_rgba(0,200,255,0.4)]
      "
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      {/* Neon border glow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300"
           style={{
             boxShadow: "0 0 25px 3px rgba(0,200,255,0.45)",
           }}
      ></div>

      {/* Highlight swipe animation */}
      <div className="
        absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500
        bg-gradient-to-r from-transparent via-white/10 to-transparent
        translate-x-[-200%] group-hover:translate-x-[200%]
      "></div>

      {/* SQUARE Image container */}
      <div className="w-full aspect-square bg-black/40 flex items-center justify-center">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-contain p-4" />
        ) : (
          <span
            className="text-6xl"
            style={{ filter: "drop-shadow(0 0 10px rgba(0,200,255,0.5))" }}
          >
            {icon || "🎮"}
          </span>
        )}
      </div>

      {/* TITLE BAR */}
      <div className="
        p-4 text-center 
        bg-black/40 backdrop-blur-xl border-t border-white/10
      ">
        <h2 className="text-xl font-bold tracking-wide text-cyan-300 drop-shadow-md">
          {title}
        </h2>
      </div>
    </div>
  );
}
