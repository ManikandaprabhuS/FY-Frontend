import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import brokenFrameArtwork from '../../assets/broken-frame-404.png';

interface RouteErrorPageProps {
  homePath?: string;
}

const RouteErrorPage: React.FC<RouteErrorPageProps> = ({ homePath = '/' }) => (
  <main
    className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-white px-5 py-10 text-black sm:px-8"
    aria-labelledby="route-error-title"
  >
    <section className="w-full max-w-md text-center">
      <div className="relative mx-auto aspect-square w-full max-w-[330px] sm:max-w-[380px]">
        <img
          src={brokenFrameArtwork}
          alt="A broken black picture frame"
          className="h-full w-full object-contain"
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2">
          <span className="text-[clamp(4.75rem,21vw,7.5rem)] font-black leading-none tracking-[-0.08em]">
            404
          </span>
          <span className="mt-2 flex items-center gap-3 text-[0.65rem] font-bold tracking-[0.34em] sm:text-xs">
            <span className="h-px w-6 bg-black/45" aria-hidden="true" />
            BROKEN FRAME
            <span className="h-px w-6 bg-black/45" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="-mt-3 sm:-mt-5">
        <h1 id="route-error-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Oops! This frame doesn&apos;t exist.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-600 sm:text-base">
          The page you&apos;re looking for was either moved, removed, or never existed.
        </p>
        <Link
          to={homePath}
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-black px-7 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </Link>
      </div>
    </section>
  </main>
);

export default RouteErrorPage;
