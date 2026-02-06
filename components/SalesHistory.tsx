
import React, { useState } from 'react';
import { Bill } from '../types.ts';
import { Search, Receipt, Calendar, User, Eye, X, Printer, Download } from 'lucide-react';
import { convertToCSV, downloadCSV } from '../logic/csvUtils.ts';

interface SalesHistoryProps {
  bills: Bill[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ bills }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const filteredBills = bills.filter(bill => 
    bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportSalesCSV = () => {
    // Flatten bills for CSV export
    const flattenedData = bills.flatMap(bill => 
      bill.items.map(item => ({
        billId: bill.id,
        date: bill.date,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        itemTotal: (item.quantity * item.price).toFixed(2),
        billTotal: bill.total.toFixed(2)
      }))
    );
    
    const csv = convertToCSV(flattenedData);
    downloadCSV(csv, `sales_history_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">Transaction History</h2>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by Bill ID, Date, or Product..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={exportSalesCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
            disabled={bills.length === 0}
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs font-semibold text-slate-500 uppercase">
                <th className="px-6 py-4">Bill ID</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Items Count</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No transaction records found.
                  </td>
                </tr>
              ) : (
                filteredBills.map(bill => (
                  <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600">
                      {bill.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {bill.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {bill.items.length} {bill.items.length === 1 ? 'Item' : 'Items'}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">
                      ${bill.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedBill(bill)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Receipt"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Viewer Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Receipt size={20} className="text-indigo-400" />
                <h3 className="font-bold">Transaction Details</h3>
              </div>
              <button onClick={() => setSelectedBill(null)} className="hover:bg-slate-800 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="bg-white rounded-xl p-6 font-mono text-sm border-2 border-dashed border-slate-200">
                <div className="text-center mb-6 border-b border-slate-200 pb-4">
                  <p className="font-bold text-lg">SMARTSTOCK RETAIL</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Transaction Record</p>
                  <div className="flex justify-between mt-4 text-[10px] text-slate-400">
                    <span>ID: {selectedBill.id}</span>
                    <span>{selectedBill.date}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedBill.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="flex-1">{item.quantity}x {item.name.substring(0, 20)}</span>
                      <span className="ml-4 font-bold">${(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between font-bold text-xl">
                  <span>TOTAL</span>
                  <span>${selectedBill.total.toFixed(2)}</span>
                </div>

                <div className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-widest italic">
                  Digital Receipt - SmartStock AI
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => window.print()} 
                  className="flex-1 border border-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <Printer size={18} /> Print
                </button>
                <button 
                  onClick={() => setSelectedBill(null)}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
