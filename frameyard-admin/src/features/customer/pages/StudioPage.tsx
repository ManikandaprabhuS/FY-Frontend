import React from 'react';
import MobileCustomizeSection from '../components/MobileCustomizeSection';

import { ButtonLink } from '../ui/Button';

/**
 * Entry point for the Customize action. Until the dedicated Frame Studio is built,
 * customization happens on each product page (upload, crop and preview).
 */
const StudioPage: React.FC = () => (
  <>
  <MobileCustomizeSection />
  <section className="fy-custom-desktop mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-5 py-16">
    <h1 className="fy-display text-[40px] leading-[1.05] sm:text-[52px]">Customize a frame</h1>
    <p className="mt-5 max-w-[46ch] text-[16px] leading-7 text-mute">
      Choose a frame, upload your photo and adjust the crop. You'll see it inside the frame before you add it to your bag.
    </p>
    <div className="mt-8 flex flex-wrap gap-3">
      <ButtonLink to="/products">Choose a frame</ButtonLink>
      <ButtonLink to="/book-appointment" variant="secondary">Get help in store</ButtonLink>
    </div>
  </section>
  </>
);

export default StudioPage;
