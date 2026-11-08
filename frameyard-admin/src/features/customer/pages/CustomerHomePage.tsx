import React, { useEffect } from 'react';
import useProducts from '../../../hooks/useProducts';
import FrameTypesCarousel from '../components/FrameTypesCarousel';
import HeroSection from '../components/HeroSection';
import HowItWorksSection from '../components/HowItWorksSection';

const CustomerHomePage: React.FC = () => {
  const { fetchProducts } = useProducts(false);

  useEffect(() => {
    void fetchProducts({ page: 1, limit: 50, isActive: true, publicCatalog: true });
  }, [fetchProducts]);

  return (
    <div className="bg-white text-black">
      <HeroSection />
      <FrameTypesCarousel />
      <HowItWorksSection />
    </div>
  );
};

export default CustomerHomePage;
