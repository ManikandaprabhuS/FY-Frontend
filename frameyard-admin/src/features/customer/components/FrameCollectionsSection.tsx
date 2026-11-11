import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, RefreshCw, ShieldCheck, Truck } from 'lucide-react';

import { collectionShopPath, frameCollections, type FrameCollection } from '../data/frameCollections';
import { useFramePhotosStore } from '../store/framePhotosStore';
import '../styles/collections.css';
import {collectionPlants} from '../data/collectionPlants';

const promises = [
  { icon: Truck, title: 'Shipping across India', detail: 'Delivered to your door' },
  { icon: ShieldCheck, title: 'Secure payment', detail: 'Protected checkout' },
  { icon: RefreshCw, title: 'Easy returns', detail: 'Hassle-free exchanges' },
  { icon: BadgeCheck, title: 'Quality assured', detail: 'Premium materials' },
];

const CollectionCard: React.FC<{ collection: FrameCollection; index: number; photosOn: boolean }> = ({ collection, index, photosOn }) => {
  const plant=collection.id in collectionPlants?collectionPlants[collection.id as keyof typeof collectionPlants]:null;
  return (
    <li className="fy-col__item">
      <Link
        to={collectionShopPath(collection.id)}
        className="fy-col__card"
        data-collection={collection.id}
        style={{ '--i': index } as React.CSSProperties}
        aria-label={`Shop ${collection.name.toLowerCase()}`}
        // iOS Safari only shows :active (the tap flip of Shop now) when a touch listener exists.
        onTouchStart={() => undefined}
      >
        <span className="fy-col__scene" aria-hidden="true">
          <span className="fy-col__ledge" />
          {plant&&<img src={plant.src} alt={plant.alt} width={400} height={600} loading="lazy" decoding="async" className={"fy-col__plant fy-col__plant--"+plant.side}/>}
          <span className={`fy-col__frame fy-col__frame--${collection.id}`}>
            <span className="fy-col__mat">
              <span className="fy-col__opening">
                <img
                  className="fy-col__photo"
                  src={collection.fallbackPhoto.src}
                  srcSet={collection.fallbackPhoto.srcSet}
                  sizes="(min-width: 1024px) 200px, 45vw"
                  alt=""
                  decoding="async"
                  loading="lazy"
                  draggable={false}
                  data-visible={photosOn}
                />
              </span>
            </span>
          </span>
        </span>
        <span className="fy-col__bar">
          <span className="fy-col__name">{collection.name}</span>
          <span className="fy-col__shop">
            Shop now
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </span>
        </span>
      </Link>
    </li>
  );
};

/**
 * Homepage section after the hero: the four frame collections, each a frame leaning on a
 * ledge. The hero's photo switch drives these frames too, so
 * photos appear in every frame at once. A row of store promises closes the section.
 */
const FrameCollectionsSection: React.FC = () => {
  const photosOn = useFramePhotosStore((state) => state.photosOn);

  return (
    <section className="fy-col mx-auto w-full max-w-[1440px] px-5 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10 lg:px-10 lg:pb-12 lg:pt-12" aria-labelledby="fy-collections-title">
      <div className="text-center">
        <h2 id="fy-collections-title" className="fy-col__title">Meet our frame collection</h2>
        <p className="fy-col__lead">Every memory deserves the right edge.</p>
      </div>

      <ul className="fy-col__list" role="list">
        {frameCollections.map((collection, index) => (
          <CollectionCard key={collection.id} collection={collection} index={index} photosOn={photosOn} />
        ))}
      </ul>
      {/* Phones: how far through the four collections the swipe is. */}
      <span className="fy-col__progress" aria-hidden="true"><span /></span>

      <ul className="fy-col__promises" role="list" aria-label="Why shop with FrameYaad">
        {promises.map(({ icon: Icon, title, detail }) => (
          <li key={title} className="fy-col__promise">
            <span className="fy-col__promise-icon" aria-hidden="true"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
            <span>
              <span className="fy-col__promise-title">{title}</span>
              <span className="fy-col__promise-detail">{detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default FrameCollectionsSection;
