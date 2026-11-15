import { useEffect, useRef, useState } from 'react';

import { checkoutService, type CheckoutOffer } from '../../../services/checkout.service';
import type { CustomerCartItem } from '../../../store/customerCommerceStore';

export type CartOffers = {
  /** The offer that saves the most right now (from the server), if any. */
  best: CheckoutOffer | null;
  /** The Big Order rule: its spend threshold and percentage, when it is enabled. */
  bigOrder: { threshold: number | null; percent: number; title: string } | null;
  loading: boolean;
};

const parseAmount = (text?: string) => {
  const match = text?.match(/Rs\.?\s*([\d,]+(?:\.\d+)?)/i);
  const value = match ? Number(match[1].replace(/,/g, '')) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
};

/**
 * Reads the offers the checkout would show for the current cart, from the existing
 * /checkout/summary endpoint (customers only). The Big Order threshold is remembered once
 * seen, so the progress bar keeps its scale after the offer unlocks.
 */
export function useCartOffers(items: CustomerCartItem[], enabled: boolean): CartOffers {
  const [state, setState] = useState<CartOffers>({ best: null, bigOrder: null, loading: false });
  const bigRule = useRef<CartOffers['bigOrder']>(null);
  const selection = JSON.stringify(items.map((item) => ({
    productIdentifier: item.productIdentifier ?? '',
    variantId: item.variantId,
    quantity: item.quantity,
    ...(item.colorName ? { colorName: item.colorName } : {}),
    ...(item.colorHex ? { colorHex: item.colorHex } : {}),
  })));

  useEffect(() => {
    const payload = JSON.parse(selection) as Parameters<typeof checkoutService.offers>[0];
    if (!enabled || !payload.length || payload.some((row) => !row.productIdentifier)) {
      setState({ best: null, bigOrder: bigRule.current, loading: false });
      return;
    }
    let live = true;
    setState((current) => ({ ...current, loading: true }));
    const timer = window.setTimeout(() => {
      checkoutService.offers(payload).then((quote) => {
        if (!live) return;
        const locked = quote.unavailableOffers?.find((offer) => offer.code === 'BIG_ORDER');
        const threshold = parseAmount(locked?.unavailableReason) ?? parseAmount(quote.bigOrderRemovalMessage);
        const open = quote.offers.find((offer) => offer.code === 'BIG_ORDER');
        const rule = locked ?? open;
        if (!rule) bigRule.current = null;
        else bigRule.current = { threshold: threshold ?? bigRule.current?.threshold ?? null, percent: rule.percent, title: rule.title };
        const best = quote.offers.reduce<CheckoutOffer | null>((top, offer) => (!top || offer.discountAmount > top.discountAmount ? offer : top), null);
        setState({ best, bigOrder: bigRule.current, loading: false });
      }).catch(() => {
        if (live) setState((current) => ({ ...current, loading: false }));
      });
    }, 380);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [selection, enabled]);

  return state;
}
