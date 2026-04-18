export function BackgroundIllustration() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f5ba7]/[0.035] via-transparent to-[#d9c97f]/[0.08]" />
      <svg
        className="absolute inset-0 h-full w-full"
        fill="none"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern height="60" id="grid" patternUnits="userSpaceOnUse" width="60">
            <path
              d="M 60 0 L 0 0 0 60"
              stroke="rgba(15,91,167,0.05)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect fill="url(#grid)" height="100%" width="100%" />
        <g fill="none" stroke="rgba(15,91,167,0.12)" strokeWidth="1.5">
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
          <path d="M400 400 Q550 350 700 380 Q850 410 950 350" strokeDasharray="8 4" />
          <g transform="translate(400 400)">
            <path d="M0 -25 C-15 -25 -20 -10 -20 0 C-20 15 0 35 0 35 C0 35 20 15 20 0 C20 -10 15 -25 0 -25 Z" />
            <circle cx="0" cy="-5" r="7" />
          </g>
          <g transform="translate(700 380)">
            <path d="M0 -25 C-15 -25 -20 -10 -20 0 C-20 15 0 35 0 35 C0 35 20 15 20 0 C20 -10 15 -25 0 -25 Z" />
            <circle cx="0" cy="-5" r="7" />
          </g>
          <g transform="translate(950 350)">
            <path d="M0 -25 C-15 -25 -20 -10 -20 0 C-20 15 0 35 0 35 C0 35 20 15 20 0 C20 -10 15 -25 0 -25 Z" />
            <circle cx="0" cy="-5" r="7" />
          </g>
        </g>
        <g fill="none" stroke="rgba(217,201,127,0.22)" strokeWidth="1.5">
          <rect height="120" rx="8" width="180" x="1050" y="80" />
          <path d="M1050 105 L1230 105" />
          <circle cx="1065" cy="92" r="5" />
          <circle cx="1082" cy="92" r="5" />
          <circle cx="1099" cy="92" r="5" />
          <rect x="1070" y="120" width="60" height="60" rx="4" />
          <rect x="1145" y="125" width="65" height="50" rx="4" />
          <path d="M1155 165 L1165 155 L1180 160 L1195 140" />
        </g>
        <g fill="none" stroke="rgba(15,91,167,0.08)" strokeWidth="1.5">
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
        </g>
      </svg>
      <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(15,91,167,0.06)_0%,transparent_65%)]" />
      <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(217,201,127,0.08)_0%,transparent_68%)]" />
    </div>
  );
}
