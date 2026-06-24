/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, StoreSettings } from './types';

export const CATEGORIES = [
  'All',
  'Apparel',
  'Homeware',
  'Stationery',
  'Specialty Food'
];

export const PRODUCT_ICON_MAP: Record<string, string> = {
  Shirt: 'Shirt',
  ShoppingBag: 'ShoppingBag',
  Coffee: 'Coffee',
  Book: 'Book',
  Pen: 'Pen',
  Home: 'Home',
  Compass: 'Compass',
  Gift: 'Gift',
  Sparkles: 'Sparkles',
  Tag: 'Tag',
  Utensils: 'Utensils',
  Package: 'Package'
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Classic Linen Apron',
    sku: '880192031122',
    category: 'Homeware',
    costPrice: 18.00,
    retailPrice: 42.00,
    stock: 24,
    lowStockLevel: 5,
    iconName: 'Shirt'
  },
  {
    id: 'p2',
    name: 'Ceramic Coffee Mug',
    sku: '440291038221',
    category: 'Homeware',
    costPrice: 4.50,
    retailPrice: 16.00,
    stock: 48,
    lowStockLevel: 10,
    iconName: 'Coffee'
  },
  {
    id: 'p3',
    name: 'Leather Bullet Journal',
    sku: '110293819203',
    category: 'Stationery',
    costPrice: 9.00,
    retailPrice: 28.00,
    stock: 15,
    lowStockLevel: 4,
    iconName: 'Book'
  },
  {
    id: 'p4',
    name: 'Minimalist Brass Pen',
    sku: '330491028392',
    category: 'Stationery',
    costPrice: 12.50,
    retailPrice: 35.00,
    stock: 3,
    lowStockLevel: 5, // Will trigger a low stock alert
    iconName: 'Pen'
  },
  {
    id: 'p5',
    name: 'Organic Espresso Beans (12oz)',
    sku: '990283716293',
    category: 'Specialty Food',
    costPrice: 6.20,
    retailPrice: 18.50,
    stock: 32,
    lowStockLevel: 8,
    iconName: 'Coffee'
  },
  {
    id: 'p6',
    name: 'Soy Scented Candle',
    sku: '770291827364',
    category: 'Homeware',
    costPrice: 5.00,
    retailPrice: 22.00,
    stock: 0, // Will show as out of stock
    lowStockLevel: 5,
    iconName: 'Sparkles'
  },
  {
    id: 'p7',
    name: 'Canvas Tote Bag',
    sku: '550293817291',
    category: 'Apparel',
    costPrice: 3.50,
    retailPrice: 15.00,
    stock: 60,
    lowStockLevel: 12,
    iconName: 'ShoppingBag'
  },
  {
    id: 'p8',
    name: 'Artisan Dark Chocolate Bar',
    sku: '660192837482',
    category: 'Specialty Food',
    costPrice: 2.10,
    retailPrice: 7.50,
    stock: 40,
    lowStockLevel: 10,
    iconName: 'Gift'
  }
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Merchant & Co.',
  address: '102 Pine Street, Suite A, Seattle, WA 98101',
  phone: '(206) 555-0142',
  taxRate: 8.8, // 8.8%
  currencySymbol: '$',
  receiptHeader: 'THANK YOU FOR SHOPPING SMALL!',
  receiptFooter: 'Exchange or store credit within 30 days with receipt.\nFollow us on Instagram @merchant_co'
};
