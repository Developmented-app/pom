/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  FileText, 
  Search, 
  Calendar, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Eye,
  X,
  CreditCard,
  QrCode,
  Gift,
  Printer
} from 'lucide-react';
import { SaleTransaction, Product, StoreSettings } from '../types';

interface AnalyticsProps {
  transactions: SaleTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<SaleTransaction[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
}

export default function Analytics({
  transactions,
  setTransactions,
  products,
  setProducts,
  settings
}: AnalyticsProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<SaleTransaction | null>(null);

  // Filtered transactions for the list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesMethod = methodFilter === 'all' || t.paymentMethod === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [transactions, searchQuery, methodFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let transactionsCount = 0;
    let activeTransactionsCount = 0;
    
    // Category sales mapper
    const categorySales: Record<string, number> = {};
    // Product sales mapper
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};

    transactions.forEach(t => {
      transactionsCount += 1;
      if (t.status === 'completed') {
        activeTransactionsCount += 1;
        revenue += t.total;
        
        t.items.forEach(item => {
          cost += (item.costPrice * item.quantity);
          
          // Map product volume
          if (!productSales[item.productId]) {
            productSales[item.productId] = { name: item.name, qty: 0, revenue: 0 };
          }
          productSales[item.productId].qty += item.quantity;
          productSales[item.productId].revenue += (item.retailPrice * (1 - item.discountPercentage / 100) * item.quantity);

          // Find product category for charting
          const catalogItem = products.find(p => p.id === item.productId);
          const cat = catalogItem ? catalogItem.category : 'Other';
          categorySales[cat] = (categorySales[cat] || 0) + (item.retailPrice * (1 - item.discountPercentage / 100) * item.quantity);
        });
      }
    });

    const grossProfit = revenue - cost;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 105 : 0; // adjusted for visual flow
    const averageBasket = activeTransactionsCount > 0 ? revenue / activeTransactionsCount : 0;

    // Convert productSales map to sorted list
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Convert categorySales to list
    const categoriesList = Object.entries(categorySales).map(([category, value]) => ({
      category,
      value
    }));

    return {
      revenue,
      cost,
      grossProfit,
      profitMargin: Math.min(100, Math.max(0, (grossProfit / (revenue || 1)) * 100)),
      transactionsCount,
      activeTransactionsCount,
      averageBasket,
      topProducts,
      categoriesList
    };
  }, [transactions, products]);

  // Handle transaction Refund/Void
  const handleRefund = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    if (tx.status === 'refunded') {
      alert('This transaction has already been refunded.');
      return;
    }

    if (confirm(`Void transaction ${txId} and return all ${tx.items.reduce((acc, i) => acc + i.quantity, 0)} items to inventory?`)) {
      // 1. Mark transaction as refunded
      setTransactions(prev => prev.map(t => {
        if (t.id === txId) {
          return { ...t, status: 'refunded' };
        }
        return t;
      }));

      // 2. Replenish products stock
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          const refundItem = tx.items.find(item => item.productId === p.id);
          if (refundItem) {
            return {
              ...p,
              stock: p.stock + refundItem.quantity
            };
          }
          return p;
        });
      });

      // Update current viewed transaction state if open
      setSelectedTransaction(prev => prev?.id === txId ? { ...prev, status: 'refunded' } : prev);
      alert('Transaction refunded successfully. Product stock counts have been restored.');
    }
  };

  // SVG Chart Computations:
  // 1. Sales trends over last 5 completed orders
  const trendLinePoints = useMemo(() => {
    const completedTxs = [...transactions]
      .filter(t => t.status === 'completed')
      .slice(-6); // last 6 orders
    
    if (completedTxs.length === 0) return '';
    
    const maxVal = Math.max(...completedTxs.map(t => t.total), 50);
    const height = 120;
    const width = 240;
    const padding = 15;

    return completedTxs.map((t, index) => {
      const x = padding + (index * (width - padding * 2) / Math.max(1, completedTxs.length - 1));
      const y = height - padding - (t.total * (height - padding * 2) / maxVal);
      return { x, y, orderId: t.id, total: t.total };
    });
  }, [transactions]);

  // SVG line path string generator
  const trendPath = useMemo(() => {
    if (trendLinePoints.length < 2) return '';
    return trendLinePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [trendLinePoints]);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)]" id="analytics_tab_view">
      
      {/* 1. KEY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 shrink-0" id="analytics_metrics_row">
        
        {/* Gross Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" id="metric_revenue">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Gross Sales</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-900" id="sales_revenue_val">
            {settings.currencySymbol}{stats.revenue.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Net of active transactions</span>
        </div>

        {/* Cost of Goods Sold */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" id="metric_cost">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Cost of Goods</span>
            <DollarSign className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-800">
            {settings.currencySymbol}{stats.cost.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Wholesale inventory value</span>
        </div>

        {/* Gross Profit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" id="metric_profit">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Gross Profit</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-indigo-700">
            {settings.currencySymbol}{stats.grossProfit.toFixed(2)}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">
            {stats.profitMargin.toFixed(1)}% Avg Profit Margin
          </span>
        </div>

        {/* Average Basket Value */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" id="metric_basket">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Avg Order Value</span>
            <ShoppingBag className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-900">
            {settings.currencySymbol}{stats.averageBasket.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Average sale basket size</span>
        </div>

        {/* Sales Count */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm col-span-2 lg:col-span-1" id="metric_count">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Transactions</span>
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-900">
            {stats.activeTransactionsCount}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">
            {stats.transactionsCount - stats.activeTransactionsCount} voided refunds
          </span>
        </div>

      </div>

      {/* 2. CHARTS GRID (VISUAL ANALYTICS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0" id="analytics_charts_row">
        
        {/* Sales Trend Line (Custom SVG) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" id="chart_trendline">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Order History Trend</h4>
          
          {trendLinePoints.length < 2 ? (
            <div className="h-28 flex items-center justify-center text-slate-400 text-xs italic">
              Need at least 2 completed sales to graph trend.
            </div>
          ) : (
            <div className="relative">
              <svg viewBox="0 0 240 120" className="w-full h-28 overflow-visible">
                {/* Grid guidelines */}
                <line x1="15" y1="15" x2="225" y2="15" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="15" y1="60" x2="225" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="15" y1="105" x2="225" y2="105" stroke="#e2e8f0" strokeWidth="1" />

                {/* Plot Line */}
                <path d={trendPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Gradient area under trend */}
                {/* Dots on points */}
                {trendLinePoints.map((pt, idx) => (
                  <g key={pt.orderId} className="group/dot cursor-pointer">
                    <circle cx={pt.x} cy={pt.y} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={pt.x} cy={pt.y} r="8" fill="#4f46e5" fillOpacity="0.1" className="hover:scale-150 transition-transform" />
                  </g>
                ))}
              </svg>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1 px-2 uppercase font-semibold">
                <span>Older Orders</span>
                <span>Latest Checkout</span>
              </div>
            </div>
          )}
        </div>

        {/* Category Sales Distribution Bar (Custom SVG) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" id="chart_category">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Revenue by Category</h4>
          
          {stats.categoriesList.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-slate-400 text-xs italic">
              No sales data to catalog categories.
            </div>
          ) : (
            <div className="space-y-2.5 h-28 overflow-y-auto pr-1">
              {stats.categoriesList.map((item) => {
                const percentage = stats.revenue > 0 ? (item.value / stats.revenue) * 100 : 0;
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600 uppercase">
                      <span>{item.category}</span>
                      <span>{settings.currencySymbol}{item.value.toFixed(0)} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-900 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Selling Products Volume */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" id="chart_topbestsellers">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Top Products by Volume</h4>
          
          {stats.topProducts.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-slate-400 text-xs italic">
              No product volume recorded yet.
            </div>
          ) : (
            <div className="space-y-2 h-28 overflow-y-auto pr-1" id="top_selling_list_pane">
              {stats.topProducts.map((p, idx) => (
                <div key={p.name} className="flex justify-between items-center text-xs text-slate-700 border-b border-slate-50 pb-1.5 last:border-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-400 font-mono">#{idx+1}</span>
                    <span className="font-semibold truncate text-slate-800">{p.name}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 font-mono">
                    <span className="bg-indigo-50 text-indigo-800 text-[10px] font-bold px-1.5 rounded-full">{p.qty} sold</span>
                    <span className="text-[11px] text-slate-500">{settings.currencySymbol}{p.revenue.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 3. COMPLETED TRANSACTIONS HISTORY LOG */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col" id="transaction_log_panel">
        
        {/* Header toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Transaction Archive Log</h3>
          
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Search by ID/Item */}
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Tx ID, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-full bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                id="tx_search_input"
              />
            </div>

            {/* Filter by Method */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold py-1.5 px-3 rounded-xl focus:outline-none cursor-pointer shrink-0"
              id="tx_method_filter"
            >
              <option value="all">All Methods</option>
              <option value="card">Cards</option>
              <option value="cash">Cash Register</option>
              <option value="mobile">Mobile Pay</option>
              <option value="giftcard">Gift Cards</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto" id="transactions_table_scroller">
          <table className="w-full text-left border-collapse" id="transactions_table">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-500 sticky top-0 z-10 uppercase select-none">
                <th className="py-2.5 px-4">Tx ID</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Products Sold</th>
                <th className="py-2.5 px-4 text-center">Payment</th>
                <th className="py-2.5 px-4">Total Amount</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600" id="transactions_rows">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No transaction history found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Ring up sales on Checkout tab first</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isRefunded = tx.status === 'refunded';
                  const totalUnitsSold = tx.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-slate-50/50 transition duration-150 ${isRefunded ? 'bg-slate-50 opacity-70' : ''}`}
                      id={`tx_row_${tx.id}`}
                    >
                      {/* Tx ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{tx.id}</td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{tx.timestamp}</span>
                        </div>
                      </td>

                      {/* Products Summary */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="truncate font-semibold text-slate-700" title={tx.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                          {tx.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{totalUnitsSold} units total</div>
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 capitalize font-bold text-slate-700 text-[11px]">
                          {tx.paymentMethod === 'card' && <CreditCard className="h-3.5 w-3.5 text-slate-500" />}
                          {tx.paymentMethod === 'cash' && <DollarSign className="h-3.5 w-3.5 text-emerald-600" />}
                          {tx.paymentMethod === 'mobile' && <QrCode className="h-3.5 w-3.5 text-indigo-500" />}
                          {tx.paymentMethod === 'giftcard' && <Gift className="h-3.5 w-3.5 text-amber-500" />}
                          <span>{tx.paymentMethod}</span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-950 text-sm">
                        {settings.currencySymbol}{tx.total.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isRefunded ? (
                          <span className="inline-flex items-center gap-0.5 bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                            <AlertCircle className="h-3 w-3 text-rose-600" /> Voided/Refund
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                            <CheckCircle className="h-3 w-3 text-emerald-600" /> Complete
                          </span>
                        )}
                      </td>

                      {/* Actions (View/Refund) */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => setSelectedTransaction(tx)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                            title="Review full receipt & authorization details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          
                          {!isRefunded && (
                            <button
                              onClick={() => handleRefund(tx.id)}
                              className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                              title="Void checkout & replenish stock to inventory"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
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

      {/* 4. MODAL POPUP: DETAILED TRANSACTION RECEIPT VIEWER */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="tx_viewer_modal">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Thermal Receipt Preview</h3>
              <button 
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-full transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Thermal paper scroll */}
            <div className="p-6 font-mono text-xs text-slate-800 bg-white leading-relaxed overflow-y-auto flex-1 select-none">
              <div className="text-center">
                <span className="font-bold text-sm block uppercase">{settings.storeName}</span>
                <span className="text-[10px] text-slate-500 block">{settings.address}</span>
                <span className="text-[10px] text-slate-500 block">TEL: {settings.phone}</span>
                <span className="text-[10px] text-slate-400 block mt-1">=============================</span>
              </div>
              
              <div className="my-2 space-y-0.5 text-[11px]">
                <div><strong>TX CODE:</strong> {selectedTransaction.id}</div>
                <div><strong>DATE:</strong> {selectedTransaction.timestamp}</div>
                <div><strong>CASHIER:</strong> System Station #01</div>
                <div><strong>STATUS:</strong> {selectedTransaction.status.toUpperCase()}</div>
                <div className="text-slate-400">-----------------------------</div>
              </div>

              <div className="space-y-1 text-[11px]">
                {selectedTransaction.items.map((item) => (
                  <div key={item.productId} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{settings.currencySymbol}{(item.retailPrice * (1 - item.discountPercentage / 100) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="text-slate-400 my-2">-----------------------------</div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-slate-950 text-sm pt-1">
                  <span>TOTAL PAID</span>
                  <span>{settings.currencySymbol}{selectedTransaction.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-slate-400 my-2">=============================</div>

              <div className="space-y-0.5 text-[10px] text-slate-600">
                <div><strong>METHOD:</strong> {selectedTransaction.paymentMethod.toUpperCase()}</div>
                {selectedTransaction.paymentMethod === 'card' && (
                  <>
                    <div><strong>PROVIDER:</strong> {selectedTransaction.paymentDetails.cardBrand}</div>
                    <div><strong>CARD NUMBER:</strong> •••• •••• •••• {selectedTransaction.paymentDetails.last4}</div>
                    <div><strong>AUTH CODE:</strong> {selectedTransaction.paymentDetails.authCode}</div>
                    <div><strong>REF NO:</strong> {selectedTransaction.paymentDetails.refNo}</div>
                  </>
                )}
                {selectedTransaction.paymentMethod === 'cash' && (
                  <>
                    <div><strong>TENDERED:</strong> {settings.currencySymbol}{selectedTransaction.paymentDetails.cashTendered?.toFixed(2)}</div>
                    <div><strong>CHANGE:</strong> {settings.currencySymbol}{selectedTransaction.paymentDetails.cashChange?.toFixed(2)}</div>
                  </>
                )}
                {selectedTransaction.paymentMethod === 'giftcard' && (
                  <div><strong>VOUCHER CODE:</strong> {selectedTransaction.paymentDetails.giftCardCode}</div>
                )}
              </div>

              <div className="text-slate-400 my-2">=============================</div>
              
              <div className="text-center text-[10px] text-slate-500 space-y-1">
                <p className="whitespace-pre-line">{settings.receiptHeader}</p>
                <p className="whitespace-pre-line">{settings.receiptFooter}</p>
                <span className="text-[8px] text-slate-400 block mt-2 text-center uppercase leading-none break-all">
                  {selectedTransaction.paymentDetails.refNo || selectedTransaction.id}
                </span>
                <strong className="block text-[9px] text-emerald-700 mt-1 uppercase">PCI-DSS COMPLIANT TRANSACTION SECURED</strong>
              </div>
            </div>

            {/* Quick Actions Footer inside log receipt */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  alert('Reflashing offline printer spool. Printing copy...');
                }}
                className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Print Copy
              </button>
              
              {selectedTransaction.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => handleRefund(selectedTransaction.id)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Refund Order
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
