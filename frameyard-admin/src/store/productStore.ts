import { create } from 'zustand';
import axios from 'axios';
import { Product } from '../types';
import type { Pagination } from '../services/contracts';
import { ProductListParams, ProductPayload, productService, VariantPayload } from '../services/product.service';

interface ProductState {
  products: Product[];
  currentProduct: Product | null;
  loading: boolean;
  pagination: Pagination;
  error: string | null;
  fetchProducts: (params?: ProductListParams) => Promise<void>;
  fetchProductById: (id: string, publicCatalog?: boolean) => Promise<void>;
  addProduct: (product: ProductPayload) => Promise<Product | null>;
  editProduct: (id: string, product: ProductPayload) => Promise<boolean>;
  addVariant: (productId: string, variant: VariantPayload) => Promise<boolean>;
  editVariant: (variantId: string, variant: VariantPayload) => Promise<boolean>;
  removeVariant: (variantId: string) => Promise<boolean>;
  clearCurrentProduct: () => void;
}

let productsRequestId = 0;
let productDetailsRequestId = 0;

const getProductErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError<{ message?: string; error?: { message?: string } }>(error)) return fallback;
  return error.response?.data?.error?.message ?? error.response?.data?.message ?? fallback;
};

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  currentProduct: null,
  loading: false,
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  error: null,

  fetchProducts: async (params = {}) => {
    const requestId = ++productsRequestId;
    set({ loading: true, error: null });
    try {
      const data = await productService.getProducts(params);
      if (requestId !== productsRequestId) return;
      set({ products: data.products, pagination: data.pagination, loading: false });
    } catch (err: unknown) {
      if (requestId !== productsRequestId) return;
      set({ error: getProductErrorMessage(err, 'Failed to fetch products'), loading: false });
    }
  },

  fetchProductById: async (id: string, publicCatalog = false) => {
    const requestId = ++productDetailsRequestId;
    set({ loading: true, error: null });
    try {
      const product = await productService.getProductById(id, publicCatalog);
      if (requestId !== productDetailsRequestId) return;
      set({ currentProduct: product, loading: false });
    } catch (err: unknown) {
      if (requestId !== productDetailsRequestId) return;
      set({ error: getProductErrorMessage(err, 'Failed to fetch product'), loading: false });
    }
  },

  addProduct: async (product) => {
    set({ loading: true, error: null });
    try {
      const newProd = await productService.createProduct(product);
      set((state) => ({
        products: [...state.products, newProd],
        loading: false,
      }));
      return newProd;
    } catch (err: unknown) {
      set({ error: getProductErrorMessage(err, 'Failed to add product'), loading: false });
      return null;
    }
  },

  editProduct: async (id, product) => {
    set({ loading: true, error: null });
    try {
      const updatedProd = await productService.updateProduct(id, product);
      set((state) => {
        // The backend now returns variants+images. But as a safety net,
        // if variants come back empty/missing, keep the existing ones.
        const existingProduct = state.products.find((p) => p.id === id);
        const mergedVariants =
          updatedProd.variants !== undefined
            ? updatedProd.variants
            : existingProduct?.variants || [];
        const mergedImages =
          updatedProd.images !== undefined
            ? updatedProd.images
            : existingProduct?.images || [];
        const merged = {
          ...updatedProd,
          variants: mergedVariants,
          images: mergedImages,
        };
        return {
          products: state.products.map((p) => (p.id === id ? merged : p)),
          currentProduct:
            state.currentProduct?.id === id ? merged : state.currentProduct,
          loading: false,
        };
      });
      return true;
    } catch (err: unknown) {
      set({ error: getProductErrorMessage(err, 'Failed to update product'), loading: false });
      return false;
    }
  },

  addVariant: async (productId, variant) => {
    set({ loading: true, error: null });
    try {
      await productService.createVariant(productId, variant);
      const product = await productService.getProductById(productId);
      set((state) => ({
        currentProduct: product,
        products: state.products.map((p) => (p.id === productId ? product : p)),
        loading: false,
      }));
      return true;
    } catch (err: unknown) {
      set({ error: getProductErrorMessage(err, 'Failed to add variant'), loading: false });
      return false;
    }
  },

  editVariant: async (variantId, variant) => {
    set({ loading: true, error: null });
    try {
      const updatedVariant = await productService.updateVariant(variantId, variant);
      set((state) => ({
        products: state.products.map((product) => ({
          ...product,
          variants: product.variants.map((item) => (item.id === variantId ? updatedVariant : item)),
        })),
        currentProduct: state.currentProduct
          ? {
              ...state.currentProduct,
              variants: state.currentProduct.variants.map((item) =>
                item.id === variantId ? updatedVariant : item
              ),
            }
          : null,
        loading: false,
      }));
      return true;
    } catch (err: unknown) {
      set({ error: getProductErrorMessage(err, 'Failed to update variant'), loading: false });
      return false;
    }
  },

  removeVariant: async (variantId) => {
    set({ loading: true, error: null });
    try {
      await productService.deleteVariant(variantId);
      set((state) => ({
        products: state.products.map((product) => ({
          ...product,
          variants: product.variants.filter((item) => item.id !== variantId),
        })),
        currentProduct: state.currentProduct
          ? {
              ...state.currentProduct,
              variants: state.currentProduct.variants.filter((item) => item.id !== variantId),
            }
          : null,
        loading: false,
      }));
      return true;
    } catch (err: unknown) {
      set({ error: getProductErrorMessage(err, 'Failed to delete variant'), loading: false });
      return false;
    }
  },

  clearCurrentProduct: () => {
    productDetailsRequestId += 1;
    set({ currentProduct: null, loading: false });
  },
}));
