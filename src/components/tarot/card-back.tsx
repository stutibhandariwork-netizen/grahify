/** Face-down card design: night indigo with a gold eight-pointed star. */
export function CardBack({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 172" className={className} aria-hidden>
      <defs>
        <linearGradient id="cb-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b2250" />
          <stop offset="1" stopColor="#15112a" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="98" height="170" rx="7" fill="url(#cb-bg)" stroke="#d6a54e" strokeWidth="1.5" />
      <rect x="6" y="6" width="88" height="160" rx="4" fill="none" stroke="#d6a54e" strokeOpacity=".45" />
      <g transform="translate(50 86)" fill="none" stroke="#e5b45e" strokeWidth="1.2">
        <circle r="24" strokeOpacity=".6" />
        <circle r="31" strokeOpacity=".25" />
        <path d="M0-20L5-5 20 0 5 5 0 20-5 5-20 0-5-5Z" fill="#e5b45e" fillOpacity=".85" stroke="none" />
        <path d="M0-14L4-4 14 0 4 4 0 14-4 4-14 0-4-4Z" transform="rotate(45)" fill="#e5b45e" fillOpacity=".4" stroke="none" />
      </g>
      {[[18, 22], [82, 22], [18, 150], [82, 150], [50, 30], [50, 142]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#e5b45e" fillOpacity=".7" />
      ))}
    </svg>
  );
}
