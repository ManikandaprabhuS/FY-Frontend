import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import ProductCatalogCard from '../components/ProductCatalogCard';
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

const totalStockFor = (product: Product) =>
  (product.variants ?? []).reduce((total, variant) => total + Number(variant.stockQuantity ?? 0), 0);

const CustomerProductsPage: React.FC = () => {
  const products = useProductStore((state) => state.products);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const pagination = useProductStore(state => state.pagination);
  const facets = useProductStore(state => state.facets);
  const [materials, setMaterials] = useState<string[]>([]);
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

  const updateFilter = (callback: () => void) => {
    callback();
    setPage(1);
  };

  const clearFilters = () => {
    setMaterials([]);
    setSizes([]);
    setAvailability([]);
    setSaleOnly(false);
    setMaximumPrice(null);
    setPage(1);
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

  const filterPanel = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-4">
        <h2 className="text-xs font-black uppercase tracking-[0.15em]">Filters</h2>
      </div>

      <div className="divide-y divide-black/10 overflow-y-auto">
        <FilterSection title="By material">
          {materialOptions.length === 0 ? <FilterHint /> : materialOptions.map((material) => (
            <CheckRow
              key={material}
              label={material}
              count={filterCounts.material.get(material) ?? 0}
              checked={materials.includes(material)}
              onChange={() => updateFilter(() => setMaterials((current) => toggleValue(current, material)))}
            />
          ))}
        </FilterSection>

        <FilterSection title="By frame size">
          {sizeOptions.length === 0 ? <FilterHint /> : sizeOptions.map((size) => (
            <CheckRow
              key={size}
              label={size}
              count={filterCounts.size.get(size) ?? 0}
              checked={sizes.includes(size)}
              onChange={() => updateFilter(() => setSizes((current) => toggleValue(current, size)))}
            />
          ))}
        </FilterSection>

        <FilterSection title="By price">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold">
            <span>₹0</span>
            <span>₹{effectiveMaximumPrice.toLocaleString('en-IN')}</span>
          </div>
          <input
            type="range"
            min={0}
            max={priceCeiling}
            step={50}
            value={effectiveMaximumPrice}
            aria-label="Maximum product price"
            onChange={(event) => updateFilter(() => setMaximumPrice(Number(event.target.value)))}
            className="w-full accent-black"
          />
          <button type="button" onClick={() => updateFilter(() => setMaximumPrice(null))} className="mt-3 w-full rounded-md border border-black/15 px-3 py-2 text-[10px] font-bold">Reset</button>
        </FilterSection>

        <FilterSection title="By promotions">
          <CheckRow
            label="On sale"
            count={filterCounts.onSale}
            checked={saleOnly}
            onChange={() => updateFilter(() => setSaleOnly((current) => !current))}
          />
        </FilterSection>

        <FilterSection title="Availability">
          <CheckRow
            label="In stock"
            count={filterCounts.inStock}
            checked={availability.includes('in-stock')}
            onChange={() => updateFilter(() => setAvailability((current) => toggleValue(current, 'in-stock')))}
          />
          <CheckRow
            label="Out of stock"
            count={filterCounts.outOfStock}
            checked={availability.includes('out-of-stock')}
            onChange={() => updateFilter(() => setAvailability((current) => toggleValue(current, 'out-of-stock')))}
          />
        </FilterSection>
      </div>

      <div className="mt-auto border-t border-black/10 p-4">
        <button type="button" onClick={clearFilters} className="flex w-full items-center justify-center gap-2 rounded-md border border-black/20 py-2.5 text-[10px] font-bold uppercase tracking-wide hover:bg-black hover:text-white">
          <RotateCcw className="h-3.5 w-3.5" /> Clear all filters
        </button>
      </div>
    </div>
  );

  return (
    <section className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto flex max-w-[1500px] items-start">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[230px] shrink-0 border-r border-black/10 lg:block">
          {filterPanel}
        </aside>

        <div className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">FrameYaad collection</p>
              <h1 className="mt-1 text-2xl font-black text-black sm:text-3xl">All Frames</h1>
              <p className="mt-1 text-xs text-black/50">
                Showing {startItem}–{endItem} of {pagination.total} products
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="relative inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-xs font-bold lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] text-white">{activeFilterCount}</span>}
              </button>
              <label className="relative flex h-11 min-w-0 items-center gap-1 rounded-lg border border-black/15 bg-white pl-3 text-[10px] font-semibold text-black/55 sm:h-10 sm:gap-2">
                <span className="hidden min-[390px]:inline">Sort by:</span>
                <select
                  value={sort}
                  onChange={(event) => { setSort(event.target.value as SortOption); setPage(1); }}
                  className="h-full min-w-0 flex-1 appearance-none bg-transparent py-0 pl-0 pr-8 text-[11px] font-bold text-black outline-none sm:pl-1 sm:pr-9 sm:text-xs"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to high</option>
                  <option value="price-high">Price: High to low</option>
                  <option value="newest">Newest</option>
                  <option value="name">Name</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-black" />
              </label>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-black/10 py-3">
              <span className="mr-1 text-[10px] font-bold uppercase text-black/45">Active filters:</span>
              {materials.map((value) => <FilterChip key={`material-${value}`} label={value} onRemove={() => removeChip('material', value)} />)}
              {sizes.map((value) => <FilterChip key={`size-${value}`} label={value} onRemove={() => removeChip('size', value)} />)}
              {availability.map((value) => <FilterChip key={value} label={value === 'in-stock' ? 'In stock' : 'Out of stock'} onRemove={() => removeChip('availability', value)} />)}
              {saleOnly && <FilterChip label="On sale" onRemove={() => removeChip('sale')} />}
              {maximumPrice !== null && <FilterChip label={`Up to ₹${maximumPrice.toLocaleString('en-IN')}`} onRemove={() => removeChip('price')} />}
              <button type="button" onClick={clearFilters} className="ml-auto text-[10px] font-bold underline underline-offset-2">Clear all</button>
            </div>
          )}

          {error && !loading ? (
            <div className="my-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-bold text-red-700">Unable to load products</p>
              <p className="mt-1 text-xs text-red-600">{error}</p>
              <button type="button" onClick={() => fetchProducts(catalogQuery)} className="mt-4 rounded-md bg-black px-4 py-2 text-xs font-bold text-white">Retry</button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-3 py-6 min-[360px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, index) => <ProductSkeleton key={index} />)}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="my-8 flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-black/20 bg-white px-6 text-center">
              <PackageOpen className="h-9 w-9 text-black/35" />
              <h2 className="mt-4 text-lg font-black">No frames found</h2>
              <p className="mt-1 max-w-sm text-xs text-black/50">No products match the selected filters. Clear the filters to explore the full collection.</p>
              <button type="button" onClick={clearFilters} className="mt-4 rounded-md bg-black px-4 py-2 text-xs font-bold text-white">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 py-6 min-[360px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {paginatedProducts.map(({ product, pricing, totalStock }, index) => (
                <ProductCatalogCard
                  key={product.id}
                  product={product}
                  pricing={pricing}
                  totalStock={totalStock}
                  wished={customerLoggedIn && Boolean(product.productIdentifier && wishlist[product.productIdentifier])}
                  priority={currentPage === 1 && index < 4}
                  onToggleWishlist={toggleWishlist}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}

          {!loading && pagination.total > 0 && (
            <div className="flex flex-col gap-3 border-t border-black/10 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-black/50">Showing {startItem}–{endItem} of {pagination.total}</p>
              <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
                <PageButton label="Previous page" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></PageButton>
                {Array.from({ length: Math.min(pageCount, 7) }, (_, index) => Math.max(1, Math.min(currentPage - 3, pageCount - 6)) + index).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    className={`grid h-8 min-w-8 place-items-center rounded-md border px-2 text-xs font-bold ${pageNumber === currentPage ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black hover:border-black/40'}`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <PageButton label="Next page" disabled={currentPage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight className="h-4 w-4" /></PageButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[150] lg:hidden">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" onClick={() => setFiltersOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,340px)] overflow-hidden bg-white shadow-2xl">
            <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black text-white">
              <X className="h-4 w-4" />
            </button>
            {filterPanel}
          </aside>
        </div>
      )}
    </section>
  );
};

const FilterSection: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <section className="px-4 py-4">
    <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-black/75">{title}</h3>
    <div className="space-y-2.5">{children}</div>
  </section>
);

const CheckRow: React.FC<{ label: string; count: number; checked: boolean; onChange: () => void }> = ({ label, count, checked, onChange }) => (
  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-black/70">
    <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 rounded border-black/25 accent-black" />
    <span className="min-w-0 flex-1 truncate">{label}</span>
    <span className="text-[9px] text-black/35">({count})</span>
  </label>
);

const FilterHint = () => <p className="text-[10px] text-black/40">No options available</p>;

const FilterChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[10px] font-semibold hover:border-black/40">
    {label}<X className="h-3 w-3" />
  </button>
);

const ProductSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-black/5 bg-white" aria-hidden="true">
    <div className="aspect-[4/3] animate-pulse bg-black/10" />
    <div className="space-y-3 p-4">
      <div className="h-3 w-4/5 animate-pulse rounded bg-black/10" />
      <div className="h-2 w-2/5 animate-pulse rounded bg-black/5" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-black/10" />
    </div>
  </div>
);

const PageButton: React.FC<React.PropsWithChildren<{ label: string; disabled: boolean; onClick: () => void }>> = ({ label, disabled, onClick, children }) => (
  <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-md border border-black/10 bg-white disabled:cursor-not-allowed disabled:opacity-35 hover:border-black/40">
    {children}
  </button>
);

export default CustomerProductsPage;
