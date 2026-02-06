
import React, { useState, useRef } from 'react';
import { Product, UserProfile } from '../types.ts';
import { Plus, X, Save, Trash2, Search, Download, Upload, FileQuestion, Edit3, Package, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { convertToCSV, downloadCSV, parseCSV } from '../logic/csvUtils.ts';
import { dbService } from '../services/dbService.ts';

interface SupplierCatalogProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  currentUserProfile: UserProfile;
}

const SupplierCatalog: React.FC<SupplierCatalogProps> = ({ products, setProducts, currentUserProfile }) => {
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: '',
    currentStock: 1000,
    unitPrice: 0,
    unit: 'pcs',
    leadTimeDays: 3
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadTemplate = () => {
    const template = [
      { name: 'Example Flour', category: 'Grocery', currentStock: 500, unitPrice: 1.50, unit: 'kg', leadTimeDays: 2 }
    ];
    const csv = convertToCSV(template);
    downloadCSV(csv, 'supplier_catalog_template.csv');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;
    setIsSaving(true);

    try {
      const id = showForm === 'add' 
        ? `SUP-P-${Math.floor(Math.random() * 10000)}` 
        : editingProduct!.id;

      const productToSave: Product = {
        id,
        name: formData.name!,
        category: formData.category!,
        currentStock: Number(formData.currentStock) || 0,
        minStockLevel: 0,
        leadTimeDays: Number(formData.leadTimeDays) || 0,
        unitPrice: Number(formData.unitPrice) || 0,
        unit: formData.unit || 'pcs',
        supplierName: currentUserProfile.businessName,
        supplierPhone: currentUserProfile.phoneNumber,
        supplierId: currentUserProfile.uid
      };

      await dbService.saveProduct(currentUserProfile.uid, productToSave);
      
      if (showForm === 'add') {
        setProducts([...products, productToSave]);
      } else {
        setProducts(products.map(p => p.id === id ? productToSave : p));
      }
      setShowForm(null);
    } catch (err) {
      alert("Error saving product: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to remove this product from your catalog?')) {
      await dbService.deleteProduct(currentUserProfile.uid, id);
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const importedData = parseCSV(text);
        const validatedProducts = importedData.map((item, idx) => ({
          id: `SUP-CSV-${idx}-${Math.floor(Math.random() * 10000)}`,
          name: item.name || 'Imported Item',
          category: item.category || 'General',
          currentStock: Number(item.currentStock) || 0,
          minStockLevel: 0,
          leadTimeDays: Number(item.leadTimeDays) || 3,
          unitPrice: Number(item.unitPrice) || 0,
          unit: item.unit || 'pcs',
          supplierName: currentUserProfile.businessName,
          supplierPhone: currentUserProfile.phoneNumber,
          supplierId: currentUserProfile.uid
        }));
        
        await Promise.all(validatedProducts.map(p => dbService.saveProduct(currentUserProfile.uid, p)));
        setProducts([...products, ...validatedProducts]);
        alert(`Bulk upload complete: ${validatedProducts.length} items added.`);
      } catch (err) {
        alert("CSV parsing error. Ensure columns match the template.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Catalog Management</h2>
          <p className="text-slate-500 text-sm">Update your wholesale inventory for platform retailers.</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search catalog..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={downloadTemplate} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500" title="Download CSV Template"><FileText size={18}/></button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-indigo-600" title="Import Bulk CSV"><Upload size={18}/></button>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <button onClick={() => { setFormData({ name: '', category: '', currentStock: 1000, unitPrice: 0, unit: 'pcs', leadTimeDays: 3 }); setShowForm('add'); }} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all">
            <Plus size={18} /> New Entry
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Product Detail</th>
              <th className="px-8 py-5 text-center">Available Qty</th>
              <th className="px-8 py-5 text-center">Wholesale Price</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <tr><td colSpan={4} className="p-24 text-center text-slate-400 italic font-medium">No products registered in your catalog.</td></tr>
            ) : (
              filteredProducts.map(p => (
                <tr key={p.id} className="text-sm hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-black text-slate-800 text-base">{p.name}</div>
                    <div className="text-[10px] text-indigo-600 uppercase font-black mt-0.5 tracking-tighter">{p.category}</div>
                  </td>
                  <td className="px-8 py-5 text-center font-bold text-slate-700">
                    {p.currentStock} <span className="text-slate-400 font-medium text-xs">{p.unit}</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="font-black text-slate-900 text-base">${p.unitPrice.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 font-bold">per {p.unit}</div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => { setEditingProduct(p); setFormData(p); setShowForm('edit'); }} className="p-2.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit3 size={18}/></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-2.5 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
               <h3 className="text-xl font-black tracking-tight">{showForm === 'add' ? 'Add To Platform Catalog' : 'Update Catalog Item'}</h3>
               <button onClick={() => setShowForm(null)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Full Product Title</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</label>
                    <input required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unit Type</label>
                    <input required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600" placeholder="pcs, kg, box" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Bulk Available Qty</label>
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Wholesale Price ($)</label>
                    <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setShowForm(null)} className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                 <button disabled={isSaving} className="flex-[2] bg-indigo-600 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                  Confirm & Sync
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierCatalog;
