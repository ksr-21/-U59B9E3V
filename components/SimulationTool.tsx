
import React, { useState, useEffect, useRef } from 'react';
import { Product, ForecastResult, UserProfile, UserRole } from '../types';
import { SimulationParams, SpecialEvent } from '../logic/calculations';
import { 
  Sliders, Clock, Tag, RefreshCw, CheckCircle, Search, Sparkles, 
  CalendarDays, Truck, User, ArrowRight, X, Loader2, Send, 
  MessageCircle, Bot, User as UserIcon, Maximize2, Minimize2, ChevronDown
} from 'lucide-react';
import { getSimulationInsight, getChatResponse } from '../services/geminiService';
import { dbService } from '../services/dbService';

interface SimulationToolProps {
  simulation: SimulationParams;
  setSimulation: (val: SimulationParams) => void;
  products: Product[];
  setProducts: (products: Product[]) => void;
  forecasts: ForecastResult[];
  currentUserProfile: UserProfile;
}

const FESTIVAL_PRESETS: SpecialEvent[] = [
  { 
    name: 'Diwali Peak', 
    categoryBoosts: { 'Grocery': 2.8, 'Produce': 1.8, 'Dairy': 2.0 } 
  },
  { 
    name: 'Christmas / New Year', 
    categoryBoosts: { 'Beverages': 2.5, 'Bakery': 3.0, 'Grocery': 1.5 } 
  },
  { 
    name: 'Monsoon Sale', 
    categoryBoosts: { 'Grocery': 1.4, 'Dairy': 1.2 } 
  }
];

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const SimulationTool: React.FC<SimulationToolProps> = ({ simulation, setSimulation, products, setProducts, forecasts, currentUserProfile }) => {
  const [aiInsight, setAiInsight] = useState<string>('Analyzing scenario...');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [panelSearch, setPanelSearch] = useState('');
  
  // Chatbot State
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'ai', text: `Hi ${currentUserProfile.businessName}! I'm ready to help you analyze this simulation. What would you like to know?` }
  ]);
  const [userChatInput, setUserChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Supplier Selection State
  const [activeRequest, setActiveRequest] = useState<{product: Product, forecast: ForecastResult} | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<UserProfile[]>([]);
  const [isSearchingSuppliers, setIsSearchingSuppliers] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderedIds, setOrderedIds] = useState<Set<string>>(new Set());

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    if (activeRequest) {
      const search = async () => {
        setIsSearchingSuppliers(true);
        const results = await dbService.searchSuppliers(supplierSearch);
        setSuppliers(results);
        setIsSearchingSuppliers(false);
      };
      const t = setTimeout(search, 300);
      return () => clearTimeout(t);
    }
  }, [supplierSearch, activeRequest]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userChatInput.trim() || isChatLoading) return;

    const userMsg = userChatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setUserChatInput('');
    setIsChatLoading(true);

    const scenarioText = `
      Current Simulation:
      - Demand Multiplier: ${Math.round(simulation.demandMultiplier * 100)}% 
      - Supply Delay: ${simulation.leadTimeDelayDays} days
      - Promotion Status: ${simulation.isPromotionActive ? 'ACTIVE (+40%)' : 'None'}
      - Special Event: ${simulation.activeEvent ? simulation.activeEvent.name : 'Standard Operations'}
    `;

    const aiResponse = await getChatResponse(userMsg, {
      scenario: scenarioText,
      products,
      forecasts
    });

    setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setIsChatLoading(false);
  };

  const handleCreateOrder = async (supplier: UserProfile) => {
    if (!activeRequest) return;
    setIsOrdering(true);
    try {
      await dbService.createSupplyOrder({
        retailerId: currentUserProfile.uid,
        retailerBusinessName: currentUserProfile.businessName,
        supplierId: supplier.uid,
        supplierBusinessName: supplier.businessName,
        productId: activeRequest.product.id,
        productName: activeRequest.product.name,
        quantity: activeRequest.forecast.recommendedRestock,
        unit: activeRequest.product.unit,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
      setOrderedIds(prev => new Set([...prev, activeRequest.product.id]));
      setActiveRequest(null);
    } catch (e) {
      alert("Order failed: " + e);
    } finally {
      setIsOrdering(false);
    }
  };

  const handleWhatsAppOrder = (product: Product, forecast: ForecastResult) => {
    const phone = product.supplierPhone;
    if (!phone) {
      alert("No phone number linked for this supplier.");
      return;
    }
    const message = `Hello ${product.supplierName || 'Supplier'}, I would like to order ${forecast.recommendedRestock} ${product.unit} of ${product.name} (Ref: SmartStock AI). Please confirm availability.`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const filteredForecasts = forecasts.filter(f => {
    const p = products.find(prod => prod.id === f.productId);
    if (!p) return false;
    return p.name.toLowerCase().includes(panelSearch.toLowerCase());
  });

  const totalRestockCapital = forecasts.reduce((acc, f) => {
    const p = products.find(prod => prod.id === f.productId);
    return p ? acc + (f.recommendedRestock * p.unitPrice) : acc;
  }, 0);

  const productsAtRisk = forecasts.filter(f => {
    const p = products.find(prod => prod.id === f.productId);
    return p ? p.currentStock < f.predictedDemand7Days : false;
  }).length;

  const riskLevel = simulation.demandMultiplier > 1.8 || simulation.leadTimeDelayDays >= 3 || simulation.activeEvent ? 'Critical' : 
                   simulation.demandMultiplier > 1.3 || simulation.leadTimeDelayDays >= 1 ? 'Elevated' : 'Stable';

  useEffect(() => {
    const fetchInsight = async () => {
      setIsAiLoading(true);
      const scenarioText = `
        Demand: ${Math.round(simulation.demandMultiplier * 100)}% 
        Delay: ${simulation.leadTimeDelayDays} days
        Promotion: ${simulation.isPromotionActive ? 'Active' : 'None'}
        Event: ${simulation.activeEvent ? simulation.activeEvent.name : 'None'}
      `;
      const insight = await getSimulationInsight(scenarioText, productsAtRisk, totalRestockCapital, riskLevel);
      setAiInsight(insight);
      setIsAiLoading(false);
    };
    const timeout = setTimeout(fetchInsight, 800);
    return () => clearTimeout(timeout);
  }, [simulation, productsAtRisk, totalRestockCapital, riskLevel]);

  const toggleEvent = (event: SpecialEvent) => {
    setSimulation({ ...simulation, activeEvent: simulation.activeEvent?.name === event.name ? undefined : event });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Sliders size={20} className="text-indigo-600" />
            Scenario Controls
          </h3>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-600">Global Demand</label>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                  {Math.round(simulation.demandMultiplier * 100)}%
                </span>
              </div>
              <input 
                type="range" 
                min="0.5" max="2.0" step="0.1" 
                value={simulation.demandMultiplier} 
                onChange={(e) => setSimulation({...simulation, demandMultiplier: parseFloat(e.target.value)})}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-1">
                  <Clock size={14} /> Supply Delay
                </label>
                <span className={`text-xs font-bold px-2 py-1 rounded ${simulation.leadTimeDelayDays > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  +{simulation.leadTimeDelayDays} Days
                </span>
              </div>
              <input 
                type="range" 
                min="0" max="7" step="1" 
                value={simulation.leadTimeDelayDays} 
                onChange={(e) => setSimulation({...simulation, leadTimeDelayDays: parseInt(e.target.value)})}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="pt-4 space-y-3 border-t border-slate-100">
               <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <CalendarDays size={12} /> Special Events
               </h4>
               <div className="grid grid-cols-1 gap-2">
                  {FESTIVAL_PRESETS.map(event => (
                    <button
                      key={event.name}
                      onClick={() => toggleEvent(event)}
                      className={`text-left p-3 rounded-xl border text-xs font-bold transition-all flex justify-between items-center ${
                        simulation.activeEvent?.name === event.name 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className={simulation.activeEvent?.name === event.name ? 'text-indigo-200' : 'text-indigo-500'} />
                        {event.name}
                      </div>
                      {simulation.activeEvent?.name === event.name && <CheckCircle size={14} />}
                    </button>
                  ))}
               </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={() => setSimulation({...simulation, isPromotionActive: !simulation.isPromotionActive})}
                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                  simulation.isPromotionActive ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Tag size={18} />
                  <div className="text-left font-bold text-sm">Sale (+40%)</div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${simulation.isPromotionActive ? 'bg-rose-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${simulation.isPromotionActive ? 'right-1' : 'left-1'}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* AI Chatbot Widget */}
        <div className={`bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-500 flex flex-col ${isChatExpanded ? 'h-[500px]' : 'h-[320px]'}`}>
           <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                 <div className="bg-indigo-600 p-2 rounded-xl">
                   <Bot size={18} className="text-white" />
                 </div>
                 <div className="flex flex-col">
                   <span className="font-bold text-sm leading-none">SmartStock AI</span>
                   <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Strategy Partner</span>
                 </div>
              </div>
              <button onClick={() => setIsChatExpanded(!isChatExpanded)} className="hover:bg-slate-800 p-1.5 rounded-xl transition-colors">
                 {isChatExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                   <div className={`max-w-[90%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                     msg.role === 'user' 
                     ? 'bg-slate-900 text-white rounded-tr-none' 
                     : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                   }`}>
                      {msg.text}
                   </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                   <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Analyzing Data</span>
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
           </div>

           <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white">
              <div className="relative flex gap-2">
                 <input 
                    type="text" 
                    placeholder="Ask about inventory risk..." 
                    className="flex-1 pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={userChatInput}
                    onChange={(e) => setUserChatInput(e.target.value)}
                 />
                 <button type="submit" disabled={isChatLoading || !userChatInput.trim()} className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 disabled:bg-slate-200 transition-all shadow-lg shadow-indigo-100 active:scale-90">
                    <Send size={18} />
                 </button>
              </div>
           </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform text-white">
            <Sparkles size={160} />
          </div>
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-2">
               <h3 className="font-black text-xl tracking-tight">AI Strategy Insight</h3>
               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${riskLevel === 'Critical' ? 'bg-rose-500' : riskLevel === 'Elevated' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                 {riskLevel} Risk
               </span>
             </div>
             {isAiLoading ? (
               <div className="flex items-center gap-3">
                 <Loader2 className="animate-spin text-indigo-300" size={20} />
                 <p className="text-indigo-200 font-medium">Recalculating global supply vectors...</p>
               </div>
             ) : (
               <p className="text-xl italic leading-relaxed font-bold">"{aiInsight}"</p>
             )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900">Procurement Panel</h3>
              <p className="text-xs text-slate-400 font-medium">Scenario-based recommendations.</p>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search catalog..." 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                value={panelSearch}
                onChange={(e) => setPanelSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                 <tr>
                    <th className="px-8 py-5">Product</th>
                    <th className="px-8 py-5 text-center">Simulated Stock</th>
                    <th className="px-8 py-5 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredForecasts.map(f => {
                   const p = products.find(prod => prod.id === f.productId);
                   if (!p) return null;
                   const hasOrdered = orderedIds.has(p.id);
                   const isCritical = p.currentStock < f.predictedDemand7Days;
                   return (
                     <tr key={f.productId} className={`text-sm hover:bg-slate-50 transition-colors ${isCritical ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-8 py-5">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{p.category}</div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <div className={`font-black ${isCritical ? 'text-rose-600' : 'text-slate-900'}`}>{p.currentStock.toFixed(2)} {p.unit}</div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">7d Proj: {f.predictedDemand7Days}</div>
                        </td>
                        <td className="px-8 py-5 text-right">
                           {f.recommendedRestock > 0 ? (
                             <div className="flex justify-end items-center gap-3">
                               <button 
                                 onClick={() => setActiveRequest({product: p, forecast: f})}
                                 className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-2 ${
                                   hasOrdered ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-900 text-white hover:bg-slate-800'
                                 }`}
                                 disabled={hasOrdered}
                               >
                                 {hasOrdered ? <><CheckCircle size={14} /> Ordered</> : <><Truck size={14} /> Restock</>}
                               </button>

                               <button 
                                 onClick={() => handleWhatsAppOrder(p, f)}
                                 className="p-2.5 rounded-xl text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all shadow-sm"
                                 title="WhatsApp Order"
                               >
                                 <MessageCircle size={18} />
                               </button>
                             </div>
                           ) : <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">Optimized</span>}
                        </td>
                     </tr>
                   );
                 })}
               </tbody>
            </table>
          </div>
        </div>
      </div>

      {activeRequest && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-300">
              <div className="bg-indigo-600 p-8 flex justify-between items-center text-white">
                 <div>
                    <h3 className="text-2xl font-black tracking-tight">Supply Channel</h3>
                    <p className="text-xs text-indigo-100 mt-1 uppercase font-bold tracking-widest">Order: {activeRequest.forecast.recommendedRestock} {activeRequest.product.unit} of {activeRequest.product.name}</p>
                 </div>
                 <button onClick={() => setActiveRequest(null)} className="p-2.5 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
              </div>

              <div className="p-8 space-y-6 flex-1 overflow-y-auto bg-slate-50/50">
                 <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                       type="text"
                       placeholder="Filter by supplier business name..."
                       className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                       value={supplierSearch}
                       onChange={(e) => setSupplierSearch(e.target.value)}
                    />
                 </div>

                 <div className="space-y-3">
                    {isSearchingSuppliers ? (
                       <div className="flex flex-col items-center py-16 text-slate-400 gap-3">
                          <Loader2 className="animate-spin text-indigo-600" size={32} />
                          <span className="font-black text-xs uppercase tracking-widest">Querying Platform...</span>
                       </div>
                    ) : suppliers.length === 0 ? (
                       <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                          <div className="bg-slate-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Truck size={32}/>
                          </div>
                          <p className="font-black text-slate-900">No matching suppliers</p>
                          <p className="text-xs text-slate-400 mt-2">Search for a business name or invite your vendors.</p>
                       </div>
                    ) : (
                       suppliers.map(s => (
                          <div key={s.uid} className="group bg-white hover:bg-indigo-600 border border-slate-100 rounded-3xl p-6 flex items-center justify-between transition-all cursor-pointer shadow-sm hover:shadow-indigo-200" onClick={() => handleCreateOrder(s)}>
                             <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-white/10 group-hover:text-white transition-colors">
                                   {s.businessName.charAt(0)}
                                </div>
                                <div>
                                   <div className="font-black text-slate-900 group-hover:text-white transition-colors text-lg leading-tight">{s.businessName}</div>
                                   <div className="text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors group-hover:text-indigo-200 text-slate-400">
                                      @{s.username} • Verified Partner
                                   </div>
                                </div>
                             </div>
                             <div className="bg-slate-100 text-slate-400 p-3 rounded-2xl group-hover:bg-white group-hover:text-indigo-600 transition-all">
                                <ArrowRight size={20} />
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>

              {isOrdering && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-[70]">
                   <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                   <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Processing Digital Order</span>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default SimulationTool;
