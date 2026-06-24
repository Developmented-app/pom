/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Barcode, 
  Tag, 
  ArrowRight, 
  FolderSync, 
  ChevronRight,
  AlertTriangle,
  FolderOpen,
  Undo2,
  PackageCheck
} from 'lucide-react';
import { Product, CartItem, StoreSettings } from '../types';
import { CATEGORIES } from '../constants';

interface CheckoutProps {
  products: Product[];
  settings: StoreSettings;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  suspendedCarts: { id: string; timestamp: string; items: CartItem[]; total: number }[];
  setSuspendedCarts: React.Dispatch<React.SetStateAction<{ id: string; timestamp: string; items: CartItem[]; total: number }[]>>;
  onProceedToPayment: () => void;
}

export default function Checkout({
  products,
  settings,
  cart,
  setCart,
  suspendedCarts,
  setSuspendedCarts,
  onProceedToPayment
}: CheckoutProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<number>(0); // Global discount %
  const [taxRateInput, setTaxRateInput] = useState<number>(settings.taxRate);
  const [barcodeMessage, setBarcodeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        product.sku.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle adding an item to the cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`"${product.name}" is currently out of stock.`);
      return;
    }

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id);
      if (existingItemIndex > -1) {
        const currentQty = prevCart[existingItemIndex].quantity;
        if (currentQty >= product.stock) {
          alert(`Cannot add more. Only ${product.stock} units of "${product.name}" are in stock.`);
          return prevCart;
        }
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: currentQty + 1
        };
        return updatedCart;
      } else {
        return [...prevCart, { product, quantity: 1, discountPercentage: 0 }];
      }
    });
  };

  // Handle removing or decrementing cart item
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) {
            return null; // Will filter out below
          }
          // Stock check when incrementing
          if (delta > 0 && newQty > item.product.stock) {
            alert(`Cannot exceed stock limit of ${item.product.stock} units.`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  // Set item-level discount percentage
  const setItemDiscount = (productId: string, discount: number) => {
    const cleanDiscount = Math.min(100, Math.max(0, discount));
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          return { ...item, discountPercentage: cleanDiscount };
        }
        return item;
      });
    });
  };

  // Simulated Barcode Scanner Handler
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedProduct = products.find(p => p.sku === barcodeInput.trim());
    if (matchedProduct) {
      if (matchedProduct.stock <= 0) {
        setBarcodeMessage({ type: 'error', text: `Scanned: ${matchedProduct.name} (OUT OF STOCK)` });
      } else {
        addToCart(matchedProduct);
        setBarcodeMessage({ type: 'success', text: `Scanned and added: ${matchedProduct.name}` });
      }
    } else {
      setBarcodeMessage({ type: 'error', text: `No product found for SKU "${barcodeInput}"` });
    }

    setBarcodeInput('');
    setTimeout(() => setBarcodeMessage(null), 3000);
  };

  // Simulate scanning a random barcode from the store
  const triggerRandomScan = () => {
    if (products.length === 0) return;
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    setBarcodeInput(randomProduct.sku);
    // Submit immediately
    setTimeout(() => {
      const matchedProduct = products.find(p => p.sku === randomProduct.sku);
      if (matchedProduct) {
        addToCart(matchedProduct);
        setBarcodeMessage({ type: 'success', text: `Scanned Barcode: ${matchedProduct.sku} (${matchedProduct.name})` });
      }
      setBarcodeInput('');
      setTimeout(() => setBarcodeMessage(null), 3000);
    }, 100);
  };

  // Hold / Suspend current cart
  const suspendCart = () => {
    if (cart.length === 0) return;
    const total = subtotal - discountAmount + taxAmount;
    const newSuspended = {
      id: `suspended-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: [...cart],
      total
    };
    setSuspendedCarts(prev => [newSuspended, ...prev]);
    setCart([]);
    setDiscountInput(0);
  };

  // Recall a suspended cart
  const recallCart = (suspendedId: string) => {
    const found = suspendedCarts.find(sc => sc.id === suspendedId);
    if (found) {
      // Overwrite current cart (or merge, let's overwrite as it's standard POS behavior)
      setCart(found.items);
      setSuspendedCarts(prev => prev.filter(sc => sc.id !== suspendedId));
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const itemPrice = item.product.retailPrice;
      const discountMult = 1 - (item.discountPercentage / 100);
      return acc + (itemPrice * discountMult * item.quantity);
    }, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return subtotal * (discountInput / 100);
  }, [subtotal, discountInput]);

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = useMemo(() => {
    return taxableAmount * (taxRateInput / 100);
  }, [taxableAmount, taxRateInput]);

  const finalTotal = taxableAmount + taxAmount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] select-none" id="pos_register_layout">
      {/* LEFT PANEL: Catalog (8 Columns on Large Screen) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-4" id="catalog_panel">
        
        {/* Search & Barcode Block */}
        <div className="flex flex-col md:flex-row gap-3 mb-4" id="catalog_controls">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search items by name, SKU or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm shadow-sm"
              id="product_search_input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs py-0.5 px-1.5 rounded-md hover:bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>

          {/* Simulated Barcode Form */}
          <form onSubmit={handleBarcodeScan} className="flex gap-2">
            <div className="relative">
              <Barcode className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Simulate SKU Scanner..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm w-48 shadow-sm font-mono text-center"
                id="barcode_scanner_input"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 text-white font-medium rounded-xl text-sm hover:bg-slate-800 transition shadow-sm cursor-pointer"
              id="barcode_scan_submit_btn"
            >
              Scan
            </button>
            <button
              type="button"
              onClick={triggerRandomScan}
              title="Click to simulate a physically scanned barcode from inventory"
              className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-xl text-sm border border-indigo-100 transition shadow-sm cursor-pointer"
              id="barcode_random_scanner_btn"
            >
              Auto-Scan
            </button>
          </form>
        </div>

        {/* Scan Message Banner */}
        {barcodeMessage && (
          <div 
            className={`px-4 py-2 rounded-xl text-xs font-medium mb-3 border flex items-center gap-2 animate-fade-in ${
              barcodeMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}
            id="barcode_message_banner"
          >
            {barcodeMessage.type === 'success' ? (
              <PackageCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{barcodeMessage.text}</span>
          </div>
        )}

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none" id="categories_nav">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
              id={`category_btn_${cat.replace(/\s+/g, '_')}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto min-h-[250px] pr-1" id="products_grid_container">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400" id="no_products_found">
              <PackageCheck className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium">No products matching filters</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting the search query or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4" id="products_grid">
              {filteredProducts.map((product) => {
                const isLowStock = product.stock > 0 && product.stock <= product.lowStockLevel;
                const isOutOfStock = product.stock === 0;

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`group bg-white border rounded-xl p-4 text-left flex flex-col justify-between transition relative h-40 shadow-sm cursor-pointer ${
                      isOutOfStock 
                        ? 'opacity-60 border-slate-200 bg-slate-100 cursor-not-allowed' 
                        : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                    }`}
                    id={`product_card_${product.id}`}
                  >
                    {/* Status Badges */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {isOutOfStock && (
                        <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase" id={`out_of_stock_badge_${product.id}`}>
                          Out of Stock
                        </span>
                      )}
                      {isLowStock && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5" id={`low_stock_badge_${product.id}`}>
                          <AlertTriangle className="h-2 w-2" />
                          {product.stock} Left
                        </span>
                      )}
                    </div>

                    {/* Catalog Item Title */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                        {product.category}
                      </span>
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 group-hover:text-slate-900">
                        {product.name}
                      </h3>
                      <span className="font-mono text-[9px] text-slate-400 mt-1 block">
                        SKU: {product.sku}
                      </span>
                    </div>

                    {/* Pricing and Action */}
                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-50">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Retail Price</span>
                        <span className="font-mono font-bold text-slate-900 text-base">
                          {settings.currencySymbol}{product.retailPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-slate-100 group-hover:bg-slate-900 group-hover:text-white p-1.5 rounded-lg transition-colors duration-200">
                        <Plus className="h-4 w-4 text-slate-600 group-hover:text-white" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Cart (4 Columns on Large Screen) */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" id="cart_panel">
        
        {/* Cart Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center" id="cart_header">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide">ACTIVE CHECKOUT</span>
            <span className="bg-slate-700 text-white font-mono text-xs px-2 py-0.5 rounded-full">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} items
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear entire cart?')) setCart([]);
              }}
              className="text-slate-300 hover:text-white text-xs flex items-center gap-1 transition font-medium cursor-pointer"
              id="clear_cart_btn"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[150px]" id="cart_items_list">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12" id="cart_empty_state">
              <div className="border border-dashed border-slate-200 rounded-full p-4 mb-3">
                <Barcode className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium">Cart is currently empty</p>
              <p className="text-xs text-slate-400 text-center max-w-[200px] mt-1">
                Scan barcode or select products on the left to ring up items.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const basePrice = item.product.retailPrice;
              const isDiscounted = item.discountPercentage > 0;
              const finalItemPrice = basePrice * (1 - (item.discountPercentage / 100));

              return (
                <div 
                  key={item.product.id} 
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2 transition"
                  id={`cart_row_${item.product.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-semibold text-slate-800 text-sm truncate">{item.product.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">SKU: {item.product.sku}</span>
                        <span className="text-[10px] text-slate-300">|</span>
                        <span className="text-[10px] text-slate-400">Stock: {item.product.stock}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => updateQuantity(item.product.id, -item.quantity)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-200 transition cursor-pointer"
                      id={`remove_item_btn_${item.product.id}`}
                      title="Remove product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    {/* Quantity Controls */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 hover:bg-slate-100 text-slate-500 rounded transition cursor-pointer"
                        id={`qty_dec_btn_${item.product.id}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-slate-800 text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 hover:bg-slate-100 text-slate-500 rounded transition cursor-pointer"
                        id={`qty_inc_btn_${item.product.id}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Price and Item Discount */}
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        {isDiscounted && (
                          <span className="text-xs text-slate-400 line-through font-mono">
                            {settings.currencySymbol}{(basePrice * item.quantity).toFixed(2)}
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-950 text-sm">
                          {settings.currencySymbol}{(finalItemPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Dropdown/Input item discount */}
                      <div className="flex items-center gap-1 mt-1">
                        <Tag className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] text-slate-400">Item Disc %:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercentage || ''}
                          onChange={(e) => setItemDiscount(item.product.id, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-10 text-center font-mono text-[10px] border border-slate-200 bg-white rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          id={`item_discount_input_${item.product.id}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Suspended/Held Carts Shelf */}
        {suspendedCarts.length > 0 && (
          <div className="px-4 py-2 bg-slate-50 border-y border-slate-200" id="suspended_carts_shelf">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">Held Transactions</span>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold px-1.5 rounded-full">
                {suspendedCarts.length}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {suspendedCarts.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => recallCart(sc.id)}
                  className="bg-white border border-indigo-100 hover:border-indigo-300 text-indigo-900 rounded-lg py-1 px-2.5 text-left text-[11px] whitespace-nowrap transition cursor-pointer shadow-sm flex items-center gap-1.5 hover:bg-indigo-50"
                  id={`recall_cart_btn_${sc.id}`}
                  title="Click to recall suspended transaction"
                >
                  <FolderSync className="h-3 w-3 text-indigo-500" />
                  <span className="font-bold">{sc.timestamp}</span>
                  <span className="text-indigo-400">|</span>
                  <span className="font-mono font-medium">{settings.currencySymbol}{sc.total.toFixed(2)}</span>
                  <ChevronRight className="h-2.5 w-2.5 text-indigo-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cart Calculations Footer & Pay Block */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3" id="cart_totals_footer">
          <div className="space-y-1.5 text-sm text-slate-600 font-medium">
            
            {/* Subtotal */}
            <div className="flex justify-between" id="totals_subtotal">
              <span>Subtotal</span>
              <span className="font-mono text-slate-800">{settings.currencySymbol}{subtotal.toFixed(2)}</span>
            </div>

            {/* Global Discount */}
            <div className="flex justify-between items-center" id="totals_discount">
              <div className="flex items-center gap-1">
                <span>Discount</span>
                <div className="flex items-center gap-0.5 border border-slate-200 bg-white rounded-md px-1.5 py-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountInput || ''}
                    onChange={(e) => setDiscountInput(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-7 text-center font-mono text-xs border-none bg-transparent p-0 focus:outline-none"
                    id="global_discount_input"
                  />
                  <span className="text-xs font-mono text-slate-400">%</span>
                </div>
              </div>
              <span className="font-mono text-rose-600">
                -{settings.currencySymbol}{discountAmount.toFixed(2)}
              </span>
            </div>

            {/* Sales Tax */}
            <div className="flex justify-between items-center" id="totals_tax">
              <div className="flex items-center gap-1">
                <span>Sales Tax</span>
                <div className="flex items-center gap-0.5 border border-slate-200 bg-white rounded-md px-1.5 py-0.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxRateInput}
                    onChange={(e) => setTaxRateInput(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-10 text-center font-mono text-xs border-none bg-transparent p-0 focus:outline-none"
                    id="tax_rate_input"
                  />
                  <span className="text-xs font-mono text-slate-400">%</span>
                </div>
              </div>
              <span className="font-mono text-slate-800">{settings.currencySymbol}{taxAmount.toFixed(2)}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 my-2"></div>

            {/* Total */}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1" id="totals_final">
              <span>Total Due</span>
              <span className="font-mono text-lg">{settings.currencySymbol}{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            
            {/* Suspend Cart */}
            <button
              onClick={suspendCart}
              disabled={cart.length === 0}
              className={`py-3 px-2 rounded-xl text-xs font-bold border transition text-center flex flex-col justify-center items-center gap-1 cursor-pointer ${
                cart.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200'
              }`}
              id="suspend_cart_btn"
              title="Suspend this cart and hold it to serve other customers"
            >
              <FolderSync className="h-4 w-4" />
              <span>Hold Order</span>
            </button>

            {/* Check Out / Pay */}
            <button
              onClick={onProceedToPayment}
              disabled={cart.length === 0}
              className={`col-span-2 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer ${
                cart.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-md'
              }`}
              id="checkout_proceed_btn"
            >
              <span>Collect Payment</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
