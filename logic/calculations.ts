
import { Product, SalesData, ForecastResult, Anomaly } from '../types';

/**
 * Enhanced Simulation: Support for festival-based category spikes
 */
export interface SpecialEvent {
  name: string;
  categoryBoosts: { [category: string]: number }; // e.g., { 'Grocery': 2.5, 'Produce': 1.8 }
}

export interface SimulationParams {
  demandMultiplier: number;
  leadTimeDelayDays: number;
  isPromotionActive: boolean;
  activeEvent?: SpecialEvent;
}

export const calculateForecast = (
  product: Product, 
  sales: SalesData[], 
  daysToForecast: number = 7,
  simulation: SimulationParams = { demandMultiplier: 1.0, leadTimeDelayDays: 0, isPromotionActive: false }
): ForecastResult => {
  const productSales = sales
    .filter(s => s.productId === product.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (productSales.length === 0) {
    return {
      productId: product.id,
      historicalAvg: 0,
      predictedDemand7Days: 0,
      trendPercentage: 0,
      recommendedRestock: product.minStockLevel,
    };
  }

  // Simple Moving Average (last 7 days)
  const recentSales = productSales.slice(0, 7);
  const avgSales = recentSales.reduce((acc, curr) => acc + curr.unitsSold, 0) / Math.max(1, recentSales.length);

  // Linear Trend
  const priorSales = productSales.slice(7, 14);
  const priorAvg = priorSales.length > 0 
    ? priorSales.reduce((acc, curr) => acc + curr.unitsSold, 0) / priorSales.length
    : avgSales;

  const trend = priorAvg !== 0 ? ((avgSales - priorAvg) / priorAvg) * 100 : 0;
  
  // Base demand adjusted for trend
  const trendAdjustment = 1 + (trend / 100);
  
  // Simulation Multipliers
  const promoMultiplier = simulation.isPromotionActive ? 1.4 : 1.0;
  
  // Event Category Boost (e.g., Diwali boost for Oil/Fruits)
  const eventMultiplier = (simulation.activeEvent && simulation.activeEvent.categoryBoosts[product.category]) 
    ? simulation.activeEvent.categoryBoosts[product.category] 
    : 1.0;
  
  // Predicted Demand over the forecast window
  const predicted = Math.ceil(
    avgSales * 
    daysToForecast * 
    trendAdjustment * 
    simulation.demandMultiplier * 
    promoMultiplier * 
    eventMultiplier
  );
  
  // Effective Lead Time includes simulation delay
  const totalLeadTime = product.leadTimeDays + simulation.leadTimeDelayDays;
  
  // Safety Stock Requirement
  const dailyDemand = predicted / Math.max(1, daysToForecast);
  const safetyStockNeeded = Math.ceil(dailyDemand * totalLeadTime);
  
  // Restock logic
  const recommended = Math.max(0, (predicted + safetyStockNeeded) - product.currentStock);

  return {
    productId: product.id,
    historicalAvg: Number(avgSales.toFixed(2)),
    predictedDemand7Days: predicted,
    trendPercentage: Number(trend.toFixed(1)),
    recommendedRestock: recommended
  };
};

export const detectAnomalies = (products: Product[], sales: SalesData[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const today = new Date().toISOString().split('T')[0];

  products.forEach(p => {
    if (p.currentStock <= p.minStockLevel * 0.5) {
      anomalies.push({
        id: `AN-${p.id}-LOW`,
        productId: p.id,
        type: 'DROP',
        severity: 'CRITICAL',
        description: `Extreme low stock alert. Currently at ${p.currentStock.toFixed(2)} ${p.unit}.`,
        date: today
      });
    }

    const pSales = sales.filter(s => s.productId === p.id).slice(0, 3);
    const avgRecent = pSales.reduce((a, b) => a + b.unitsSold, 0) / Math.max(1, pSales.length);
    const historical = sales.filter(s => s.productId === p.id).slice(3, 13);
    const avgHist = historical.reduce((a, b) => a + b.unitsSold, 0) / Math.max(1, historical.length);

    if (avgRecent > avgHist * 1.8) {
      anomalies.push({
        id: `AN-${p.id}-SPIKE`,
        productId: p.id,
        type: 'SPIKE',
        severity: 'WARNING',
        description: `Unusual 80%+ increase in sales detected over the last 3 days.`,
        date: today
      });
    }
  });

  return anomalies;
};
