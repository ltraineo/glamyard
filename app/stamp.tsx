// The Glamyard mark: a door stamp, tilted like it was pressed on in a hurry.
// The rough filter gives the ink an uneven edge; the violet drop-shadow is the
// glow a real hand-stamp gives off under blacklight.
export function Stamp({ width = 260, label = "Glamyard" }: { width?: number; label?: string }) {
  return (
    <svg
      className="stamp"
      width={width}
      viewBox="0 0 240 160"
      role="img"
      aria-label={label}
    >
      <defs>
        <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" />
        </filter>
      </defs>
      <g transform="rotate(-9 120 80)" filter="url(#ink)" fill="none" stroke="currentColor">
        <rect x="22" y="30" width="196" height="100" rx="14" strokeWidth="4" />
        <rect x="32" y="40" width="176" height="80" rx="9" strokeWidth="1.5" strokeDasharray="3 3" />
        <text
          x="120"
          y="93"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          style={{ fontFamily: "var(--display)", fontSize: 40, letterSpacing: 2 }}
        >
          GLAMYARD
        </text>
        <text
          x="120"
          y="113"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 4 }}
        >
          ADMITTED
        </text>
      </g>
    </svg>
  );
}
