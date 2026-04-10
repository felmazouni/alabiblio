type BackgroundIllustrationProps = {
  className?: string;
};

export function BackgroundIllustration({ className = "" }: BackgroundIllustrationProps) {
  return (
    <div className={`background-illustration ${className}`.trim()}>
      <div className="background-illustration__gradient" />

      <svg
        className="background-illustration__svg"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <pattern id="catalog-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="color-mix(in srgb, var(--color-primary) 8%, transparent)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#catalog-grid)" />

        <g
          stroke="color-mix(in srgb, var(--color-primary) 18%, transparent)"
          strokeWidth="1.5"
          fill="none"
        >
          <path d="M80 680 L280 680 L280 690 L80 690 Z" />
          <path d="M100 690 L100 780" />
          <path d="M260 690 L260 780" />
          <path d="M120 720 L120 780 L200 780 L200 720" />
          <path d="M100 680 L100 620 C100 600 220 600 220 620 L220 680" />
          <circle cx="160" cy="560" r="30" />
          <path d="M160 590 L160 650" />
          <path d="M160 610 L120 660" />
          <path d="M160 610 L200 640" />
          <path d="M160 650 L130 720" />
          <path d="M160 650 L190 720" />
          <path d="M180 640 L240 640 L250 680 L170 680 Z" />
          <path d="M185 645 L235 645 L235 675 L185 675 Z" />
        </g>

        <g
          stroke="color-mix(in srgb, var(--color-primary-soft) 14%, transparent)"
          strokeWidth="1.5"
          fill="none"
        >
          <rect x="1100" y="200" width="200" height="400" rx="4" />
          <path d="M1100 280 L1300 280" />
          <path d="M1100 360 L1300 360" />
          <path d="M1100 440 L1300 440" />
          <path d="M1100 520 L1300 520" />
          <rect x="1110" y="210" width="15" height="60" />
          <rect x="1130" y="220" width="12" height="50" />
          <rect x="1147" y="215" width="18" height="55" />
          <rect x="1170" y="210" width="10" height="60" />
          <rect x="1185" y="225" width="14" height="45" />
          <rect x="1205" y="210" width="20" height="60" />
          <rect x="1230" y="218" width="12" height="52" />
          <rect x="1115" y="290" width="18" height="60" />
          <rect x="1138" y="295" width="14" height="55" />
          <rect x="1158" y="285" width="12" height="65" />
          <rect x="1175" y="292" width="20" height="58" />
          <rect x="1200" y="288" width="15" height="62" />
          <rect x="1220" y="295" width="22" height="55" />
          <rect x="1248" y="290" width="16" height="60" />
          <rect x="1108" y="370" width="14" height="60" />
          <rect x="1127" y="375" width="18" height="55" />
          <rect x="1150" y="365" width="12" height="65" />
          <rect x="1168" y="372" width="16" height="58" />
          <rect x="1190" y="368" width="20" height="62" />
          <rect x="1215" y="375" width="14" height="55" />
          <ellipse cx="1270" cy="425" rx="20" ry="8" />
          <path d="M1270 425 L1270 385" />
          <path d="M1255 400 Q1265 380 1270 385" />
          <path d="M1285 400 Q1275 380 1270 385" />
        </g>

        <g
          stroke="color-mix(in srgb, var(--color-primary) 12%, transparent)"
          strokeWidth="1.5"
          fill="none"
        >
          <rect x="1050" y="80" width="180" height="120" rx="8" />
          <path d="M1050 105 L1230 105" />
          <circle cx="1065" cy="92" r="5" />
          <circle cx="1082" cy="92" r="5" />
          <circle cx="1099" cy="92" r="5" />
          <rect x="1070" y="120" width="60" height="60" rx="4" />
          <path d="M1090 130 L1090 170" />
          <path d="M1110 130 L1110 170" />
          <circle
            cx="1100"
            cy="145"
            r="8"
            fill="color-mix(in srgb, var(--color-primary) 6%, transparent)"
          />
          <rect x="1145" y="125" width="65" height="50" rx="4" />
          <path d="M1155 165 L1165 155 L1180 160 L1195 140" />
        </g>

        <g
          stroke="color-mix(in srgb, var(--color-primary) 14%, transparent)"
          strokeWidth="1.5"
          fill="none"
        >
          <path d="M400 400 Q550 350 700 380 Q850 410 950 350" strokeDasharray="8 4" />

          <g transform="translate(400, 400)">
            <path d="M0 -25 C-15 -25 -20 -10 -20 0 C-20 15 0 35 0 35 C0 35 20 15 20 0 C20 -10 15 -25 0 -25 Z" />
            <circle cx="0" cy="-5" r="7" />
          </g>

          <g transform="translate(700, 380)">
            <path d="M0 -25 C-15 -25 -20 -10 -20 0 C-20 15 0 35 0 35 C0 35 20 15 20 0 C20 -10 15 -25 0 -25 Z" />
            <circle cx="0" cy="-5" r="7" />
          </g>

          <g transform="translate(950, 350)">
            <path d="M0 -25 C-15 -25 -20 -10 -20 0 C-20 15 0 35 0 35 C0 35 20 15 20 0 C20 -10 15 -25 0 -25 Z" />
            <circle cx="0" cy="-5" r="7" />
          </g>
        </g>

        <g
          stroke="color-mix(in srgb, var(--color-primary-soft) 12%, transparent)"
          strokeWidth="1"
          fill="none"
        >
          <circle cx="500" cy="200" r="4" />
          <circle cx="600" cy="150" r="3" />
          <circle cx="800" cy="250" r="5" />
          <circle cx="350" cy="300" r="3" />
          <circle cx="900" cy="500" r="4" />
          <circle cx="1000" cy="650" r="3" />
          <circle cx="200" cy="450" r="4" />
          <path d="M500 200 L520 180" />
          <path d="M600 150 L620 170" />
          <path d="M800 250 L820 230" />
        </g>
      </svg>

      <div className="background-illustration__noise" />
      <div className="background-illustration__corner background-illustration__corner--right" />
      <div className="background-illustration__corner background-illustration__corner--left" />
    </div>
  );
}
