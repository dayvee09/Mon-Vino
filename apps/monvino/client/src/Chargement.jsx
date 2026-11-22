import { useId } from "react";
import "./Chargement.scss";

/**
 * Indicateur de chargement : bouteille au-dessus du verre, penchée pour verser.
 * @param {{ message?: string, className?: string }} props
 */
function Chargement({ message = "Chargement…", className = "" }) {
  const uid = useId().replace(/:/g, "");
  const glassClipId = `chargement-verre-${uid}`;
  const wineGradId = `chargement-vin-${uid}`;
  const streamGradId = `chargement-jet-${uid}`;
  const bottleClipId = `chargement-bout-${uid}`;

  return (
    <div
      className={`chargement${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="chargement__icone" aria-hidden="true">
        <svg
          className="chargement__svg"
          viewBox="0 0 150 165"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Rouge secondaire app, légèrement assombri */}
            <linearGradient id={wineGradId} x1="0%" y1="0%" x2="10%" y2="100%">
              <stop offset="0%" stopColor="#b53533" />
              <stop offset="100%" stopColor="#8f2a28" />
            </linearGradient>
            <linearGradient
              id={streamGradId}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#c43d3b" />
              <stop offset="100%" stopColor="#b53533" />
            </linearGradient>
            <clipPath id={glassClipId}>
              <path d="M78 78 C78 78 76 106 84 118 C88 125 94 128 100 128 C106 128 112 125 116 118 C124 106 122 78 122 78 Z" />
            </clipPath>
            <clipPath id={bottleClipId}>
              <path
                d="M22 118
                   C18 118 16 115 16 111
                   V58
                   C16 48 19 42 25 36
                   L29 28
                   V8
                   C29 5 30.5 4 33 4
                   H41
                   C43.5 4 45 5 45 8
                   V28
                   L49 36
                   C55 42 58 48 58 58
                   V111
                   C58 115 56 118 52 118 Z"
              />
            </clipPath>
          </defs>

          {/* Verre (structure) — sous le jet */}
          <g className="chargement__verre">
            <line
              x1="100"
              y1="128"
              x2="100"
              y2="148"
              stroke="#152440"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="84"
              y1="154"
              x2="116"
              y2="154"
              stroke="#152440"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M78 78
                 C78 78 76 106 84 118
                 C88 125 94 128 100 128
                 C106 128 112 125 116 118
                 C124 106 122 78 122 78"
              fill="rgba(243,245,235,0.45)"
              stroke="#152440"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/*
            Jet dessiné AVANT la bouteille : commence sous le goulot (~y 70),
            sans chevaucher la pointe. La bouteille peinte ensuite cache
            éventuellement le raccord.
          */}
          <g className="chargement__jet">
            <path
              className="chargement__jet-corps"
              d="M98 70
                 C101 70 104 71 104.5 74
                 C106 84 105 94 102.5 108
                 C102 111 100.5 111.5 99.5 110
                 C97.5 100 96.5 88 96.5 80
                 C96.5 74 97 70.5 98 70 Z"
              fill={`url(#${streamGradId})`}
            />
            <path
              className="chargement__jet-flux"
              d="M100.5 72 C102 86 101 98 100.5 109"
              fill="none"
              stroke="#d0706e"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>

          {/* Bouteille — peinte par-dessus le haut du jet */}
          <g className="chargement__bouteille">
            <path
              d="M22 118
                 C18 118 16 115 16 111
                 V58
                 C16 48 19 42 25 36
                 L29 28
                 V8
                 C29 5 30.5 4 33 4
                 H41
                 C43.5 4 45 5 45 8
                 V28
                 L49 36
                 C55 42 58 48 58 58
                 V111
                 C58 115 56 118 52 118 Z"
              fill="#f3f5eb"
              stroke="#152440"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${bottleClipId})`}>
              <rect
                className="chargement__vin-bouteille"
                x="14"
                y="55"
                width="46"
                height="68"
                fill={`url(#${wineGradId})`}
              />
            </g>
            <ellipse
              cx="37"
              cy="4"
              rx="5.5"
              ry="2.2"
              fill="#b53533"
              stroke="#152440"
              strokeWidth="1.2"
            />
            <path
              d="M23 50 V95"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.22"
            />
          </g>

          {/* Vin dans le verre — au-dessus du jet */}
          <g clipPath={`url(#${glassClipId})`}>
            <rect
              className="chargement__vin-verre"
              x="74"
              y="130"
              width="52"
              height="58"
              fill={`url(#${wineGradId})`}
            />
            <ellipse
              className="chargement__surface-verre"
              cx="100"
              cy="130"
              rx="22"
              ry="3.4"
              fill="#b53533"
            />
          </g>
          <path
            d="M86 88 C85 100 88 112 92 120"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.28"
            fill="none"
          />
        </svg>
      </div>
      <p className="chargement__message">{message}</p>
    </div>
  );
}

export default Chargement;
