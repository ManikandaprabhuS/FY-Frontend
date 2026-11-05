import { useEffect } from 'react';
import { useProductStore } from '../store/productStore';

export const useProducts = (autoFetch = false) => {
  const products = useProductStore((state) => state.products);
  const currentProduct = useProductStore((state) => state.currentProduct);
  const loading = useProductStore((state) => state.loading);
  const pagination = useProductStore((state) => state.pagination);
  const error = useProductStore((state) => state.error);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const fetchProductById = useProductStore((state) => state.fetchProductById);
  const addProduct = useProductStore((state) => state.addProduct);
  const editProduct = useProductStore((state) => state.editProduct);
  const addVariant = useProductStore((state) => state.addVariant);
  const editVariant = useProductStore((state) => state.editVariant);
  const removeVariant = useProductStore((state) => state.removeVariant);
  const clearCurrentProduct = useProductStore((state) => state.clearCurrentProduct);

  useEffect(() => {
    if (autoFetch && products.length === 0) {
      fetchProducts();
    }
  }, [autoFetch, fetchProducts]);

  return {
    products,
    currentProduct,
    loading,
    pagination,
    error,
    fetchProducts,
    fetchProductById,
    addProduct,
    editProduct,
    addVariant,
    editVariant,
    removeVariant,
    clearCurrentProduct,
  };
};
export default useProducts;
