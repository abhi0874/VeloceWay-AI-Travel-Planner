/**
 * Hand-drawn Swiss alpine scene — light, colourful, fully self-contained.
 * Rendered behind the hero with `slice` so it crops like a photo at any size.
 */
export default function HeroScene() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3DE" />
          <stop offset="45%" stopColor="#FBDDE8" />
          <stop offset="100%" stopColor="#C9E8F7" />
        </linearGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ADFE0" />
          <stop offset="100%" stopColor="#54B4D6" />
        </linearGradient>
        <linearGradient id="meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ABDA7C" />
          <stop offset="100%" stopColor="#77B84D" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFE2A8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFE2A8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sky + sun */}
      <rect width="1600" height="900" fill="url(#sky)" />
      <circle cx="260" cy="170" r="150" fill="url(#sunGlow)" />
      <circle cx="260" cy="170" r="58" fill="#FFD98A" />

      {/* clouds */}
      <g fill="#FFFFFF" opacity="0.9">
        <ellipse cx="1120" cy="150" rx="95" ry="26" />
        <ellipse cx="1190" cy="132" rx="65" ry="20" />
        <ellipse cx="480" cy="110" rx="80" ry="22" />
        <ellipse cx="545" cy="96" rx="50" ry="16" />
        <ellipse cx="1420" cy="260" rx="70" ry="18" opacity="0.75" />
      </g>

      {/* birds */}
      <g stroke="#5B6B8C" strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M600 205 q14 -12 28 0 q14 -12 28 0" />
        <path d="M690 165 q11 -9 22 0 q11 -9 22 0" />
      </g>

      {/* far ridge */}
      <polygon
        points="0,470 180,395 340,455 520,375 700,455 880,405 1060,465 1240,395 1420,455 1600,415 1600,640 0,640"
        fill="#C7D3F1"
      />

      {/* mid ridge with snow caps */}
      <polygon
        points="0,520 220,430 430,510 640,420 860,515 1080,435 1300,515 1500,445 1600,500 1600,680 0,680"
        fill="#9DB4E3"
      />
      <g fill="#FFFFFF">
        <polygon points="220,430 190,462 250,462" />
        <polygon points="640,420 605,458 675,458" />
        <polygon points="1080,435 1048,470 1112,470" />
        <polygon points="1500,445 1472,476 1528,476" />
      </g>

      {/* hero peak (Matterhorn-ish) with snow */}
      <polygon points="800,175 565,640 1035,640" fill="#7C97CE" />
      <polygon points="800,175 1035,640 905,640" fill="#6483BE" />
      <polygon
        points="800,175 762,265 782,250 800,282 820,248 840,262 838,300 856,286 872,330 728,330 748,278 766,292 778,258"
        fill="#FFFFFF"
      />

      {/* right companion peak */}
      <polygon points="1185,265 1005,640 1365,640" fill="#8FA9DC" />
      <polygon points="1185,265 1005,640 1120,640" fill="#7A93CB" />
      <polygon points="1185,265 1152,340 1172,322 1190,352 1210,318 1228,336 1236,376 1136,376 1168,318" fill="#FFFFFF" />

      {/* lake */}
      <rect x="0" y="620" width="1600" height="160" fill="url(#lake)" />
      <polygon points="800,640 700,778 900,778" fill="#7C97CE" opacity="0.16" />
      <polygon points="1185,640 1090,778 1280,778" fill="#8FA9DC" opacity="0.14" />
      <g fill="#FFFFFF" opacity="0.35">
        <ellipse cx="420" cy="672" rx="120" ry="4" />
        <ellipse cx="960" cy="712" rx="160" ry="4" />
        <ellipse cx="1330" cy="668" rx="110" ry="3.5" />
        <ellipse cx="240" cy="742" rx="90" ry="3.5" />
      </g>

      {/* meadow */}
      <path
        d="M0 780 C 260 748, 540 762, 800 756 C 1080 750, 1340 766, 1600 748 L1600 900 L0 900 Z"
        fill="url(#meadow)"
      />

      {/* pines */}
      <g fill="#2F6B42">
        <polygon points="150,900 150,790 190,790" transform="translate(-14,0)" />
        <polygon points="205,900 205,770 250,770" />
        <polygon points="265,900 265,800 300,800" />
        <polygon points="1385,900 1385,782 1425,782" />
        <polygon points="1445,900 1445,762 1492,762" />
        <polygon points="1512,900 1512,796 1546,796" />
      </g>
      <g fill="#3E7C4F">
        <polygon points="235,900 235,796 268,796" />
        <polygon points="1470,900 1470,790 1502,790" />
      </g>

      {/* chalet */}
      <g>
        <rect x="1150" y="806" width="86" height="56" fill="#8A5A3B" />
        <polygon points="1138,808 1193,770 1248,808" fill="#5D3A26" />
        <rect x="1166" y="822" width="18" height="16" fill="#FFE9A8" />
        <rect x="1202" y="822" width="18" height="16" fill="#FFE9A8" />
        <rect x="1184" y="836" width="16" height="26" fill="#4A2E1D" />
        <rect x="1146" y="800" width="94" height="10" fill="#4A2E1D" />
      </g>

      {/* flowers */}
      <g>
        <circle cx="380" cy="836" r="5" fill="#FF6B6B" />
        <circle cx="470" cy="862" r="4" fill="#FFD93D" />
        <circle cx="560" cy="828" r="5" fill="#FFFFFF" />
        <circle cx="660" cy="858" r="4" fill="#FF8FB1" />
        <circle cx="760" cy="834" r="5" fill="#FF6B6B" />
        <circle cx="880" cy="864" r="4" fill="#FFD93D" />
        <circle cx="985" cy="838" r="5" fill="#FFFFFF" />
        <circle cx="1080" cy="866" r="4" fill="#FF8FB1" />
        <circle cx="940" cy="884" r="4" fill="#FF6B6B" />
        <circle cx="520" cy="884" r="4" fill="#FFD93D" />
        <circle cx="1300" cy="884" r="5" fill="#FF6B6B" />
        <circle cx="700" cy="886" r="4" fill="#FFFFFF" />
      </g>

      {/* hot-air balloon */}
      <g>
        <path
          d="M1300 150 a52 58 0 1 1 -0.1 0 Z"
          fill="#FF6B6B"
        />
        <path d="M1300 92 c-16 0 -26 52 -26 116 a26 20 0 0 0 52 0 c0 -64 -10 -116 -26 -116" fill="#FFD93D" opacity="0.85" transform="translate(26,0) scale(1,1) translate(-52,0)" />
        <path d="M1274 208 q26 26 52 0" stroke="#E14B4B" strokeWidth="3" fill="none" />
        <line x1="1282" y1="212" x2="1288" y2="238" stroke="#8A5A3B" strokeWidth="2.5" />
        <line x1="1318" y1="212" x2="1312" y2="238" stroke="#8A5A3B" strokeWidth="2.5" />
        <rect x="1284" y="238" width="32" height="22" rx="4" fill="#8A5A3B" />
      </g>
    </svg>
  );
}
