
import React, { useState, useEffect } from 'react';
import { Product, BillItem } from '../types.ts';
import { ShoppingCart, Plus, Minus, Trash2, Receipt, CheckCircle, Printer, Search, Weight } from 'lucide-react';

interface SalesTerminalProps {
  products: Product[];
  onCompleteSale: (items: BillItem[]) => void;
}

const SalesTerminal: React.FC<SalesTerminalProps> = ({ products, onCompleteSale }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<BillItem[]>(() => {
    const saved = localStorage.getItem('smart_stock_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [showBill, setShowBill] = useState(false);
  const [lastBill, setLastBill] = useState<BillItem[] | null>(null);

  useEffect(() => {
    localStorage.setItem('smart_stock_cart', JSON.stringify(cart));
  }, [cart]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (product.currentStock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) return prev;
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        quantity: 1, 
        price: product.unitPrice,
        unit: product.unit
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, val: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        // Ensure quantity is positive and within stock limits
        const newQty = Math.max(0.001, val);
        if (product && newQty > product.currentStock) return { ...item, quantity: product.currentStock };
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const processSale = () => {
    if (cart.length === 0) return;
    onCompleteSale([...cart]);
    setLastBill([...cart]);
    setCart([]);
    localStorage.removeItem('smart_stock_cart');
    setShowBill(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Product Selection */}
      <div className="lg:col-span-2 space-y-4">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search products to add to cart..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-base focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
              No products found.
            </div>
          ) : (
            filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.currentStock <= 0}
                className={`p-4 rounded-2xl border text-left transition-all group ${
                  product.currentStock <= 0 
                    ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' 
                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md active:scale-[0.98]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {product.category}
                  </span>
                  <span className={`text-[10px] font-bold ${product.currentStock < product.minStockLevel ? 'text-red-500 font-black' : 'text-slate-400'}`}>
                    {product.currentStock.toFixed(2)} {product.unit} LEFT
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{product.name}</h3>
                <p className="text-lg font-black text-indigo-600">${product.unitPrice.toFixed(2)} <span className="text-xs text-slate-400">/ {product.unit}</span></p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Cart and Bill */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[550px] sticky top-8">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart size={20} className="text-indigo-600" />
              Checkout
            </h2>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">{cart.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <ShoppingCart size={48} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.productId} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-slate-800 truncate flex-1">{item.name}</h4>
                    <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-red-500 ml-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center bg-white rounded-lg px-2 py-1 border border-slate-200 w-32">
                      <input 
                        type="number"
                        step="0.001"
                        min="0.001"
                        className="w-full text-xs font-bold outline-none bg-transparent"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{item.unit}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">${(item.price * item.quantity).toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">${item.price.toFixed(2)} / {item.unit}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-slate-50 rounded-b-2xl border-t border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Total Bill</span>
              <span className="text-3xl font-black text-slate-900">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={processSale}
              disabled={cart.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Receipt size={20} />
              Finalize Sale
            </button>
          </div>
        </div>
      </div>

      {/* Bill View */}
      {showBill && lastBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Sale Complete</h3>
                <p className="text-slate-500 text-sm">Digital receipt generated successfully.</p>
              </div>

              <div className="bg-white rounded-xl p-6 font-mono text-xs border-2 border-dashed border-slate-200">
                <div className="text-center mb-4 border-b border-slate-200 pb-4">
                  <p className="font-bold text-base">SMARTSTOCK RETAIL</p>
                  <p className="text-[8px] text-slate-400 mt-1 uppercase tracking-widest">AI Inventory & POS</p>
                </div>
                <div className="space-y-2 mb-4">
                  {lastBill.map(item => (
                    <div key={item.productId} className="flex justify-between">
                      <span className="flex-1">{item.quantity.toFixed(3)}{item.unit} {item.name.substring(0, 15)}</span>
                      <span className="font-bold">${(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                  <span>TOTAL</span>
                  <span>${lastBill.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => window.print()} 
                  className="flex-1 border border-slate-200 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                  <Printer size={16} /> Print
                </button>
                <button 
                  onClick={() => setShowBill(false)}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95"
                >
                  New Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTerminal;
