
import { Product, SalesData } from './types';

export const PRODUCTS: Product[] = [
  { 
    id: 'P001', 
    name: 'Organic Coffee Beans', 
    category: 'Grocery', 
    currentStock: 45, 
    minStockLevel: 20, 
    leadTimeDays: 3, 
    unitPrice: 18.50,
    unit: 'kg',
    supplierName: 'BeanDirect Co.',
    supplierPhone: '1234567890'
  },
  { 
    id: 'P002', 
    name: 'Oat Milk - Barista Edition', 
    category: 'Dairy', 
    currentStock: 12, 
    minStockLevel: 30, 
    leadTimeDays: 2, 
    unitPrice: 4.20,
    unit: 'pcs',
    supplierName: 'PureDairy Ltd',
    supplierPhone: '0987654321'
  },
  { 
    id: 'P003', 
    name: 'Sourdough Bread', 
    category: 'Bakery', 
    currentStock: 15, 
    minStockLevel: 10, 
    leadTimeDays: 1, 
    unitPrice: 6.00,
    unit: 'pcs',
    supplierName: 'Local Oven',
    supplierPhone: '1122334455'
  },
  { 
    id: 'P004', 
    name: 'Avocado (Bulk Pack)', 
    category: 'Produce', 
    currentStock: 80, 
    minStockLevel: 25, 
    leadTimeDays: 4, 
    unitPrice: 12.00,
    unit: 'pack',
    supplierName: 'GreenEarth Farms',
    supplierPhone: '5566778899'
  },
  { 
    id: 'P005', 
    name: 'Basmati Rice', 
    category: 'Grocery', 
    currentStock: 100, 
    minStockLevel: 20, 
    leadTimeDays: 3, 
    unitPrice: 3.50,
    unit: 'kg',
    supplierName: 'Global Grains',
    supplierPhone: '1231231234'
  },
];

const generateSales = (): SalesData[] => {
  const sales: SalesData[] = [];
  const now = new Date();
  
  PRODUCTS.forEach(product => {
    let baseRate = product.id === 'P001' ? 8 : product.id === 'P002' ? 12 : 10;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const variance = Math.floor(Math.random() * 5) - 2;
      const trend = Math.floor((30 - i) / 10);
      
      let bonus = 0;
      if (product.id === 'P001' && i === 5) bonus = 25;
      
      sales.push({
        productId: product.id,
        date: dateStr,
        unitsSold: Math.max(0, baseRate + variance + trend + bonus),
        isPromotion: i === 5 && product.id === 'P001'
      });
    }
  });
  
  return sales;
};

export const SALES_HISTORY = generateSales();
