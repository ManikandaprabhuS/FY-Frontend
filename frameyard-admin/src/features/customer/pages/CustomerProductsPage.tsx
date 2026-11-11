import { totalVariantStock } from '../../../utils/stock';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { flushSync } from 'react-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import ProductCatalogCard from '../components/ProductCatalogCard';
import { materialsForCollection } from '../data/frameCollections';
import { getCatalogPricing, type CatalogPricing } from '../utils/catalog-product';
import { useProductStore } from '../../../store/productStore';
import type { Product } from '../../../types';
import { useCustomerCommerce } from '../hooks/useCustomerCommerce';

const PRODUCTS_PER_PAGE = 12;

type SortOption = 'featured' | 'price-low' | 'price-high' | 'newest' | 'name';
type AvailabilityFilter = 'in-stock' | 'out-of-stock';
type CatalogEntry = { product: Product; pricing: CatalogPricing; totalStock: number };

const toggleValue = <T,>(values: T[], value: T): T[] =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const totalStockFor = (product: Product) => totalVariantStock(product.variants);

const CustomerProductsPage: React.FC = () => {
  const products = useProductStore((state) => state.products);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const pagination = useProductStore(state => state.pagination);
  const facets = useProductStore(state => state.facets);
  // `?collection=wooden` (from the homepage collections) pre-selects that collection's
  // materials once the material list is known; any change the shopper makes then wins.
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get('collection');
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
  const { customerLoggedIn, wishlist, toggleWishlist, addToCart } = useCustomerCommerce();

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
  const activeFilterCount = materials.length + sizes.length + availability.length + Number(saleOnly) + Number(maximumPrice !== null);

  // The grid reflow animation only runs when the grid is visible (not behind the mobile sheet).
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
      setMaterials([]);
      setSizes([]);
      setAvailability([]);
      setSaleOnly(false);
      setMaximumPrice(null);
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
      if (kind === 'price') setMaximumPrice(null);
    });
  };


  // Mobile filter sheet: lock page scroll and close on Escape while it is open.
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

  const changeSort = (value: SortOption) => withGridTransition(() => {
    setSort(value);
    setPage(1);
  });
  const goToPage = (value: number) => withGridTransition(() => setPage(value));

  const sortControl = (
    <label className="relative inline-flex min-h-11 items-center gap-1.5 text-[14px]">
      <span className="text-mute">Sort</span>
      <select
        value={sort}
        onChange={(event) => changeSort(event.target.value as SortOption)}
        className="cursor-pointer appearance-none border-b border-ink bg-transparent py-1 pl-0.5 pr-6 font-medium text-ink outline-none focus-visible:border-b-2"
      >
        <option value="featured">Featured</option>
        <option value="price-low">Price: low to high</option>
        <option value="price-high">Price: high to low</option>
        <option value="newest">Newest</option>
        <option value="name">Name</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4" strokeWidth={1.6} />
    </label>
  );

  const filterPanel = (
    <div className="space-y-8">
      <FilterGroup title="Size">
        {drawnSizes.length === 0 ? <FilterHint /> : (
          <div className="flex flex-wrap items-end gap-x-2 gap-y-3">
            {drawnSizes.map(({ label, width, height }) => {
              const selected = sizes.includes(label);
              const count = filterCounts.size.get(label) ?? 0;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${label}, ${count} ${count === 1 ? 'frame' : 'frames'}`}
                  onClick={() => updateFilter(() => setSizes((current) => toggleValue(current, label)))}
                  className="fy-size"
                >
                  {width && height ? (
                    <span className="fy-size__shape" style={{ width, height }} aria-hidden="true" />
                  ) : null}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </FilterGroup>

      <FilterGroup title="Material">
        {materialOptions.length === 0 ? <FilterHint /> : (
          <ul className="-mx-1">
            {materialOptions.map((material) => {
              const selected = materials.includes(material);
              return (
                <li key={material}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateFilter(() => setMaterials((current) => toggleValue(current, material)))}
                    className={`flex min-h-10 w-full items-center gap-3 px-1 text-left text-[14px] transition-colors ${selected ? 'font-medium text-ink' : 'text-ink/70 hover:text-ink'}`}
                  >
                    <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 border border-ink transition-colors ${selected ? 'bg-ink' : ''}`} />
                    <span className="min-w-0 flex-1 truncate">{material}</span>
                    <span className="text-[13px] text-mute">{filterCounts.material.get(material) ?? 0}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </FilterGroup>

      <FilterGroup title={`Price, up to ₹${effectiveMaximumPrice.toLocaleString('en-IN')}`}>
        <input
          type="range"
          min={0}
          max={priceCeiling}
          step={50}
          value={effectiveMaximumPrice}
          aria-label="Maximum frame price"
          onChange={(event) => updateFilter(() => setMaximumPrice(Number(event.target.value)), false)}
          className="fy-range"
        />
        <div className="mt-1 flex justify-between text-[12px] text-mute">
          <span>₹0</span>
          {maximumPrice !== null
            ? <button type="button" onClick={() => updateFilter(() => setMaximumPrice(null))} className="text-ink underline underline-offset-4">Reset</button>
            : <span>₹{priceCeiling.toLocaleString('en-IN')}</span>}
        </div>
      </FilterGroup>

      <FilterGroup title="Show">
        <SwitchRow label="On sale" count={filterCounts.onSale} checked={saleOnly} onChange={() => updateFilter(() => setSaleOnly((current) => !current))} />
        <SwitchRow label="In stock" count={filterCounts.inStock} checked={availability.includes('in-stock')} onChange={() => updateFilter(() => setAvailability((current) => toggleValue(current, 'in-stock')))} />
        <SwitchRow label="Out of stock" count={filterCounts.outOfStock} checked={availability.includes('out-of-stock')} onChange={() => updateFilter(() => setAvailability((current) => toggleValue(current, 'out-of-stock')))} />
      </FilterGroup>
    </div>
  );

  return (
    <section className="min-h-screen bg-white">
      {/* Phones and tablets: a sticky bar for filters and sorting. */}
      <div className="sticky top-[60px] z-[60] flex items-center justify-between border-b border-rule bg-white/95 px-5 backdrop-blur-xl sm:px-8 lg:hidden">
        <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-12 items-center gap-2 text-[14px] font-medium">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.6} />
          Filter
          {activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] text-white">{activeFilterCount}</span>}
        </button>
        {sortControl}
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] items-start">
        <aside className="sticky top-[76px] hidden max-h-[calc(100vh-76px)] w-[250px] shrink-0 overflow-y-auto border-r border-rule px-7 py-10 lg:block" aria-label="Filters">
          {filterPanel}
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters} className="mt-8 text-[14px] underline underline-offset-4">Clear all filters</button>
          )}
        </aside>

        <div className="min-w-0 flex-1 px-5 pb-12 pt-8 sm:px-8 lg:px-10 lg:pt-10">
          <header className="flex items-end justify-between gap-6">
            <div>
              <h1 className="fy-display text-[40px] leading-none sm:text-[48px] lg:text-[60px]">All frames</h1>
              <p className="mt-3 text-[14px] text-mute" aria-live="polite">{loading ? 'Loading frames' : frameCount}</p>
            </div>
            <div className="hidden lg:block">{sortControl}</div>
          </header>

          {activeFilterCount > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {materials.map((value) => <FilterTag key={`material-${value}`} label={value} onRemove={() => removeChip('material', value)} />)}
              {sizes.map((value) => <FilterTag key={`size-${value}`} label={value} onRemove={() => removeChip('size', value)} />)}
              {availability.map((value) => <FilterTag key={value} label={value === 'in-stock' ? 'In stock' : 'Out of stock'} onRemove={() => removeChip('availability', value)} />)}
              {saleOnly && <FilterTag label="On sale" onRemove={() => removeChip('sale')} />}
              {maximumPrice !== null && <FilterTag label={`Up to ₹${maximumPrice.toLocaleString('en-IN')}`} onRemove={() => removeChip('price')} />}
              <button type="button" onClick={clearFilters} className="min-h-9 px-1 text-[13px] underline underline-offset-4">Clear all</button>
            </div>
          )}

          {error && !loading ? (
            <div className="mt-10 border-t border-rule pt-10">
              <h2 className="fy-display text-[28px]">Frames couldn't load</h2>
              <p className="mt-2 max-w-[48ch] text-[15px] leading-6 text-mute">Check your connection and try again.</p>
              <button type="button" onClick={() => fetchProducts(catalogQuery)} className="mt-6 min-h-12 bg-ink px-6 text-[15px] font-medium text-white">Try again</button>
            </div>
          ) : loading ? (
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-4" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => <ProductSkeleton key={index} />)}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="mt-10 border-t border-rule pt-10">
              <h2 className="fy-display text-[28px]">No frames match these filters</h2>
              <p className="mt-2 max-w-[48ch] text-[15px] leading-6 text-mute">Remove a filter or clear them all to see the full collection.</p>
              <button type="button" onClick={clearFilters} className="mt-6 min-h-12 bg-ink px-6 text-[15px] font-medium text-white">Clear filters</button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-12 xl:grid-cols-4">
              {paginatedProducts.map(({ product, pricing, totalStock }, index) => (
                <div key={product.id} style={{ viewTransitionName: `fy-frame-${product.id}` } as React.CSSProperties}>
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

          {!loading && pagination.total > 0 && pageCount > 1 && (
            <nav className="mt-14 flex flex-col items-center gap-3 border-t border-rule pt-6 sm:flex-row sm:justify-between" aria-label="Pages">
              <p className="text-[13px] text-mute">Showing {startItem}–{endItem} of {pagination.total}</p>
              <div className="flex items-center gap-1">
                <PageArrow label="Previous page" disabled={currentPage === 1} onClick={() => goToPage(Math.max(1, currentPage - 1))}><ChevronLeft className="h-4 w-4" strokeWidth={1.6} /></PageArrow>
                {Array.from({ length: Math.min(pageCount, 7) }, (_, index) => Math.max(1, Math.min(currentPage - 3, pageCount - 6)) + index).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => goToPage(pageNumber)}
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    className={`grid h-11 min-w-9 place-items-center px-1 text-[14px] ${pageNumber === currentPage ? 'font-semibold underline decoration-2 underline-offset-[6px]' : 'text-mute hover:text-ink'}`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <PageArrow label="Next page" disabled={currentPage === pageCount} onClick={() => goToPage(Math.min(pageCount, currentPage + 1))}><ChevronRight className="h-4 w-4" strokeWidth={1.6} /></PageArrow>
              </div>
            </nav>
          )}
        </div>
      </div>

      {/* Mobile filter sheet rises from the bottom, above the bottom bar. */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[160] lg:hidden" role="dialog" aria-modal="true" aria-label="Filter frames">
          <button type="button" aria-label="Close filters" className="fy-sheet-backdrop absolute inset-0 bg-ink/40" onClick={() => setFiltersOpen(false)} />
          <div className="fy-sheet absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-white">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h2 className="fy-display text-[26px]">Filter</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="-mr-2 grid h-11 w-11 place-items-center">
                <X className="h-5 w-5" strokeWidth={1.6} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-2">{filterPanel}</div>
            <div className="flex items-center gap-4 border-t border-rule px-5 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-4">
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearFilters} className="min-h-12 text-[14px] underline underline-offset-4">Clear all</button>
              )}
              <button type="button" onClick={() => setFiltersOpen(false)} className="min-h-12 flex-1 bg-ink px-6 text-[15px] font-medium text-white">
                Show {frameCount}
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
  <section>
    <h3 className="mb-3 text-[14px] font-semibold">{title}</h3>
    {children}
  </section>
);

const SwitchRow: React.FC<{ label: string; count: number; checked: boolean; onChange: () => void }> = ({ label, count, checked, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={onChange} className="flex min-h-10 w-full items-center gap-3 text-left text-[14px]">
    <span className="min-w-0 flex-1">{label} <span className="text-[13px] text-mute">{count}</span></span>
    <span aria-hidden="true" className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-rule'}`}>
      <span className={`absolute top-[3px] h-3 w-3 rounded-full bg-white transition-transform duration-300 ease-[var(--fy-ease-spring)] ${checked ? 'translate-x-[17px]' : 'translate-x-[3px]'}`} />
    </span>
  </button>
);

const FilterHint = () => <p className="text-[13px] text-mute">No options yet</p>;

const FilterTag: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="inline-flex min-h-9 items-center gap-1.5 border border-ink px-3 text-[13px] transition-colors hover:bg-ink hover:text-white">
    {label}<X className="h-3.5 w-3.5" strokeWidth={1.8} />
  </button>
);

const ProductSkeleton = () => (
  <div>
    <div className="aspect-[4/5] animate-pulse bg-mat" />
    <div className="mt-3 h-4 w-3/4 animate-pulse bg-mat" />
    <div className="mt-2 h-3 w-1/2 animate-pulse bg-mat" />
  </div>
);

const PageArrow: React.FC<React.PropsWithChildren<{ label: string; disabled: boolean; onClick: () => void }>> = ({ label, disabled, onClick, children }) => (
  <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="grid h-11 w-11 place-items-center disabled:cursor-not-allowed disabled:opacity-30">
    {children}
  </button>
);

export default CustomerProductsPage;
