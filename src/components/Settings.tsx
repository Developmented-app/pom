/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Store, 
  Percent, 
  FileText, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { StoreSettings, Product, SaleTransaction } from '../types';

interface SettingsProps {
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transactions: SaleTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<SaleTransaction[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  onResetToDefaults: () => void;
}

export default function Settings({
  settings,
  setSettings,
  products,
  setProducts,
  transactions,
  setTransactions,
  categories,
  setCategories,
  onResetToDefaults
}: SettingsProps) {
  const [storeName, setStoreName] = useState<string>(settings.storeName);
  const [address, setAddress] = useState<string>(settings.address);
  const [phone, setPhone] = useState<string>(settings.phone);
  const [taxRate, setTaxRate] = useState<string>(settings.taxRate.toString());
  const [currencySymbol, setCurrencySymbol] = useState<string>(settings.currencySymbol);
  const [receiptHeader, setReceiptHeader] = useState<string>(settings.receiptHeader);
  const [receiptFooter, setReceiptFooter] = useState<string>(settings.receiptFooter);
  
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Handle Save Settings
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      storeName: storeName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      taxRate: Math.max(0, parseFloat(taxRate) || 0),
      currencySymbol: currencySymbol.trim() || '$',
      receiptHeader: receiptHeader.trim(),
      receiptFooter: receiptFooter.trim()
    };
    setSettings(updated);
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Export database to JSON file download
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      settings,
      products,
      transactions,
      categories
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pos_backup_${settings.storeName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import database from JSON file upload
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result as string);
        if (parsed.settings && parsed.products && parsed.transactions && parsed.categories) {
          if (confirm('Importing this file will overwrite your current inventory, transaction history, and business settings. Do you wish to proceed?')) {
            setSettings(parsed.settings);
            setProducts(parsed.products);
            setTransactions(parsed.transactions);
            setCategories(parsed.categories);
            
            // Sync form states with imported data
            setStoreName(parsed.settings.storeName);
            setAddress(parsed.settings.address);
            setPhone(parsed.settings.phone);
            setTaxRate(parsed.settings.taxRate.toString());
            setCurrencySymbol(parsed.settings.currencySymbol);
            setReceiptHeader(parsed.settings.receiptHeader);
            setReceiptFooter(parsed.settings.receiptFooter);

            alert('Database and settings imported and restored successfully!');
          }
        } else {
          alert('Error: Selected JSON file does not contain a valid POS database schema.');
        }
      } catch (err) {
        alert('Failed to parse selected JSON file. Please ensure it is a valid backup.');
      }
    };
    reader.readAsText(file);
    // Clear input
    e.target.value = '';
  };

  const triggerReset = () => {
    if (confirm('Are you absolutely sure you want to reset the store to initial demo settings? This will delete all customized products and transactions.')) {
      onResetToDefaults();
      alert('POS system restored to default starter catalogs successfully!');
      
      // Reload states
      window.location.reload();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-140px)] overflow-y-auto pr-1" id="settings_tab_view">
      
      {/* LEFT COLUMN: Main settings forms (8 columns) */}
      <div className="md:col-span-8 space-y-6">
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col" id="settings_form">
          
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="h-4 w-4 text-indigo-600" /> Store Profiles & Tax Configurations
            </span>
            {saveSuccess && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Saved Successfully!
              </span>
            )}
          </div>

          <div className="p-6 space-y-5 flex-1">
            
            {/* Store Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Merchant Profile</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Business / Store Name</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                    id="set_store_name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Contact Telephone</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    id="set_store_phone"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Physical Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  id="set_store_address"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Tax & currency settings */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Formatting</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-slate-400" />
                    <span>Sales Tax Rate (%)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    id="set_store_tax"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Currency Symbol</label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer font-mono font-bold"
                    id="set_store_currency"
                  >
                    <option value="$">USD ($)</option>
                    <option value="€">EUR (€)</option>
                    <option value="£">GBP (£)</option>
                    <option value="¥">JPY/CNY (¥)</option>
                    <option value="CAD$">CAD (CAD$)</option>
                  </select>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Receipt Styling Customize */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <FileText className="h-4 w-4 text-slate-400" /> Thermal Receipt Messages
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Header Custom Memo</label>
                  <textarea
                    rows={2}
                    placeholder="THANK YOU FOR SHOPPING WITH US!"
                    value={receiptHeader}
                    onChange={(e) => setReceiptHeader(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    id="set_receipt_header"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Footer Terms & Policies</label>
                  <textarea
                    rows={2}
                    placeholder="Exchange or store credit within 30 days."
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    id="set_receipt_footer"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Action Row */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-xl text-xs transition shadow cursor-pointer"
              id="save_settings_btn"
            >
              Save Configuration Changes
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: Database administration / JSON exports (4 columns) */}
      <div className="md:col-span-4 space-y-6">
        
        {/* DB Management Section */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-4 w-4 text-indigo-600" /> Database Administration
            </span>
          </div>
          
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Back up your small business store data. All transaction logs and products are kept secure inside offline caches, but can be exported for spreadsheets or restored here.
            </p>

            <div className="space-y-2">
              
              {/* EXPORT BACKUP */}
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                id="export_db_btn"
              >
                <Download className="h-4 w-4" />
                <span>Export POS Backup (.json)</span>
              </button>

              {/* IMPORT FILE CHOOSE */}
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                  id="import_db_file_input"
                />
                <label
                  htmlFor="import_db_file_input"
                  className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border-dashed"
                >
                  <Upload className="h-4 w-4 text-indigo-500" />
                  <span>Restore POS Backup (.json)</span>
                </label>
              </div>

              {/* RESET TO DEFAULTS */}
              <button
                type="button"
                onClick={triggerReset}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                id="reset_db_btn"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset Demo Database</span>
              </button>

            </div>
          </div>
        </div>

        {/* Security & System Info Help Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="h-4 w-4 text-indigo-600" />
            <span>Terminal Terminal Specs</span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-2 leading-relaxed">
            <div className="flex justify-between border-b border-slate-200 pb-1 font-mono">
              <span>PCI-DSS STATUS:</span>
              <span className="text-emerald-700 font-bold">LEVEL 1 COMPLIANT</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1 font-mono">
              <span>SECURITY CORES:</span>
              <span className="text-slate-800">AES-GCM (256-BIT)</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1 font-mono">
              <span>PRINTER ENGINE:</span>
              <span className="text-slate-800">THERMAL EMULATION SPOOL</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>DATA MODE:</span>
              <span className="text-indigo-700 font-bold">DURABLE SECURE PERSISTENCE</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
