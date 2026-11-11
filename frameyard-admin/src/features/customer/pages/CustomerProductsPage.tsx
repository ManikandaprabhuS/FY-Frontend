import { totalVariantStock } from '../../../utils/stock';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { flushSync } from 'react-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';

// The shop hero: a gallery wall of frames over a sofa (the client's chosen reference image).
import shopHero from '../../../assets/shop-hero-gallery-wall.jpg';
import ProductCatalogCard from '../components/ProductCatalogCard';
import ShopSortMenu from '../components/ShopSortMenu';
import { frameCollections, materialsForCollection, type FrameCollectionId } from '../data/frameCollections';
import { getCatalogPricing, type CatalogPricing } from '../utils/catalog-product';
import { useProductStore } from '../../../store/productStore';
import type { Product } from '../../../types';
import { useCustomerCommerce } from '../hooks/useCustomerCommerce';

const PRODUCTS_PER_PAGE = 12;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
];

type SortOption = 'featured' | 'price-low' | 'price-high' | 'newest' | 'name';
type AvailabilityFilter = 'in-stock' | 'out-of-stock';
type CatalogEntry = { product: Product; pricing: CatalogPricing; totalStock: number };

const toggleValue = <T,>(values: T[], value: T): T[] =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const totalStockFor = (product: Product) => totalVariantStock(product.variants);

/** The shop's tabs: everything, then each homepage collection (matched to materials). */
const SHOP_TABS: { id: FrameCollectionId | null; label: string }[] = [
  { id: null, label: 'All Frames' },
  { id: 'wooden', label: 'Wooden Frames' },
  { id: 'metal', label: 'Metal Frames' },
  { id: 'classic', label: 'Classic Frames' },
  { id: 'premium', label: 'Premium Frames' },
];

const CustomerProductsPage: React.FC = () => {
  const products = useProductStore((state) => state.products);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const pagination = useProductStore(state => state.pagination);
  const facets = useProductStore(state => state.facets);
  // `?collection=wooden` (from the homepage collections) pre-selects that collection's
  // materials once the material list is known; any change the shopper makes then wins.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCollection = searchParams.get('collection');
  // An unknown `collection` value falls back to All Frames.
  const collectionId = frameCollections.some((item) => item.id === requestedCollection) ? requestedCollection : null;
  const activeTab = SHOP_TABS.find((tab) => tab.id === collectionId) ?? SHOP_TABS[0];
  // Keyed on the matched names, so a fresh facets object with the same materials keeps the
  // same array and does not trigger another fetch.
  const collectionMaterialsKey = materialsForCollection(collectionId, facets?.materials.map((item) => item.value) ?? []).join('\n');
  const collectionMaterials = useMemo(
    () => (collectionMaterialsKey ? collectionMaterialsKey.split('\n') : []),
    [collectionMaterialsKey],
  );
  const [materialChoice, setMaterialChoice] = useState<string[] | null>(null);
  const materials = materialChoice ?? collectionMaterials;
  const setMaterials = useCallback((next: string[] | ((current: string[]) => string[])) => {
    setMaterialChoice((previous) => {
      const base = previous ?? collectionMaterials;
      return typeof next === 'function' ? next(base) : next;
    });
  }, [collectionMaterials]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityFilter[]>([]);
  const [saleOnly, setSaleOnly] = useState(false);
  const [maximumPrice, setMaximumPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>('featured');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState('');

  // Hero: as it scrolls out of view, --hero-p runs 0 → 1 and the CSS fades it away.
  // Written straight to the element (no re-render), once per frame.
  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight)));
      hero.style.setProperty('--hero-p', progress.toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);
  const { customerLoggedIn, wishlist, toggleWishlist, addToCart } = useCustomerCommerce();

  // A collection tab whose materials are not known yet waits for the facets; one with no
  // matching materials at all shows its own empty state instead of every frame.
  const collectionPending = collectionId !== null && !facets;
  const collectionEmpty = collectionId !== null && Boolean(facets) && collectionMaterials.length === 0;

  const catalogQuery = useMemo(() => ({ page, limit: PRODUCTS_PER_PAGE, publicCatalog: true,
    materials, frameSizes: sizes, availability: availability.length === 1 ? availability[0] : 'all' as const,
    maxPrice: maximumPrice ?? undefined, saleOnly, sort,
  }), [page, materials, sizes, availability, maximumPrice, saleOnly, sort]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchProducts(catalogQuery); }, 150);
    return () => window.clearTimeout(timer);
  }, [fetchProducts, catalogQuery]);

  const activeProducts = useMemo(() => products.filter((product) => product.isActive), [products]);
  const catalogEntries = useMemo<CatalogEntry[]>(
    () => activeProducts.map((product) => ({
      product,
      pricing: getCatalogPricing(product),
      totalStock: totalStockFor(product),
    })),
    [activeProducts],
  );
  const materialOptions = useMemo(
    () => facets?.materials.map(item => item.value) ?? [],
    [facets],
  );
  const sizeOptions = useMemo(
    () => facets?.sizes.map(item => item.value) ?? [],
    [facets],
  );
  const filterCounts = useMemo(() => {
    return { material: new Map(facets?.materials.map(item => [item.value, item.count]) ?? []),
      size: new Map(facets?.sizes.map(item => [item.value, item.count]) ?? []),
      onSale: facets?.onSale ?? 0, inStock: facets?.inStock ?? 0, outOfStock: facets?.outOfStock ?? 0 };
  }, [facets]);
  const priceCeiling = useMemo(() => {
    const highestPrice = facets?.maximumPrice ?? 0;
    return Math.max(500, Math.ceil(highestPrice / 500) * 500);
  }, [facets]);
  const effectiveMaximumPrice = maximumPrice ?? priceCeiling;


  const pageCount = Math.max(1, pagination.totalPages);
  const currentPage = Math.min(page, pageCount);
  const paginatedProducts = catalogEntries;
  const startItem = pagination.total === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * PRODUCTS_PER_PAGE, pagination.total);
  // The selected tab's own materials are not counted as filters; only the shopper's choices are.
  const chosenMaterials = materialChoice ?? [];
  const activeFilterCount = chosenMaterials.length + sizes.length + availability.length + Number(saleOnly) + Number(maximumPrice !== null);

  // The grid reflow animation only runs when the grid is visible (not behind the sheet).
  const updateFilter = (callback: () => void, animate = true) => {
    const apply = () => {
      callback();
      setPage(1);
    };
    if (animate && !filtersOpen) withGridTransition(apply);
    else apply();
  };

  const clearFilters = () => {
    const apply = () => {
      // Back to the selected tab's materials (none on All Frames).
      setMaterialChoice(null);
      setSizes([]);
      setAvailability([]);
      setSaleOnly(false);
      setMaximumPrice(null);
      setPriceDraft('');
      setPage(1);
    };
    if (filtersOpen) apply();
    else withGridTransition(apply);
  };

  const removeChip = (kind: 'material' | 'size' | 'availability' | 'sale' | 'price', value?: string) => {
    updateFilter(() => {
      if (kind === 'material' && value) setMaterials((current) => current.filter((item) => item !== value));
      if (kind === 'size' && value) setSizes((current) => current.filter((item) => item !== value));
      if (kind === 'availability' && value) setAvailability((current) => current.filter((item) => item !== value));
      if (kind === 'sale') setSaleOnly(false);
      if (kind === 'price') {
        setMaximumPrice(null);
        setPriceDraft('');
      }
    });
  };

  /** Applies the typed top price (empty clears it), kept between ₹0 and the ceiling. */
  const applyPrice = () => {
    const typed = priceDraft.trim();
    updateFilter(() => {
      if (!typed) {
        setMaximumPrice(null);
        return;
      }
      const value = Math.min(priceCeiling, Math.max(0, Math.round(Number(typed))));
      if (Number.isFinite(value)) {
        setMaximumPrice(value);
        setPriceDraft(String(value));
      }
    });
  };

  // Filter sheet: lock page scroll and close on Escape while it is open.
  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [filtersOpen]);

  const drawnSizes = useMemo(() => drawSizes(sizeOptions), [sizeOptions]);
  const frameCount = `${pagination.total} ${pagination.total === 1 ? 'frame' : 'frames'}`;
  const countText = loading || collectionPending ? 'Loading frames' : collectionEmpty ? '0 frames' : frameCount;

  const changeSort = (value: SortOption) => withGridTransition(() => {
    setSort(value);
    setPage(1);
  });
  const goToPage = (value: number) => {
    withGridTransition(() => setPage(value));
    document.getElementById('fy-shop-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Tabs live in the URL (`?collection=metal`), the same link the homepage collections use.
  const selectTab = (id: FrameCollectionId | null) => {
    if (id === collectionId) return;
    withGridTransition(() => {
      setMaterialChoice(null);
      setPage(1);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (id) next.set('collection', id);
        else next.delete('collection');
        return next;
      });
    });
  };

  // ---- The "Shop by" panel: the same markup in the desktop sidebar and the sheet. ----
  const filterGroups = (
    <>
      <FilterGroup title="Material">
        {materialOptions.length === 0 ? <FilterHint /> : materialOptions.map((material) => (
          <CheckRow
            key={material}
            label={material}
            count={filterCounts.material.get(material) ?? 0}
            checked={materials.includes(material)}
            onToggle={() => updateFilter(() => setMaterials((current) => toggleValue(current, material)))}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Frame size">
        {drawnSizes.length === 0 ? <FilterHint /> : drawnSizes.map(({ label }) => (
          <CheckRow
            key={label}
            label={label}
            count={filterCounts.size.get(label) ?? 0}
            checked={sizes.includes(label)}
            onToggle={() => updateFilter(() => setSizes((current) => toggleValue(current, label)))}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Price">
        <form
          className="fy-price"
          onSubmit={(event) => {
            event.preventDefault();
            applyPrice();
          }}
        >
          <label className="fy-price__field">
            <span>₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={priceCeiling}
              step={50}
              value={priceDraft}
              placeholder={priceCeiling.toLocaleString('en-IN')}
              aria-label="Highest price in rupees"
              onChange={(event) => setPriceDraft(event.target.value)}
            />
          </label>
          <button type="submit" className="fy-price__apply">Apply</button>
        </form>
        <input
          type="range"
          min={0}
          max={priceCeiling}
          step={50}
          value={effectiveMaximumPrice}
          aria-label="Highest price"
          aria-valuetext={`Up to ₹${effectiveMaximumPrice.toLocaleString('en-IN')}`}
          onChange={(event) => {
            const value = Number(event.target.value);
            setPriceDraft(String(value));
            updateFilter(() => setMaximumPrice(value), false);
          }}
          className="fy-range"
        />
        <div className="fy-price__range">
          <span>₹0</span>
          <span className="font-semibold text-ink">Up to ₹{effectiveMaximumPrice.toLocaleString('en-IN')}</span>
          <span>₹{priceCeiling.toLocaleString('en-IN')}</span>
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <CheckRow label="In stock" count={filterCounts.inStock} checked={availability.includes('in-stock')} onToggle={() => updateFilter(() => setAvailability((current) => toggleValue(current, 'in-stock')))} />
        <CheckRow label="Out of stock" count={filterCounts.outOfStock} checked={availability.includes('out-of-stock')} onToggle={() => updateFilter(() => setAvailability((current) => toggleValue(current, 'out-of-stock')))} />
      </FilterGroup>

      <FilterGroup title="Offers">
        <CheckRow label="On sale" count={filterCounts.onSale} checked={saleOnly} onToggle={() => updateFilter(() => setSaleOnly((current) => !current))} />
      </FilterGroup>
    </>
  );

  const toolbarControls = <ShopSortMenu value={sort} options={SORT_OPTIONS} onChange={changeSort} />;

  return (
    <section className="min-h-screen bg-white">
      {/* Hero: a gallery wall of frames under the see-through navbar, with the tab's name. */}
      <header ref={heroRef} className="fy-shop-hero">
        <img src={shopHero} alt="" className="fy-shop-hero__img" decoding="async" fetchPriority="high" />
        <div className="fy-shop-hero__inner">
          <h1 className="fy-shop-hero__title">{activeTab.label}</h1>
          <div className="fy-shop-hero__count" aria-live="polite">
            {countText === 'Loading frames'
              ? <FrameLoader />
              : <span key={countText} className="fy-shop-hero__count-text">{countText}</span>}
          </div>
        </div>
      </header>

      {/* A full-width hairline bar: the collection tabs, sort, and (below desktop) Filter. */}
      <div className="fy-toolbar">
        <div className="fy-toolbar__row">
          <div className="fy-shop-tabs" role="tablist" aria-label="Frame collections">
            {SHOP_TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={tab.id === activeTab.id}
                aria-controls="fy-shop-results"
                onClick={() => selectTab(tab.id)}
                className="fy-shop-tab"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="fy-toolbar__actions">
            <div className="fy-toolbar__cell fy-toolbar__sort">{toolbarControls}</div>
            <div className="fy-toolbar__cell fy-toolbar__filter">
              <button type="button" onClick={() => setFiltersOpen(true)} className="fy-filter-open" aria-haspopup="dialog">
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                Filter
                {activeFilterCount > 0 && <span className="fy-filter-open__count">{activeFilterCount}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] items-start gap-10 px-5 pb-16 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        {/* Desktop: the "Shop by" panel stays in view while the grid scrolls. */}
        <aside className="sticky top-[148px] hidden max-h-[calc(100vh-164px)] w-[272px] shrink-0 overflow-y-auto lg:block" aria-label="Filters">
          <div className="fy-filter">
            <div className="fy-filter__head">
              <span>Shop by</span>
              {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="fy-filter__clear">Clear all</button>}
            </div>
            {filterGroups}
          </div>
        </aside>

        <div id="fy-shop-results" className="min-w-0 flex-1 scroll-mt-40">
          {activeFilterCount > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {chosenMaterials.map((value) => <FilterTag key={`material-${value}`} label={value} onRemove={() => removeChip('material', value)} />)}
              {sizes.map((value) => <FilterTag key={`size-${value}`} label={value} onRemove={() => removeChip('size', value)} />)}
              {availability.map((value) => <FilterTag key={value} label={value === 'in-stock' ? 'In stock' : 'Out of stock'} onRemove={() => removeChip('availability', value)} />)}
              {saleOnly && <FilterTag label="On sale" onRemove={() => removeChip('sale')} />}
              {maximumPrice !== null && <FilterTag label={`Up to ₹${maximumPrice.toLocaleString('en-IN')}`} onRemove={() => removeChip('price')} />}
              <button type="button" onClick={clearFilters} className="min-h-11 px-1 text-[13px] underline underline-offset-4">Clear all</button>
            </div>
          )}

          {collectionEmpty ? (
            <EmptyState
              title={`No ${activeTab.label.toLowerCase()} yet`}
              text="New pieces are added often. Browse the full collection in the meantime."
              action="See all frames"
              onAction={() => selectTab(null)}
            />
          ) : error && !loading ? (
            <EmptyState title="Frames couldn't load" text="Check your connection and try again." action="Try again" onAction={() => fetchProducts(catalogQuery)} />
          ) : loading || collectionPending ? (
            <div className="fy-shop-grid" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => <ProductSkeleton key={index} />)}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <EmptyState title="No frames match these filters" text="Remove a filter or clear them all to see the full collection." action="Clear filters" onAction={clearFilters} />
          ) : (
            <div className="fy-shop-grid">
              {paginatedProducts.map(({ product, pricing, totalStock }, index) => (
                <div key={product.id} className="min-w-0" style={{ viewTransitionName: `fy-frame-${product.id}` } as React.CSSProperties}>
                  <ProductCatalogCard
                    product={product}
                    pricing={pricing}
                    totalStock={totalStock}
                    wished={customerLoggedIn && Boolean(product.productIdentifier && wishlist[product.productIdentifier])}
                    priority={currentPage === 1 && index < 4}
                    onToggleWishlist={toggleWishlist}
                    onAddToCart={addToCart}
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && !collectionPending && !collectionEmpty && pagination.total > 0 && pageCount > 1 && (
            <nav className="mt-12 flex flex-col items-center gap-3 border-t border-rule pt-6 sm:flex-row sm:justify-between" aria-label="Pages">
              <p className="text-[13px] text-mute">Showing {startItem}–{endItem} of {pagination.total}</p>
              <div className="flex items-center gap-1.5">
                <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => goToPage(Math.max(1, currentPage - 1))} className="fy-page">
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
                </button>
                {Array.from({ length: Math.min(pageCount, 7) }, (_, index) => Math.max(1, Math.min(currentPage - 3, pageCount - 6)) + index).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => goToPage(pageNumber)}
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    className="fy-page"
                  >
                    {pageNumber}
                  </button>
                ))}
                <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => goToPage(Math.min(pageCount, currentPage + 1))} className="fy-page">
                  <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>

      {/* Tablets and phones: the same panel in a sheet rising from the bottom. */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[160] lg:hidden" role="dialog" aria-modal="true" aria-label="Filter frames">
          <button type="button" aria-label="Close filters" className="fy-sheet-backdrop absolute inset-0 bg-ink/40" onClick={() => setFiltersOpen(false)} />
          <div className="fy-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-[560px] flex-col bg-white">
            <div className="fy-filter__head">
              <span>Shop by</span>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="-mr-3 grid h-11 w-11 place-items-center">
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{filterGroups}</div>
            <div className="flex items-center gap-4 border-t border-rule px-4 pb-[calc(14px+env(safe-area-inset-bottom,0px))] pt-3">
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearFilters} className="min-h-12 text-[14px] underline underline-offset-4">Clear all</button>
              )}
              <button type="button" onClick={() => setFiltersOpen(false)} className="min-h-12 flex-1 bg-ink px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white">
                Show {countText.toLowerCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/** Runs a state change inside a view transition (where supported) so the grid visibly reflows. */
const withGridTransition = (update: () => void) => {
  const startViewTransition = (document as Document & { startViewTransition?: (callback: () => void) => unknown }).startViewTransition;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!startViewTransition || reduceMotion) {
    update();
    return;
  }
  startViewTransition.call(document, () => flushSync(update));
};

/** Standard paper sizes, in inches, so labels like "A4" can be drawn too. */
const PAPER_SIZES: Record<string, [number, number]> = { A5: [5.8, 8.3], A4: [8.3, 11.7], A3: [11.7, 16.5], A2: [16.5, 23.4] };

/**
 * Turns size labels like "8x10", "12 × 16 in" or "A4" into rectangles drawn to one shared
 * scale, ordered smallest to largest. Labels that can't be read are listed last as text.
 */
const drawSizes = (labels: string[]) => {
  const MAX_SIDE = 44;
  const MIN_SIDE = 10;
  const parsed = labels.map((label) => {
    const match = label.match(/(\d+(?:\.\d+)?)\s*[x×X*]\s*(\d+(?:\.\d+)?)/);
    const paper = PAPER_SIZES[label.trim().toUpperCase()];
    const [w, h] = match ? [Number(match[1]), Number(match[2])] : paper ?? [0, 0];
    return { label, w, h };
  });
  const largest = Math.max(0, ...parsed.map(({ w, h }) => Math.max(w, h)));
  return parsed
    .sort((a, b) => (a.w * a.h || Infinity) - (b.w * b.h || Infinity))
    .map(({ label, w, h }) => ({
      label,
      width: w && h && largest ? Math.max(MIN_SIDE, Math.round((w / largest) * MAX_SIDE)) : null,
      height: w && h && largest ? Math.max(MIN_SIDE, Math.round((h / largest) * MAX_SIDE)) : null,
    }));
};

const FilterGroup: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <section className="fy-filter__group">
    <h3 className="fy-filter__title">{title}</h3>
    {children}
  </section>
);

/** A square checkbox row with its count. */
const CheckRow: React.FC<{ label: string; count: number; checked: boolean; onToggle: () => void }> = ({ label, count, checked, onToggle }) => (
  <button type="button" aria-pressed={checked} onClick={onToggle} disabled={count === 0 && !checked} className="fy-check">
    <span className="fy-check__box" aria-hidden="true"><Check className="h-3 w-3" strokeWidth={3} /></span>
    <span className="fy-check__label">
      <span>{label}</span>
    </span>
    <span className="fy-check__count">({count})</span>
  </button>
);

const FilterHint = () => <p className="fy-filter__hint">No options yet</p>;

const FilterTag: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="inline-flex min-h-11 items-center gap-1.5 border border-ink px-3 text-[13px] transition-colors hover:bg-ink hover:text-white">
    {label}<X className="h-3.5 w-3.5" strokeWidth={1.8} />
  </button>
);

const EmptyState: React.FC<{ title: string; text: string; action: string; onAction: () => void }> = ({ title, text, action, onAction }) => (
  <div className="mt-6 border border-rule px-6 py-12 text-center">
    <h2 className="fy-display text-[26px]">{title}</h2>
    <p className="mx-auto mt-2 max-w-[48ch] text-[15px] leading-6 text-mute">{text}</p>
    <button type="button" onClick={onAction} className="mt-6 min-h-12 bg-ink px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white">{action}</button>
  </div>
);

/**
 * Loading state for the hero: a small picture frame whose moulding draws itself around,
 * then the mat and a little landscape appear, on a loop. Screen readers hear 'Loading frames'.
 */
const FrameLoader = () => (
  <span className="fy-frame-loader" role="status">
    <svg viewBox="0 0 40 48" width="34" height="41" aria-hidden="true">
      <rect className="fy-frame-loader__moulding" x="2" y="2" width="36" height="44" pathLength="100" />
      <rect className="fy-frame-loader__mat" x="9" y="9" width="22" height="30" />
      <path className="fy-frame-loader__art" d="M12 34l6-8 4 5 3-3 4 6z" />
      <circle className="fy-frame-loader__art" cx="25" cy="16" r="2.4" />
    </svg>
    <span className="sr-only">Loading frames</span>
  </span>
);

const ProductSkeleton = () => (
  <div>
    <div className="aspect-[4/5] animate-pulse bg-mat" />
    <div className="flex flex-col gap-2 py-3">
      <div className="h-3 w-1/3 animate-pulse bg-mat" />
      <div className="h-4 w-3/4 animate-pulse bg-mat" />
      <div className="h-4 w-1/4 animate-pulse bg-mat" />
    </div>
    <div className="h-[46px] border border-rule" />
  </div>
);

export default CustomerProductsPage;
