import { useId } from "react";
import "./Chargement.scss";

/**
 * Indicateur de chargement : bouteille au-dessus du verre, penchée pour verser.
 * Wine fills live in nested <svg overflow="hidden"> so CSS transforms cannot
 * leak red pixels outside the bottle/glass silhouettes.
 * @param {{ message?: string, className?: string }} props
 */
function Chargement({ message = "Chargement…", className = "" }) {
  const uid = useId().replace(/:/g, "");
  const wineGradId = `chargement-vin-${uid}`;
  const streamGradId = `chargement-jet-${uid}`;
  const bottleClipId = `chargement-bout-local-${uid}`;
  const glassClipId = `chargement-verre-local-${uid}`;

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
          </defs>

          {/* Verre */}
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
                 C124 106 122 78 122 78 Z"
              fill="rgba(243,245,235,0.45)"
              stroke="#152440"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Jet */}
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

          {/* Bouteille — wine clipped in nested svg so rotation cannot leak */}
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
            <svg
              className="chargement__bout-vin"
              x="16"
              y="4"
              width="42"
              height="114"
              viewBox="0 0 42 114"
              overflow="hidden"
            >
              <defs>
                <clipPath id={bottleClipId}>
                  <path
                    d="M6 114
                       C2 114 0 111 0 107
                       V54
                       C0 44 3 38 9 32
                       L13 24
                       V4
                       C13 1 14.5 0 17 0
                       H25
                       C27.5 0 29 1 29 4
                       V24
                       L33 32
                       C39 38 42 44 42 54
                       V107
                       C42 111 40 114 36 114 Z"
                  />
                </clipPath>
              </defs>
              <g clipPath={`url(#${bottleClipId})`}>
                <rect
                  className="chargement__vin-bouteille"
                  x="0"
                  y="30"
                  width="42"
                  height="100"
                  fill={`url(#${wineGradId})`}
                />
              </g>
            </svg>
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

          {/* Vin dans le verre — nested svg, bowl clip flush to the rim */}
          <svg
            className="chargement__verre-vin"
            x="78"
            y="78"
            width="44"
            height="50"
            viewBox="0 0 44 50"
            overflow="hidden"
          >
            <defs>
              <clipPath id={glassClipId}>
                <path d="M0 0 C0 0 -2 28 6 40 C10 47 16 50 22 50 C28 50 34 47 38 40 C46 28 44 0 44 0 Z" />
              </clipPath>
            </defs>
            <g clipPath={`url(#${glassClipId})`}>
              <rect
                className="chargement__vin-verre"
                x="0"
                y="54"
                width="44"
                height="54"
                fill={`url(#${wineGradId})`}
              />
              <ellipse
                className="chargement__surface-verre"
                cx="22"
                cy="54"
                rx="20"
                ry="2.4"
                fill="#b53533"
              />
            </g>
          </svg>
        </svg>
      </div>
      <p className="chargement__message">{message}</p>
    </div>
  );
}

export default Chargement;
