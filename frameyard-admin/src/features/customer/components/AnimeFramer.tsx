import React from 'react';

/**
 * An original black-and-white anime-style illustration for the log in / sign up screens: a
 * young man holding up a picture frame (a little mountain-and-sun sketch inside it), drawn
 * in ink on white with a transparent ground so it can break out of the card. `crop="bust"`
 * frames just the head and shoulders, for the account-created reveal.
 */
const AnimeFramer: React.FC<{ className?: string; crop?: 'full' | 'bust' }> = ({ className, crop = 'full' }) => (
  <svg
    className={className}
    viewBox={crop === 'bust' ? '110 58 180 240' : '40 50 320 510'}
    preserveAspectRatio="xMidYMid meet"
    fill="none"
    stroke="#111111"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {/* Hair, back: a rounded mass with a few spikes breaking the top line */}
    <path d="M126 214 C114 178 116 142 134 118 L114 100 L148 100 L146 72 L176 92 L194 60 L210 90 L238 66 L242 98 L276 90 L266 122 C288 150 292 198 274 238 L262 214 L132 222 Z" fill="#111111" />

    {/* Neck and shoulders: a black jacket over a white tee */}
    <path d="M182 268 L182 300 L218 300 L218 268" fill="#ffffff" strokeWidth="4" />
    <path d="M58 560 C60 470 70 380 104 346 C128 322 160 310 184 300 L200 318 L216 300 C240 310 272 322 296 346 C330 380 340 470 342 560 Z" fill="#111111" />
    <path d="M182 300 L200 334 L218 300" fill="#ffffff" stroke="#ffffff" strokeWidth="2" />
    <path d="M168 306 L186 360 M232 306 L214 360" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="3" />

    {/* Ears */}
    <path d="M140 206 C128 200 124 222 134 234 C138 240 144 238 146 234" fill="#ffffff" strokeWidth="4" />
    <path d="M260 206 C272 200 276 222 266 234 C262 240 256 238 254 234" fill="#ffffff" strokeWidth="4" />

    {/* Face */}
    <path d="M144 170 C144 132 170 116 200 116 C230 116 256 132 256 170 L254 216 C252 244 236 264 214 276 C205 281 195 281 186 276 C164 264 148 244 146 216 Z" fill="#ffffff" strokeWidth="4.5" />

    {/* Hair, fringe: anime spikes over the forehead */}
    <path d="M132 196 C122 136 152 98 200 96 C250 94 282 132 270 196 L258 162 L250 190 L236 146 L224 182 L212 140 L198 180 L186 142 L174 184 L162 150 L152 192 L144 166 Z" fill="#111111" />
    <path d="M176 106 C190 100 208 100 222 106" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" />

    {/* Brows */}
    <path d="M160 188 L184 184 M216 184 L240 188" strokeWidth="4" />

    {/* Eyes: heavy upper lash line, tall iris, two highlights */}
    <path d="M158 206 C166 194 184 192 194 202" strokeWidth="5.5" />
    <path d="M206 202 C216 192 234 194 242 206" strokeWidth="5.5" />
    <ellipse cx="177" cy="212" rx="9" ry="12" fill="#111111" stroke="none" />
    <ellipse cx="223" cy="212" rx="9" ry="12" fill="#111111" stroke="none" />
    <circle cx="180.5" cy="206" r="3.6" fill="#ffffff" stroke="none" />
    <circle cx="226.5" cy="206" r="3.6" fill="#ffffff" stroke="none" />
    <circle cx="174" cy="217" r="1.6" fill="#ffffff" stroke="none" />
    <circle cx="220" cy="217" r="1.6" fill="#ffffff" stroke="none" />
    {/* Nose, smile, blush hatching on the cheeks */}
    <path d="M201 230 L197 241 L203 242" strokeWidth="2.5" />
    <path d="M186 255 C194 263 206 263 214 255" strokeWidth="3.5" />
    <path d="M160 248 l6 -5 M167 250 l6 -5 M227 250 l6 -5 M234 248 l6 -5" strokeWidth="2" strokeOpacity="0.3" />

    {/* The frame, held up and tilted a touch */}
    <g transform="rotate(-5 200 440)">
      {/* A white moulding with an ink double line, so it reads against the black jacket */}
      <rect x="106" y="336" width="188" height="210" rx="3" fill="#ffffff" stroke="#111111" strokeWidth="4.5" />
      <rect x="117" y="347" width="166" height="188" fill="none" stroke="#111111" strokeWidth="2" />
      <rect x="136" y="366" width="128" height="150" fill="#f1f1f1" stroke="#111111" strokeWidth="3" />
      <path d="M137 515 L176 456 L198 486 L222 452 L263 515 Z" fill="#111111" stroke="none" />
      <path d="M176 456 L184 468 L178 470 M222 452 L230 464 L224 466" stroke="#ffffff" strokeWidth="2" />
      <circle cx="236" cy="402" r="13" stroke="#111111" strokeWidth="3" fill="#ffffff" />
      <path d="M150 396 c6 -4 12 -4 18 0 M160 386 c5 -3 10 -3 15 0" strokeWidth="2.5" />
    </g>

    {/* Hands gripping the frame's sides */}
    <g strokeWidth="4" fill="#ffffff">
      <path d="M94 418 C92 404 104 396 116 398 L130 402 C136 404 136 414 130 416 L124 418 L132 422 C138 424 138 434 132 436 L124 438 L130 442 C136 446 134 456 126 456 L112 456 C100 456 94 446 94 432 Z" />
      <path d="M308 410 C310 396 298 388 286 390 L272 394 C266 396 266 406 272 408 L278 410 L270 414 C264 416 264 426 270 428 L278 430 L272 434 C266 438 268 448 276 448 L290 448 C302 448 308 438 308 424 Z" />
    </g>

    {/* Two small sparkles */}
    <path d="M318 300 l5 13 l13 5 l-13 5 l-5 13 l-5 -13 l-13 -5 l13 -5 Z" fill="#111111" stroke="none" />
    <path d="M78 292 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" fill="#111111" stroke="none" />
  </svg>
);

export default AnimeFramer;
