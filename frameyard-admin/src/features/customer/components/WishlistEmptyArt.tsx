/**
 * Empty-wishlist illustration, drawn to sit beside the empty-cart art: heavy black outlines,
 * a soft grey disc behind, sparkles, a tag and a dashed trail. An empty frame hangs on its
 * nail with a dashed heart where a saved frame will go. Pure SVG, so it stays crisp in a
 * narrow drawer and costs no image request.
 */
export default function WishlistEmptyArt({ className }: { className?: string }) {
  const ink = '#111';
  return (
    <svg className={className} viewBox="0 0 320 286" fill="none" aria-hidden="true" focusable="false">
      {/* Soft ground */}
      <circle cx="166" cy="150" r="112" fill="#f1f1f1" />
      <ellipse cx="160" cy="268" rx="78" ry="7" fill="#e7e7e7" />

      {/* Nail and hanging cord */}
      <path d="M118 92 L160 44 L202 92" stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="160" cy="42" r="6" fill={ink} />
      <circle cx="160" cy="42" r="2" fill="#fff" />

      {/* The empty frame, slightly askew */}
      <g transform="rotate(-3 160 172)">
        <rect x="92" y="88" width="136" height="168" rx="3" fill="#fff" stroke={ink} strokeWidth="11" />
        <rect x="110" y="106" width="100" height="132" fill="#fff" stroke="#c9c9c9" strokeWidth="1.5" />
        <rect x="118" y="114" width="84" height="116" fill="#fafafa" stroke="#e2e2e2" strokeWidth="1" />
        {/* Where a saved frame goes */}
        <path
          d="M160 196c-14-10-26-19-26-32 0-8 6-14 14-14 5 0 9 3 12 7 3-4 7-7 12-7 8 0 14 6 14 14 0 13-12 22-26 32z"
          stroke={ink}
          strokeWidth="2.5"
          strokeDasharray="5 5"
          strokeLinejoin="round"
        />
      </g>

      {/* Accents */}
      <path d="M70 62l10 14M58 82l16 6M86 50l2 16" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <path d="M262 74l3.5 8.5 8.5 3.5-8.5 3.5-3.5 8.5-3.5-8.5-8.5-3.5 8.5-3.5z" fill={ink} />
      <path d="M64 214l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill={ink} />
      <path
        d="M262 140c-6-4-11-8-11-13 0-3.5 2.6-6 6-6 2 0 3.8 1 5 2.8 1.2-1.8 3-2.8 5-2.8 3.4 0 6 2.5 6 6 0 5-5 9-11 13z"
        stroke={ink}
        strokeWidth="2.8"
        strokeLinejoin="round"
        fill="#fff"
      />
      {/* Price tag with a heart */}
      <g transform="rotate(-24 46 140)">
        <path d="M30 124h28l12 16-12 16H30z" fill="#fff" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="60" cy="140" r="3" stroke={ink} strokeWidth="2" />
        <path d="M44 147c-4-3-7-5.5-7-8.5 0-2 1.6-3.6 3.6-3.6 1.4 0 2.6.8 3.4 2 .8-1.2 2-2 3.4-2 2 0 3.6 1.6 3.6 3.6 0 3-3 5.5-7 8.5z" fill={ink} />
      </g>
      {/* Dashed trail */}
      <path d="M244 236c22-6 38-22 40-44" stroke={ink} strokeWidth="1.6" strokeDasharray="4 5" strokeLinecap="round" />
    </svg>
  );
}
