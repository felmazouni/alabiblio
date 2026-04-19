export function BackgroundIllustration() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,91,167,0.06),transparent_28%),radial-gradient(circle_at_top_right,rgba(217,201,127,0.08),transparent_22%),linear-gradient(180deg,var(--background)_0%,color-mix(in_srgb,var(--background)_94%,#d9e2ec_6%)_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(90,163,231,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(253,176,34,0.06),transparent_22%),linear-gradient(180deg,#09111e_0%,#0b1424_100%)]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-80 dark:opacity-50"
        fill="none"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern height="56" id="grid" patternUnits="userSpaceOnUse" width="56">
            <path
              d="M 56 0 L 0 0 0 56"
              stroke="rgba(15,91,167,0.045)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect fill="url(#grid)" height="100%" width="100%" />
        <g fill="none" stroke="rgba(15,91,167,0.11)" strokeWidth="1.25">
          <path d="M90 670 L270 670 L270 680 L90 680 Z" />
          <path d="M108 680 L108 758" />
          <path d="M252 680 L252 758" />
          <path d="M126 708 L126 758 L198 758 L198 708" />
          <path d="M108 670 L108 620 C108 602 214 602 214 620 L214 670" />
          <circle cx="160" cy="568" r="26" />
          <path d="M160 594 L160 646" />
          <path d="M160 612 L126 652" />
          <path d="M160 612 L194 636" />
          <path d="M160 646 L136 708" />
          <path d="M160 646 L184 708" />
          <path d="M176 634 L230 634 L240 670 L170 670 Z" />
          <path d="M410 396 Q555 350 698 382 Q845 412 948 352" strokeDasharray="8 5" />
        </g>
        <g fill="none" stroke="rgba(217,201,127,0.18)" strokeWidth="1.25">
          <rect height="112" rx="8" width="176" x="1052" y="82" />
          <path d="M1052 106 L1228 106" />
          <circle cx="1068" cy="93" r="4.5" />
          <circle cx="1084" cy="93" r="4.5" />
          <circle cx="1100" cy="93" r="4.5" />
          <rect height="56" rx="4" width="56" x="1072" y="122" />
          <rect height="48" rx="4" width="66" x="1142" y="128" />
          <path d="M1154 166 L1166 154 L1178 160 L1196 142" />
        </g>
      </svg>
      <div className="absolute bottom-0 left-0 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(15,91,167,0.07)_0%,transparent_64%)] dark:bg-[radial-gradient(circle,rgba(90,163,231,0.08)_0%,transparent_64%)]" />
      <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(217,201,127,0.07)_0%,transparent_66%)] dark:bg-[radial-gradient(circle,rgba(253,176,34,0.06)_0%,transparent_66%)]" />
    </div>
  );
}
