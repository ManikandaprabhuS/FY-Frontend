import React from 'react';
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
 * all ease into place as they change; a new photo settles in behind the glass.
 */
const FrameStudioPreview = ({ photo, ratio, colorHex, mounted, glazed, productName, onUpload }: FrameStudioPreviewProps) => {
  const style = {
    '--fs-r': ratio.width / ratio.height,
    '--fs-color': colorHex,
  } as React.CSSProperties;

  return (
    <div className="fy-studio" style={style} data-mounted={mounted || undefined} data-glazed={glazed || undefined}>
      <div className="fy-studio__frame">
        <span className="fy-studio__dim fy-studio__dim--w" aria-hidden="true"><span>{ratio.width} in</span></span>
        <span className="fy-studio__dim fy-studio__dim--h" aria-hidden="true"><span>{ratio.height} in</span></span>
        <div className="fy-studio__mat">
          <div className="fy-studio__opening">
            {photo ? (
              <img key={photo.slice(-48)} src={photo} alt={`Your photo in the ${productName}, ${ratio.label}`} className="fy-studio__photo" decoding="async" />
            ) : (
              <button type="button" className="fy-studio__empty" onClick={onUpload}>
                <ImagePlus className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                <span>Add your photo</span>
              </button>
            )}
            <span className="fy-studio__glass" aria-hidden="true" />
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
