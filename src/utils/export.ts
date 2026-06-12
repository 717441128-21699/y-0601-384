import * as XLSX from 'xlsx';
import { Bill, Lease, Tenant, Property, Transaction, Expense, Deposit } from '../types';
import { formatDate, formatCurrency, getCurrentPeriod } from './date';
import { 
  getTenantNameByBill, 
  getPropertyNameByBill, 
  getExpenseCategoryLabel, 
  getBillStatusLabel,
  getLeaseByBill 
} from './finance';

export interface LedgerExportRow {
  月份: string;
  房源名称: string;
  租客姓名: string;
  租金: number;
  水费: number;
  电费: number;
  物业费: number;
  其他费用: number;
  应收总额: number;
  已收金额: number;
  欠费金额: number;
  账单状态: string;
  缴费日期: string;
  备注: string;
}

export interface ExpenseExportRow {
  日期: string;
  房源名称: string;
  费用类别: string;
  金额: number;
  描述: string;
  备注: string;
}

export interface PropertyReportExportRow {
  房源名称: string;
  总收入: number;
  总支出: number;
  净利润: number;
  入住率: string;
  空置天数: number;
  平均租金: number;
  投资回报率: string;
}

export const exportLedgerToExcel = (
  bills: Bill[],
  leases: Lease[],
  tenants: Tenant[],
  properties: Property[],
  period?: string
): void => {
  const filteredBills = period
    ? bills.filter(b => b.period === period)
    : bills;

  const rows: LedgerExportRow[] = filteredBills.map(bill => {
    const tenantName = getTenantNameByBill(bill, leases, tenants);
    const propertyName = getPropertyNameByBill(bill, leases, properties);
    
    return {
      月份: bill.period,
      房源名称: propertyName,
      租客姓名: tenantName,
      租金: bill.rentAmount,
      水费: bill.waterFee,
      电费: bill.electricFee,
      物业费: bill.propertyFee,
      其他费用: bill.otherFee,
      应收总额: bill.totalAmount,
      已收金额: bill.paidAmount || 0,
      欠费金额: bill.totalAmount - (bill.paidAmount || 0),
      账单状态: getBillStatusLabel(bill.status),
      缴费日期: bill.paidDate ? formatDate(bill.paidDate) : '',
      备注: bill.notes || '',
    };
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, '租金台账');

  const summaryRow = {
    月份: '合计',
    房源名称: '',
    租客姓名: '',
    租金: rows.reduce((sum, r) => sum + r.租金, 0),
    水费: rows.reduce((sum, r) => sum + r.水费, 0),
    电费: rows.reduce((sum, r) => sum + r.电费, 0),
    物业费: rows.reduce((sum, r) => sum + r.物业费, 0),
    其他费用: rows.reduce((sum, r) => sum + r.其他费用, 0),
    应收总额: rows.reduce((sum, r) => sum + r.应收总额, 0),
    已收金额: rows.reduce((sum, r) => sum + r.已收金额, 0),
    欠费金额: rows.reduce((sum, r) => sum + r.欠费金额, 0),
    账单状态: '',
    缴费日期: '',
    备注: '',
  };

  XLSX.utils.sheet_add_json(worksheet, [summaryRow], { skipHeader: true, origin: rows.length + 1 });

  const filename = `租金台账_${period || getCurrentPeriod()}_${formatDate(new Date())}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

export const exportExpensesToExcel = (
  expenses: Expense[],
  properties: Property[],
  period?: string
): void => {
  const filteredExpenses = period
    ? expenses.filter(e => {
        const expenseMonth = e.expenseDate.substring(0, 7);
        return expenseMonth === period;
      })
    : expenses;

  const rows: ExpenseExportRow[] = filteredExpenses.map(expense => {
    const property = properties.find(p => p.id === expense.propertyId);
    return {
      日期: formatDate(expense.expenseDate),
      房源名称: property?.name || '未关联',
      费用类别: getExpenseCategoryLabel(expense.category),
      金额: expense.amount,
      描述: expense.description,
      备注: expense.notes || '',
    };
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, '支出明细');

  const summaryRow = {
    日期: '合计',
    房源名称: '',
    费用类别: '',
    金额: rows.reduce((sum, r) => sum + r.金额, 0),
    描述: '',
    备注: '',
  };

  XLSX.utils.sheet_add_json(worksheet, [summaryRow], { skipHeader: true, origin: rows.length + 1 });

  const filename = `支出明细_${period || getCurrentPeriod()}_${formatDate(new Date())}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

export const exportAllData = (
  bills: Bill[],
  expenses: Expense[],
  transactions: Transaction[],
  leases: Lease[],
  tenants: Tenant[],
  properties: Property[],
  deposits: Deposit[]
): void => {
  const workbook = XLSX.utils.book_new();

  const billsSheet = XLSX.utils.json_to_sheet(bills.map(b => ({
    ID: b.id,
    账期: b.period,
    合同ID: b.leaseId,
    租金: b.rentAmount,
    水费: b.waterFee,
    电费: b.electricFee,
    物业费: b.propertyFee,
    其他: b.otherFee,
    合计: b.totalAmount,
    状态: getBillStatusLabel(b.status),
    到期日: formatDate(b.dueDate),
    缴费日: b.paidDate ? formatDate(b.paidDate) : '',
    已缴金额: b.paidAmount || '',
    备注: b.notes || '',
  })));
  XLSX.utils.book_append_sheet(workbook, billsSheet, '账单');

  const expensesSheet = XLSX.utils.json_to_sheet(expenses.map(e => ({
    ID: e.id,
    日期: formatDate(e.expenseDate),
    房源ID: e.propertyId,
    类别: getExpenseCategoryLabel(e.category),
    金额: e.amount,
    描述: e.description,
    备注: e.notes || '',
  })));
  XLSX.utils.book_append_sheet(workbook, expensesSheet, '支出');

  const transactionsSheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
    ID: t.id,
    日期: formatDate(t.transactionDate),
    描述: t.description,
    金额: t.amount,
    类型: t.type === 'income' ? '收入' : t.type === 'expense' ? '支出' : '未知',
    银行: t.bank,
    已匹配: t.isMatched ? '是' : '否',
    关联账单ID: t.matchedBillId || '',
    备注: t.notes || '',
  })));
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, '交易流水');

  const leasesSheet = XLSX.utils.json_to_sheet(leases.map(l => ({
    ID: l.id,
    房源ID: l.propertyId,
    租客ID: l.tenantId,
    起租日: formatDate(l.startDate),
    到期日: formatDate(l.endDate),
    月租金: l.monthlyRent,
    押金: l.depositAmount,
    付款周期: l.paymentCycle === 'monthly' ? '月付' : l.paymentCycle === 'quarterly' ? '季付' : '年付',
    交租日: `每月${l.rentDay}日`,
    状态: l.status,
    备注: l.notes || '',
  })));
  XLSX.utils.book_append_sheet(workbook, leasesSheet, '合同');

  const propertiesSheet = XLSX.utils.json_to_sheet(properties.map(p => ({
    ID: p.id,
    名称: p.name,
    地址: p.address,
    面积: p.area,
    月租金: p.monthlyRent,
    户型: `${p.bedrooms}室${p.bathrooms}卫`,
    状态: p.status,
    备注: p.notes || '',
  })));
  XLSX.utils.book_append_sheet(workbook, propertiesSheet, '房源');

  const tenantsSheet = XLSX.utils.json_to_sheet(tenants.map(t => ({
    ID: t.id,
    姓名: t.name,
    电话: t.phone,
    身份证: t.idCard,
    邮箱: t.email || '',
    紧急联系人: t.emergencyContact || '',
    备注: t.notes || '',
  })));
  XLSX.utils.book_append_sheet(workbook, tenantsSheet, '租客');

  const depositsSheet = XLSX.utils.json_to_sheet(deposits.map(d => ({
    ID: d.id,
    租客ID: d.tenantId,
    房源ID: d.propertyId,
    金额: d.amount,
    收到日期: formatDate(d.receivedDate),
    状态: d.status === 'held' ? '保管中' : d.status === 'refunded' ? '已退还' : '已抵扣',
    退还日期: d.refundDate ? formatDate(d.refundDate) : '',
    退还金额: d.refundAmount || '',
    扣除原因: d.deductionReason || '',
    备注: d.notes || '',
  })));
  XLSX.utils.book_append_sheet(workbook, depositsSheet, '押金');

  const filename = `租金管理完整数据_${formatDate(new Date())}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

export const generateBackupData = (data: any): string => {
  return JSON.stringify({
    version: '1.0',
    exportDate: new Date().toISOString(),
    data,
  }, null, 2);
};

export const restoreBackupData = (jsonString: string): any | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.version && parsed.data) {
      return parsed.data;
    }
    return null;
  } catch (error) {
    console.error('解析备份数据失败:', error);
    return null;
  }
};
