export interface HeroFrameArt {
  id: string;
  tone: 'sage' | 'navy' | 'terracotta' | 'cream';
  frame: 'oak' | 'black' | 'white';
  title: string;
  image?: string;
  alt?: string;
}

export interface HeroProductColorOption {
  name: string;
  value: string;
}

export interface HeroProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  image?: string;
  alt?: string;
  badge: string;
  featured: boolean;
  frameColor: string;
  matColor: string;
  artAccent: string;
  colorOptions: HeroProductColorOption[];
}

export const heroCopy = {
  headline: 'Frame Every Moment',
  slogan: 'Handcrafted frames for the photos, art, and memories that deserve a beautiful place at home.',
  ctaLabel: 'Shop Frames',
  ctaHref: '/collections/frames',
};

export const heroFrames: HeroFrameArt[] = [
  { id: 'memory-sage', tone: 'sage', frame: 'oak', title: 'Sage botanical frame' },
  { id: 'midnight-abstract', tone: 'navy', frame: 'black', title: 'Navy abstract frame' },
  { id: 'sunset-terracotta', tone: 'terracotta', frame: 'white', title: 'Terracotta gallery frame' },
];

export const FEATURED_HERO_PRODUCT_COUNT = 2;
export const HERO_PRODUCT_AUTOROTATE = false;

export const heroProducts: HeroProduct[] = [
  {
    id: 'oak-memory-frame',
    name: 'Oak Memory Frame',
    slug: 'oak-memory-frame',
    price: '₹1,299',
    badge: 'NEW',
    featured: true,
    frameColor: '#b9874e',
    matColor: '#f7efe4',
    artAccent: '#8a9a5b',
    colorOptions: [
      { name: 'Oak', value: '#b9874e' },
      { name: 'Walnut', value: '#6b3f25' },
      { name: 'Black', value: '#111111' },
    ],
  },
  {
    id: 'black-classic-frame',
    name: 'Black Classic Frame',
    slug: 'black-classic-frame',
    price: '₹1,599',
    badge: 'NEW',
    featured: true,
    frameColor: '#101010',
    matColor: '#f4f4f1',
    artAccent: '#243047',
    colorOptions: [
      { name: 'Black', value: '#101010' },
      { name: 'White', value: '#f5f2ea' },
      { name: 'Navy', value: '#243047' },
    ],
  },
  {
    id: 'terracotta-gallery-frame',
    name: 'Terracotta Gallery Frame',
    slug: 'terracotta-gallery-frame',
    price: '₹1,449',
    badge: 'NEW',
    featured: false,
    frameColor: '#a85f3d',
    matColor: '#fbefe4',
    artAccent: '#cc7d4a',
    colorOptions: [
      { name: 'Terracotta', value: '#a85f3d' },
      { name: 'Cream', value: '#f5ead9' },
      { name: 'Charcoal', value: '#2d2b29' },
    ],
  },
  {
    id: 'white-minimal-frame',
    name: 'White Minimal Frame',
    slug: 'white-minimal-frame',
    price: '₹1,149',
    badge: 'NEW',
    featured: false,
    frameColor: '#f6f3ec',
    matColor: '#fffaf2',
    artAccent: '#c6b99d',
    colorOptions: [
      { name: 'White', value: '#f6f3ec' },
      { name: 'Oak', value: '#b9874e' },
      { name: 'Black', value: '#111111' },
    ],
  },
];


