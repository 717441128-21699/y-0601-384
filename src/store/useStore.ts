import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Property, Tenant, Lease, Bill, Transaction, Expense, Deposit, Reminder, MonthlySummary, PropertyReport 
} from '../types';
import { generateId, getCurrentPeriod, formatDate, getPreviousMonths, getMonthPeriod } from '../utils/date';
import { 
  calculateBillTotal, calculateMonthlySummary, calculatePropertyReport,
  getLeaseByBill, getTenantByLease, getPropertyByLease
} from '../utils/finance';
import { 
  parseBankStatement, autoMatchTransactions, detectRentPayment 
} from '../utils/import';
import { detectAnomaly } from '../utils/finance';
import { generateCollectionText, generateReminders } from '../utils/reminder';
import { getAllMockData } from '../mock/seed';
import { parseISO, addDays } from 'date-fns';

interface AppState {
  properties: Property[];
  tenants: Tenant[];
  leases: Lease[];
  bills: Bill[];
  transactions: Transaction[];
  expenses: Expense[];
  deposits: Deposit[];
  reminders: Reminder[];
  
  isInitialized: boolean;
  initializeData: () => void;
  
  addProperty: (data: Omit<Property, 'id' | 'createdAt'>) => void;
  updateProperty: (id: string, data: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  
  addTenant: (data: Omit<Tenant, 'id' | 'createdAt'>) => void;
  updateTenant: (id: string, data: Partial<Tenant>) => void;
  deleteTenant: (id: string) => void;
  
  addLease: (data: Omit<Lease, 'id' | 'createdAt'>) => void;
  updateLease: (id: string, data: Partial<Lease>) => void;
  deleteLease: (id: string) => void;
  
  createBill: (leaseId: string, period: string) => Bill;
  generateMonthlyBills: (month: string) => Bill[];
  updateBill: (id: string, data: Partial<Bill>) => void;
  markBillPaid: (billId: string, paidDate: string, paidAmount: number) => void;
  markBillPartial: (billId: string, paidDate: string, paidAmount: number) => void;
  deleteBill: (id: string) => void;
  
  importTransactions: (file: File) => Promise<Transaction[]>;
  autoMatchAll: () => number;
  reconcileTransaction: (transactionId: string, billId: string) => void;
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'isMatched'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  addExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  
  addDeposit: (data: Omit<Deposit, 'id' | 'createdAt'>) => void;
  updateDeposit: (id: string, data: Partial<Deposit>) => void;
  deleteDeposit: (id: string) => void;
  
  markReminderRead: (id: string) => void;
  markReminderCompleted: (id: string) => void;
  markAllRemindersRead: () => void;
  refreshReminders: () => void;
  
  getPropertyIncome: (propertyId: string, period?: string) => number;
  getPropertyExpense: (propertyId: string, period?: string) => number;
  getPropertyNetProfit: (propertyId: string, period?: string) => number;
  getMonthlySummary: (month: string) => MonthlySummary;
  getPropertyReports: (period?: string) => PropertyReport[];
  generateCollectionText: (billId: string, type?: 'sms' | 'wechat') => string;
  getUnreadReminderCount: () => number;
  
  exportLedger: (period?: string) => void;
  exportExpenses: (period?: string) => void;
  exportAllData: () => void;
  
  clearAllData: () => void;
  resetToMockData: () => void;
}

const STORAGE_KEY = 'landlord-rent-manager';

const mockData = getAllMockData();

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      properties: [],
      tenants: [],
      leases: [],
      bills: [],
      transactions: [],
      expenses: [],
      deposits: [],
      reminders: [],
      isInitialized: false,

      initializeData: () => {
        const state = get();
        if (!state.isInitialized && state.properties.length === 0) {
          set({
            properties: mockData.properties,
            tenants: mockData.tenants,
            leases: mockData.leases,
            bills: mockData.bills,
            transactions: mockData.transactions,
            expenses: mockData.expenses,
            deposits: mockData.deposits,
            reminders: mockData.reminders,
            isInitialized: true,
          });
        }
      },

      addProperty: (data) => {
        const newProperty: Property = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ properties: [...state.properties, newProperty] }));
      },

      updateProperty: (id, data) => {
        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      deleteProperty: (id) => {
        set((state) => ({
          properties: state.properties.filter((p) => p.id !== id),
          leases: state.leases.filter((l) => l.propertyId !== id),
          expenses: state.expenses.filter((e) => e.propertyId !== id),
          deposits: state.deposits.filter((d) => d.propertyId !== id),
        }));
      },

      addTenant: (data) => {
        const newTenant: Tenant = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ tenants: [...state.tenants, newTenant] }));
      },

      updateTenant: (id, data) => {
        set((state) => ({
          tenants: state.tenants.map((t) =>
            t.id === id ? { ...t, ...data } : t
          ),
        }));
      },

      deleteTenant: (id) => {
        set((state) => ({
          tenants: state.tenants.filter((t) => t.id !== id),
          leases: state.leases.filter((l) => l.tenantId !== id),
          deposits: state.deposits.filter((d) => d.tenantId !== id),
        }));
      },

      addLease: (data) => {
        const newLease: Lease = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ leases: [...state.leases, newLease] }));
      },

      updateLease: (id, data) => {
        set((state) => ({
          leases: state.leases.map((l) =>
            l.id === id ? { ...l, ...data } : l
          ),
        }));
      },

      deleteLease: (id) => {
        set((state) => ({
          leases: state.leases.filter((l) => l.id !== id),
          bills: state.bills.filter((b) => b.leaseId !== id),
        }));
      },

      createBill: (leaseId, period) => {
        const state = get();
        const lease = state.leases.find((l) => l.id === leaseId);
        if (!lease) throw new Error('合同不存在');

        const dueDate = parseISO(`${period}-${lease.rentDay.toString().padStart(2, '0')}`);
        
        const newBill: Bill = {
          id: generateId(),
          leaseId,
          period,
          rentAmount: lease.monthlyRent,
          waterFee: 0,
          electricFee: 0,
          propertyFee: 0,
          otherFee: 0,
          totalAmount: lease.monthlyRent,
          status: 'pending',
          dueDate: formatDate(dueDate),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ bills: [...state.bills, newBill] }));
        return newBill;
      },

      generateMonthlyBills: (month) => {
        const state = get();
        const activeLeases = state.leases.filter((l) => l.status === 'active');
        const newBills: Bill[] = [];

        for (const lease of activeLeases) {
          const existingBill = state.bills.find(
            (b) => b.leaseId === lease.id && b.period === month
          );
          
          if (!existingBill) {
            const dueDate = parseISO(`${month}-${lease.rentDay.toString().padStart(2, '0')}`);
            const newBill: Bill = {
              id: generateId(),
              leaseId: lease.id,
              period: month,
              rentAmount: lease.monthlyRent,
              waterFee: 0,
              electricFee: 0,
              propertyFee: 0,
              otherFee: 0,
              totalAmount: lease.monthlyRent,
              status: 'pending',
              dueDate: formatDate(dueDate),
              createdAt: new Date().toISOString(),
            };
            newBills.push(newBill);
          }
        }

        if (newBills.length > 0) {
          set((state) => ({ bills: [...state.bills, ...newBills] }));
        }

        return newBills;
      },

      updateBill: (id, data) => {
        set((state) => ({
          bills: state.bills.map((b) => {
            if (b.id === id) {
              const updated = { ...b, ...data };
              updated.totalAmount = calculateBillTotal(updated);
              return updated;
            }
            return b;
          }),
        }));
      },

      markBillPaid: (billId, paidDate, paidAmount) => {
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === billId
              ? { ...b, status: 'paid', paidDate, paidAmount }
              : b
          ),
        }));
      },

      markBillPartial: (billId, paidDate, paidAmount) => {
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === billId
              ? { ...b, status: 'partial', paidDate, paidAmount }
              : b
          ),
        }));
      },

      deleteBill: (id) => {
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== id),
          transactions: state.transactions.map((t) =>
            t.matchedBillId === id
              ? { ...t, isMatched: false, matchedBillId: undefined }
              : t
          ),
        }));
      },

      importTransactions: async (file) => {
        const parsedTransactions = await parseBankStatement(file);
        const state = get();
        
        const processedTransactions = parsedTransactions.map((t) => {
          const rentDetection = detectRentPayment(t, state.leases);
          const anomaly = detectAnomaly(t, state.bills, state.leases, state.transactions);
          
          return {
            ...t,
            isSuspected: anomaly.isAnomaly,
            suspicionReason: anomaly.reason,
          };
        });

        set((state) => ({
          transactions: [...processedTransactions, ...state.transactions],
        }));

        return processedTransactions;
      },

      autoMatchAll: () => {
        const state = get();
        const { updatedTransactions, updatedBills, matchedCount } = autoMatchTransactions(
          state.transactions,
          state.bills,
          state.leases
        );

        set({
          transactions: updatedTransactions,
          bills: updatedBills,
        });

        return matchedCount;
      },

      reconcileTransaction: (transactionId, billId) => {
        const state = get();
        const transaction = state.transactions.find((t) => t.id === transactionId);
        const bill = state.bills.find((b) => b.id === billId);

        if (!transaction || !bill) return;

        set({
          transactions: state.transactions.map((t) =>
            t.id === transactionId
              ? { ...t, isMatched: true, matchedBillId: billId }
              : t
          ),
          bills: state.bills.map((b) =>
            b.id === billId
              ? {
                  ...b,
                  status: 'paid',
                  paidDate: transaction.transactionDate,
                  paidAmount: transaction.amount,
                  matchedTransactionId: transactionId,
                }
              : b
          ),
        });
      },

      addTransaction: (data) => {
        const newTransaction: Transaction = {
          ...data,
          id: generateId(),
          isMatched: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ transactions: [newTransaction, ...state.transactions] }));
      },

      updateTransaction: (id, data) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...data } : t
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
          bills: state.bills.map((b) =>
            b.matchedTransactionId === id
              ? { ...b, status: 'pending', paidDate: undefined, paidAmount: undefined, matchedTransactionId: undefined }
              : b
          ),
        }));
      },

      addExpense: (data) => {
        const newExpense: Expense = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ expenses: [...state.expenses, newExpense] }));
      },

      updateExpense: (id, data) => {
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        }));
      },

      deleteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
      },

      addDeposit: (data) => {
        const newDeposit: Deposit = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ deposits: [...state.deposits, newDeposit] }));
      },

      updateDeposit: (id, data) => {
        set((state) => ({
          deposits: state.deposits.map((d) =>
            d.id === id ? { ...d, ...data } : d
          ),
        }));
      },

      deleteDeposit: (id) => {
        set((state) => ({
          deposits: state.deposits.filter((d) => d.id !== id),
        }));
      },

      markReminderRead: (id) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, isRead: true } : r
          ),
        }));
      },

      markReminderCompleted: (id) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, isCompleted: true, isRead: true } : r
          ),
        }));
      },

      markAllRemindersRead: () => {
        set((state) => ({
          reminders: state.reminders.map((r) => ({ ...r, isRead: true })),
        }));
      },

      refreshReminders: () => {
        const state = get();
        const newReminders = generateReminders(
          state.bills,
          state.leases,
          state.tenants,
          state.properties
        );

        const existingIds = new Set(state.reminders.map((r) => r.relatedId + r.type));
        const uniqueNew = newReminders.filter(
          (r) => !existingIds.has(r.relatedId + r.type)
        );

        set((state) => ({
          reminders: [...state.reminders, ...uniqueNew],
        }));
      },

      getPropertyIncome: (propertyId, period) => {
        const state = get();
        const propertyBills = state.bills.filter((b) => {
          const lease = getLeaseByBill(b, state.leases);
          if (!lease || lease.propertyId !== propertyId) return false;
          if (period && b.period !== period) return false;
          return b.status === 'paid' || b.status === 'partial';
        });

        return propertyBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
      },

      getPropertyExpense: (propertyId, period) => {
        const state = get();
        const propertyExpenses = state.expenses.filter((e) => {
          if (e.propertyId !== propertyId) return false;
          if (period) {
            const expensePeriod = getMonthPeriod(parseISO(e.expenseDate));
            if (expensePeriod !== period) return false;
          }
          return true;
        });

        return propertyExpenses.reduce((sum, e) => sum + e.amount, 0);
      },

      getPropertyNetProfit: (propertyId, period) => {
        return (
          get().getPropertyIncome(propertyId, period) -
          get().getPropertyExpense(propertyId, period)
        );
      },

      getMonthlySummary: (month) => {
        const state = get();
        return calculateMonthlySummary(
          month,
          state.properties,
          state.bills,
          state.expenses,
          state.leases
        );
      },

      getPropertyReports: (period) => {
        const state = get();
        return state.properties.map((p) =>
          calculatePropertyReport(p, state.bills, state.expenses, state.leases, period)
        );
      },

      generateCollectionText: (billId, type = 'sms') => {
        const state = get();
        const bill = state.bills.find((b) => b.id === billId);
        if (!bill) return '';

        const lease = getLeaseByBill(bill, state.leases);
        const tenant = lease ? getTenantByLease(lease, state.tenants) : undefined;
        const property = lease ? getPropertyByLease(lease, state.properties) : undefined;

        return generateCollectionText(bill, lease, tenant, property, type);
      },

      getUnreadReminderCount: () => {
        return get().reminders.filter((r) => !r.isRead && !r.isCompleted).length;
      },

      exportLedger: (period) => {
        const { exportLedgerToExcel } = require('../utils/export');
        const state = get();
        exportLedgerToExcel(
          state.bills,
          state.leases,
          state.tenants,
          state.properties,
          period
        );
      },

      exportExpenses: (period) => {
        const { exportExpensesToExcel } = require('../utils/export');
        const state = get();
        exportExpensesToExcel(state.expenses, state.properties, period);
      },

      exportAllData: () => {
        const { exportAllData } = require('../utils/export');
        const state = get();
        exportAllData(
          state.bills,
          state.expenses,
          state.transactions,
          state.leases,
          state.tenants,
          state.properties,
          state.deposits
        );
      },

      clearAllData: () => {
        set({
          properties: [],
          tenants: [],
          leases: [],
          bills: [],
          transactions: [],
          expenses: [],
          deposits: [],
          reminders: [],
          isInitialized: true,
        });
      },

      resetToMockData: () => {
        set({
          properties: mockData.properties,
          tenants: mockData.tenants,
          leases: mockData.leases,
          bills: mockData.bills,
          transactions: mockData.transactions,
          expenses: mockData.expenses,
          deposits: mockData.deposits,
          reminders: mockData.reminders,
          isInitialized: true,
        });
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);
