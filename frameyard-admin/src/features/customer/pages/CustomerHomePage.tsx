import React, { useEffect } from 'react';
import useProducts from '../../../hooks/useProducts';
import { HeroSplit, HowItWorksSection } from '../components';

const CustomerHomePage: React.FC = () => {
  const { products, loading, error, fetchProducts } = useProducts(false);

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts({ page: 1, limit: 50, isActive: true, publicCatalog: true });
    }
  }, [fetchProducts, products.length]);

  return (
    <div className="bg-white text-black">
      <HeroSplit products={products} loading={loading} error={error} />
      <HowItWorksSection />
    </div>
  );
};

export default CustomerHomePage;
