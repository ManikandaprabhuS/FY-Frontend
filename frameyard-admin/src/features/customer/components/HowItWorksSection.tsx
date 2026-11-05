import React from 'react';
import { Eye, Package, PictureInPicture2, Upload, LucideIcon } from 'lucide-react';

interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconLabel: string;
}

const howItWorksSteps: HowItWorksStep[] = [
  {
    number: 'Step 1',
    title: 'Upload Your Photo',
    description: 'Choose your favorite memory from your phone or computer and upload it securely to FrameYaad.',
    icon: Upload,
    iconLabel: 'Upload photo',
  },
  {
    number: 'Step 2',
    title: 'Choose Your Frame',
    description: 'Browse premium frame styles, colors, sizes, mount options, and glass finishes that match your space.',
    icon: PictureInPicture2,
    iconLabel: 'Choose frame',
  },
  {
    number: 'Step 3',
    title: 'Preview Before You Order',
    description: 'Instantly preview your uploaded photo inside the selected frame before placing your order.',
    icon: Eye,
    iconLabel: 'Preview framed photo',
  },
  {
    number: 'Step 4',
    title: 'Receive & Display',
    description: 'Complete your order and receive a beautifully handcrafted frame delivered to your doorstep.',
    icon: Package,
    iconLabel: 'Receive package',
  },
];

const HowItWorksSection: React.FC = () => (
  <section className="mx-auto max-w-7xl bg-white px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
    <div className="text-center">
      <p className="text-sm font-black uppercase tracking-[0.26em] text-[#c07d42]">FrameYaad Experience</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-black md:text-4xl">How FrameYaad Works</h2>
      <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-black/60">
        Create your perfect framed memory in just a few simple steps.
      </p>
    </div>

    <div className="relative mt-10 grid gap-9 sm:mt-12 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:mt-16 lg:grid-cols-4 lg:gap-8">
      {howItWorksSteps.map((step, index) => {
        const Icon = step.icon;

        return (
          <article
            key={step.number}
            className="group relative flex animate-fade-in flex-col items-center text-center transition duration-300"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <div
              className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-black/10 bg-[#f7f3ef] text-black shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary group-hover:shadow-[0_18px_45px_rgba(0,74,198,0.18)] sm:h-18 sm:w-18"
              aria-label={step.iconLabel}
            >
              <Icon className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#c07d42] sm:mt-6">{step.number}</p>
            <h3 className="mt-2 text-base font-black text-black sm:mt-3 sm:text-lg">{step.title}</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-black/60 sm:mt-3">{step.description}</p>
          </article>
        );
      })}
    </div>
  </section>
);

export default HowItWorksSection;
