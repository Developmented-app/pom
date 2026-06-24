/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  SlidersHorizontal, 
  Clock, 
  User, 
  ShieldCheck,
  Building,
  Battery,
  BatteryCharging,
  Leaf,
  History,
  Plug
} from 'lucide-react';
import { Product, CartItem, SaleTransaction, StoreSettings } from './types';
import { DEFAULT_PRODUCTS, DEFAULT_SETTINGS, CATEGORIES } from './constants';
import Checkout from './components/Checkout';
import PaymentModal from './components/PaymentModal';
import Inventory from './components/Inventory';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

interface PowerEvent {
  id: string;
  timestamp: string;
  eventType: 'plugged' | 'unplugged' | 'level_change';
  batteryLevel: number;
}

export default function App() {
  // Navigation Routing Tab
  const [activeTab, setActiveTab] = useState<'checkout' | 'inventory' | 'analytics' | 'settings'>('checkout');

  // Business state synchronizations (Durable Local Storage Engine)
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('pos_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pos_products');
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('pos_categories');
    return saved ? JSON.parse(saved) : CATEGORIES;
  });

  const [transactions, setTransactions] = useState<SaleTransaction[]>(() => {
    const saved = localStorage.getItem('pos_transactions');
    if (saved) return JSON.parse(saved);
    
    // Default mock transaction database to enrich analytics automatically out-of-the-box!
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const mockSeed: SaleTransaction[] = [
      {
        id: 'TX-90241',
        timestamp: `${yesterday.toLocaleDateString()} 10:14 AM`,
        items: [
          { productId: 'p2', name: 'Ceramic Coffee Mug', quantity: 2, costPrice: 4.50, retailPrice: 16.00, discountPercentage: 0 },
          { productId: 'p7', name: 'Canvas Tote Bag', quantity: 1, costPrice: 3.50, retailPrice: 15.00, discountPercentage: 0 }
        ],
        subtotal: 47.00,
        discountTotal: 0,
        taxTotal: 4.14,
        total: 51.14,
        paymentMethod: 'card',
        paymentDetails: { cardBrand: 'Visa Credit', last4: '8812', authCode: '402193', refNo: 'REF-302910382' },
        status: 'completed'
      },
      {
        id: 'TX-90242',
        timestamp: `${yesterday.toLocaleDateString()} 02:45 PM`,
        items: [
          { productId: 'p3', name: 'Leather Bullet Journal', quantity: 1, costPrice: 9.00, retailPrice: 28.00, discountPercentage: 10 }
        ],
        subtotal: 25.20,
        discountTotal: 2.80,
        taxTotal: 2.22,
        total: 27.42,
        paymentMethod: 'card',
        paymentDetails: { cardBrand: 'Mastercard', last4: '1029', authCode: '904128', refNo: 'REF-550291029' },
        status: 'completed'
      },
      {
        id: 'TX-90243',
        timestamp: `${today.toLocaleDateString()} 09:30 AM`,
        items: [
          { productId: 'p5', name: 'Organic Espresso Beans (12oz)', quantity: 2, costPrice: 6.20, retailPrice: 18.50, discountPercentage: 0 },
          { productId: 'p1', name: 'Classic Linen Apron', quantity: 1, costPrice: 18.00, retailPrice: 42.00, discountPercentage: 0 }
        ],
        subtotal: 79.00,
        discountTotal: 0,
        taxTotal: 6.95,
        total: 85.95,
        paymentMethod: 'cash',
        paymentDetails: { cashTendered: 100.00, cashChange: 14.05 },
        status: 'completed'
      },
      {
        id: 'TX-90244',
        timestamp: `${today.toLocaleDateString()} 12:15 PM`,
        items: [
          { productId: 'p8', name: 'Artisan Dark Chocolate Bar', quantity: 4, costPrice: 2.10, retailPrice: 7.50, discountPercentage: 0 }
        ],
        subtotal: 30.00,
        discountTotal: 0,
        taxTotal: 2.64,
        total: 32.64,
        paymentMethod: 'mobile',
        paymentDetails: { mobileProvider: 'Apple Pay Gateway' },
        status: 'completed'
      }
    ];
    return mockSeed;
  });

  // Active register state (un-suspended)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [suspendedCarts, setSuspendedCarts] = useState<{ id: string; timestamp: string; items: CartItem[]; total: number }[]>([]);

  // Payment triggers
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);

  // Time stamp state for Live Clock
  const [liveTime, setLiveTime] = useState<string>('');

  // Simulated Battery state (mimics POS tablet hardware)
  const [batteryLevel, setBatteryLevel] = useState<number>(98);
  const [isCharging, setIsCharging] = useState<boolean>(true);
  const [isPowerSavingMode, setIsPowerSavingMode] = useState<boolean>(false);

  // Power Event log state
  const [powerEvents, setPowerEvents] = useState<PowerEvent[]>(() => {
    const saved = localStorage.getItem('pos_power_events');
    return saved ? JSON.parse(saved) : [
      {
        id: 'init',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        eventType: 'plugged',
        batteryLevel: 98
      }
    ];
  });
  const [showPowerHistory, setShowPowerHistory] = useState<boolean>(false);

  // Ref to track charging transitions
  const prevChargingRef = React.useRef(isCharging);

  // Sync power event log with localStorage
  useEffect(() => {
    localStorage.setItem('pos_power_events', JSON.stringify(powerEvents));
  }, [powerEvents]);

  // Handle power transition and level change logging
  useEffect(() => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (prevChargingRef.current !== isCharging) {
      const newEvent: PowerEvent = {
        id: `evt-${Math.random().toString(36).substring(2, 9)}`,
        timestamp,
        eventType: isCharging ? 'plugged' : 'unplugged',
        batteryLevel
      };
      setPowerEvents(prev => [newEvent, ...prev].slice(0, 15));
      prevChargingRef.current = isCharging;
    } else {
      // Log battery level changes as well
      setPowerEvents(prev => {
        const lastEvent = prev[0];
        if (lastEvent && lastEvent.batteryLevel !== batteryLevel) {
          const newEvent: PowerEvent = {
            id: `evt-${Math.random().toString(36).substring(2, 9)}`,
            timestamp,
            eventType: 'level_change',
            batteryLevel
          };
          return [newEvent, ...prev].slice(0, 15);
        }
        return prev;
      });
    }
  }, [isCharging, batteryLevel]);

  // Estimate time remaining based on the current mode and battery level
  const estimatedTimeRemaining = useMemo(() => {
    if (isCharging) return null;
    // Standard Mode: 1% discharge takes 6 minutes (gives ~10 hrs full charge)
    // Power Saving Mode: 1% discharge takes 10 minutes (gives ~16.6 hrs full charge)
    const minutesPerPercent = isPowerSavingMode ? 10 : 6;
    const totalMinutes = batteryLevel * minutesPerPercent;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  }, [batteryLevel, isCharging, isPowerSavingMode]);

  // Simulated battery state simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setBatteryLevel(prev => {
        if (isCharging) {
          if (prev >= 100) return 100;
          return prev + 1;
        } else {
          if (prev <= 1) return 1;
          return prev - 1;
        }
      });
    }, isPowerSavingMode ? 30000 : 15000); // 30 seconds when power saving, 15 seconds otherwise
    return () => clearInterval(interval);
  }, [isCharging, isPowerSavingMode]);

  // Automatically trigger Power Saving Mode at 20% or lower
  useEffect(() => {
    if (batteryLevel <= 20) {
      setIsPowerSavingMode(true);
    }
  }, [batteryLevel]);

  // Clock Update Effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    // Reduce update frequency to 10 seconds if power saving is active, otherwise update every second
    const interval = setInterval(updateTime, isPowerSavingMode ? 10000 : 1000);
    return () => clearInterval(interval);
  }, [isPowerSavingMode]);

  // Sync state with LocalStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pos_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pos_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pos_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Handle sales checkout confirmation
  const handleCompleteSale = (
    paymentMethod: 'card' | 'cash' | 'mobile' | 'giftcard',
    paymentDetails: any,
    totals: { subtotal: number; discountTotal: number; taxTotal: number; total: number }
  ) => {
    // 1. Deduct stock quantities from products list in real-time
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const cartItem = cart.find(item => item.product.id === p.id);
        if (cartItem) {
          return {
            ...p,
            stock: Math.max(0, p.stock - cartItem.quantity)
          };
        }
        return p;
      });
    });

    // 2. Record Completed Transaction log
    const newTx: SaleTransaction = {
      id: paymentDetails.id,
      timestamp: paymentDetails.timestamp,
      items: paymentDetails.items,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      paymentMethod,
      paymentDetails: {
        cardBrand: paymentDetails.brand,
        last4: paymentDetails.last4,
        authCode: paymentDetails.authCode,
        refNo: paymentDetails.refNo,
        cashTendered: paymentDetails.cashTendered,
        cashChange: paymentDetails.cashChange,
        mobileProvider: paymentDetails.mobileProvider,
        giftCardCode: paymentDetails.giftCode
      },
      status: 'completed'
    };

    setTransactions(prev => [newTx, ...prev]);

    // 3. Reset Active register Cart state
    setCart([]);
    setIsPaymentOpen(false);
  };

  // Reset database completely to factory initial setup
  const handleResetToDefaults = () => {
    localStorage.removeItem('pos_settings');
    localStorage.removeItem('pos_products');
    localStorage.removeItem('pos_categories');
    localStorage.removeItem('pos_transactions');
    
    setSettings(DEFAULT_SETTINGS);
    setProducts(DEFAULT_PRODUCTS);
    setCategories(CATEGORIES);
    setTransactions([]);
    setCart([]);
    setSuspendedCarts([]);
  };

  // Check out alerts for top bar navigation
  const lowStockNotificationCount = useMemo(() => {
    return products.filter(p => p.stock > 0 && p.stock <= p.lowStockLevel).length;
  }, [products]);

  const outOfStockNotificationCount = useMemo(() => {
    return products.filter(p => p.stock === 0).length;
  }, [products]);

  return (
    <div className={`min-h-screen ${isPowerSavingMode ? 'bg-slate-200/90 brightness-[0.93]' : 'bg-slate-100'} transition-all duration-500 ease-in-out flex flex-col font-sans`} id="pos_app_container">
      
      {/* APP TOP NAVIGATION HEADER */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md flex flex-col md:flex-row justify-between items-center shrink-0 border-b border-slate-800" id="pos_header">
        
        {/* Left Side: Store profile info */}
        <div className="flex items-center gap-3.5 mb-3 md:mb-0" id="header_store_profile">
          <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 shadow-inner">
            <Building className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-none tracking-wide text-white uppercase">{settings.storeName}</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 uppercase bg-emerald-900/40 px-1.5 py-0.5 rounded-md">
                <ShieldCheck className="h-3 w-3" /> PCI secured
              </span>
              <span className="text-[10px] text-slate-400">|</span>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <User className="h-3 w-3 text-slate-500" />
                <span>Maisie Clarke</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Tablet-style tab router buttons */}
        <nav className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-3 md:mb-0 select-none" id="header_nav_tabs">
          <button
            onClick={() => setActiveTab('checkout')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
              activeTab === 'checkout'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="tab_nav_checkout"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Register</span>
          </button>
          
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition duration-150 cursor-pointer relative ${
              activeTab === 'inventory'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="tab_nav_inventory"
          >
            <Package className="h-4 w-4" />
            <span>Inventory</span>
            {(lowStockNotificationCount > 0 || outOfStockNotificationCount > 0) && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold font-mono h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-slate-900 shadow-sm">
                {lowStockNotificationCount + outOfStockNotificationCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="tab_nav_analytics"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Reports</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="tab_nav_settings"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Right Side: Live visual clock and Simulated Battery / Power controls */}
        <div className="flex items-center gap-2" id="header_status_group">
          {/* Simulated Tablet Battery & Power control group */}
          <div className="relative flex items-center gap-1.5 bg-slate-800 border border-slate-700 p-1 rounded-xl shadow-inner select-none" id="header_battery_panel_group">
            {/* Battery status & charger plug toggle */}
            <button 
              onClick={() => setIsCharging(prev => !prev)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-700/60 text-slate-200 transition-all text-xs font-mono font-bold focus:outline-none cursor-pointer"
              title={isCharging ? "AC Power Connected (Charging). Click to simulate running on battery." : `Running on battery. Click to simulate plugging in AC charger. Estimated: ${estimatedTimeRemaining} remaining.`}
              id="header_battery_status_btn"
            >
              {/* Custom Animated Battery Icon */}
              <div className="relative w-6 h-3.5 border border-slate-500 rounded-[3px] p-[1px] flex items-center shrink-0" id="custom_battery_container">
                {/* Battery Cap/Tip */}
                <div className="absolute -right-[3px] top-[3px] w-[2px] h-[6px] bg-slate-500 rounded-r-[1px]" id="custom_battery_cap"></div>
                
                {/* Battery Progress Fill */}
                <div 
                  className={`h-full rounded-[1px] transition-all duration-1000 ease-out ${
                    isCharging 
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' 
                      : batteryLevel <= 20 
                        ? 'bg-rose-500' 
                        : isPowerSavingMode 
                          ? 'bg-amber-400' 
                          : 'bg-slate-300'
                  }`}
                  style={{ width: `${isCharging ? 100 : batteryLevel}%` }}
                  id="custom_battery_fill"
                />
                
                {/* Micro Lightning Bolt overlay */}
                {isCharging && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-900 font-extrabold select-none" id="battery_charging_bolt">
                    ⚡
                  </div>
                )}
              </div>

              <span>{batteryLevel}%</span>
              {isCharging ? (
                <span className="text-[9px] text-emerald-400 font-sans font-bold">AC</span>
              ) : (
                <span className={`text-[9px] font-sans font-medium transition-colors ${isPowerSavingMode ? 'text-amber-400/80' : 'text-slate-400'}`}>
                  {estimatedTimeRemaining}
                </span>
              )}
            </button>

            {/* Divider */}
            <span className="w-px h-4.5 bg-slate-700"></span>

            {/* Power Saving Mode Toggle */}
            <button
              onClick={() => setIsPowerSavingMode(prev => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-xs font-bold cursor-pointer focus:outline-none ${
                isPowerSavingMode 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/30'
              }`}
              title={isPowerSavingMode ? "Power Saving Mode is ACTIVE. Click to disable." : "Click to enable Power Saving Mode (reduces clock update rate & dims UI background)."}
              id="header_power_saving_btn"
            >
              <Leaf className={`h-3.5 w-3.5 ${isPowerSavingMode ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="hidden sm:inline text-[10px]">Eco</span>
            </button>

            {/* Divider */}
            <span className="w-px h-4.5 bg-slate-700"></span>

            {/* Power History Toggle */}
            <button
              onClick={() => setShowPowerHistory(prev => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-xs font-bold cursor-pointer focus:outline-none ${
                showPowerHistory 
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/30'
              }`}
              title="View battery power session log history"
              id="header_power_history_btn"
            >
              <History className={`h-3.5 w-3.5 ${showPowerHistory ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline text-[10px]">Log</span>
            </button>

            {/* Power History Event Log Dropdown */}
            {showPowerHistory && (
              <div 
                className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-slate-100"
                id="power_history_popup"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2" id="power_history_header">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <History className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Power Event Log</span>
                  </div>
                  <button 
                    onClick={() => {
                      setPowerEvents([
                        {
                          id: 'init-' + Date.now(),
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                          eventType: isCharging ? 'plugged' : 'unplugged',
                          batteryLevel
                        }
                      ]);
                    }}
                    className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer font-medium bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700"
                    id="clear_power_history_btn"
                  >
                    Clear
                  </button>
                </div>

                {/* Inline SVG Sparkline Chart */}
                {(() => {
                  const chartData = [...powerEvents].reverse();
                  const levels = chartData.map(d => d.batteryLevel);
                  let minVal = Math.min(...levels);
                  let maxVal = Math.max(...levels);
                  if (minVal === maxVal) {
                    minVal = Math.max(0, minVal - 5);
                    maxVal = Math.min(100, maxVal + 5);
                  } else {
                    const pad = (maxVal - minVal) * 0.1 || 1;
                    minVal = Math.max(0, minVal - pad);
                    maxVal = Math.min(100, maxVal + pad);
                  }

                  const width = 224;
                  const height = 44;
                  const padX = 8;
                  const padY = 6;

                  const points = chartData.map((d, i) => {
                    const x = padX + (chartData.length > 1 ? (i / (chartData.length - 1)) * (width - 2 * padX) : 0);
                    const y = height - padY - ((d.batteryLevel - minVal) / (maxVal - minVal)) * (height - 2 * padY);
                    return { x, y, level: d.batteryLevel, eventType: d.eventType, timestamp: d.timestamp };
                  });

                  const pathD = points.length > 0 
                    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
                    : '';

                  const areaD = points.length > 0
                    ? `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
                    : '';

                  return (
                    <div className="bg-slate-950/80 border border-slate-800/60 rounded-lg p-2 mb-2.5 flex flex-col gap-1.5" id="power_sparkline_widget">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono px-0.5" id="sparkline_meta">
                        <span>Trend (Last 15 events)</span>
                        <span className={`${isCharging ? 'text-emerald-400' : 'text-amber-400'} font-semibold`}>
                          {minVal.toFixed(0)}% - {maxVal.toFixed(0)}%
                        </span>
                      </div>
                      <div className="relative h-11 w-full bg-slate-900/40 rounded border border-slate-800/40 p-0.5 flex items-center justify-center overflow-hidden" id="sparkline_canvas_box">
                        {chartData.length < 2 ? (
                          <span className="text-[10px] text-slate-500 font-sans italic">Logging history...</span>
                        ) : (
                          <svg className="w-full h-11 overflow-visible" viewBox={`0 0 ${width} ${height}`} id="sparkline_svg">
                            <defs>
                              <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            {areaD && <path d={areaD} fill="url(#sparklineGrad)" />}
                            {pathD && (
                              <path 
                                d={pathD} 
                                fill="none" 
                                stroke="#818cf8" 
                                strokeWidth="1.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                              />
                            )}
                            {points.map((p, idx) => {
                              const isSpecial = p.eventType === 'plugged' || p.eventType === 'unplugged';
                              return (
                                <circle 
                                  key={idx}
                                  cx={p.x}
                                  cy={p.y}
                                  r={isSpecial ? 3 : 1.5}
                                  className={`transition-all duration-300 ${
                                    isSpecial 
                                      ? p.eventType === 'plugged' 
                                        ? 'fill-emerald-400 stroke-slate-900 stroke-[1px]' 
                                        : 'fill-amber-400 stroke-slate-900 stroke-[1px]'
                                      : 'fill-indigo-400/80'
                                  }`}
                                  title={`${p.level}% - ${p.eventType === 'plugged' ? 'Plugged' : p.eventType === 'unplugged' ? 'Unplugged' : 'Level Changed'} at ${p.timestamp}`}
                                />
                              );
                            })}
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar flex flex-col" id="power_history_list">
                  {powerEvents.length === 0 ? (
                    <span className="text-[10px] text-slate-500 py-4 text-center">No power events logged.</span>
                  ) : (
                    powerEvents.map((evt) => (
                      <div 
                        key={evt.id} 
                        className="flex items-center justify-between text-[11px] p-1.5 rounded bg-slate-950/40 border border-slate-800/60"
                        id={`power_event_${evt.id}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {evt.eventType === 'plugged' ? (
                            <Plug className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : evt.eventType === 'unplugged' ? (
                            <Battery className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          ) : (
                            <Battery className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className={`font-semibold ${
                            evt.eventType === 'plugged' 
                              ? 'text-emerald-400' 
                              : evt.eventType === 'unplugged' 
                                ? 'text-rose-400' 
                                : 'text-slate-300'
                          }`}>
                            {evt.eventType === 'plugged' 
                              ? 'AC Connected' 
                              : evt.eventType === 'unplugged' 
                                ? 'AC Disconnected' 
                                : 'Level Update'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 shrink-0">
                          <span>{evt.batteryLevel}%</span>
                          <span>{evt.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5" id="power_history_footer">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>POS Hardware Logger Active</span>
                </div>
              </div>
            )}
          </div>

          {/* Live visual clock */}
          <div className="flex items-center gap-2 font-mono text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl shadow-inner select-none text-slate-200" id="header_clock_panel">
            <Clock className={`h-4 w-4 ${isPowerSavingMode ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="font-bold">{liveTime || '14:08:35'}</span>
            <span className="text-slate-500 font-sans font-medium text-[10px]">
              {isPowerSavingMode ? 'Eco' : 'Lcl'}
            </span>
          </div>
        </div>

      </header>

      {/* CORE VIEWPORT CANVAS CONTAINER */}
      <main className="flex-1 p-6 overflow-hidden" id="pos_viewport_content">
        
        {/* Tab switcher renderer */}
        {activeTab === 'checkout' && (
          <Checkout
            products={products}
            settings={settings}
            cart={cart}
            setCart={setCart}
            suspendedCarts={suspendedCarts}
            setSuspendedCarts={setSuspendedCarts}
            onProceedToPayment={() => setIsPaymentOpen(true)}
          />
        )}

        {activeTab === 'inventory' && (
          <Inventory
            products={products}
            setProducts={setProducts}
            categories={categories}
            setCategories={setCategories}
            settings={settings}
          />
        )}

        {activeTab === 'analytics' && (
          <Analytics
            transactions={transactions}
            setTransactions={setTransactions}
            products={products}
            setProducts={setProducts}
            settings={settings}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            setSettings={setSettings}
            products={products}
            setProducts={setProducts}
            transactions={transactions}
            setTransactions={setTransactions}
            categories={categories}
            setCategories={setCategories}
            onResetToDefaults={handleResetToDefaults}
          />
        )}

      </main>

      {/* SECURE PAYMENT EMV TERMINAL MODAL POPUP */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        settings={settings}
        cart={cart}
        onCompleteSale={handleCompleteSale}
      />

    </div>
  );
}
