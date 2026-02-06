
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  addDoc, 
  deleteDoc,
  limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase";
import { Product, SalesData, Bill, UserProfile, SupplyOrder, UserRole } from "../types";

export const dbService = {
  // User Profiles
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, "profiles", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  },

  async createUserProfile(profile: UserProfile) {
    await setDoc(doc(db, "profiles", profile.uid), profile);
  },

  async updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    const docRef = doc(db, "profiles", uid);
    await updateDoc(docRef, updates);
  },

  async searchSuppliers(searchTerm: string): Promise<UserProfile[]> {
    const q = query(
      collection(db, "profiles"),
      where("role", "==", UserRole.SUPPLIER),
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(doc => doc.data() as UserProfile);
    
    if (!searchTerm) return results;
    
    const lowerTerm = searchTerm.toLowerCase();
    return results.filter(p => 
      p.businessName.toLowerCase().includes(lowerTerm) || 
      p.username.toLowerCase().includes(lowerTerm)
    );
  },

  // Supply Orders
  async createSupplyOrder(order: Omit<SupplyOrder, "id">) {
    await addDoc(collection(db, "supply_orders"), order);
  },

  async updateSupplyOrder(orderId: string, status: SupplyOrder['status']) {
    const docRef = doc(db, "supply_orders", orderId);
    await updateDoc(docRef, { status });
  },

  async getRetailerOrders(uid: string): Promise<SupplyOrder[]> {
    const q = query(
      collection(db, "supply_orders"),
      where("retailerId", "==", uid)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as SupplyOrder))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getSupplierOrders(uid: string): Promise<SupplyOrder[]> {
    const q = query(
      collection(db, "supply_orders"),
      where("supplierId", "==", uid)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as SupplyOrder))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Products (Works for both Retailer and Supplier collections)
  async getProducts(uid: string): Promise<Product[]> {
    const q = query(collection(db, "users", uid, "products"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  },

  async saveProduct(uid: string, product: Product) {
    await setDoc(doc(db, "users", uid, "products", product.id), product);
  },

  async deleteProduct(uid: string, productId: string) {
    await deleteDoc(doc(db, "users", uid, "products", productId));
  },

  async updateProductStock(uid: string, productId: string, newStock: number) {
    await updateDoc(doc(db, "users", uid, "products", productId), { currentStock: newStock });
  },

  // Sales
  async getSales(uid: string): Promise<SalesData[]> {
    const q = query(collection(db, "users", uid, "sales"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => doc.data() as SalesData)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async addSales(uid: string, sales: SalesData[]) {
    const batch = sales.map(s => addDoc(collection(db, "users", uid, "sales"), s));
    await Promise.all(batch);
  },

  // Bills
  async getBills(uid: string): Promise<Bill[]> {
    const q = query(collection(db, "users", uid, "bills"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => doc.data() as Bill)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async saveBill(uid: string, bill: Bill) {
    await setDoc(doc(db, "users", uid, "bills", bill.id), bill);
  }
};
