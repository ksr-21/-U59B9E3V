
import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from './firebase';
import { dbService } from './services/dbService';
import { DashboardTab, Product, SalesData, ForecastResult, Bill, BillItem, UserRole, UserProfile, SupplyOrder, Anomaly } from './types';
import { PRODUCTS, SALES_HISTORY } from './mockData';
import { calculateForecast, detectAnomalies, SimulationParams } from './logic/calculations';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import InventoryTable from './components/InventoryTable';
import ForecastDashboard from './components/ForecastDashboard';
import SimulationTool from './components/SimulationTool';
import SalesTerminal from './components/SalesTerminal';
import SalesHistory from './components/SalesHistory';
import ProfileSettings from './components/ProfileSettings';
import SupplierCatalog from './components/SupplierCatalog';
import AuthPage from './components/AuthPage';
import { Loader2, LogOut, Truck, Package, Bell, ShoppingBag, Clock, CheckCircle2, Search, UserCircle, XCircle, BellRing } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.OVERVIEW);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SalesData[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [supplyOrders, setSupplyOrders] = useState<SupplyOrder[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [simulation, setSimulation] = useState<SimulationParams>({
    demandMultiplier: 1.0,
    leadTimeDelayDays: 0,
    isPromotionActive: false
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await dbService.getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshData = async () => {
    if (!currentUser || !userProfile) return;
    setDataLoading(true);
    try {
      let fetchedProducts = await dbService.getProducts(currentUser.uid);
      let fetchedSales = await dbService.getSales(currentUser.uid);
      let fetchedBills = await dbService.getBills(currentUser.uid);
      let fetchedOrders = userProfile.role === UserRole.RETAILER 
        ? await dbService.getRetailerOrders(currentUser.uid)
        : await dbService.getSupplierOrders(currentUser.uid);

      if (fetchedProducts.length === 0 && userProfile.role === UserRole.RETAILER) {
        await Promise.all(PRODUCTS.map(p => dbService.saveProduct(currentUser.uid, p)));
        await dbService.addSales(currentUser.uid, SALES_HISTORY);
        fetchedProducts = PRODUCTS;
        fetchedSales = SALES_HISTORY;
      }

      setProducts(fetchedProducts);
      setSales(fetchedSales);
      setBills(fetchedBills);

      // Simple notification logic: count orders that were updated recently
      if (userProfile.role === UserRole.RETAILER) {
        const newUpdates = fetchedOrders.filter(o => (o.status === 'SHIPPED' || o.status === 'CANCELLED') && 
          (!supplyOrders.find(old => old.id === o.id) || supplyOrders.find(old => old.id === o.id)?.status === 'PENDING')).length;
        if (newUpdates > 0) setUnreadNotifications(prev => prev + newUpdates);
      }
      
      setSupplyOrders(fetchedOrders);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000); // Polling for "real-time" notifications
    return () => clearInterval(interval);
  }, [currentUser, userProfile, activeTab]);

  const forecasts = useMemo(() => {
    return products.map(p => calculateForecast(p, sales, 7, simulation));
  }, [products, sales, simulation]);

  const anomalies = useMemo(() => {
    const baseAnomalies = detectAnomalies(products, sales);
    if (userProfile?.role === UserRole.RETAILER) {
      const orderAnomalies: Anomaly[] = supplyOrders
        .filter(o => o.status === 'SHIPPED' || o.status === 'CANCELLED')
        .map(o => ({
          id: `ORD-${o.id}`,
          productId: o.productId,
          type: 'STATUS_CHANGE',
          severity: o.status === 'SHIPPED' ? 'INFO' : 'CRITICAL',
          description: `Order #${o.id.substring(0,4)} for ${o.productName} was ${o.status.toLowerCase()} by ${o.supplierBusinessName}.`,
          date: o.createdAt.split('T')[0]
        }));
      return [...baseAnomalies, ...orderAnomalies];
    }
    return baseAnomalies;
  }, [products, sales, supplyOrders, userProfile]);

  const handleUpdateOrderStatus = async (orderId: string, status: SupplyOrder['status']) => {
    try {
      await dbService.updateSupplyOrder(orderId, status);
      setSupplyOrders(supplyOrders.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err) {
      alert("Failed to update order: " + err);
    }
  };

  const handleSale = async (cartItems: BillItem[]) => {
    if (!currentUser) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const fullDateStr = now.toLocaleString();
    
    const productUpdates = cartItems.map(item => {
      const p = products.find(prod => prod.id === item.productId)!;
      const newQty = Math.max(0, p.currentStock - item.quantity);
      return dbService.updateProductStock(currentUser.uid, item.productId, newQty);
    });

    const newSalesEntries: SalesData[] = cartItems.map(item => ({
      productId: item.productId,
      date: dateStr,
      unitsSold: item.quantity
    }));

    const newBill: Bill = {
      id: `BILL-${Math.floor(Math.random() * 1000000)}`,
      date: fullDateStr,
      items: cartItems,
      total: cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    };

    try {
      await Promise.all([
        ...productUpdates,
        dbService.addSales(currentUser.uid, newSalesEntries),
        dbService.saveBill(currentUser.uid, newBill)
      ]);
      refreshData();
    } catch (e) {
      alert("Error processing sale: " + e);
    }
  };

  const handleRestock = async (productId: string, quantity: number) => {
    if (!currentUser) return;
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    const newStock = p.currentStock + quantity;
    await dbService.updateProductStock(currentUser.uid, productId, newStock);
    setProducts(products.map(prod => prod.id === productId ? { ...prod, currentStock: newStock } : prod));
  };

  const handleLogout = async () => {
    await signOut(auth);
    setProducts([]);
    setSales([]);
    setBills([]);
    setUserProfile(null);
  };

  if (authLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-white"><Loader2 size={40} className="animate-spin text-indigo-600" /></div>;
  }

  if (!currentUser || !userProfile) return <AuthPage />;

  const NotificationCenter = () => (
    <div className="relative">
      <button 
        onClick={() => { setShowNotifications(!showNotifications); setUnreadNotifications(0); }} 
        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 relative group transition-all"
      >
        <Bell size={20} className={unreadNotifications > 0 ? "text-indigo-600" : "text-slate-400"} />
        {unreadNotifications > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            {unreadNotifications}
          </span>
        )}
      </button>
      
      {showNotifications && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">Supply Notifications</h4>
            <button onClick={() => setShowNotifications(false)} className="text-slate-400"><XCircle size={14}/></button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {anomalies.filter(a => a.type === 'STATUS_CHANGE').length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-sm">No recent supply updates.</div>
            ) : (
              anomalies.filter(a => a.type === 'STATUS_CHANGE').reverse().slice(0, 10).map(note => (
                <div key={note.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-3">
                    <div className={`mt-1 p-1.5 rounded-lg ${note.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {note.severity === 'CRITICAL' ? <XCircle size={14}/> : <Truck size={14}/>}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-800 leading-relaxed">{note.description}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block font-bold">{note.date}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (userProfile.role === UserRole.SUPPLIER) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
        <div className="w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800 p-6">
           <div className="flex items-center gap-3 mb-10 border-b border-slate-800 pb-6">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20"><Truck size={24}/></div>
              <span className="font-black text-lg tracking-tight">SupplyLink <span className="text-indigo-400">AI</span></span>
           </div>
           <nav className="flex-1 space-y-2">
              <button onClick={() => setActiveTab(DashboardTab.OVERVIEW)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === DashboardTab.OVERVIEW ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><ShoppingBag size={18}/> Dashboard</button>
              <button onClick={() => setActiveTab(DashboardTab.CATALOG)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === DashboardTab.CATALOG ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><Package size={18}/> Catalog Management</button>
              <button onClick={() => setActiveTab(DashboardTab.SUPPLY_ORDERS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === DashboardTab.SUPPLY_ORDERS ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><Bell size={18}/> Retailer Orders</button>
              <button onClick={() => setActiveTab(DashboardTab.PROFILE)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === DashboardTab.PROFILE ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><UserCircle size={18}/> Business Profile</button>
           </nav>
           <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white text-sm font-bold mt-auto transition-colors"><LogOut size={18}/> Logout</button>
        </div>
        <main className="flex-1 overflow-y-auto p-8 lg:p-12">
           <header className="mb-12 flex justify-between items-center">
             <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome, {userProfile.businessName}</h1>
                <p className="text-slate-500 font-medium">Supply channel active and monitored.</p>
             </div>
             <div className="flex items-center gap-4">
               {dataLoading && <Loader2 size={18} className="animate-spin text-indigo-400" />}
               <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase text-slate-500">Live Status</span>
               </div>
             </div>
           </header>

           {activeTab === DashboardTab.OVERVIEW && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px]">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Orders</p>
                    <p className="text-5xl font-black text-slate-900">{supplyOrders.filter(o => o.status === 'PENDING').length}</p>
                    <p className="text-xs text-indigo-600 font-bold">Needs Fulfillment</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px]">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shipped Total</p>
                    <p className="text-5xl font-black text-slate-900">{supplyOrders.filter(o => o.status === 'SHIPPED').length}</p>
                    <p className="text-xs text-emerald-600 font-bold">In Transit</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px]">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Listings</p>
                    <p className="text-5xl font-black text-slate-900">{products.length}</p>
                    <p className="text-xs text-slate-400 font-medium">Platform Wide</p>
                  </div>
                </div>
              </div>
           )}

           {activeTab === DashboardTab.CATALOG && (
             <SupplierCatalog products={products} setProducts={setProducts} currentUserProfile={userProfile} />
           )}

           {activeTab === DashboardTab.SUPPLY_ORDERS && (
              <div className="space-y-6">
                <header>
                  <h2 className="text-2xl font-black text-slate-900">Retailer Requests</h2>
                  <p className="text-slate-500 text-sm">Update shipping status to notify your retailers.</p>
                </header>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {supplyOrders.length === 0 ? <div className="p-20 text-center text-slate-400 italic">No incoming orders yet.</div> : (
                      supplyOrders.map(order => (
                        <div key={order.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-all gap-6">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl font-black">R</div>
                            <div>
                              <div className="font-black text-slate-900 text-lg">{order.retailerBusinessName}</div>
                              <div className="text-sm text-slate-500 font-medium">{order.quantity} {order.unit} of <span className="text-indigo-600 font-bold">{order.productName}</span></div>
                              <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Order ID: {order.id.substring(0,12)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                             {order.status === 'PENDING' ? (
                               <>
                                 <button onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all active:scale-95"><XCircle size={18}/> Cancel Order</button>
                                 <button onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"><CheckCircle2 size={18}/> Confirm & Ship</button>
                               </>
                             ) : (
                               <div className="flex flex-col items-end gap-1">
                                 <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${order.status === 'SHIPPED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                   {order.status}
                                 </span>
                                 <p className="text-[10px] text-slate-400 font-medium">Retailer has been notified</p>
                               </div>
                             )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
           )}

           {activeTab === DashboardTab.PROFILE && (
             <ProfileSettings profile={userProfile} setProfile={setUserProfile} />
           )}
        </main>
      </div>
    );
  }

  // Retailer Layout
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-center sticky top-0 bg-slate-50/80 backdrop-blur-md z-40 py-4 border-b border-slate-200 -mx-8 px-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight capitalize">
              {activeTab === DashboardTab.PROFILE ? 'Settings' : activeTab.replace('_', ' ').toLowerCase()}
            </h1>
            <p className="text-slate-500 font-medium text-sm">{userProfile.businessName}</p>
          </div>
          <div className="flex items-center gap-4">
             <NotificationCenter />
             <div className="bg-white shadow-sm border border-slate-200 pl-4 pr-2 py-2 rounded-2xl flex items-center space-x-4">
                <div className="flex flex-col text-right">
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Retailer Account</span>
                   <span className="text-sm font-black text-slate-700 truncate max-w-[150px]">{userProfile.businessName}</span>
                </div>
                <button onClick={handleLogout} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><LogOut size={18} /></button>
             </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto pb-20">
          {activeTab === DashboardTab.OVERVIEW && <Overview products={products} forecasts={forecasts} anomalies={anomalies} />}
          {activeTab === DashboardTab.INVENTORY && <InventoryTable products={products} setProducts={setProducts} onRestock={handleRestock} />}
          {activeTab === DashboardTab.FORECAST && <ForecastDashboard products={products} sales={sales} forecasts={forecasts} />}
          {activeTab === DashboardTab.SIMULATION && <SimulationTool simulation={simulation} setSimulation={setSimulation} products={products} setProducts={setProducts} forecasts={forecasts} currentUserProfile={userProfile} />}
          {activeTab === DashboardTab.SALES_TERMINAL && <SalesTerminal products={products} onCompleteSale={handleSale} />}
          {activeTab === DashboardTab.PAST_BILLS && <SalesHistory bills={bills} />}
          {activeTab === DashboardTab.SUPPLY_ORDERS && (
            <div className="space-y-6">
              <header>
                <h2 className="text-2xl font-black text-slate-900">Supply Tracking</h2>
                <p className="text-slate-500 text-sm">Monitor shipments from platform suppliers.</p>
              </header>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="divide-y divide-slate-100">
                    {supplyOrders.length === 0 ? <div className="p-12 text-center text-slate-400 italic">No requests sent yet.</div> : (
                      supplyOrders.map(order => (
                        <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all">
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                order.status === 'SHIPPED' ? 'bg-emerald-50 text-emerald-600' : 
                                order.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600' : 
                                'bg-indigo-50 text-indigo-600'
                              }`}>
                                 {order.status === 'SHIPPED' ? <Truck size={24}/> : order.status === 'CANCELLED' ? <XCircle size={24}/> : <Clock size={24}/>}
                              </div>
                              <div>
                                 <div className="font-black text-slate-900">{order.supplierBusinessName}</div>
                                 <div className="text-sm text-slate-500 font-medium">{order.quantity} {order.unit} of <span className="font-bold">{order.productName}</span></div>
                                 <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Ref: {order.id.substring(0,8)}</div>
                              </div>
                           </div>
                           <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-slate-400 font-bold">{new Date(order.createdAt).toLocaleDateString()}</span>
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                order.status === 'SHIPPED' ? 'bg-emerald-100 text-emerald-700' : 
                                order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : 
                                'bg-indigo-100 text-indigo-700'
                              }`}>
                                 {order.status}
                              </span>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
              </div>
            </div>
          )}
          {activeTab === DashboardTab.PROFILE && (
            <ProfileSettings profile={userProfile} setProfile={setUserProfile} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
