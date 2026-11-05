import React, { useEffect, useMemo, useState } from 'react';
import { showError, showSuccess } from '../../utils/toast';
import { useNavigate } from 'react-router-dom';
import useProducts from '../../hooks/useProducts';
import DataTable from '../../components/tables/DataTable';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Download, Edit2, Trash2, Search } from 'lucide-react';
import { Product } from '../../types';
import { productService } from '../../services/product.service';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, loading, fetchProducts, editProduct, pagination } = useProducts(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');

  // Delete Dialog State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchProducts({ page: currentPage, limit: itemsPerPage, search: debouncedSearchTerm || undefined, isActive: statusFilter === 'all' ? undefined : statusFilter === 'active' });
  }, [fetchProducts, currentPage, itemsPerPage, debouncedSearchTerm, statusFilter]);

  // Handle stock computation
  const getStockStatus = (product: Product) => {
    const allVariants = product.variants || [];

    if (allVariants.length === 0) {
      return { label: 'Out of Stock', type: 'error' as const };
    }

    const totalStock = allVariants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);

    // All variants are zero → truly out of stock
    if (totalStock === 0) return { label: 'Out of Stock', type: 'error' as const };

    // Any variant is at or below 15 units (but product has stock somewhere)
    const hasLowOrZeroVariant = allVariants.some(v => (v.stockQuantity || 0) <= 15);
    if (hasLowOrZeroVariant) return { label: 'Low Stock', type: 'warning' as const };

    return { label: 'In Stock', type: 'success' as const };
  };

  // Filtered Products
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brandName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && product.isActive) ||
      (statusFilter === 'draft' && !product.isActive);

    return matchesSearch && matchesStatus;
  }), [products, searchTerm, statusFilter]);

  // Pagination Logic
  const totalItems = pagination.total;
  const totalPages = pagination.totalPages;
  const indexOfFirstItem = totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit;
  const currentItems = products;

  const handleStatusToggle = async (product: Product) => {
    const updated = await editProduct(product.id, {
      name: product.name,
      description: product.description,
      material: product.material,
      availableColors: product.availableColors,
      isActive: !product.isActive,
    });
    if (updated) {
      showSuccess(product.isActive ? 'Product deactivated successfully' : 'Product activated successfully');
    } else {
      showError('Failed to update product');
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

 const handleConfirmDelete = async () => {
  if (!deleteId) {
    return;
  }
  try {
    await productService.deleteProduct(deleteId);
    showSuccess('Product deleted successfully');
      await fetchProducts({ page: currentPage, limit: itemsPerPage, search: searchTerm || undefined, isActive: statusFilter === 'all' ? undefined : statusFilter === 'active' });
  } catch (error) {
    const backendMessage = (error as {
      response?: { data?: { error?: { message?: string } } };
    })?.response?.data?.error?.message;
    const message = backendMessage
      ?? (error instanceof Error ? error.message : 'Failed to delete product');
    console.error('Delete failed:', error);
    showError(message);
  } finally {
    setDeleteId(null);
    setIsDeleteOpen(false);
  }
};

  const handleExport = async () => {
    try {
      // Export the already-loaded/filtered catalog locally. The backend does
      // not expose an export route, so this avoids a failing extra request.
      const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const rows = [
        ['Product ID', 'Product Name', 'Brand', 'Material', 'Colors', 'Variants', 'Status', 'Created Date'],
        ...filteredProducts.map((product) => [
          product.id,
          product.name,
          product.brandName,
          product.material,
          (product.availableColors || []).join(', '),
          product.variants?.length || 0,
          product.isActive ? 'Active' : 'Inactive',
          new Date(product.createdAt).toISOString(),
        ]),
      ];
      const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
      const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Product export downloaded successfully');
    } catch (error) {
      console.error("Export failed:", error);
      showError('Unable to export products');
    }
  };

  // Reset page when filters change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as any);
    setCurrentPage(1);
  };

  const headers = [
    { key: 'image', label: 'Image', w: '16' },
    { key: 'name', label: 'Product Name' },
    { key: 'material', label: 'Material' },
    { key: 'colors', label: 'Colors' },
    { key: 'variants', label: 'Variants' },
    { key: 'stock', label: 'Stock', align: 'center' as const },
    { key: 'status', label: 'Status', align: 'center' as const },
    { key: 'date', label: 'Created Date' },
    { key: 'actions', label: 'Actions', align: 'right' as const },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-1">
            <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/admin/overview')}>Catalog</span>
            <span>&gt;</span>
            <span className="text-primary font-semibold">Products</span>
          </nav>
          <h2 className="text-3xl font-bold text-on-surface">Products</h2>
        </div>
        <button
          onClick={() => navigate('/admin/products/new')}
          className="flex items-center justify-center gap-1.5 bg-primary text-on-primary px-5 py-2.5 rounded-xl hover:bg-primary/95 transition-all shadow-sm font-semibold text-sm hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Bento Grid Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl flex flex-col gap-1 shadow-sm">
          <span className="text-xs font-semibold text-on-surface-variant">Total Products</span>
          <span className="text-2xl font-bold text-on-surface">{products.length}</span>
          <span className="text-[11px] text-tertiary font-medium flex items-center gap-0.5">
            Overall Products 
          </span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl flex flex-col gap-1 shadow-sm">
          <span className="text-xs font-semibold text-on-surface-variant">Active Variants</span>
          <span className="text-2xl font-bold text-on-surface">
            {products.reduce((sum, p) => sum + p.variants.length, 0)}
          </span>
          <span className="text-[11px] text-on-surface-variant/80">Standard Variant sizes</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl flex flex-col gap-1 shadow-sm">
          <span className="text-xs font-semibold text-on-surface-variant">Low Stock Alerts</span>
          <span className="text-2xl font-bold text-error">
            {products.filter(p => getStockStatus(p).label !== 'In Stock').length}
          </span>
          <span className="text-[11px] text-error font-medium">Requires attention</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl flex flex-col gap-1 shadow-sm">
          <span className="text-xs font-semibold text-on-surface-variant"> Active Products</span>
          <span className="text-2xl font-bold text-on-surface">
             {products.filter(product => product.isActive).length} </span>
  <span className="text-[11px] text-secondary font-medium">
    Currently Active Products
  </span>
</div>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant w-[18px] h-[18px]" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Filter by name, material, brand..."
              className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
            />
          </div>
          <div className="h-6 w-px bg-outline-variant hidden sm:block" />
          <div className="relative w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="draft">Draft Only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button onClick={handleExport} className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold hover:bg-surface transition-colors flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="px-4 py-2 text-sm font-semibold text-secondary hover:text-on-surface transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        headers={headers}
        items={currentItems}
        loading={loading}
        emptyTitle="No products found"
        emptyMessage="Try adjusting your filters or search terms, or create a new product."
        emptyActionText="Create Product"
        onEmptyAction={() => navigate('/admin/products/new')}

        // Desktop Row Renderer
        renderRow={(product, index) => {
          const stockInfo = getStockStatus(product);
          return (
            <tr key={product.id} className="hover:bg-surface/40 transition-colors group">
              <td className="px-6 py-4">
                <div className="w-12 h-12 rounded bg-surface-container overflow-hidden inner-stroke">
                  <img
                    src={
                      product.images?.[0]?.imageUrl ||
                      "https://via.placeholder.com/300x300?text=No+Image"
                    }
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="font-semibold text-on-surface group-hover:text-primary transition-colors">{product.name}</div>
                <div className="text-[11px] text-on-surface-variant font-medium mt-0.5">Brand: {product.brandName}</div>
              </td>
              <td className="px-6 py-4 text-on-surface-variant">{product.material}</td>
              <td className="px-6 py-4">
                <div className="flex -space-x-1">
                  {(product.availableColors || []).map((color, idx) => (
                    <span
                      key={idx}
                      className="w-4 h-4 rounded-full border border-white ring-1 ring-black/5"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </td>
              <td className="px-6 py-4 text-on-surface-variant">{product.variants?.length || 0} Variants</td>
              <td className="px-6 py-4">
                <div className="flex justify-center">
                  <Badge type={stockInfo.type}  className="min-w-[100px] justify-center"> {stockInfo.label}</Badge>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={product.isActive}
                      onChange={() => handleStatusToggle(product)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </td>
              <td className="px-6 py-4 text-on-surface-variant">{new Date(product.createdAt).toLocaleDateString()}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => navigate(`/admin/products/${product.id}`)}
                    className="p-1.5 hover:bg-surface-container rounded-lg text-primary transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(product.id)}
                    className="p-1.5 hover:bg-error-container/20 rounded-lg text-error transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
        }}

        // Mobile Card Renderer
        renderCard={(product) => {
          const stockInfo = getStockStatus(product);
          return (
            <div key={product.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex gap-4 relative group">
              <div className="w-20 h-20 rounded bg-surface-container overflow-hidden inner-stroke flex-shrink-0">
                <img
                  src={
                    product.images?.[0]?.imageUrl ||
                    "https://via.placeholder.com/300x300?text=No+Image"
                  }
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-semibold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{product.name}</h4>
                  <Badge type={stockInfo.type} className="min-w-[100px] justify-center">  {stockInfo.label}</Badge>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">{product.material} • {product.variants?.length || 0} Variants</p>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <span className="text-[10px] text-on-surface-variant font-semibold bg-surface px-2 py-0.5 rounded border border-outline-variant uppercase">
                    {product.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <div className="flex -space-x-1">
                    {(product.availableColors || []).map((color, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-white"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions container (top right or hover absolute) */}
              <div className="absolute right-4 bottom-4 flex gap-1">
                <button
                  onClick={() => navigate(`/admin/products/${product.id}`)}
                  className="p-1.5 hover:bg-surface-container rounded-lg text-primary transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(product.id)}
                  className="p-1.5 hover:bg-error-container/20 rounded-lg text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-4 border border-outline-variant bg-surface-container-lowest rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-transparent border border-outline-variant rounded-lg px-2.5 py-1 text-xs text-on-surface-variant focus:ring-primary/20"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-on-surface-variant/70 ml-2">
              Showing {totalItems === 0 ? 0 : indexOfFirstItem + 1}-{Math.min(indexOfFirstItem + currentItems.length, totalItems)} of {totalItems} entries
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-semibold text-secondary hover:bg-surface disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${currentPage === pageNum
                      ? 'bg-primary text-on-primary font-bold'
                      : 'hover:bg-surface-container text-on-surface'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-semibold text-secondary hover:bg-surface disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setDeleteId(null); }}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action will permanently remove it from catalog records and delete all variants associated with it."
      />

    </div>
  );
};

export default ProductsPage;


