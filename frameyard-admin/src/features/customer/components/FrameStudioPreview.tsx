import React, { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import type { FrameRatio } from './framePreviewGeometry';

type FrameStudioPreviewProps = {
  /** The customer's photo, already cropped to this size's ratio (or undefined). */
  photo?: string;
  ratio: FrameRatio;
  /** The selected finish, as a CSS colour. */
  colorHex: string;
  /** A mount (mat) shows between frame and photo when the variant has one. */
  mounted: boolean;
  /** Glass shows as a soft diagonal sheen across the picture. */
  glazed: boolean;
  productName: string;
  onUpload: () => void;
};

/**
 * "Your frame": the selected frame drawn live on a wall, built from the inside out — the
 * opening takes the size's exact proportions, so a photo cropped to that size fills it edge
 * to edge with no gap and nothing spilling past the moulding. Size, finish, mount and glass
 * all ease into place as they change: a new finish washes across the moulding, and a new
 * photo develops into the opening (rising into view as its colour comes up), then the
 * glass catches the light once.
 */
const FrameStudioPreview = ({ photo, ratio, colorHex, mounted, glazed, productName, onUpload }: FrameStudioPreviewProps) => {
  const style = {
    '--fs-r': ratio.width / ratio.height,
    '--fs-color': colorHex,
  } as React.CSSProperties;
  const photoKey = photo?.slice(-48);

  // The finish washes across the moulding when it changes, but not on first paint.
  const [firstColor] = useState(colorHex);
  const washed = colorHex !== firstColor;

  return (
    <div className="fy-studio" style={style} data-mounted={mounted || undefined} data-glazed={glazed || undefined}>
      <div className="fy-studio__frame">
        {washed && <span key={colorHex} className="fy-studio__wash" aria-hidden="true" />}
        <span className="fy-studio__dim fy-studio__dim--w" aria-hidden="true"><span key={ratio.width}>{ratio.width} in</span></span>
        <span className="fy-studio__dim fy-studio__dim--h" aria-hidden="true"><span key={ratio.height}>{ratio.height} in</span></span>
        <div className="fy-studio__mat">
          <div className="fy-studio__opening">
            {photo ? (
              <img key={photoKey} src={photo} alt={`Your photo in the ${productName}, ${ratio.label}`} className="fy-studio__photo" decoding="async" />
            ) : (
              <button type="button" className="fy-studio__empty" onClick={onUpload}>
                <ImagePlus className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                <span>Add your photo</span>
              </button>
            )}
            {/* Remounts with each new photo, so the glass catches the light once as it settles. */}
            <span key={`glass:${photoKey ?? 'empty'}`} className="fy-studio__glass" data-photo={photo ? true : undefined} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
};

/** The studio slide's thumbnail: a tiny drawn frame, holding the photo once there is one. */
export const FrameStudioThumb = ({ photo, colorHex }: { photo?: string; colorHex: string }) => (
  <span className="fy-studio-thumb" style={{ '--fs-color': colorHex } as React.CSSProperties}>
    <span>{photo ? <img src={photo} alt="" /> : null}</span>
  </span>
);

export default FrameStudioPreview;
