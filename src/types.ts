/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  retailPrice: number;
  stock: number;
  lowStockLevel: number;
  iconName?: string; // Name of Lucide icon to display
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercentage: number; // 0 to 100
}

export interface SaleTransactionItem {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
  retailPrice: number;
  discountPercentage: number;
}

export interface SaleTransaction {
  id: string;
  timestamp: string;
  items: SaleTransactionItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: 'card' | 'cash' | 'mobile' | 'giftcard';
  paymentDetails: {
    cardBrand?: string;
    last4?: string;
    authCode?: string;
    refNo?: string;
    cashTendered?: number;
    cashChange?: number;
    mobileProvider?: string;
    giftCardCode?: string;
  };
  status: 'completed' | 'refunded';
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  taxRate: number; // e.g. 8.25 for 8.25%
  currencySymbol: string; // e.g. "$"
  receiptHeader: string;
  receiptFooter: string;
}
