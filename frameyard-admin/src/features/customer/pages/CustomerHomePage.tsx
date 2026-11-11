import React, { useEffect } from 'react';
import useProducts from '../../../hooks/useProducts';
import FrameCollectionsSection from '../components/FrameCollectionsSection';
import HeroSection from '../components/HeroSection';
import HomepageOfferBanner from '../components/HomepageOfferBanner';
import PhotoToFrameSection from '../components/PhotoToFrameSection';

const CustomerHomePage: React.FC = () => {
  const { fetchProducts } = useProducts(false);

  useEffect(() => {
    void fetchProducts({ page: 1, limit: 50, isActive: true, publicCatalog: true });
  }, [fetchProducts]);

  return (
    <div className="bg-white text-black">
      <HeroSection />
      <HomepageOfferBanner />
      <FrameCollectionsSection />
      <PhotoToFrameSection />
    </div>
  );
};

export default CustomerHomePage;
