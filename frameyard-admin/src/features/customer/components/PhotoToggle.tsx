import React from 'react';

import { useFramePhotosStore } from '../store/framePhotosStore';
import '../styles/hero.css';

/**
 * The rolling ON/OFF switch that shows or hides the photos inside the homepage frames.
 * Every copy shares one state, so switching it anywhere switches every section.
 */
const PhotoToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const photosOn = useFramePhotosStore((state) => state.photosOn);
  const togglePhotos = useFramePhotosStore((state) => state.togglePhotos);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={photosOn}
      aria-label="Show photos in the frames"
      onClick={togglePhotos}
      className={`fy-toggle ${className}`.trim()}
    >
      <span className="fy-toggle__label">{photosOn ? 'Reveal frames' : 'Reveal photos'}</span>
      <span className="fy-toggle__track" aria-hidden="true">
        <span className="fy-toggle__knob">
          <span className="fy-toggle__face">
            <span className="fy-toggle__word fy-toggle__word--on">On</span>
            <span className="fy-toggle__word fy-toggle__word--off">Off</span>
          </span>
        </span>
      </span>
    </button>
  );
};

export default PhotoToggle;
