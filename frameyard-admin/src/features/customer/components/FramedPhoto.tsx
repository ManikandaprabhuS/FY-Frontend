import React from 'react';

import type { FrameFinish } from '../data/heroSlides';
import '../styles/frame.css';

interface FramedPhotoProps {
  photo: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  finish: FrameFinish;
  priority?: boolean;
  lazy?: boolean;
}

/** A photograph in a moulding with a bottom-weighted mat. Fills its container's height. */
const FramedPhoto: React.FC<FramedPhotoProps> = ({ photo, srcSet, sizes, alt, finish, priority = false, lazy = false }) => (
  <div className={`fy-frame fy-frame--${finish}`}>
    <div className="fy-frame__mat">
      <img
        src={photo}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={720}
        height={900}
        decoding="async"
        loading={lazy ? 'lazy' : undefined}
        fetchPriority={priority ? 'high' : 'low'}
        draggable={false}
        className="fy-frame__photo"
      />
    </div>
  </div>
);

export default FramedPhoto;
