export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'primaryOnDark' | 'secondaryOnDark';

// Sizing lives in the variants (not the base) so no two classes set the same property.
const base =
  'inline-flex items-center justify-center gap-2 rounded-[2px] text-[15px] font-medium tracking-[0.005em] transition-[background-color,color,transform] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

const filled = 'min-h-12 px-6';

const variants: Record<ButtonVariant, string> = {
  primary: `${filled} bg-ink text-white hover:bg-black`,
  secondary: `${filled} border border-ink text-ink hover:bg-ink hover:text-white`,
  quiet: 'min-h-10 text-ink underline decoration-1 underline-offset-[6px] hover:decoration-2',
  primaryOnDark: `${filled} bg-white text-ink hover:bg-mat`,
  secondaryOnDark: `${filled} border border-white text-white hover:bg-white hover:text-ink`,
};

/** Storefront button styles, shared by <Button>, <ButtonLink> and any element that needs to look like one. */
export const buttonClass = (variant: ButtonVariant = 'primary', className = '') =>
  `${base} ${variants[variant]} ${className}`.trim();
