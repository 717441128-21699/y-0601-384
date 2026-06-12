export interface Property {
  id: string;
  name: string;
  address: string;
  area: number;
  monthlyRent: number;
  propertyType: 'apartment' | 'house' | 'studio' | 'other';
  bedrooms: number;
  bathrooms: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  imageUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  idCard: string;
  email?: string;
  emergencyContact?: string;
  notes?: string;
  createdAt: string;
}

export interface Lease {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  paymentCycle: 'monthly' | 'quarterly' | 'yearly';
  rentDay: number;
  status: 'active' | 'expired' | 'terminated';
  notes?: string;
  createdAt: string;
}

export interface Bill {
  id: string;
  leaseId: string;
  period: string;
  totalAmount: number;
  rentAmount: number;
  waterFee: number;
  electricFee: number;
  propertyFee: number;
  otherFee: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  matchedTransactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  transactionDate: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'unknown';
  bank: string;
  matchedBillId?: string;
  isMatched: boolean;
  isSuspected?: boolean;
  suspicionReason?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  propertyId: string;
  category: 'maintenance' | 'property' | 'water' | 'electric' | 'internet' | 'insurance' | 'tax' | 'other';
  amount: number;
  expenseDate: string;
  description: string;
  receipt?: string;
  notes?: string;
  createdAt: string;
}

export interface Deposit {
  id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  receivedDate: string;
  status: 'held' | 'refunded' | 'deducted';
  refundDate?: string;
  refundAmount?: number;
  deductionReason?: string;
  notes?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  type: 'rent_due' | 'lease_expiry' | 'bill_overdue' | 'maintenance' | 'other';
  relatedId: string;
  title: string;
  content: string;
  dueDate: string;
  isRead: boolean;
  isCompleted: boolean;
  createdAt: string;
}

export interface MonthlySummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  billsPaid: number;
  billsPending: number;
  billsOverdue: number;
}

export interface PropertyReport {
  propertyId: string;
  propertyName: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  occupancyRate: number;
  vacantDays: number;
  averageRent: number;
  roi: number;
}

export interface CollectionTemplate {
  type: 'sms' | 'wechat';
  template: string;
}

export type PageType = 
  | 'dashboard'
  | 'properties'
  | 'property-detail'
  | 'tenants'
  | 'tenant-detail'
  | 'bills'
  | 'expenses'
  | 'import'
  | 'reminders'
  | 'reconciliation'
  | 'reports';
