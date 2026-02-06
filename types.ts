
export enum UserRole {
  RETAILER = 'RETAILER',
  SUPPLIER = 'SUPPLIER'
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  role: UserRole;
  businessName: string;
  phoneNumber?: string;
}

export interface SupplyOrder {
  id: string;
  retailerId: string;
  retailerBusinessName: string;
  supplierId: string;
  supplierBusinessName: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  status: 'PENDING' | 'ACCEPTED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  leadTimeDays: number;
  unitPrice: number;
  unit: string;
  supplierPhone?: string;
  supplierName?: string;
  supplierId?: string; 
}

export interface SalesData {
  productId: string;
  date: string;
  unitsSold: number;
  isPromotion?: boolean;
}

export interface BillItem {
  productId: string;
  name: string;
  quantity: number; 
  price: number;
  unit: string;
}

export interface Bill {
  id: string;
  date: string;
  items: BillItem[];
  total: number;
}

export interface ForecastResult {
  productId: string;
  historicalAvg: number;
  predictedDemand7Days: number;
  trendPercentage: number;
  recommendedRestock: number;
  explanation?: string;
}

export interface Anomaly {
  id: string;
  productId: string;
  type: 'SPIKE' | 'DROP' | 'SUPPLY_DELAY' | 'STATUS_CHANGE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  date: string;
}

export enum DashboardTab {
  OVERVIEW = 'OVERVIEW',
  INVENTORY = 'INVENTORY',
  FORECAST = 'FORECAST',
  SIMULATION = 'SIMULATION',
  SALES_TERMINAL = 'SALES_TERMINAL',
  PAST_BILLS = 'PAST_BILLS',
  SUPPLY_ORDERS = 'SUPPLY_ORDERS',
  PROFILE = 'PROFILE',
  CATALOG = 'CATALOG'
}
