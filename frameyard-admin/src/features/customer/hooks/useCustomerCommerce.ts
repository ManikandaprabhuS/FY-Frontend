import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../store/authStore';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import type { Product, ProductVariant } from '../../../types';
import { showError, showSuccess } from '../../../utils/toast';

export const useCustomerCommerce = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const wishlist = useCustomerCommerceStore((state) => state.wishlistByProductIdentifier);
  const toggleStoredWishlist = useCustomerCommerceStore((state) => state.toggleWishlist);
  const addCartItem = useCustomerCommerceStore((state) => state.addCartItem);
  const customerLoggedIn = isAuthenticated && user?.role === 'CUSTOMER';


  const requestLogin = useCallback((message: string, returnTo = location.pathname) => {
    showError(message);
    navigate('/profile', { state: { returnTo } });
  }, [location.pathname, navigate]);

  const toggleWishlist = useCallback(async (product: Product) => {
    if (!customerLoggedIn) {
      requestLogin('Please login to add product to wishlist');
      return;
    }
    if (!product.productIdentifier) {
      showError('This product cannot be added to the wishlist right now.');
      return;
    }
    try {
      const added = await toggleStoredWishlist(product.productIdentifier);
      if (added === null) return;
      showSuccess(added ? 'Product added to wishlist' : 'Product removed from wishlist');
    } catch {
      showError('Wishlist could not be updated. Please try again.');
    }
  }, [customerLoggedIn, requestLogin, toggleStoredWishlist]);

  const addToCart = useCallback((product: Product, variant: ProductVariant, quantity = 1, selectedColor?: string) => {
    const stockQuantity = Number(variant.stockQuantity ?? 0);
    if (stockQuantity <= 0) {
      showError('This product variant is out of stock.');
      return;
    }
    const unitPrice = Number(variant.offerPrice ?? variant.price ?? 0);
    addCartItem({
      productId: product.id,
      productIdentifier: product.productIdentifier,
      variantId: variant.id,
      name: product.name,
      imageUrl: product.images?.find((image) => image.isPrimary)?.imageUrl ?? product.images?.[0]?.imageUrl,
      material: product.material,
      frameSize: variant.frameSize,
      color: selectedColor || variant.color,
      mountType: variant.mountType,
      glassType: variant.glassType,
      unitPrice,
      quantity,
      stockQuantity,
    });
    showSuccess(`${product.name} added to cart`);
  }, [addCartItem]);

  return { customerLoggedIn, wishlist, toggleWishlist, addToCart, requestLogin };
};
