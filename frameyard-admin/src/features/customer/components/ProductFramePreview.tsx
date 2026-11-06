import { useId, useState } from 'react';
import { getFrameOpening } from './framePreviewConfig';

interface ProductFramePreviewProps {
  productImage: string;
  photo?: string;
  name: string;
}

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
          {openings.map((opening, index) => (
            <g key={index}>
              <defs>
                <clipPath id={`${clipId}-${index}`}>
                  {opening.points
                    ? <polygon points={opening.points.map(([x, y]) => `${x * dimensions.width},${y * dimensions.height}`).join(' ')} />
                    : <rect x={opening.x * dimensions.width} y={opening.y * dimensions.height} width={opening.width * dimensions.width} height={opening.height * dimensions.height} />}
                </clipPath>
              </defs>
              <image href={photo} x={opening.x * dimensions.width} y={opening.y * dimensions.height} width={opening.width * dimensions.width} height={opening.height * dimensions.height} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId}-${index})`} />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
