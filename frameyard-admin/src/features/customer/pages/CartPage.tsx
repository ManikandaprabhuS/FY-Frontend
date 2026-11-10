import { cartStockIssue } from '../../../utils/stock';
import React, { useMemo, useRef, useState } from 'react';

import { Heart, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../store/authStore';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import { showError, showSuccess, showWarning } from '../../../utils/toast';

import ColorSwatch from '../components/ColorSwatch';
import {checkoutService} from "../../../services/checkout.service";
const prefetchCheckout=()=>{
 const auth=useAuthStore.getState();
 if(!auth.isAuthenticated||auth.user?.role!=="CUSTOMER")return;
 const items=useCustomerCommerceStore.getState().cartItems;
 if(!items.length)return;
 void checkoutService.offers(items.map(i=>({productIdentifier:i.productIdentifier??"",variantId:i.variantId,quantity:i.quantity,...(i.colorName?{colorName:i.colorName}:{}),...(i.colorHex?{colorHex:i.colorHex}:{})}))).catch(()=>undefined);
};

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const customerLoggedIn=useAuthStore(state=>state.isAuthenticated&&state.user?.role==="CUSTOMER");

  const items = useCustomerCommerceStore((state) => state.cartItems);
  const updateQuantity = useCustomerCommerceStore((state) => state.updateCartQuantity);
  const removeItem = useCustomerCommerceStore((state) => state.removeCartItem);
  const moveCartItemToWishlist = useCustomerCommerceStore((state) => state.moveCartItemToWishlist);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);





  const [removalChoiceKey, setRemovalChoiceKey] = useState<string | null>(null);
  const moveInFlight = useRef(new Set<string>());
  const [movingToWishlistKey, setMovingToWishlistKey] = useState<string | null>(null);





  const checkout = async () => {
    if (useAuthStore.getState().status === 'checking') await useAuthStore.getState().checkAuth();
    const verified = useAuthStore.getState();
    if (verified.status === 'checking') return;
    if (verified.isAuthenticated && verified.user?.role === 'CUSTOMER') {
      const issue = cartStockIssue(useCustomerCommerceStore.getState().cartItems);
      if (issue) { showWarning(issue, { id: 'cart-stock' }); return; }
      prefetchCheckout();return navigate('/checkout');
    }
    showWarning('Please login to continue to checkout');
    navigate('/profile', { state: { returnTo: '/checkout' } });
  };

  const moveToWishlist = async (item: (typeof items)[number]) => {
    if (moveInFlight.current.has(item.key)) return;
    if (useAuthStore.getState().status === 'checking') await useAuthStore.getState().checkAuth();
    const verified = useAuthStore.getState();
    if (verified.status === 'checking') return;
    if (!verified.isAuthenticated || verified.user?.role !== 'CUSTOMER') {
      showWarning('Please login / create an account to add products to wishlist');
      navigate('/profile', { state: { returnTo: '/cart' } });
      return;
    }
    if (!item.productIdentifier) {
      showError('This product cannot be added to the wishlist right now.');
      return;
    }

    if (useCustomerCommerceStore.getState().wishlistPending[item.productIdentifier]) return;
    moveInFlight.current.add(item.key);
    const toastId = 'cart-move:' + item.key;
    const alreadySaved = Boolean(useCustomerCommerceStore.getState().wishlistByProductIdentifier[item.productIdentifier]);
    setMovingToWishlistKey(item.key);
    try {
      // The store applies the optimistic state before its first await.
      const request = moveCartItemToWishlist(item.key, item.productIdentifier);
      if (!useCustomerCommerceStore.getState().cartItems.some(row => row.key === item.key)) {
        setRemovalChoiceKey(null);
        if (alreadySaved) showWarning('Already in your wishlist. Removed from cart.', { id: toastId });
        else showSuccess('Moved to wishlist', { id: toastId });
      }
      const moved = await request;
      if (moved === 'exists' && !alreadySaved) showWarning('Already in your wishlist. Removed from cart.', { id: toastId });
    } catch {
      // Store rollback restores the cart and counts before this replacement.
      showError('Could not move to wishlist. Please try again.', { id: toastId });
    } finally {
      moveInFlight.current.delete(item.key);
      setMovingToWishlistKey(current => current === item.key ? null : current);
    }
  };

  if (items.length === 0) return (
    <section className="mx-auto my-12 max-w-xl rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
      <ShoppingBag className="mx-auto h-10 w-10 text-black/30" />
      <h1 className="mt-4 text-2xl font-black text-black">Your cart is empty</h1>
      <p className="mt-2 text-sm text-black/50">Browse our frames and add your favorites to the bag.</p>
      <Link to="/products" className="mt-6 inline-flex rounded-lg bg-black px-5 py-3 text-sm font-bold text-white">Continue shopping</Link>
    </section>
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <h1 className="text-3xl font-black text-black">Your cart</h1>
        <span className="mb-1 rounded-full bg-black px-2.5 py-1 text-[10px] font-bold text-white">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      </div>
      <p className="mt-1 text-sm text-black/50">Review your {items.length} product {items.length === 1 ? 'selection' : 'selections'} and quantities before checkout.</p>
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">{items.map((item) => (
          <article key={item.key} className="flex gap-4 rounded-xl border border-black/10 bg-white p-3 shadow-sm sm:p-4">
            <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-black/5 sm:h-28 sm:w-24">{item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate text-sm font-black">{item.name}</h2><p className="mt-1 text-xs text-black/50">{item.frameSize} · {item.material}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-black/60"><span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2 py-1"><ColorSwatch color={item.color} className="h-4 w-4" /> Color</span><span className="rounded-full border border-black/10 px-2 py-1">Mount: {item.mountType || 'None'}</span><span className="rounded-full border border-black/10 px-2 py-1">Glass: {item.glassType || 'None'}</span></div></div><button type="button" onClick={() => setRemovalChoiceKey((current) => current === item.key ? null : item.key)} aria-label={`Remove or save ${item.name}`} aria-expanded={removalChoiceKey === item.key} className="rounded-lg p-2 text-black/45 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
              {removalChoiceKey === item.key && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-[#fafafa] p-2.5">
                  <span className="mr-auto text-[11px] font-bold text-black/60">Remove this item?</span>
                  <button type="button" onClick={() => { removeItem(item.key); setRemovalChoiceKey(null); showSuccess('Product removed from cart'); }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-[10px] font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                  <button type="button" disabled={movingToWishlistKey === item.key} onClick={() => void moveToWishlist(item)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black px-3 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><Heart className="h-3.5 w-3.5" />{movingToWishlistKey === item.key ? 'Moving…' : 'Move to Wishlist'}</button>
                  <button type="button" onClick={() => setRemovalChoiceKey(null)} aria-label="Cancel remove item" className="grid h-8 w-8 place-items-center rounded-md border border-black/10 text-black/50 hover:bg-white"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex h-9 items-center rounded-lg border border-black/15"><button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Decrease quantity" className="grid h-full w-9 place-items-center"><Minus className="h-3.5 w-3.5" /></button><span className="w-8 text-center text-xs font-black">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)} aria-label="Increase quantity" className="grid h-full w-9 place-items-center"><Plus className="h-3.5 w-3.5" /></button></div>
                <p className="text-base font-black">₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </article>
        ))}</div>
        <aside className="h-fit rounded-xl border border-black/10 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-lg font-black">Order summary</h2>
          {!customerLoggedIn&&<p className="mt-3 text-xs text-black/60"><Link to="/profile" state={{returnTo:"/checkout"}} className="font-bold underline">Log in</Link> to check your first-order offer and claim eligible checkout offers.</p>}
          <div className="mt-5 flex items-center justify-between border-b border-black/10 pb-4 text-sm"><span className="text-black/55">Subtotal</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div>


          <div className="flex items-center justify-between py-4"><span className="font-bold">Total</span><strong className="text-xl">₹{subtotal.toLocaleString('en-IN')}</strong></div>
          <button type="button" onMouseEnter={prefetchCheckout} onFocus={prefetchCheckout} onPointerDown={prefetchCheckout} onClick={checkout} className="h-12 w-full rounded-lg bg-black text-sm font-black text-white hover:bg-black/80">Checkout</button>
          <Link to="/products" className="mt-3 flex justify-center text-xs font-bold text-black/55 underline underline-offset-4">Continue shopping</Link>
        </aside>
      </div>
    </section>
  );
};

export default CartPage;
