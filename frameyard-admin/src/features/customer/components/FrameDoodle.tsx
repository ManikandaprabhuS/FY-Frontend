import React from 'react';

/** The monochrome, hand-drawn frame mark used on the customer auth screens. */
const FrameDoodle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 620 520" fill="none" aria-hidden="true" focusable="false">
    <rect width="620" height="520" fill="var(--frame-doodle-bg, #000)" />
    <g transform="rotate(-10 270 250)">
      <rect x="84" y="58" width="324" height="386" rx="7" fill="#202020" stroke="#d7d7d7" strokeWidth="5" />
      <rect x="101" y="75" width="290" height="352" rx="3" stroke="#797979" strokeWidth="3" />
      <path d="M115 92h260M115 410h260" stroke="#f2f2f2" strokeOpacity=".35" strokeWidth="2" />
    </g>
    <g transform="rotate(7 350 280)">
      <rect x="204" y="114" width="320" height="370" rx="7" fill="#f5f5f5" stroke="#111" strokeWidth="6" />
      <rect x="222" y="132" width="284" height="334" rx="3" stroke="#707070" strokeWidth="3" />
      <path d="M237 148h254M237 450h254" stroke="#111" strokeOpacity=".35" strokeWidth="2" />
    </g>
    <path d="M77 274l27 12-27 12M500 75l11 26 26 11-26 11-11 26-11-26-26-11 26-11z" fill="#2c2c2c" stroke="#8a8a8a" strokeWidth="2" />
    <path d="M160 470l36-8M173 479l28-6M514 430l30-9" stroke="#777" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default FrameDoodle;
