import { useId, useState } from 'react';
import { getFrameOpening } from './framePreviewConfig';
import { fitPhotoRect } from './framePreviewGeometry';

interface ProductFramePreviewProps {
  productImage: string;
  photo?: string;
  aspectRatio?: number;
  name: string;
}

export default function ProductFramePreview({ productImage, photo, aspectRatio = 4 / 5, name }: ProductFramePreviewProps) {
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
            const photoRect = fitPhotoRect(bounds, aspectRatio);
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
                <image href={photo} {...photoRect} preserveAspectRatio="xMidYMid slice" />
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
