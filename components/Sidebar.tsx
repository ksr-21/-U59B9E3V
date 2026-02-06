
import React from 'react';
import { DashboardTab } from '../types.ts';
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  Settings2,
  Box,
  ShoppingCart,
  History,
  Truck,
  UserCircle
} from 'lucide-react';

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: DashboardTab.OVERVIEW, label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: DashboardTab.SALES_TERMINAL, label: 'Sales Terminal', icon: <ShoppingCart size={20} /> },
    { id: DashboardTab.PAST_BILLS, label: 'Sales History', icon: <History size={20} /> },
    { id: DashboardTab.INVENTORY, label: 'Inventory', icon: <Package size={20} /> },
    { id: DashboardTab.FORECAST, label: 'Forecasting', icon: <TrendingUp size={20} /> },
    { id: DashboardTab.SIMULATION, label: 'What-If Tool', icon: <Settings2 size={20} /> },
    { id: DashboardTab.SUPPLY_ORDERS, label: 'Supply Orders', icon: <Truck size={20} /> },
    { id: DashboardTab.PROFILE, label: 'Business Profile', icon: <UserCircle size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <Box size={24} className="text-white" />
        </div>
        <span className="font-bold text-xl text-white tracking-tight">SmartStock</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'bg-indigo-600 text-white' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Platform Network</p>
          <p className="text-sm text-slate-400">Retail & Supply Unified Intelligence</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
