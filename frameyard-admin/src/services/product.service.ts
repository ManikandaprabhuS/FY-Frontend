import api from './api';
import { Product, ProductImage, ProductVariant } from '../types';
import type { Pagination } from './contracts';

export type ProductImagePayload = {
  imageUrl: string;
  displayOrder: number;
};

export type ProductPayload = {
  productIdentifier?: string | null;
  productName?: string | null;
  materialId?: string | null;
  variantId?: string | null;
  name: string;
  description?: string;
  brandName?: string;
  material: string;
  availableColors: string[];
  createdBy?: string | null;
  isActive?: boolean;
  images?: ProductImagePayload[];
  variants?: VariantPayload[];
};

export type VariantPayload = {
  color?: string | null;
  frameSize: string;
  mountType: string;
  glassType: string;
  isActive?: boolean;
  createdBy?: string | null;
  mrp?: number | null;
  MRP?: number | null;
  price: number;
  offerPrice?: number | null;
  stockQuantity: number;
  priceValidUntil?: string | null;
};

export type ProductListParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  publicCatalog?: boolean;
};

type ProductVariantApi = {
  id?: string;
  productId?: string;
  price: number | string;
  mrp?: number | string | null;
  offerPrice?: number | string | null;
  stockQuantity?: number | string;
  createdAt?: string;
  updatedAt?: string;
  priceValidUntil?: string | null;
  [key: string]: unknown;
};

type ProductApi = {
  id?: string;
  productIdentifier?: string;
  productName?: string;
  name?: string;
  description?: string;
  brandName?: string;
  material?: string | {
    brandName: string;
    description?: string | null;
    material: string;
    availableColors: string[];
    isActive: boolean;
  };
  availableColors?: string[];
  isActive?: boolean;
  variant?: ProductVariantApi;
  createdAt?: string;
  updatedAt?: string;
  variants?: ProductVariantApi[];
  images?: Array<{
    id: string;
    productId?: string;
    productIdentifier?: string | null;
    imageUrl: string;
    isPrimary?: boolean;
    displayOrder?: number | string;
  }>;
  [key: string]: unknown;
};

const normalizeVariant = (variant: ProductVariantApi): ProductVariant => ({
  ...(variant as unknown as ProductVariant),
  price: Number(variant.mrp ?? variant.price),
  offerPrice:
    variant.offerPrice !== null && variant.offerPrice !== undefined
      ? Number(variant.offerPrice)
      : variant.mrp !== null && variant.mrp !== undefined && Number(variant.price) < Number(variant.mrp)
        ? Number(variant.price)
        : null,
  mrp:
    variant.mrp === null || variant.mrp === undefined
      ? null
      : Number(variant.mrp),
  stockQuantity: Number(variant.stockQuantity ?? 0),
  createdAt: variant.createdAt
    ? new Date(variant.createdAt).toISOString()
    : new Date().toISOString(),
  updatedAt: variant.updatedAt
    ? new Date(variant.updatedAt).toISOString()
    : undefined,
  priceValidUntil: variant.priceValidUntil
    ? new Date(variant.priceValidUntil).toISOString()
    : null,
});

const normalizeProduct = (product: ProductApi): Product => {
  const materialDetails = typeof product.material === 'object' ? product.material : undefined;
  const variants = Array.isArray(product.variants)
    ? product.variants.map(normalizeVariant)
    : product.variant
      ? [normalizeVariant(product.variant)]
      : [];

  return {
  ...(product as unknown as Product),
  name: product.name ?? product.productName ?? '',
  description: product.description ?? materialDetails?.description ?? undefined,
  brandName: product.brandName ?? materialDetails?.brandName ?? '',
  material: typeof product.material === 'string' ? product.material : materialDetails?.material ?? '',
  availableColors: product.availableColors ?? materialDetails?.availableColors ?? [],
  isActive: product.isActive ?? materialDetails?.isActive ?? false,
  createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
  updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
  variants,
  images: Array.isArray(product.images)
    ? product.images.map((image): ProductImage => ({
      id: image.id,
      productId: image.productId ?? product.id ?? '',
      productIdentifier: image.productIdentifier ?? null,
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary ?? false,
      displayOrder: Number(image.displayOrder ?? 1),
    }))
    : [],
  };
};

export const uploadProductImages = async (
  files: File[]
) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append(
      "images",
      file
    );
  });
  const response = await api.post("/products/uploadProductImages", formData);
  return response.data.images;
};

export const productService = {
  getProducts: async (params: ProductListParams = {}): Promise<{ products: Product[]; pagination: Pagination }> => {
    const { publicCatalog = false, ...queryParams } = params;
    const response = await api.get(publicCatalog ? '/products/public' : '/products', { params: queryParams });
    return {
      products: (response.data.data?.products || response.data.products || []).map(normalizeProduct),
      pagination: response.data.data?.pagination || { page: queryParams.page || 1, limit: queryParams.limit || 10, total: 0, totalPages: 1 },
    };
  },

  getProductById: async (id: string, publicCatalog = false): Promise<Product> => {
    const response = await api.get(publicCatalog ? `/products/public/${id}` : `/products/${id}`);
    return normalizeProduct(response.data.data?.product || response.data.product);
  },

  createProduct: async (
    product: ProductPayload
  ): Promise<Product> => {
    const response = await api.post('/products/addProduct', product);
    return normalizeProduct(response.data.product);
  },

  updateProduct: async (
    id: string,
    product: ProductPayload
  ): Promise<Product> => {
    const response = await api.patch(`/products/${id}/admin-preview`, product);
    return normalizeProduct(response.data.product);
  },

  createVariant: async (
    productId: string,
    variant: VariantPayload
  ): Promise<ProductVariant> => {
    const response = await api.post(`/products/${productId}/variants`, variant);
    return normalizeVariant(response.data.variant);
  },

  updateVariant: async (
    variantId: string,
    variant: VariantPayload
  ): Promise<ProductVariant> => {
    const response = await api.patch(`/products/variants/${variantId}`, variant);
    return normalizeVariant(response.data.variant);
  },

  deleteVariant: async (variantId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/products/variants/${variantId}`);
    return response.data;
  },

deleteProduct: async (productId: string): Promise<void> => {
  await api.delete(`/products/${productId}`);
},

  exportInventory: async (): Promise<Blob> => {
    const response = await api.get(
      "/products/export",
      {
        responseType: "blob",
      }
    );

    return response.data;
  },

};

