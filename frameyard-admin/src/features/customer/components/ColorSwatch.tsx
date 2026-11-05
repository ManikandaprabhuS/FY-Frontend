import React from 'react';

type ColorSwatchProps = {
  color?: string | null;
  className?: string;
};

const isImageValue = (value: string) => /^(data:image\/|https?:\/\/|\/)/i.test(value);

const swatchColor = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized.includes('black')) return '#171717';
  if (normalized.includes('white')) return '#f8f8f8';
  if (normalized.includes('walnut')) return '#79543a';
  if (normalized.includes('oak')) return '#c79d68';
  if (normalized.includes('natural')) return '#c8aa7c';
  if (normalized.includes('silver')) return '#b9bec5';
  if (normalized.includes('gold')) return '#c6a15b';
  return value;
};

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, className = 'h-6 w-6' }) => {
  const value = color?.trim() || '#d1d5db';
  const image = isImageValue(value);

  return (
    <span
      role="img"
      aria-label={`Color: ${color || 'Standard'}`}
      title={color || 'Standard color'}
      className={`inline-block shrink-0 rounded-full border border-black/15 bg-center bg-cover shadow-sm ${className}`}
      style={image ? { backgroundImage: `url("${value.replaceAll('"', '\\"')}")` } : { backgroundColor: swatchColor(value) }}
    />
  );
};

export default ColorSwatch;
