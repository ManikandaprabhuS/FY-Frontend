import React, { useEffect } from 'react';
import useProducts from '../../../hooks/useProducts';
import FrameCollectionsSection from '../components/FrameCollectionsSection';
import HomepageOfferBanner from '../components/HomepageOfferBanner';
import PhotoToFrameSection from '../components/PhotoToFrameSection';

const CustomerHomePage: React.FC = () => {
  const { fetchProducts } = useProducts(false);

  useEffect(() => {
    void fetchProducts({ page: 1, limit: 50, isActive: true, publicCatalog: true });
  }, [fetchProducts]);

  return (
    <div className="bg-white text-black">
      <HomepageOfferBanner />
      <FrameCollectionsSection />
      <PhotoToFrameSection />
    </div>
  );
};

export default CustomerHomePage;
