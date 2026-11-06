import React, { useEffect } from 'react';
import useProducts from '../../../hooks/useProducts';
import HeroSplit from '../components/HeroSplit';
import HowItWorksSection from '../components/HowItWorksSection';

const CustomerHomePage: React.FC = () => {
  const { products, loading, error, fetchProducts } = useProducts(false);

  useEffect(() => {
    void fetchProducts({ page: 1, limit: 50, isActive: true, publicCatalog: true });
  }, [fetchProducts]);

  return (
    <div className="bg-white text-black">
      <HeroSplit products={products} loading={loading} error={error} />
      <HowItWorksSection />
    </div>
  );
};

export default CustomerHomePage;
