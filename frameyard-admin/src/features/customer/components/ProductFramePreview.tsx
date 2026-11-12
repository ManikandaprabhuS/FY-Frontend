import { useId, useState } from 'react';
import { getFrameOpening } from './framePreviewConfig';

interface ProductFramePreviewProps {
  productImage: string;
  photo?: string;
  aspectRatio?: number;
  name: string;
}

/** How far (as a share of the photo) it runs past each edge, under the moulding, so no gap shows. */
const OVERSCAN = 0.02;

/**
 * An SVG transform that maps the unit square onto an opening's corners, given in order
 * top-left, top-right, bottom-right, bottom-left. Each edge direction averages its two
 * opposite sides, so a slightly uneven quad is matched evenly rather than from one corner.
 */
const quadPlacement = (corners: number[][]) => {
  const [tl, tr, br, bl] = corners;
  const across = [((tr[0] - tl[0]) + (br[0] - bl[0])) / 2, ((tr[1] - tl[1]) + (br[1] - bl[1])) / 2];
  const down = [((bl[0] - tl[0]) + (br[0] - tr[0])) / 2, ((bl[1] - tl[1]) + (br[1] - tr[1])) / 2];
  const centre = [(tl[0] + tr[0] + br[0] + bl[0]) / 4, (tl[1] + tr[1] + br[1] + bl[1]) / 4];
  const origin = [centre[0] - (across[0] + down[0]) / 2, centre[1] - (across[1] + down[1]) / 2];
  return `matrix(${across[0]} ${across[1]} ${down[0]} ${down[1]} ${origin[0]} ${origin[1]})`;
};

// `aspectRatio` is kept for callers; the photo now takes the opening's own shape.
export default function ProductFramePreview({ productImage, photo, name }: ProductFramePreviewProps) {
  const clipId = useId();
  const [loaded, setLoaded] = useState<{ source: string; width: number; height: number } | null>(null);
  const openings = getFrameOpening(productImage);
  const dimensions = loaded?.source === productImage ? loaded : null;

  return (
    <div className="absolute inset-0">
      <img
        src={productImage}
        alt={photo && openings ? `${name} with your photo inside the frame` : name}
        fetchPriority="high"
        decoding="async"
        className="h-full w-full object-contain object-center"
        onLoad={event => setLoaded({ source: productImage, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
      />
      {photo && openings && dimensions && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <mask id={`${clipId}-frame`} maskUnits="userSpaceOnUse" x="0" y="0" width={dimensions.width} height={dimensions.height}>
              <rect width={dimensions.width} height={dimensions.height} fill="white" />
              {openings.map((opening, index) => opening.points
                ? <polygon key={index} points={opening.points.map(([x, y]) => `${x * dimensions.width},${y * dimensions.height}`).join(' ')} fill="black" />
                : <rect key={index} x={opening.x * dimensions.width} y={opening.y * dimensions.height} width={opening.width * dimensions.width} height={opening.height * dimensions.height} fill="black" />)}
            </mask>
          </defs>
          {openings.map((opening, index) => {
            const bounds = { x: opening.x * dimensions.width, y: opening.y * dimensions.height, width: opening.width * dimensions.width, height: opening.height * dimensions.height };
            // A four-corner opening (a frame shot at an angle): lay the photo onto those corners,
            // so it follows the tilt instead of sitting upright inside it with white gaps.
            const corners = opening.points?.length === 4 ? opening.points.map(([x, y]) => [x * dimensions.width, y * dimensions.height]) : null;
            const placement = corners ? quadPlacement(corners) : null;
            return (
            <g key={index}>
              <defs>
                <clipPath id={`${clipId}-${index}`}>
                  {opening.points
                    ? <polygon points={opening.points.map(([x, y]) => `${x * dimensions.width},${y * dimensions.height}`).join(' ')} />
                    : <rect x={opening.x * dimensions.width} y={opening.y * dimensions.height} width={opening.width * dimensions.width} height={opening.height * dimensions.height} />}
                </clipPath>
              </defs>
              <g clipPath={`url(#${clipId}-${index})`}>
                <rect {...bounds} fill="white" />
                {placement
                  ? <image href={photo} x={-OVERSCAN} y={-OVERSCAN} width={1 + OVERSCAN * 2} height={1 + OVERSCAN * 2} preserveAspectRatio="none" transform={placement} />
                  : <image href={photo} {...bounds} preserveAspectRatio="xMidYMid slice" />}
              </g>
            </g>
            );
          })}
          <image href={productImage} width={dimensions.width} height={dimensions.height} mask={`url(#${clipId}-frame)`} />
        </svg>
      )}
    </div>
  );
}
