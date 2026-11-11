import { normalizeStock } from "../../../utils/stock";
import { useCallback, useEffect, useMemo } from 'react';
import { getVariantPricing } from '../utils/product-pricing';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../store/authStore';
import { useProductStore } from '../../../store/productStore';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import type { Product, ProductVariant } from '../../../types';
import { resolveColorOption, useFrameColorStore } from '../../../store/frameColorStore';
import { showError, showSuccess, showWarning } from '../../../utils/toast';

export const useCustomerCommerce = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const wishlist = useCustomerCommerceStore((state) => state.wishlistByProductIdentifier);
  const toggleStoredWishlist = useCustomerCommerceStore((state) => state.toggleWishlist);
  const addCartItem = useCustomerCommerceStore((state) => state.addCartItem);
  const customerLoggedIn = isAuthenticated && user?.role === 'CUSTOMER';
  const products = useProductStore(state => state.products);
  const currentProduct = useProductStore(state => state.currentProduct);
  const hydrateWishlist = useCustomerCommerceStore(state => state.hydrateWishlist);
  const visibleIdentifiers = useMemo(() => [...new Set([currentProduct, ...products].flatMap(product => product?.productIdentifier ? [product.productIdentifier] : []))].slice(0, 100), [products, currentProduct]);
  useEffect(() => {
    if (customerLoggedIn && user) void hydrateWishlist(user.id, visibleIdentifiers).catch(() => { /* Existing loaded heart states remain usable on a transient lookup failure. */ });
  }, [customerLoggedIn, user, visibleIdentifiers, hydrateWishlist]);


  const requestLogin = useCallback((message: string, returnTo = location.pathname + location.search + location.hash) => {
    showWarning(message);
    navigate('/profile', { state: { returnTo } });
  }, [location.pathname, location.search, location.hash, navigate]);

  const toggleWishlist = useCallback(async (product: Product) => {
    if (useAuthStore.getState().status === 'checking') await useAuthStore.getState().checkAuth();
    const verified = useAuthStore.getState();
    if (verified.status === 'checking') return;
    if (!verified.isAuthenticated || verified.user?.role !== 'CUSTOMER') {
      requestLogin('Please login / create an account to add products to wishlist');
      return;
    }
    if (!product.productIdentifier) {
      showError('This product cannot be added to the wishlist right now.');
      return;
    }
    const state = useCustomerCommerceStore.getState();
    if (state.wishlistPending[product.productIdentifier]) return;
    const saved = Boolean(state.wishlistByProductIdentifier[product.productIdentifier]);
    const toastId = 'wishlist:' + product.productIdentifier;
    const promise = toggleStoredWishlist(product.productIdentifier, {
      id: product.id, productIdentifier: product.productIdentifier, productName: product.name,
      material: { material: product.material, brandName: product.brandName, isActive: product.isActive },
      images: product.images, variants: product.variants,
    });
    try {
      const added = await promise;
      if (added === 'exists') showWarning('Already in your wishlist', { id: toastId });
      else if (added !== null) showSuccess(saved ? 'Product removed from wishlist' : 'Added to wishlist', { id: toastId });
    } catch {
      showError('Wishlist could not be updated. Please try again.', { id: toastId });
    }
  }, [requestLogin, toggleStoredWishlist]);

  /** Adds the variant to the cart; returns whether it was added (callers may ignore it). */
  const addToCart = useCallback((product: Product, variant: ProductVariant, quantity = 1, selectedColor?: string): boolean => {
    const stockQuantity = normalizeStock(variant.stockQuantity);
    if (stockQuantity <= 0) {
      showWarning('This product variant is out of stock.');
      return false;
    }
    const unitPrice = getVariantPricing(variant).currentPrice;
    const catalogue = useFrameColorStore.getState();
    const color = resolveColorOption(selectedColor || variant.color, catalogue.colors, catalogue.legacyColors);
    const added = addCartItem({
      productId: product.id,
      productIdentifier: product.productIdentifier,
      variantId: variant.id,
      name: product.name,
      imageUrl: product.images?.find((image) => image.isPrimary)?.imageUrl ?? product.images?.[0]?.imageUrl,
      material: product.material,
      frameSize: variant.frameSize,
      color: selectedColor || variant.color,
      colorName: color.name, colorHex: color.hex,
      mountType: variant.mountType,
      glassType: variant.glassType,
      unitPrice,
      quantity,
      stockQuantity,
    });
    if (added) showSuccess(`${product.name} added to cart`);
    return Boolean(added);
  }, [addCartItem]);

  return { customerLoggedIn, wishlist, toggleWishlist, addToCart, requestLogin };
};
