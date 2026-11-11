import React, { useEffect } from 'react';
import useProducts from '../../../hooks/useProducts';
import BestSellersSection from '../components/BestSellersSection';
import FrameCollectionsSection from '../components/FrameCollectionsSection';
import HeroSection from '../components/HeroSection';
import PhotoToFrameSection from '../components/PhotoToFrameSection';

const CustomerHomePage: React.FC = () => {
  const { fetchProducts } = useProducts(false);

  useEffect(() => {
    void fetchProducts({ page: 1, limit: 50, isActive: true, publicCatalog: true });
  }, [fetchProducts]);

  return (
    <div className="bg-white text-black">
      <HeroSection />
      <FrameCollectionsSection />
      <PhotoToFrameSection />
      <BestSellersSection />
    </div>
  );
};

export default CustomerHomePage;
