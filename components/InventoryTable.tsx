
import React, { useState, useRef } from 'react';
import { Product } from '../types.ts';
import { Plus, X, Save, Package, Trash2, ArrowUpCircle, Search, Download, Upload, FileQuestion, Edit3, Phone, User, Sparkles, Loader2 } from 'lucide-react';
import { convertToCSV, downloadCSV, parseCSV } from '../logic/csvUtils.ts';
import { GoogleGenAI } from '@google/genai';

interface InventoryTableProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  onRestock?: (id: string, qty: number) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ products, setProducts, onRestock }) => {
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [restockQty, setRestockQty] = useState<{ [id: string]: number }>({});
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: '',
    currentStock: 0,
    minStockLevel: 10,
    leadTimeDays: 3,
    unitPrice: 0,
    unit: 'pcs',
    supplierName: '',
    supplierPhone: ''
  });

  const generateAIImage = async () => {
    if (!formData.name) {
      alert("Please enter a product name first to generate an image.");
      return;
    }
    setIsGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A clean, professional studio photograph of ${formData.name}, commercial product style, white background, high resolution.` }]
        },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImageUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err) {
      console.error("Image generation failed:", err);
      alert("Failed to generate AI image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      category: '',
      currentStock: 0,
      minStockLevel: 10,
      leadTimeDays: 3,
      unitPrice: 0,
      unit: 'pcs',
      supplierName: '',
      supplierPhone: ''
    });
    setGeneratedImageUrl(null);
    setShowForm('add');
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setGeneratedImageUrl(null);
    setShowForm('edit');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;

    if (showForm === 'add') {
      const id = `P${String(products.length + 1).padStart(3, '0')}-${Math.floor(Math.random() * 1000)}`;
      const productToAdd: Product = {
        id,
        name: formData.name!,
        category: formData.category!,
        currentStock: Number(formData.currentStock) || 0,
        minStockLevel: Number(formData.minStockLevel) || 0,
        leadTimeDays: Number(formData.leadTimeDays) || 0,
        unitPrice: Number(formData.unitPrice) || 0,
        unit: formData.unit || 'pcs',
        supplierName: formData.supplierName || '',
        supplierPhone: formData.supplierPhone || ''
      };
      setProducts([...products, productToAdd]);
    } else if (showForm === 'edit' && editingProduct) {
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id ? { ...p, ...formData } as Product : p
      );
      setProducts(updatedProducts);
    }

    setShowForm(null);
    setEditingProduct(null);
  };

  const deleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleManualRestock = (productId: string) => {
    const qty = restockQty[productId] || 0;
    if (qty <= 0) return;
    onRestock?.(productId, qty);
    setRestockQty({ ...restockQty, [productId]: 0 });
  };

  const exportToCSV = () => {
    const csv = convertToCSV(products);
    downloadCSV(csv, `inventory_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        id: 'S001',
        name: 'Sample Rice Brand',
        category: 'Grocery',
        currentStock: 50.5,
        minStockLevel: 10,
        leadTimeDays: 3,
        unitPrice: 2.5,
        unit: 'kg',
        supplierName: 'Main Supplier',
        supplierPhone: '1234567890'
      }
    ];
    const csv = convertToCSV(sampleData);
    downloadCSV(csv, 'inventory_template.csv');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const importedData = parseCSV(text);
        const validatedProducts = importedData.map((item, idx) => ({
          id: item.id || `IMP-${idx}-${Math.floor(Math.random() * 1000)}`,
          name: item.name || 'Unnamed Product',
          category: item.category || 'Uncategorized',
          currentStock: Number(item.currentStock) || 0,
          minStockLevel: Number(item.minStockLevel) || 10,
          leadTimeDays: Number(item.leadTimeDays) || 3,
          unitPrice: Number(item.unitPrice) || 0,
          unit: item.unit || 'pcs',
          supplierName: item.supplierName || '',
          supplierPhone: item.supplierPhone || ''
        }));
        setProducts([...products, ...validatedProducts]);
      } catch (err) {
        alert("CSV parsing error. Please ensure the format matches the template.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">Master Inventory</h2>
        
        <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by name/cat..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={downloadSampleTemplate} 
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 flex items-center gap-1 text-xs"
              title="Download Import Template"
            >
              <FileQuestion size={16} />
              <span className="hidden sm:inline font-bold">Template</span>
            </button>
            <button onClick={exportToCSV} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50" title="Export Current Inventory"><Download size={16}/></button>
            <button onClick={handleImportClick} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50" title="Import via CSV"><Upload size={16}/></button>
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <button onClick={handleOpenAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors">
              <Plus size={18} /> New Product
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 text-center">In Stock</th>
                <th className="px-6 py-4 text-center">Supplier Info</th>
                <th className="px-6 py-4 text-right">Quick Restock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No products found.</td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="text-sm hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{product.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest">{product.category} • {product.unit}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold text-slate-900">{product.currentStock.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{product.unit}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {product.supplierPhone ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-medium text-slate-600">{product.supplierName || 'Linked Supplier'}</span>
                          <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold">
                             <Phone size={10} /> WhatsApp Active
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No Contact Set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <input 
                            type="number" 
                            step="0.001"
                            className="w-16 border border-slate-200 rounded p-1 text-xs outline-none bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-400"
                            placeholder="Qty"
                            value={restockQty[product.id] || ''}
                            onChange={(e) => setRestockQty({...restockQty, [product.id]: parseFloat(e.target.value) || 0})}
                          />
                          <button onClick={() => handleManualRestock(product.id)} className="text-indigo-600 hover:text-indigo-800 active:scale-90 transition-all" title="Add to stock">
                            <ArrowUpCircle size={20} />
                          </button>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpenEdit(product)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => deleteProduct(product.id)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white font-bold">
                <span className="flex items-center gap-2">
                  {showForm === 'add' ? <Plus size={18}/> : <Edit3 size={18}/>}
                  {showForm === 'add' ? 'Add New Product' : 'Edit Product Details'}
                </span>
                <button onClick={() => setShowForm(null)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <div className="flex justify-between items-end mb-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Product Name</label>
                      <button 
                        type="button"
                        onClick={generateAIImage}
                        disabled={isGeneratingImage}
                        className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {isGeneratingImage ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10} />}
                        {isGeneratingImage ? 'Imaging...' : 'Gen AI Image'}
                      </button>
                    </div>
                    <input 
                      required 
                      type="text" 
                      className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    />
                    {generatedImageUrl && (
                      <div className="mt-3 relative group rounded-xl overflow-hidden border border-slate-200 aspect-square w-32 mx-auto">
                        <img src={generatedImageUrl} className="w-full h-full object-cover" alt="Generated" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <button type="button" onClick={() => setGeneratedImageUrl(null)} className="text-white"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Category</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
                      value={formData.category} 
                      onChange={(e) => setFormData({...formData, category: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Unit (kg, pcs, etc)</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
                      value={formData.unit} 
                      onChange={(e) => setFormData({...formData, unit: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Current Stock</label>
                    <input 
                      type="number" 
                      step="0.001" 
                      className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
                      value={formData.currentStock} 
                      onChange={(e) => setFormData({...formData, currentStock: parseFloat(e.target.value)})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Unit Price ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
                      value={formData.unitPrice} 
                      onChange={(e) => setFormData({...formData, unitPrice: parseFloat(e.target.value)})} 
                    />
                  </div>

                  <div className="col-span-2 pt-4 border-t border-slate-100 mt-2">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <User size={12}/> Supplier WhatsApp Configuration
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Supplier Name</label>
                         <input 
                           type="text" 
                           placeholder="e.g. Acme Wholesale"
                           className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
                           value={formData.supplierName} 
                           onChange={(e) => setFormData({...formData, supplierName: e.target.value})} 
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">WhatsApp Phone</label>
                         <div className="relative">
                            <input 
                              type="tel" 
                              placeholder="+1234567890"
                              className="w-full border border-slate-200 p-3 pl-9 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50" 
                              value={formData.supplierPhone} 
                              onChange={(e) => setFormData({...formData, supplierPhone: e.target.value})} 
                            />
                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(null)} className="flex-1 bg-slate-50 text-slate-600 p-4 rounded-xl font-bold hover:bg-slate-100 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                    <Save size={18} />
                    {showForm === 'add' ? 'Create Product' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTable;
