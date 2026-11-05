import React, { useRef, useState } from 'react';
import { Check, Move, RotateCcw, X } from 'lucide-react';

type Point = { x: number; y: number };
type ImageDimensions = { width: number; height: number };
type CropRect = { x: number; y: number; width: number; height: number };
type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type Interaction = {
  pointerId: number;
  mode: 'move' | 'resize';
  start: Point;
  crop: CropRect;
  handle?: ResizeHandle;
};

type ImageCropModalProps = {
  imageSource: string;
  aspectWidth: number;
  aspectHeight: number;
  frameLabel: string;
  onCancel: () => void;
  onSave: (croppedImage: string) => void;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const createInitialCrop = (
  dimensions: ImageDimensions,
  cropAspectRatio: number,
): CropRect => {
  const imageAspectRatio = dimensions.width / dimensions.height;
  const normalizedRatio = cropAspectRatio / imageAspectRatio;
  let width: number;
  let height: number;

  if (normalizedRatio >= 1) {
    width = 0.82;
    height = width / normalizedRatio;
  } else {
    height = 0.82;
    width = height * normalizedRatio;
  }

  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  };
};

const handlePositionClasses: Record<ResizeHandle, string> = {
  'top-left': '-left-3 -top-3 cursor-nwse-resize',
  'top-right': '-right-3 -top-3 cursor-nesw-resize',
  'bottom-left': '-bottom-3 -left-3 cursor-nesw-resize',
  'bottom-right': '-bottom-3 -right-3 cursor-nwse-resize',
};

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSource,
  aspectWidth,
  aspectHeight,
  frameLabel,
  onCancel,
  onSave,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const maximumCropWidthRef = useRef(1);
  const [dimensions, setDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [crop, setCrop] = useState<CropRect | null>(null);
  const cropAspectRatio = aspectWidth / aspectHeight;
  const imageAspectRatio = dimensions.height > 0 ? dimensions.width / dimensions.height : 1;

  const startInteraction = (
    event: React.PointerEvent<HTMLElement>,
    mode: Interaction['mode'],
    handle?: ResizeHandle,
  ) => {
    if (!crop || !stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    stageRef.current.setPointerCapture(event.pointerId);
    interactionRef.current = {
      pointerId: event.pointerId,
      mode,
      handle,
      start: { x: event.clientX, y: event.clientY },
      crop,
    };
  };

  const moveCrop = (interaction: Interaction, event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const bounds = stage.getBoundingClientRect();
    const deltaX = (event.clientX - interaction.start.x) / bounds.width;
    const deltaY = (event.clientY - interaction.start.y) / bounds.height;

    setCrop({
      ...interaction.crop,
      x: clamp(interaction.crop.x + deltaX, 0, 1 - interaction.crop.width),
      y: clamp(interaction.crop.y + deltaY, 0, 1 - interaction.crop.height),
    });
  };

  const resizeCrop = (interaction: Interaction, event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    const handle = interaction.handle;
    if (!stage || !handle) return;

    const bounds = stage.getBoundingClientRect();
    const pointerX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const pointerY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    const growsRight = handle.endsWith('right');
    const growsDown = handle.startsWith('bottom');
    const anchorX = growsRight ? interaction.crop.x : interaction.crop.x + interaction.crop.width;
    const anchorY = growsDown ? interaction.crop.y : interaction.crop.y + interaction.crop.height;
    const normalizedRatio = cropAspectRatio / imageAspectRatio;
    const widthFromPointerX = Math.abs(pointerX - anchorX);
    const widthFromPointerY = Math.abs(pointerY - anchorY) * normalizedRatio;
    const xChange = Math.abs(widthFromPointerX - interaction.crop.width);
    const yChange = Math.abs(widthFromPointerY - interaction.crop.width);
    const requestedWidth = xChange >= yChange ? widthFromPointerX : widthFromPointerY;
    const maximumWidthByX = growsRight ? 1 - anchorX : anchorX;
    const maximumHeight = growsDown ? 1 - anchorY : anchorY;
    const minimumWidth = Math.min(0.18, normalizedRatio * 0.18);
    const width = clamp(
      requestedWidth,
      minimumWidth,
      Math.min(maximumCropWidthRef.current, maximumWidthByX, maximumHeight * normalizedRatio),
    );
    const height = width / normalizedRatio;

    setCrop({
      x: growsRight ? anchorX : anchorX - width,
      y: growsDown ? anchorY : anchorY - height,
      width,
      height,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    if (interaction.mode === 'move') moveCrop(interaction, event);
    else resizeCrop(interaction, event);
  };

  const stopInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (interactionRef.current?.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resetCrop = () => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      setCrop(createInitialCrop(dimensions, cropAspectRatio));
    }
  };

  const saveCrop = () => {
    if (!crop || dimensions.width === 0 || dimensions.height === 0) return;
    const sourceX = Math.round(crop.x * dimensions.width);
    const sourceY = Math.round(crop.y * dimensions.height);
    const sourceWidth = Math.round(crop.width * dimensions.width);
    const sourceHeight = Math.round(crop.height * dimensions.height);
    const canvas = document.createElement('canvas');

    if (cropAspectRatio >= 1) {
      canvas.width = Math.min(1600, sourceWidth);
      canvas.height = Math.round(canvas.width / cropAspectRatio);
    } else {
      canvas.height = Math.min(1600, sourceHeight);
      canvas.width = Math.round(canvas.height * cropAspectRatio);
    }

    const context = canvas.getContext('2d');
    if (!context) return;
    const sourceImage = new Image();
    sourceImage.onload = () => {
      context.drawImage(
        sourceImage,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      onSave(canvas.toDataURL('image/jpeg', 0.9));
    };
    sourceImage.src = imageSource;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <div className="flex max-h-[97dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#111] text-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <h2 id="crop-title" className="text-base font-black sm:text-lg">Crop your photo</h2>
            <p className="mt-1 text-[11px] text-white/60 sm:text-xs">
              Move and resize the frame to select the exact subject for {frameLabel}.
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close crop editor" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 hover:bg-white hover:text-black">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          <div
            ref={stageRef}
            className="relative mx-auto touch-none select-none overflow-hidden bg-black shadow-[0_20px_70px_rgba(0,0,0,0.5)]"
            style={{
              aspectRatio: `${dimensions.width || 1} / ${dimensions.height || 1}`,
              width: `min(100%, calc(64dvh * ${imageAspectRatio}))`,
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={stopInteraction}
            onPointerCancel={stopInteraction}
          >
            <img
              src={imageSource}
              alt="Photo being cropped"
              draggable={false}
              onLoad={(event) => {
                const nextDimensions = {
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                };
                const initialCrop = createInitialCrop(nextDimensions, cropAspectRatio);
                setDimensions(nextDimensions);
                maximumCropWidthRef.current = initialCrop.width;
                setCrop(initialCrop);
              }}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            />

            {crop && (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/65" style={{ height: `${crop.y * 100}%` }} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/65" style={{ height: `${(1 - crop.y - crop.height) * 100}%` }} />
                <div className="pointer-events-none absolute left-0 bg-black/65" style={{ top: `${crop.y * 100}%`, width: `${crop.x * 100}%`, height: `${crop.height * 100}%` }} />
                <div className="pointer-events-none absolute right-0 bg-black/65" style={{ top: `${crop.y * 100}%`, width: `${(1 - crop.x - crop.width) * 100}%`, height: `${crop.height * 100}%` }} />

                <div
                  className="absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.width * 100}%`,
                    height: `${crop.height * 100}%`,
                  }}
                  onPointerDown={(event) => startInteraction(event, 'move')}
                >
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-65 [&>*]:border-white/70">
                    {Array.from({ length: 9 }, (_, index) => <span key={index} className="border-b border-r last:border-r-0" />)}
                  </div>
                  <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[9px] font-bold text-white/90">
                    <Move className="h-3 w-3" /> Drag
                  </div>
                  {(Object.keys(handlePositionClasses) as ResizeHandle[]).map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      aria-label={`Resize crop from ${handle.replace('-', ' ')}`}
                      onPointerDown={(event) => startInteraction(event, 'resize', handle)}
                      className={`absolute z-10 h-6 w-6 rounded-full border-2 border-black bg-white shadow-lg ${handlePositionClasses[handle]}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-xs font-bold">Locked frame ratio: {frameLabel}</p>
              <p className="mt-0.5 text-[10px] text-white/50">{aspectWidth}:{aspectHeight} · drag corners inward to resize · drag inside to reposition</p>
            </div>
            <button type="button" onClick={resetCrop} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-[11px] font-bold hover:bg-white hover:text-black">
              <RotateCcw className="h-3.5 w-3.5" /> Reset crop
            </button>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/15 px-5 py-2.5 text-xs font-bold hover:bg-white hover:text-black">Cancel</button>
          <button type="button" onClick={saveCrop} disabled={!crop || dimensions.width === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-bold text-black disabled:opacity-40">
            <Check className="h-4 w-4" /> Use selected crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
