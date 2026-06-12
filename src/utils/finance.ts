import { Bill, Lease, Transaction, Expense, Property, Tenant, Deposit, MonthlySummary, PropertyReport } from '../types';
import { isDateInPeriod, getMonthStartEnd, daysBetween, formatMonth } from './date';
import { parseISO } from 'date-fns';

export const calculateBillTotal = (bill: Partial<Bill>): number => {
  return (
    (bill.rentAmount || 0) +
    (bill.waterFee || 0) +
    (bill.electricFee || 0) +
    (bill.propertyFee || 0) +
    (bill.otherFee || 0)
  );
};

export const calculatePropertyIncome = (
  propertyId: string,
  bills: Bill[],
  period?: string
): number => {
  const propertyBills = bills.filter(b => {
    const lease = getLeaseByBill(b, []);
    if (!lease) return false;
    if (lease.propertyId !== propertyId) return false;
    if (period && !isDateInPeriod(b.dueDate, period)) return false;
    return b.status === 'paid' || b.status === 'partial';
  });

  return propertyBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
};

export const calculatePropertyExpense = (
  propertyId: string,
  expenses: Expense[],
  period?: string
): number => {
  const propertyExpenses = expenses.filter(e => {
    if (e.propertyId !== propertyId) return false;
    if (period && !isDateInPeriod(e.expenseDate, period)) return false;
    return true;
  });

  return propertyExpenses.reduce((sum, e) => sum + e.amount, 0);
};

export const calculatePropertyNetProfit = (
  propertyId: string,
  bills: Bill[],
  expenses: Expense[],
  period?: string
): number => {
  return (
    calculatePropertyIncome(propertyId, bills, period) -
    calculatePropertyExpense(propertyId, expenses, period)
  );
};

export const getLeaseByBill = (bill: Bill, leases: Lease[]): Lease | undefined => {
  return leases.find(l => l.id === bill.leaseId);
};

export const getTenantByLease = (lease: Lease, tenants: Tenant[]): Tenant | undefined => {
  return tenants.find(t => t.id === lease.tenantId);
};

export const getPropertyByLease = (lease: Lease, properties: Property[]): Property | undefined => {
  return properties.find(p => p.id === lease.propertyId);
};

export const getTenantNameByBill = (bill: Bill, leases: Lease[], tenants: Tenant[]): string => {
  const lease = getLeaseByBill(bill, leases);
  if (!lease) return '未知';
  const tenant = getTenantByLease(lease, tenants);
  return tenant?.name || '未知';
};

export const getPropertyNameByBill = (bill: Bill, leases: Lease[], properties: Property[]): string => {
  const lease = getLeaseByBill(bill, leases);
  if (!lease) return '未知';
  const property = getPropertyByLease(lease, properties);
  return property?.name || '未知';
};

export const calculateMonthlySummary = (
  period: string,
  properties: Property[],
  bills: Bill[],
  expenses: Expense[],
  leases: Lease[]
): MonthlySummary => {
  const { start, end } = getMonthStartEnd(period);
  
  const periodBills = bills.filter(b => isDateInPeriod(b.dueDate, period));
  const periodExpenses = expenses.filter(e => isDateInPeriod(e.expenseDate, period));

  const totalIncome = periodBills
    .filter(b => b.status === 'paid' || b.status === 'partial')
    .reduce((sum, b) => sum + (b.paidAmount || 0), 0);

  const totalExpense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const activeLeases = leases.filter(l => l.status === 'active');
  const occupiedUnits = activeLeases.length;
  const vacantUnits = properties.length - occupiedUnits;
  const occupancyRate = properties.length > 0 ? (occupiedUnits / properties.length) * 100 : 0;

  const billsPaid = periodBills.filter(b => b.status === 'paid').length;
  const billsPending = periodBills.filter(b => b.status === 'pending').length;
  const billsOverdue = periodBills.filter(b => b.status === 'overdue').length;

  return {
    month: period,
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    occupiedUnits,
    vacantUnits,
    occupancyRate,
    billsPaid,
    billsPending,
    billsOverdue,
  };
};

export const calculatePropertyReport = (
  property: Property,
  bills: Bill[],
  expenses: Expense[],
  leases: Lease[],
  period?: string
): PropertyReport => {
  const propertyLeases = leases.filter(l => l.propertyId === property.id);
  const activeLease = propertyLeases.find(l => l.status === 'active');

  const totalIncome = calculatePropertyIncome(property.id, bills, period);
  const totalExpense = calculatePropertyExpense(property.id, expenses, period);
  const netProfit = totalIncome - totalExpense;

  let vacantDays = 0;
  if (!activeLease) {
    vacantDays = 30;
  } else {
    const lastEndDate = propertyLeases
      .filter(l => l.status === 'expired' || l.status === 'terminated')
      .sort((a, b) => parseISO(b.endDate).getTime() - parseISO(a.endDate).getTime())[0]?.endDate;
    
    if (lastEndDate) {
      const gap = daysBetween(lastEndDate, activeLease.startDate);
      if (gap > 0) vacantDays = gap;
    }
  }

  const occupiedDays = 30 - vacantDays;
  const occupancyRate = (occupiedDays / 30) * 100;

  const paidBills = bills.filter(b => {
    const lease = getLeaseByBill(b, leases);
    return lease?.propertyId === property.id && b.status === 'paid';
  });

  const averageRent = paidBills.length > 0
    ? paidBills.reduce((sum, b) => sum + b.rentAmount, 0) / paidBills.length
    : property.monthlyRent;

  const totalInvestment = property.monthlyRent * 12 * 15;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  return {
    propertyId: property.id,
    propertyName: property.name,
    totalIncome,
    totalExpense,
    netProfit,
    occupancyRate,
    vacantDays,
    averageRent,
    roi,
  };
};

export const detectAnomaly = (
  transaction: Transaction,
  bills: Bill[],
  leases: Lease[],
  historicalTransactions: Transaction[]
): { isAnomaly: boolean; reason: string } => {
  const amount = Math.abs(transaction.amount);

  const matchingBill = bills.find(b => 
    !b.matchedTransactionId && 
    Math.abs(b.totalAmount - amount) < 1
  );
  
  if (matchingBill) {
    return { isAnomaly: false, reason: '' };
  }

  const lease = leases.find(l => Math.abs(l.monthlyRent - amount) < 1);
  if (lease) {
    return { isAnomaly: false, reason: '' };
  }

  const recentTransactions = historicalTransactions.filter(t => 
    Math.abs(t.amount - amount) < 1 &&
    t.id !== transaction.id
  );

  if (recentTransactions.length >= 2) {
    return { isAnomaly: true, reason: '可能存在重复入账' };
  }

  if (amount < 100) {
    return { isAnomaly: true, reason: '金额异常偏小' };
  }

  if (amount > 50000) {
    return { isAnomaly: true, reason: '金额异常偏大，请核实' };
  }

  const averageAmount = historicalTransactions.length > 0
    ? historicalTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / historicalTransactions.length
    : 3000;

  if (amount > averageAmount * 3 || amount < averageAmount * 0.3) {
    return { isAnomaly: true, reason: '金额偏离历史均值' };
  }

  return { isAnomaly: false, reason: '' };
};

export const getExpenseCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    maintenance: '维修费',
    property: '物业费',
    water: '水费',
    electric: '电费',
    internet: '网络费',
    insurance: '保险费',
    tax: '税费',
    other: '其他支出',
  };
  return labels[category] || category;
};

export const getBillStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    overdue: '已逾期',
    partial: '部分支付',
  };
  return labels[status] || status;
};

export const getBillStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    overdue: 'bg-rose-100 text-rose-800',
    partial: 'bg-blue-100 text-blue-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getPropertyStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    occupied: '已出租',
    vacant: '空置中',
    maintenance: '维修中',
  };
  return labels[status] || status;
};

export const getPropertyStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    occupied: 'bg-emerald-100 text-emerald-800',
    vacant: 'bg-rose-100 text-rose-800',
    maintenance: 'bg-amber-100 text-amber-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getLeaseStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    active: '履行中',
    expired: '已到期',
    terminated: '已终止',
  };
  return labels[status] || status;
};

export const getLeaseStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    expired: 'bg-gray-100 text-gray-800',
    terminated: 'bg-rose-100 text-rose-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getDepositStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    held: '保管中',
    refunded: '已退还',
    deducted: '已抵扣',
  };
  return labels[status] || status;
};

export const getDepositStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    held: 'bg-blue-100 text-blue-800',
    refunded: 'bg-emerald-100 text-emerald-800',
    deducted: 'bg-amber-100 text-amber-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const generateTrendData = (
  months: string[],
  bills: Bill[],
  expenses: Expense[],
  leases: Lease[],
  properties: Property[]
): Array<{ month: string; income: number; expense: number; profit: number }> => {
  return months.map(month => {
    const summary = calculateMonthlySummary(month, properties, bills, expenses, leases);
    return {
      month: formatMonth(month),
      income: summary.totalIncome,
      expense: summary.totalExpense,
      profit: summary.netProfit,
    };
  });
};
