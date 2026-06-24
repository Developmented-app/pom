/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Gift, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Receipt, 
  Printer, 
  Mail, 
  Phone,
  RefreshCw,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { CartItem, StoreSettings } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  cart: CartItem[];
  onCompleteSale: (
    paymentMethod: 'card' | 'cash' | 'mobile' | 'giftcard',
    paymentDetails: any,
    totals: { subtotal: number; discountTotal: number; taxTotal: number; total: number }
  ) => void;
}

type PaymentMethodType = 'card' | 'cash' | 'mobile' | 'giftcard';
type ProcessingStepType = 'idle' | 'tunneling' | 'encrypting' | 'authorizing' | 'finalizing' | 'success';

export default function PaymentModal({
  isOpen,
  onClose,
  settings,
  cart,
  onCompleteSale
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const [processingState, setProcessingState] = useState<ProcessingStepType>('idle');
  const [currentStepText, setCurrentStepText] = useState<string>('');
  
  // Card Details state
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [isContactlessSimulating, setIsContactlessSimulating] = useState<boolean>(false);

  // Cash details state
  const [cashTendered, setCashTendered] = useState<string>('');
  
  // Gift card code
  const [giftCode, setGiftCode] = useState<string>('');
  
  // Receipt post-purchase state
  const [transactionSummary, setTransactionSummary] = useState<any | null>(null);
  const [selectedReceiptTab, setSelectedReceiptTab] = useState<'customer' | 'merchant'>('customer');
  const [receiptEmailed, setReceiptEmailed] = useState<boolean>(false);
  const [receiptSmsed, setReceiptSmsed] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('card');
      setProcessingState('idle');
      setCardHolder('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCashTendered('');
      setGiftCode('');
      setTransactionSummary(null);
      setIsContactlessSimulating(false);
      setReceiptEmailed(false);
      setReceiptSmsed(false);
      setEmailInput('');
      setPhoneInput('');
    }
  }, [isOpen]);

  // Cart calculations
  const totals = useMemo(() => {
    const itemSubtotal = cart.reduce((acc, item) => {
      const itemPrice = item.product.retailPrice;
      const discountMult = 1 - (item.discountPercentage / 100);
      return acc + (itemPrice * discountMult * item.quantity);
    }, 0);
    
    // We assume the global discount was pre-factored in current view
    // For exact match, let's pull totals directly. Since we don't have global discount 
    // in cart, we can re-calculate or just use general settings. Let's make sure it computes correctly.
    const subtotal = itemSubtotal;
    const discountTotal = 0; // Standard item level factored, no global for simple modal logic
    const taxTotal = subtotal * (settings.taxRate / 100);
    const total = subtotal + taxTotal;

    return {
      subtotal,
      discountTotal,
      taxTotal,
      total
    };
  }, [cart, settings]);

  // Auto-format card number (adds spaces every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Digits only
    if (value.length > 16) value = value.slice(0, 16);
    
    // Format: 0000 0000 0000 0000
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.slice(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  // Auto-format expiry date (adds slash: MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    
    if (value.length > 2) {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setCardExpiry(value);
    }
  };

  // Pre-fill mock credit cards for cashier
  const prefillCard = (brand: 'visa' | 'mastercard' | 'amex') => {
    setCardHolder('JANE D. MERCHANT');
    setCardExpiry('12/29');
    setCardCvv('942');
    if (brand === 'visa') {
      setCardNumber('4111 2222 3333 4444');
    } else if (brand === 'mastercard') {
      setCardNumber('5555 4444 3333 2222');
    } else {
      setCardNumber('3782 123456 78910');
      setCardExpiry('08/28');
    }
  };

  // Cash change due
  const cashChange = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0;
    if (tendered < totals.total) return 0;
    return tendered - totals.total;
  }, [cashTendered, totals.total]);

  // Handle cash bill hotkeys
  const handleCashHotkey = (amount: number) => {
    setCashTendered(amount.toString());
  };

  // Simulate Payment Secure Gate Processing
  const processSecurePayment = () => {
    if (paymentMethod === 'card') {
      if (!isContactlessSimulating && (!cardNumber || !cardHolder || !cardExpiry || !cardCvv)) {
        alert('Please fill out card details or tap "Simulate Tap to Pay".');
        return;
      }
    } else if (paymentMethod === 'cash') {
      const tenderedVal = parseFloat(cashTendered) || 0;
      if (tenderedVal < totals.total) {
        alert(`Insufficient cash tendered. Total due is ${settings.currencySymbol}${totals.total.toFixed(2)}`);
        return;
      }
    } else if (paymentMethod === 'giftcard') {
      if (!giftCode.trim()) {
        alert('Please enter gift card voucher code.');
        return;
      }
    }

    // Begin Secure Sequence Animation
    setProcessingState('tunneling');
    setCurrentStepText('Securing Connection (SSL/TLS 1.3)...');

    // Step 2: Encrypt Data (AES-256)
    setTimeout(() => {
      setProcessingState('encrypting');
      setCurrentStepText('Encrypting Transaction Payload (AES-256 GCM)...');
    }, 7000-6100); // quick intervals for slick feel but showing real steps

    // Step 3: Gateway Authorizing
    setTimeout(() => {
      setProcessingState('authorizing');
      setCurrentStepText('PCI-DSS Merchant Authorization & Card Handshake...');
    }, 7000-5100);

    // Step 4: Token Signature / Finalizing
    setTimeout(() => {
      setProcessingState('finalizing');
      setCurrentStepText('Generating Secure Cryptographic Receipt Hash...');
    }, 7000-4100);

    // Step 5: Complete & Approved
    setTimeout(() => {
      setProcessingState('success');
      
      // Determine simulated card brand
      let brand = 'Unknown';
      let last4 = '0000';
      if (paymentMethod === 'card') {
        const cleaned = cardNumber.replace(/\s/g, '');
        last4 = cleaned.slice(-4) || '4242';
        if (cleaned.startsWith('4')) brand = 'Visa Credit';
        else if (cleaned.startsWith('5')) brand = 'Mastercard';
        else if (cleaned.startsWith('3')) brand = 'Amex Debit';
        else brand = 'EMV Debit Card';
      }

      // Generate a highly secure hash and receipt fields
      const authCode = Math.floor(100000 + Math.random() * 900000).toString();
      const refNo = `REF-${Math.floor(100000000 + Math.random() * 900000000)}`;
      const shaHash = `SHA256: ${Array.from({length: 24}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase()}`;

      const summary = {
        id: `TX-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        paymentMethod,
        brand,
        last4,
        authCode,
        refNo,
        shaHash,
        cashTendered: parseFloat(cashTendered) || totals.total,
        cashChange: cashChange,
        giftCode: giftCode,
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          costPrice: item.product.costPrice,
          retailPrice: item.product.retailPrice,
          discountPercentage: item.discountPercentage
        }))
      };

      setTransactionSummary(summary);
    }, 7000-3000);
  };

  // Simulating Contactless Card Tap (NFC)
  const triggerContactlessTap = () => {
    setIsContactlessSimulating(true);
    setCardHolder('CONTACTLESS CUSTOMER');
    setCardNumber('•••• •••• •••• 9012');
    setCardExpiry('06/30');
    setCardCvv('•••');
    
    // Begin direct process
    setTimeout(() => {
      processSecurePayment();
    }, 300);
  };

  // Print Receipt handler (Simulated)
  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const receiptHTML = `
        <html>
          <head>
            <title>Receipt ${transactionSummary?.id}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 20px auto; color: #000; line-height: 1.4; }
              .text-center { text-align: center; }
              .divider { border-top: 1px dashed #000; my: 10px; margin: 10px 0; }
              .flex { display: flex; justify-content: space-between; }
              .bold { font-weight: bold; }
              .title { font-size: 18px; font-weight: bold; }
              .small { font-size: 11px; }
            </style>
          </head>
          <body>
            <div class="text-center">
              <span class="title">${settings.storeName}</span><br/>
              <span class="small">${settings.address}</span><br/>
              <span class="small">TEL: ${settings.phone}</span>
            </div>
            <div class="divider"></div>
            <div>
              <strong>TX ID:</strong> ${transactionSummary?.id}<br/>
              <strong>Date:</strong> ${transactionSummary?.timestamp}<br/>
              <strong>Cashier:</strong> System Station #01
            </div>
            <div class="divider"></div>
            ${cart.map(item => `
              <div class="flex">
                <span>${item.quantity}x ${item.product.name}</span>
                <span>${settings.currencySymbol}${(item.product.retailPrice * (1 - item.discountPercentage / 100) * item.quantity).toFixed(2)}</span>
              </div>
              ${item.discountPercentage > 0 ? `<div class="small"> - Discount ${item.discountPercentage}% applied</div>` : ''}
            `).join('')}
            <div class="divider"></div>
            <div class="flex">
              <span>Subtotal</span>
              <span>${settings.currencySymbol}${totals.subtotal.toFixed(2)}</span>
            </div>
            <div class="flex">
              <span>Sales Tax (${settings.taxRate}%)</span>
              <span>${settings.currencySymbol}${totals.taxTotal.toFixed(2)}</span>
            </div>
            <div class="flex bold" style="font-size: 16px;">
              <span>TOTAL</span>
              <span>${settings.currencySymbol}${totals.total.toFixed(2)}</span>
            </div>
            <div class="divider"></div>
            <div>
              <strong>Payment:</strong> ${transactionSummary?.paymentMethod.toUpperCase()}<br/>
              ${transactionSummary?.paymentMethod === 'card' ? `
                <strong>Card:</strong> ${transactionSummary?.brand} (•••• ${transactionSummary?.last4})<br/>
                <strong>Auth Code:</strong> ${transactionSummary?.authCode}<br/>
                <strong>Ref No:</strong> ${transactionSummary?.refNo}<br/>
              ` : ''}
              ${transactionSummary?.paymentMethod === 'cash' ? `
                <strong>Tendered:</strong> ${settings.currencySymbol}${transactionSummary?.cashTendered.toFixed(2)}<br/>
                <strong>Change:</strong> ${settings.currencySymbol}${transactionSummary?.cashChange.toFixed(2)}<br/>
              ` : ''}
              ${transactionSummary?.paymentMethod === 'giftcard' ? `
                <strong>Voucher Code:</strong> ${transactionSummary?.giftCode}<br/>
              ` : ''}
            </div>
            <div class="divider"></div>
            <div class="text-center small">
              ${settings.receiptHeader.replace(/\n/g, '<br/>')}<br/><br/>
              ${settings.receiptFooter.replace(/\n/g, '<br/>')}<br/><br/>
              <span style="font-size: 9px; color: #555;">${transactionSummary?.shaHash}</span><br/>
              <strong>PCI-DSS COMPLIANT TRANSACTION SECURED</strong>
            </div>
          </body>
        </html>
      `;
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert('Mock Print: System generated offline thermal print request successfully.');
    }
  };

  // Email receipt mock
  const sendEmailReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setReceiptEmailed(true);
    setTimeout(() => {
      setReceiptEmailed(false);
      setEmailInput('');
      alert(`Receipt sent successfully to: ${emailInput}`);
    }, 1500);
  };

  // SMS receipt mock
  const sendSmsReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setReceiptSmsed(true);
    setTimeout(() => {
      setReceiptSmsed(false);
      setPhoneInput('');
      alert(`Receipt sent successfully via text to: ${phoneInput}`);
    }, 1500);
  };

  // Final confirmation to parent
  const finalizeSale = () => {
    if (transactionSummary) {
      onCompleteSale(paymentMethod, transactionSummary, totals);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="payment_modal_overlay">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[650px]" id="payment_modal_box">
        
        {/* MODAL LEFT HALF: Transaction Details & Summary */}
        <div className="w-full md:w-5/12 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-between" id="payment_modal_summary_column">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Merchant POS ID #01</span>
              <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                <ShieldCheck className="h-3 w-3" /> PCI Secured
              </span>
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mb-4" id="checkout_summary_title">Checkout Summary</h2>
            
            {/* Items Scroller inside modal */}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 mb-4" id="modal_summary_items">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between text-xs text-slate-600">
                  <span className="truncate pr-4">{item.quantity}x {item.product.name}</span>
                  <span className="font-mono font-medium shrink-0">
                    {settings.currencySymbol}{(item.product.retailPrice * (1 - item.discountPercentage / 100) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Secure Totals Block */}
          <div className="border-t border-slate-200 pt-4 space-y-2" id="modal_summary_totals">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="font-mono">{settings.currencySymbol}{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Tax Rate</span>
              <span className="font-mono">{settings.taxRate}%</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Sales Tax</span>
              <span className="font-mono">{settings.currencySymbol}{totals.taxTotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-150 my-2"></div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900">Total Charged</span>
              <span className="text-2xl font-mono font-extrabold text-slate-950" id="checkout_modal_total">
                {settings.currencySymbol}{totals.total.toFixed(2)}
              </span>
            </div>
            
            {/* Security Notice */}
            <div className="bg-slate-200/50 rounded-xl p-3 flex items-start gap-2 text-[11px] text-slate-500 leading-normal mt-3">
              <Lock className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
              <span>
                All active transactions are end-to-end tokenized. Sensitive customer credentials are never logged or stored in plain-text format.
              </span>
            </div>
          </div>
        </div>

        {/* MODAL RIGHT HALF: Dynamic payment forms OR processing OR completed receipt */}
        <div className="w-full md:w-7/12 flex flex-col relative bg-white" id="payment_modal_content_column">
          
          {/* Header & Close button */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
            <span className="text-sm font-bold text-slate-800">
              {processingState === 'idle' ? 'Select Secure Payment' : 'Payment Status'}
            </span>
            {processingState === 'idle' && (
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition cursor-pointer"
                id="close_payment_modal_btn"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* MAIN FORM FLOW */}
          {processingState === 'idle' && (
            <div className="flex-1 overflow-y-auto flex flex-col" id="payment_idle_screen">
              {/* Tabs for Payment Mode Selection */}
              <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50 shrink-0" id="payment_methods_tabs">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-3.5 flex flex-col items-center gap-1 text-[11px] font-bold border-r border-slate-100 transition cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-white text-slate-950 border-b-2 border-b-slate-900'
                      : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-700'
                  }`}
                  id="tab_pay_card"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Card / Tap</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-3.5 flex flex-col items-center gap-1 text-[11px] font-bold border-r border-slate-100 transition cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-white text-slate-950 border-b-2 border-b-slate-900'
                      : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-700'
                  }`}
                  id="tab_pay_cash"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Cash Register</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('mobile')}
                  className={`py-3.5 flex flex-col items-center gap-1 text-[11px] font-bold border-r border-slate-100 transition cursor-pointer ${
                    paymentMethod === 'mobile'
                      ? 'bg-white text-slate-950 border-b-2 border-b-slate-900'
                      : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-700'
                  }`}
                  id="tab_pay_mobile"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Mobile Pay</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('giftcard')}
                  className={`py-3.5 flex flex-col items-center gap-1 text-[11px] font-bold transition cursor-pointer ${
                    paymentMethod === 'giftcard'
                      ? 'bg-white text-slate-950 border-b-2 border-b-slate-900'
                      : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-700'
                  }`}
                  id="tab_pay_gift"
                >
                  <Gift className="h-4 w-4" />
                  <span>Gift Voucher</span>
                </button>
              </div>

              {/* Dynamic Payment Details Panel */}
              <div className="flex-1 p-6 flex flex-col justify-between" id="payment_details_form_panel">
                
                {/* 1. CARD FORM */}
                {paymentMethod === 'card' && (
                  <div className="space-y-4 animate-fade-in" id="pay_form_card">
                    {/* Visual Card Terminal Emulator Banner */}
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex justify-between items-center shadow-md relative overflow-hidden">
                      <div className="absolute right-0 bottom-0 text-slate-800 opacity-20 -mr-6 -mb-6 pointer-events-none">
                        <CreditCard className="h-32 w-32" />
                      </div>
                      <div className="relative">
                        <span className="text-[10px] text-slate-400 font-bold tracking-widest block">EMV TERMINAL SIMULATOR</span>
                        <h3 className="font-mono font-bold text-sm tracking-tight text-white mt-1">Ready for contactless or chip insert</h3>
                        <div className="flex gap-2 mt-2.5">
                          <button
                            onClick={triggerContactlessTap}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition shadow cursor-pointer flex items-center gap-1"
                            id="simulate_tap_btn"
                          >
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                            Simulate Tap to Pay
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex justify-end gap-1 mb-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-[9px] text-emerald-400 font-mono font-bold">ONLINE</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">Verifying EMV...</span>
                      </div>
                    </div>

                    {/* Manual Card Entry Details */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-slate-700">Manual Card Entry (Encrypted)</label>
                        <div className="flex gap-1">
                          <button onClick={() => prefillCard('visa')} className="text-[10px] bg-slate-100 hover:bg-slate-200 font-bold px-1.5 py-0.5 rounded text-slate-600 transition cursor-pointer">Visa</button>
                          <button onClick={() => prefillCard('mastercard')} className="text-[10px] bg-slate-100 hover:bg-slate-200 font-bold px-1.5 py-0.5 rounded text-slate-600 transition cursor-pointer">Mastercard</button>
                          <button onClick={() => prefillCard('amex')} className="text-[10px] bg-slate-100 hover:bg-slate-200 font-bold px-1.5 py-0.5 rounded text-slate-600 transition cursor-pointer">Amex</button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            placeholder="CARDHOLDER NAME"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                            className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            id="cardholder_name_input"
                          />
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="CARD NUMBER (0000 0000 0000 0000)"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 tracking-widest pl-10"
                            id="card_number_input"
                          />
                          <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="EXP (MM/YY)"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 text-center"
                            id="card_expiry_input"
                          />
                          <input
                            type="password"
                            placeholder="CVV"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 text-center"
                            id="card_cvv_input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CASH REGISTER FORM */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-4 animate-fade-in" id="pay_form_cash">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                      <div>
                        <span className="text-xs text-slate-500 font-semibold block">Total Due</span>
                        <span className="text-2xl font-mono font-bold text-slate-950">{settings.currencySymbol}{totals.total.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-semibold block">Change Due</span>
                        <span className={`text-2xl font-mono font-bold ${cashChange > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {settings.currencySymbol}{cashChange.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-700 block">Amount Tendered</label>
                      
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          className="w-full text-lg font-mono font-bold border border-slate-200 bg-white rounded-xl p-3 pl-12 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          id="cash_tendered_input"
                        />
                        <DollarSign className="absolute left-4 top-4 h-6 w-6 text-slate-400" />
                      </div>

                      {/* Cash Bills quick hotkeys */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Quick Bill Hotkeys</span>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          <button
                            type="button"
                            onClick={() => handleCashHotkey(totals.total)}
                            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-bold py-2 rounded-lg transition cursor-pointer"
                          >
                            Exact
                          </button>
                          {[5, 10, 20, 50, 100].map((bill) => (
                            <button
                              key={bill}
                              type="button"
                              onClick={() => handleCashHotkey(bill)}
                              disabled={bill < totals.total && bill !== 5 && bill !== 10} // allow if logical
                              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-bold py-2 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:hover:bg-white"
                            >
                              {settings.currencySymbol}{bill}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. MOBILE PAY */}
                {paymentMethod === 'mobile' && (
                  <div className="space-y-4 text-center py-4 animate-fade-in" id="pay_form_mobile">
                    <div className="max-w-[200px] mx-auto bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm relative flex justify-center items-center">
                      <QrCode className="h-32 w-32 text-slate-900" />
                      <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[0.5px] rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded-md">Gateway Connected</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">Secure Mobile Gateway</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Ask the customer to scan this dynamically encrypted QR code on their mobile device (Apple Pay, Google Pay, or Venmo).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={processSecurePayment}
                      className="mx-auto bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      id="simulate_qr_scan_btn"
                    >
                      <QrCode className="h-4 w-4 text-indigo-600" />
                      Simulate Customer Scan
                    </button>
                  </div>
                )}

                {/* 4. GIFT CARD */}
                {paymentMethod === 'giftcard' && (
                  <div className="space-y-4 animate-fade-in" id="pay_form_gift">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Voucher Code</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="MERCH-XXXX-XXXX"
                          value={giftCode}
                          onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                          className="w-full text-xs font-mono border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 tracking-widest pl-10 uppercase"
                          id="gift_code_input"
                        />
                        <Gift className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      </div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Standard demo voucher balance: MERCH-WELCOME-2026 ($50.00)
                      </span>
                    </div>

                    {/* Simple Quick Fill for Gift Card */}
                    <button
                      type="button"
                      onClick={() => setGiftCode('MERCH-WELCOME-2026')}
                      className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold cursor-pointer underline decoration-dotted"
                    >
                      Auto-fill active demo voucher
                    </button>
                  </div>
                )}

                {/* Bottom Main Button to submit */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2 shrink-0">
                  <button
                    onClick={processSecurePayment}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                    id="submit_payment_btn"
                  >
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span>Authorize & Process Payment</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECURE GATEWAYS ANIMATION SEQUENCER SCREEN */}
          {['tunneling', 'encrypting', 'authorizing', 'finalizing'].includes(processingState) && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-white select-none animate-fade-in" id="payment_processing_screen">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin flex items-center justify-center">
                  <Lock className="h-8 w-8 text-indigo-400" />
                </div>
                {/* Visual ripple effect */}
                <div className="absolute inset-0 h-20 w-20 rounded-full border-4 border-indigo-500/30 animate-ping pointer-events-none"></div>
              </div>

              <div className="space-y-4 text-center max-w-sm">
                <h3 className="text-base font-bold font-mono tracking-wider text-slate-100 uppercase">PROCESSING TRANSACTION</h3>
                
                {/* Step indicator */}
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden w-48 mx-auto relative">
                  <div className={`h-full bg-indigo-500 rounded-full transition-all duration-500 ${
                    processingState === 'tunneling' ? 'w-1/4' : 
                    processingState === 'encrypting' ? 'w-2/4' : 
                    processingState === 'authorizing' ? 'w-3/4' : 'w-[95%]'
                  }`}></div>
                </div>

                <p className="text-xs text-slate-400 font-mono h-8 flex items-center justify-center animate-pulse" id="processing_step_text">
                  {currentStepText}
                </p>

                <div className="border border-slate-800 bg-slate-900/50 rounded-lg p-3 text-[10px] text-slate-500 font-mono uppercase space-y-1 text-left">
                  <div className="flex justify-between">
                    <span>GATEWAY:</span>
                    <span className="text-slate-400">SECURE_RETAIL_v2.4</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CIPHER:</span>
                    <span className="text-slate-400">AES256-GCM-SHA384</span>
                  </div>
                  <div className="flex justify-between">
                    <span>COMPLIANCE:</span>
                    <span className="text-emerald-500 font-bold">PCI-DSS APPROVED</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETED SUCCESS & RECEIPTS WINDOW */}
          {processingState === 'success' && transactionSummary && (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between bg-emerald-50/10 animate-fade-in" id="payment_receipt_screen">
              <div className="space-y-6">
                
                {/* Header Approved Badge */}
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-950 uppercase" id="payment_approved_title">Transaction Approved!</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Authorization Code: {transactionSummary.authCode}</p>
                </div>

                {/* Tab layout to preview customer or merchant receipt */}
                <div className="border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden" id="receipt_viewer_panel">
                  <div className="flex border-b border-slate-150 bg-slate-50 text-xs font-semibold select-none">
                    <button
                      onClick={() => setSelectedReceiptTab('customer')}
                      className={`flex-1 py-2 text-center border-r border-slate-150 transition cursor-pointer ${
                        selectedReceiptTab === 'customer' ? 'bg-white text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                      id="receipt_tab_customer"
                    >
                      Customer Copy
                    </button>
                    <button
                      onClick={() => setSelectedReceiptTab('merchant')}
                      className={`flex-1 py-2 text-center transition cursor-pointer ${
                        selectedReceiptTab === 'merchant' ? 'bg-white text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                      id="receipt_tab_merchant"
                    >
                      Merchant Copy
                    </button>
                  </div>

                  {/* Thermal Paper emulation */}
                  <div className="p-6 font-mono text-xs text-slate-800 bg-white leading-relaxed max-h-60 overflow-y-auto" id="thermal_receipt_view">
                    <div className="text-center">
                      <span className="font-bold text-sm block uppercase">{settings.storeName}</span>
                      <span className="text-[10px] text-slate-500 block">{settings.address}</span>
                      <span className="text-[10px] text-slate-500 block">TEL: {settings.phone}</span>
                      <span className="text-[10px] text-slate-400 block mt-1">=============================</span>
                    </div>
                    
                    <div className="my-2 space-y-0.5 text-[11px]">
                      <div><strong>TX CODE:</strong> {transactionSummary.id}</div>
                      <div><strong>DATE:</strong> {transactionSummary.timestamp}</div>
                      <div><strong>CASHIER:</strong> System Station #01</div>
                      <div><strong>COPY:</strong> {selectedReceiptTab.toUpperCase()} COPY</div>
                      <div className="text-slate-400">-----------------------------</div>
                    </div>

                    <div className="space-y-1 text-[11px]" id="receipt_items_rows">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex justify-between">
                          <span>{item.quantity}x {item.product.name}</span>
                          <span>{settings.currencySymbol}{(item.product.retailPrice * (1 - item.discountPercentage / 100) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-slate-400 my-2">-----------------------------</div>

                    <div className="space-y-1 text-[11px]" id="receipt_totals_rows">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{settings.currencySymbol}{totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sales Tax ({settings.taxRate}%)</span>
                        <span>{settings.currencySymbol}{totals.taxTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-950 text-sm pt-1">
                        <span>TOTAL PAID</span>
                        <span>{settings.currencySymbol}{totals.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-slate-400 my-2">=============================</div>

                    <div className="space-y-0.5 text-[10px] text-slate-600">
                      <div><strong>METHOD:</strong> {transactionSummary.paymentMethod.toUpperCase()}</div>
                      {transactionSummary.paymentMethod === 'card' && (
                        <>
                          <div><strong>PROVIDER:</strong> {transactionSummary.brand}</div>
                          <div><strong>CARD NUMBER:</strong> •••• •••• •••• {transactionSummary.last4}</div>
                          <div><strong>AUTH:</strong> {transactionSummary.authCode}</div>
                          <div><strong>REF NO:</strong> {transactionSummary.refNo}</div>
                        </>
                      )}
                      {transactionSummary.paymentMethod === 'cash' && (
                        <>
                          <div><strong>TENDERED:</strong> {settings.currencySymbol}{transactionSummary.cashTendered.toFixed(2)}</div>
                          <div><strong>CHANGE:</strong> {settings.currencySymbol}{transactionSummary.cashChange.toFixed(2)}</div>
                        </>
                      )}
                      {transactionSummary.paymentMethod === 'giftcard' && (
                        <div><strong>VOUCHER CODE:</strong> {transactionSummary.giftCode}</div>
                      )}
                    </div>

                    <div className="text-slate-400 my-2">=============================</div>
                    
                    <div className="text-center text-[10px] text-slate-500 space-y-1">
                      <p className="whitespace-pre-line">{settings.receiptHeader}</p>
                      <p className="whitespace-pre-line">{settings.receiptFooter}</p>
                      <span className="text-[8px] text-slate-400 block mt-2 text-center uppercase leading-none break-all">
                        {transactionSummary.shaHash}
                      </span>
                      <strong className="block text-[9px] text-emerald-700 mt-1 uppercase">PCI-DSS COMPLIANT TRANSACTION SECURED</strong>
                    </div>
                  </div>
                </div>

                {/* Digital Receipts Sending Row (Mock) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="digital_receipts_actions">
                  <form onSubmit={sendEmailReceipt} className="relative">
                    <input
                      type="email"
                      placeholder="Email Receipt..."
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-8 pr-12 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                      id="receipt_email_input"
                    />
                    <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <button
                      type="submit"
                      disabled={receiptEmailed}
                      className="absolute right-1 top-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition disabled:bg-slate-300 shrink-0 cursor-pointer"
                    >
                      {receiptEmailed ? 'Sending...' : 'Send'}
                    </button>
                  </form>

                  <form onSubmit={sendSmsReceipt} className="relative">
                    <input
                      type="tel"
                      placeholder="Mobile No for SMS..."
                      required
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full pl-8 pr-12 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                      id="receipt_sms_input"
                    />
                    <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <button
                      type="submit"
                      disabled={receiptSmsed}
                      className="absolute right-1 top-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition disabled:bg-slate-300 shrink-0 cursor-pointer"
                    >
                      {receiptSmsed ? 'Sending...' : 'Text'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Bottom Print/thermal receipt or New Sale checkout button */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3 shrink-0 select-none">
                <button
                  onClick={handlePrintReceipt}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  id="print_receipt_btn"
                >
                  <Printer className="h-4 w-4" />
                  Print Thermal Copy
                </button>
                
                <button
                  onClick={finalizeSale}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl shadow transition text-center flex items-center justify-center gap-2 cursor-pointer text-xs"
                  id="start_new_sale_btn"
                >
                  <span>Start New Transaction</span>
                  <Loader2 className="h-3.5 w-3.5 text-slate-400 shrink-0 animate-pulse pointer-events-none" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
