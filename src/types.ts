export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  salePrice: number;
  costPrice: number; // Stored at time of bill for profit calc
  total: number;
}

export interface Bill {
  id: string;
  billNumber: number;
  customerPhone: string;
  bikeNumber: string;
  bikeModel: string;
  currentMeter: number;
  nextMeter: number;
  serviceCharge: number;
  laborCharge: number;
  discount: number;
  notes?: string;
  items: BillItem[];
  total: number;
  amountPaid: number;
  balance: number;
  profit: number; // (Service Charge + Labor Charge + (Items Sale - Items Cost))
  createdAt: any; // Firebase Timestamp
  staffId: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  items: {
    itemId: string;
    name: string;
    quantity: number;
    costPrice: number;
  }[];
  total: number;
  createdAt: any;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  createdAt: any;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  bikeNumber: string;
  bikeModel: string;
  totalBalance?: number;
}

export interface JobCard {
  id: string;
  customerName: string;
  customerPhone: string;
  bikeNumber: string;
  bikeModel: string;
  currentMeter?: number;
  items: { 
    id: string; 
    name: string; 
    quantity: number; 
    salePrice: number;
    costPrice: number;
  }[];
  serviceCharge: number;
  laborCharge: number;
  discount: number;
  notes: string;
  status: 'active' | 'billed';
  createdAt: any;
  updatedAt: any;
}

export interface InvoiceSettings {
  storeName: string;
  storeTagline: string;
  address: string;
  phone: string;
  footerMessage: string;
  accentColor: string; // Hex color for PDF
  headerFontSize: number;
  bodyFontSize: number;
  paperWidth: number; // in mm
  showSignature: boolean;
  tableTheme: 'striped' | 'grid' | 'plain';
}
