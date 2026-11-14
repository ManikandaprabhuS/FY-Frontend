export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'primaryOnDark' | 'secondaryOnDark';

// Sizing lives in the variants (not the base) so no two classes set the same property.
const base =
  'inline-flex items-center justify-center gap-2 rounded-[2px] text-[15px] font-medium tracking-[0.005em] transition-[background-color,color,border-color,box-shadow,transform] duration-[250ms] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

const filled = 'min-h-12 px-6';

// Filled variants take their inverse hover (black <-> white) from the shared rule in
// storefront.css; outlined variants invert here. Disabled buttons never change on hover.
const variants: Record<ButtonVariant, string> = {
  primary: `${filled} bg-ink text-white`,
  secondary: `${filled} border border-ink text-ink not-disabled:hover:bg-ink not-disabled:hover:text-white`,
  quiet: 'min-h-10 text-ink underline decoration-1 underline-offset-[6px] hover:decoration-2',
  primaryOnDark: `${filled} bg-white text-ink`,
  secondaryOnDark: `${filled} border border-white text-white not-disabled:hover:bg-white not-disabled:hover:text-ink`,
};

/** Storefront button styles, shared by <Button>, <ButtonLink> and any element that needs to look like one. */
export const buttonClass = (variant: ButtonVariant = 'primary', className = '') =>
  `${base} ${variants[variant]} ${className}`.trim();
