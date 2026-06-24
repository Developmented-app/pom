/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Barcode, 
  Info, 
  X,
  TrendingUp,
  PackagePlus,
  RefreshCw,
  Layers,
  FolderPlus
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { CATEGORIES } from '../constants';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  settings: StoreSettings;
}

export default function Inventory({
  products,
  setProducts,
  categories,
  setCategories,
  settings
}: InventoryProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal State for Add/Edit product
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState<string>('');
  const [formSku, setFormSku] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formCostPrice, setFormCostPrice] = useState<string>('');
  const [formRetailPrice, setFormRetailPrice] = useState<string>('');
  const [formStock, setFormStock] = useState<string>('');
  const [formLowStockLevel, setFormLowStockLevel] = useState<string>('');

  // Quick category creator state
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        product.sku.includes(searchQuery);
      
      const isLow = product.stock > 0 && product.stock <= product.lowStockLevel;
      const isOut = product.stock === 0;

      const matchesStockFilter = 
        stockFilter === 'all' ||
        (stockFilter === 'low' && isLow) ||
        (stockFilter === 'out' && isOut);

      return matchesCategory && matchesSearch && matchesStockFilter;
    });
  }, [products, selectedCategory, searchQuery, stockFilter]);

  // Totals & Valuations
  const inventoryStats = useMemo(() => {
    let totalItemsCount = 0;
    let totalStockUnits = 0;
    let costValuation = 0;
    let retailValuation = 0;
    let lowStockAlertCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      totalItemsCount += 1;
      totalStockUnits += p.stock;
      costValuation += (p.costPrice * p.stock);
      retailValuation += (p.retailPrice * p.stock);
      if (p.stock === 0) {
        outOfStockCount += 1;
      } else if (p.stock <= p.lowStockLevel) {
        lowStockAlertCount += 1;
      }
    });

    const potentialProfit = retailValuation - costValuation;
    const averageMargin = retailValuation > 0 ? (potentialProfit / retailValuation) * 100 : 0;

    return {
      totalItemsCount,
      totalStockUnits,
      costValuation,
      retailValuation,
      potentialProfit,
      averageMargin,
      lowStockAlertCount,
      outOfStockCount
    };
  }, [products]);

  // Open modal for editing
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormCategory(product.category);
    setFormCostPrice(product.costPrice.toString());
    setFormRetailPrice(product.retailPrice.toString());
    setFormStock(product.stock.toString());
    setFormLowStockLevel(product.lowStockLevel.toString());
    setIsFormOpen(true);
  };

  // Open modal for adding new item
  const handleAddClick = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormCategory(categories[1] || 'Homeware'); // Pick first real category
    setFormCostPrice('');
    setFormRetailPrice('');
    setFormStock('');
    setFormLowStockLevel('5'); // default threshold
    setIsFormOpen(true);
  };

  // Generate standard 12-digit UPC Barcode
  const generateRandomUPC = () => {
    const randomBody = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
    // Simple check digit calculation (Luhn mod 10 variation or mock)
    setFormSku(randomBody + '4');
  };

  // Live profit calculation as user types
  const liveMarginCalc = useMemo(() => {
    const cost = parseFloat(formCostPrice) || 0;
    const retail = parseFloat(formRetailPrice) || 0;
    if (retail <= 0 || retail < cost) return { profit: 0, margin: 0, markup: 0 };
    
    const profit = retail - cost;
    const margin = (profit / retail) * 100;
    const markup = cost > 0 ? (profit / cost) * 100 : 0;

    return { profit, margin, markup };
  }, [formCostPrice, formRetailPrice]);

  // Save product details (Add or Edit)
  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim()) {
      alert('Product name and SKU are required.');
      return;
    }

    const cleanCost = Math.max(0, parseFloat(formCostPrice) || 0);
    const cleanRetail = Math.max(0, parseFloat(formRetailPrice) || 0);
    const cleanStock = Math.max(0, parseInt(formStock) || 0);
    const cleanLowLevel = Math.max(0, parseInt(formLowStockLevel) || 5);

    if (cleanRetail < cleanCost) {
      if (!confirm('Warning: Retail price is lower than cost price. Continue?')) {
        return;
      }
    }

    const savedProduct: Product = {
      id: editingProduct ? editingProduct.id : `p-${Date.now()}`,
      name: formName.trim(),
      sku: formSku.trim(),
      category: formCategory,
      costPrice: cleanCost,
      retailPrice: cleanRetail,
      stock: cleanStock,
      lowStockLevel: cleanLowLevel,
      iconName: editingProduct?.iconName || 'Package'
    };

    setProducts(prevProducts => {
      if (editingProduct) {
        // Edit existing
        return prevProducts.map(p => p.id === editingProduct.id ? savedProduct : p);
      } else {
        // Check duplicate SKU
        const exists = prevProducts.some(p => p.sku === savedProduct.sku);
        if (exists) {
          alert(`A product with SKU/Barcode "${savedProduct.sku}" already exists.`);
          return prevProducts;
        }
        // Add new
        return [...prevProducts, savedProduct];
      }
    });

    setIsFormOpen(false);
  };

  // Quick stock adjuster
  const adjustStock = (productId: string, amount: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const nextStock = Math.max(0, p.stock + amount);
        return { ...p, stock: nextStock };
      }
      return p;
    }));
  };

  // Delete product
  const deleteProduct = (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to delete "${name}" from inventory?`)) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  // Add custom category
  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCategoryName.trim();
    if (!cleanName) return;
    
    // Format appropriately
    const formatted = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    if (categories.includes(formatted)) {
      alert('This category already exists.');
      return;
    }

    setCategories(prev => [...prev, formatted]);
    setNewCategoryName('');
    setFormCategory(formatted);
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)]" id="inventory_tab_view">
      
      {/* 1. TOP STATS ROW (VALUATIONS & ALERTS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0" id="inventory_stats_dashboard">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" id="stat_cost_val">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Inventory Value (Cost)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-xl font-bold text-slate-900">
              {settings.currencySymbol}{inventoryStats.costValuation.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Total Cost Price of all in-stock units</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" id="stat_retail_val">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Inventory Value (Retail)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-xl font-bold text-indigo-700">
              {settings.currencySymbol}{inventoryStats.retailValuation.toFixed(2)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 font-mono">
              +{inventoryStats.averageMargin.toFixed(0)}% Margin
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Expected total revenue when sold</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" id="stat_units_stock">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Active Products</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-xl font-bold text-slate-900">{inventoryStats.totalItemsCount}</span>
            <span className="text-xs text-slate-400">({inventoryStats.totalStockUnits} units total)</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Unique SKU catalog profiles</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" id="stat_alerts">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Alerts & Deficits</span>
          <div className="flex gap-3 mt-1.5">
            <button 
              onClick={() => { setStockFilter('out'); }}
              className={`flex items-center gap-1 text-xs font-bold rounded-lg px-2.5 py-1 font-mono transition cursor-pointer ${
                inventoryStats.outOfStockCount > 0 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200' 
                  : 'bg-slate-100 text-slate-400'
              }`}
              title="Filter by out of stock"
            >
              <span className="h-2 w-2 rounded-full bg-rose-600"></span>
              {inventoryStats.outOfStockCount} Out
            </button>
            <button 
              onClick={() => { setStockFilter('low'); }}
              className={`flex items-center gap-1 text-xs font-bold rounded-lg px-2.5 py-1 font-mono transition cursor-pointer ${
                inventoryStats.lowStockAlertCount > 0 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200' 
                  : 'bg-slate-100 text-slate-400'
              }`}
              title="Filter by low stock alert level"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              {inventoryStats.lowStockAlertCount} Low
            </button>
          </div>
        </div>
      </div>

      {/* 2. INVENTORY FILTERING AND CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 shadow-sm" id="inventory_search_bar">
        
        {/* Search input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, item name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
            id="inv_search_input"
          />
        </div>

        {/* Filters block */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto" id="inventory_filters_block">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none cursor-pointer"
            id="inv_category_filter"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat} Category</option>
            ))}
          </select>

          {/* Stock state filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none cursor-pointer"
            id="inv_stock_filter"
          >
            <option value="all">All Stock Statuses</option>
            <option value="low">Low Stock Warning Only</option>
            <option value="out">Out Of Stock Only</option>
          </select>

          {/* Reset Filters */}
          {(searchQuery || selectedCategory !== 'All' || stockFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setStockFilter('all');
              }}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full sm:w-auto" id="inventory_action_buttons">
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            id="manage_categories_btn"
          >
            <Layers className="h-4 w-4" />
            <span>Categories</span>
          </button>
          
          <button
            onClick={handleAddClick}
            className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            id="add_new_product_btn"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* 3. PRODUCT TABLE LIST */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col" id="inventory_table_panel">
        <div className="flex-1 overflow-y-auto" id="inventory_table_scroller">
          <table className="w-full text-left border-collapse" id="inventory_table_grid">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 sticky top-0 z-10 uppercase select-none">
                <th className="py-3 px-4">Item Profile</th>
                <th className="py-3 px-4 hidden md:table-cell">Barcode/SKU</th>
                <th className="py-3 px-4 hidden sm:table-cell">Cost</th>
                <th className="py-3 px-4">Retail</th>
                <th className="py-3 px-4 text-center">Stock Units</th>
                <th className="py-3 px-4 text-center">Quick Restock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700" id="inventory_table_rows">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No products fit these search filters</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try resetting criteria or add a product to stock.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= p.lowStockLevel;
                  const isOut = p.stock === 0;
                  
                  // Margin computation
                  const profit = p.retailPrice - p.costPrice;
                  const marginPct = p.retailPrice > 0 ? (profit / p.retailPrice) * 100 : 0;

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/50 transition duration-150 ${
                        isOut ? 'bg-rose-50/20' : isLow ? 'bg-amber-50/20' : ''
                      }`}
                      id={`inv_row_${p.id}`}
                    >
                      {/* Name / Category */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-sm block truncate hover:text-indigo-900">{p.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5 block">{p.category}</span>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <Barcode className="h-3.5 w-3.5 text-slate-300" />
                          <span>{p.sku}</span>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 font-mono hidden sm:table-cell">
                        {settings.currencySymbol}{p.costPrice.toFixed(2)}
                      </td>

                      {/* Retail & margin popup info */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-950">
                          {settings.currencySymbol}{p.retailPrice.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                          <TrendingUp className="h-2.5 w-2.5" />
                          {marginPct.toFixed(0)}% margin
                        </div>
                      </td>

                      {/* Stock units with visual flags */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded-full ${
                            isOut 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : isLow 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                : 'bg-slate-100 text-slate-800'
                          }`} id={`stock_counter_${p.id}`}>
                            {p.stock} units
                          </span>
                          
                          {/* Alert notice under stock */}
                          {isOut && <span className="text-[9px] text-rose-600 font-bold mt-1">Deficit!</span>}
                          {isLow && <span className="text-[9px] text-amber-600 font-bold mt-1">Refill Soon</span>}
                        </div>
                      </td>

                      {/* Stock Quick adjusters */}
                      <td className="py-3.5 px-4 text-center select-none">
                        <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <button
                            onClick={() => adjustStock(p.id, 1)}
                            className="bg-white hover:bg-slate-50 text-[10px] text-slate-700 font-bold px-2 py-1 rounded shadow-sm transition cursor-pointer"
                            title="Add 1 to stock"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => adjustStock(p.id, 5)}
                            className="bg-white hover:bg-slate-50 text-[10px] text-slate-700 font-bold px-2 py-1 rounded shadow-sm ml-1 transition cursor-pointer"
                            title="Add 5 to stock"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => adjustStock(p.id, 10)}
                            className="bg-white hover:bg-slate-50 text-[10px] text-slate-700 font-bold px-2 py-1 rounded shadow-sm ml-1 transition cursor-pointer"
                            title="Add 10 to stock"
                          >
                            +10
                          </button>
                          {p.stock > 0 && (
                            <button
                              onClick={() => adjustStock(p.id, -1)}
                              className="hover:bg-rose-50 text-[10px] text-rose-600 font-bold px-1.5 py-1 rounded ml-1 transition cursor-pointer"
                              title="Subtract 1 from stock"
                            >
                              -1
                            </button>
                          )}
                        </div>
                      </td>

                      {/* CRUD Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => handleEditClick(p)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                            id={`edit_btn_${p.id}`}
                            title="Edit details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id, p.name)}
                            className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                            id={`delete_btn_${p.id}`}
                            title="Delete item profile"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL FORM: ADD / EDIT PRODUCT */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="product_form_modal">
          <form onSubmit={saveProduct} className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">
                {editingProduct ? `Edit Profile: ${editingProduct.name}` : 'Create New Product Profile'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-full transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Product Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Stoneware Ceramic Teapot"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  id="form_name"
                />
              </div>

              {/* Barcode/SKU and generator */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex justify-between">
                  <span>SKU / Barcode Number</span>
                  <button
                    type="button"
                    onClick={generateRandomUPC}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-0.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Auto-Generate SKU
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="000000000000"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    id="form_sku"
                  />
                  <Barcode className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Category dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  id="form_category"
                >
                  {categories.filter(c => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Cost & Retail with real-time financial margin calculator */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Wholesale Cost ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    id="form_cost"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Retail Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                    value={formRetailPrice}
                    onChange={(e) => setFormRetailPrice(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    id="form_retail"
                  />
                </div>
              </div>

              {/* Financial feedback pane */}
              {(parseFloat(formCostPrice) > 0 || parseFloat(formRetailPrice) > 0) && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 grid grid-cols-3 text-center gap-2" id="form_financials_pane">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-800/60 block leading-none">Net Profit</span>
                    <span className="font-mono text-xs font-bold text-emerald-900 mt-1 block">
                      {settings.currencySymbol}{liveMarginCalc.profit.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-800/60 block leading-none">Profit Margin</span>
                    <span className="font-mono text-xs font-bold text-emerald-900 mt-1 block">
                      {liveMarginCalc.margin.toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-800/60 block leading-none">Markup %</span>
                    <span className="font-mono text-xs font-bold text-emerald-900 mt-1 block">
                      {liveMarginCalc.markup.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Stock count and low threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Starting Stock Units</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    id="form_stock"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Low Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5"
                    required
                    value={formLowStockLevel}
                    onChange={(e) => setFormLowStockLevel(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    id="form_low_level"
                  />
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition cursor-pointer"
                id="submit_product_form_btn"
              >
                {editingProduct ? 'Update Product Profile' : 'Save Product to Inventory'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. SIDE MODAL: CATEGORY MANAGER */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="category_manager_modal">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Store Product Categories</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsCategoryManagerOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-full transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Category creation form */}
              <form onSubmit={addCategory} className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Create Custom Category</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Botanicals"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    id="new_cat_name_input"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-lg transition shrink-0 cursor-pointer"
                    id="save_category_btn"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Categories list */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Active List</label>
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-50 max-h-48 overflow-y-auto" id="categories_active_list">
                  {categories.map((cat) => (
                    <div key={cat} className="p-2.5 flex justify-between items-center text-xs">
                      <span className={`font-semibold ${cat === 'All' ? 'text-slate-400 italic' : 'text-slate-700'}`}>{cat}</span>
                      {cat !== 'All' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove category "${cat}"? Products inside this category won't be deleted, but they'll remain in category listing.`)) {
                              setCategories(prev => prev.filter(c => c !== cat));
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          title="Remove category"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCategoryManagerOpen(false)}
                className="w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
