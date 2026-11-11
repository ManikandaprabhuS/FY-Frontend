import { Crop, House, Package, ShoppingBag, UserRound, type LucideIcon } from 'lucide-react';

export const BRAND_NAME = 'FrameYaad';

export const STUDIO_PATH = '/studio';

/** Desktop header links. Unchanged from the existing navigation. */
export const primaryNavLinks = [
  { name: 'Home', path: '/' },
  { name: 'Shop all', path: '/products' },
  { name: 'Book appointment', path: '/book-appointment' },
  { name: 'Contact us', path: '/contact-us' },
];

export type DockItem = { name: string; path: string; icon: LucideIcon; featured?: boolean; showsCartCount?: boolean };

/** Mobile bottom bar, left to right. Every item opens an existing page. */
export const dockItems: DockItem[] = [
  { name: 'Home', path: '/', icon: House },
  { name: 'Cart', path: '/cart', icon: ShoppingBag, showsCartCount: true },
  { name: 'Customize', path: STUDIO_PATH, icon: Crop, featured: true },
  { name: 'Orders', path: '/orders', icon: Package },
  { name: 'Account', path: '/profile', icon: UserRound },
];

/**
 * Pages where the bottom bar is hidden. Product pages have their own sticky Add to cart bar;
 * checkout has its own actions. Cart keeps the bar.
 */
const dockHiddenPrefixes = ['/checkout', '/product/'];

export const isDockRoute = (pathname: string) => !dockHiddenPrefixes.some((prefix) => pathname.startsWith(prefix));

export const isActivePath = (pathname: string, path: string) =>
  path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
