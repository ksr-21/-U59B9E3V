
import React, { useState, useEffect, useMemo } from 'react';
import { Product, SalesData, ForecastResult } from '../types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { getAIExplanation } from '../services/geminiService';
import { Sparkles, BrainCircuit, RefreshCcw, TrendingUp, Search, Loader2 } from 'lucide-react';

interface ForecastDashboardProps {
  products: Product[];
  sales: SalesData[];
  forecasts: ForecastResult[];
}

const ForecastDashboard: React.FC<ForecastDashboardProps> = ({ products, sales, forecasts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(products.length > 0 ? products[0].id : null);
  const [aiExplanation, setAiExplanation] = useState<string>('Generating AI insight...');
  const [isLoading, setIsLoading] = useState(false);

  // Set default selected product once data loads
  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
  const selectedForecast = forecasts.find(f => f.productId === selectedProduct?.id);

  useEffect(() => {
    if (selectedProduct && selectedForecast) {
      const fetchInsight = async () => {
        setIsLoading(true);
        const text = await getAIExplanation(selectedProduct, selectedForecast);
        setAiExplanation(text);
        setIsLoading(false);
      };
      fetchInsight();
    }
  }, [selectedProduct?.id, selectedForecast]);

  const chartData = useMemo(() => {
    if (!selectedProduct || !selectedForecast) return [];

    const pSales = sales
      .filter(s => s.productId === selectedProduct.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);

    const data = pSales.map(s => ({
      name: s.date.slice(-5),
      actual: s.unitsSold,
      predicted: null
    }));

    if (data.length === 0) return [];

    const dailyPredicted = selectedForecast.predictedDemand7Days / 7;
    
    for (let i = 1; i <= 7; i++) {
      data.push({
        name: `Forecast +${i}d`,
        actual: null,
        predicted: Math.round(dailyPredicted + (i * 0.2))
      } as any);
    }

    return data;
  }, [selectedProduct?.id, sales, selectedForecast]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
        <Loader2 className="animate-spin mb-2" />
        <p>Initializing forecast data...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Product Selection List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-500 uppercase px-2">Select Product</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Filter products..." 
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4 italic">No items match search</p>
          ) : (
            filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  selectedProductId === p.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm truncate">{p.name}</div>
                <div className={`text-[10px] ${selectedProductId === p.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                  Stock: {p.currentStock} units
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Forecast Visualization */}
      <div className="lg:col-span-3 space-y-6">
        {selectedProduct && selectedForecast ? (
          <>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedProduct.name} Forecast</h2>
                  <p className="text-sm text-slate-500">Historical Actuals vs. Predicted Trend</p>
                </div>
                <div className="flex space-x-2">
                  <div className="flex items-center space-x-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                      <TrendingUp size={14} />
                      <span>Trend: {selectedForecast.trendPercentage}%</span>
                  </div>
                </div>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#94a3b8'}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#94a3b8'}}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#6366f1' }}
                      name="Historical Sales"
                      activeDot={{ r: 8 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#94a3b8" 
                      strokeDasharray="5 5"
                      strokeWidth={2} 
                      name="AI Prediction"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Insight Card */}
            <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform text-indigo-400">
                <BrainCircuit size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="bg-indigo-600/50 p-1 rounded-lg">
                    <Sparkles className="text-indigo-300" size={20} />
                  </span>
                  <h3 className="font-bold text-lg uppercase tracking-wider">Predictive Explainability</h3>
                </div>
                
                {isLoading ? (
                  <div className="flex items-center space-x-3 py-4">
                    <RefreshCcw className="animate-spin text-indigo-300" />
                    <p className="text-indigo-200">Consulting AI advisor...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-indigo-50 leading-relaxed font-medium text-lg italic">
                      "{aiExplanation}"
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-indigo-800">
                      <div>
                        <span className="text-indigo-400 text-xs block uppercase font-semibold">Suggested Order</span>
                        <span className="text-2xl font-bold">{selectedForecast.recommendedRestock} units</span>
                      </div>
                      <div>
                        <span className="text-indigo-400 text-xs block uppercase font-semibold">Lead Time Risk</span>
                        <span className="text-2xl font-bold">{selectedProduct.leadTimeDays} days</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 italic">
            Select a product to view forecast data.
          </div>
        )}
      </div>
    </div>
  );
};

export default ForecastDashboard;
