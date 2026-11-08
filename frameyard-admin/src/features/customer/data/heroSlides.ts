/**
 * Homepage hero slides. Each slide is one framed photograph shown against a wall tone.
 * Kept as plain data so it can later be replaced by images from the backend or CMS.
 */

export type FrameFinish = 'black' | 'walnut' | 'white' | 'oak' | 'metal';

export type HeroSlide = {
  id: string;
  /** Photograph shown inside the frame (portrait, roughly 4:5). */
  photo: string;
  /** Responsive sources for the photograph. */
  photoSrcSet?: string;
  alt: string;
  finish: FrameFinish;
  /** Wall colour behind the frame. */
  tone: string;
  /** Use light text and controls on this tone. */
  dark: boolean;
  caption: string;
};

const unsplash = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${Math.round(width * 1.25)}&q=80`;

const sources = (id: string) => ({
  photo: unsplash(id, 720),
  photoSrcSet: `${unsplash(id, 480)} 480w, ${unsplash(id, 720)} 720w, ${unsplash(id, 1000)} 1000w`,
});

export const heroSlides: HeroSlide[] = [
  {
    id: 'family',
    ...sources('photo-1511895426328-dc8714191300'),
    alt: 'A family sharing a warm moment, in a slim black frame',
    finish: 'black',
    tone: '#f3f3f3',
    dark: false,
    caption: 'Sunday afternoons, in a slim black frame',
  },
  {
    id: 'portrait',
    ...sources('photo-1506794778202-cad84cf45f1d'),
    alt: 'A softly lit portrait in a walnut frame',
    finish: 'walnut',
    tone: '#1d1d1d',
    dark: true,
    caption: 'A portrait, warmed by walnut',
  },
  {
    id: 'landscape',
    ...sources('photo-1500534623283-312aade485b7'),
    alt: 'A quiet mountain landscape in a white gallery frame',
    finish: 'white',
    tone: '#d8d6d2',
    dark: false,
    caption: 'The trip you keep coming back to, in gallery white',
  },
];
