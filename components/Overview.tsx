
import React from 'react';
import { Product, ForecastResult, Anomaly } from '../types';
import { AlertCircle, TrendingDown, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface OverviewProps {
  products: Product[];
  forecasts: ForecastResult[];
  anomalies: Anomaly[];
}

const Overview: React.FC<OverviewProps> = ({ products, forecasts, anomalies }) => {
  const lowStockCount = products.filter(p => p.currentStock <= p.minStockLevel).length;
  const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL').length;
  const totalStockValue = products.reduce((acc, p) => acc + (p.currentStock * p.unitPrice), 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Stock Value" 
          value={`$${totalStockValue.toLocaleString()}`} 
          subtitle="All active inventory"
          icon={<CheckCircle2 className="text-green-500" />}
        />
        <StatCard 
          title="Low Stock Items" 
          value={lowStockCount.toString()} 
          subtitle="Items below safety level"
          icon={<TrendingDown className="text-amber-500" />}
          urgent={lowStockCount > 0}
        />
        <StatCard 
          title="Critical Alerts" 
          value={criticalAnomalies.toString()} 
          subtitle="Immediate action required"
          icon={<AlertCircle className="text-red-500" />}
          urgent={criticalAnomalies > 0}
        />
        <StatCard 
          title="Forecast Health" 
          value="High" 
          subtitle="92.4% Prediction Accuracy"
          icon={<ArrowUpRight className="text-indigo-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">Anomaly Feed</h3>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs font-medium">Last 24h</span>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {anomalies.length === 0 ? (
              <p className="text-slate-400 text-sm">No anomalies detected today.</p>
            ) : (
              anomalies.map(anomaly => (
                <div key={anomaly.id} className={`p-3 rounded-lg border-l-4 ${
                  anomaly.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'
                }`}>
                  <div className="flex justify-between">
                    <span className="font-semibold text-xs uppercase text-slate-600">
                      {products.find(p => p.id === anomaly.productId)?.name || 'Unknown Product'}
                    </span>
                    <span className="text-[10px] text-slate-400">{anomaly.date}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{anomaly.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Table Preview */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Recommended Actions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Restock Rec</th>
                  <th className="pb-3 text-right">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forecasts.filter(f => f.recommendedRestock > 0).slice(0, 5).map(forecast => {
                  const product = products.find(p => p.id === forecast.productId);
                  if (!product) return null; // Guard against undefined product
                  
                  return (
                    <tr key={forecast.productId} className="text-sm">
                      <td className="py-4 font-medium text-slate-700">{product.name}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          product.currentStock <= product.minStockLevel ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {product.currentStock <= product.minStockLevel ? 'Critical' : 'Warning'}
                        </span>
                      </td>
                      <td className="py-4 text-slate-600">Order {forecast.recommendedRestock} units</td>
                      <td className="py-4 text-right font-semibold text-slate-900">
                        ${(forecast.recommendedRestock * product.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  urgent?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, urgent }) => (
  <div className={`bg-white p-6 rounded-xl border transition-all ${urgent ? 'border-red-200 shadow-red-50 ring-1 ring-red-100' : 'border-slate-200 shadow-sm'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    <p className="text-slate-400 text-xs mt-1">{subtitle}</p>
  </div>
);

export default Overview;
