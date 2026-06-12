import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Transaction, Bill, Lease } from '../types';
import { generateId, formatDate } from './date';

export const parseCSVFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(results.errors);
        } else {
          resolve(results.data as any[]);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        resolve(jsonData as any[]);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsBinaryString(file);
  });
};

export const parseBankStatement = async (file: File): Promise<Transaction[]> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let rawData: any[];

  try {
    if (extension === 'csv') {
      rawData = await parseCSVFile(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      rawData = await parseExcelFile(file);
    } else {
      throw new Error('不支持的文件格式，请上传CSV或Excel文件');
    }

    return mapToTransactions(rawData, file.name);
  } catch (error) {
    console.error('解析文件失败:', error);
    throw error;
  }
};

const mapToTransactions = (rawData: any[], filename: string): Transaction[] => {
  const transactions: Transaction[] = [];

  for (const row of rawData) {
    const transaction = mapRowToTransaction(row, filename);
    if (transaction) {
      transactions.push(transaction);
    }
  }

  return transactions;
};

const mapRowToTransaction = (row: any, filename: string): Transaction | null => {
  const keys = Object.keys(row).map(k => k.toLowerCase());
  
  let date = '';
  let description = '';
  let amount = 0;
  let type: 'income' | 'expense' | 'unknown' = 'unknown';
  let bank = detectBank(filename);

  for (const key of keys) {
    const value = row[key];
    
    if (key.includes('日期') || key.includes('date') || key.includes('时间')) {
      date = String(value);
    }
    
    if (key.includes('摘要') || key.includes('描述') || key.includes('备注') || 
        key.includes('description') || key.includes('remark') || key.includes('memo')) {
      description = String(value);
    }
    
    if (key.includes('金额') || key.includes('amount') || key.includes('收入') || key.includes('支出')) {
      const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
      if (!isNaN(num)) {
        amount = num;
      }
    }
    
    if (key.includes('收入') && !key.includes('支出')) {
      const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
      if (!isNaN(num) && num > 0) {
        amount = num;
        type = 'income';
      }
    }
    
    if (key.includes('支出') && !key.includes('收入')) {
      const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
      if (!isNaN(num) && num > 0) {
        amount = -num;
        type = 'expense';
      }
    }
    
    if (key.includes('收支') || key.includes('方向')) {
      const dir = String(value);
      if (dir.includes('收入') || dir.includes('贷') || dir.includes('in')) {
        type = 'income';
      } else if (dir.includes('支出') || dir.includes('借') || dir.includes('out')) {
        type = 'expense';
      }
    }
  }

  if (type === 'unknown') {
    if (amount > 0) {
      type = 'income';
    } else if (amount < 0) {
      type = 'expense';
    }
  }

  if (!date || !description || Math.abs(amount) < 0.01) {
    return null;
  }

  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return null;
  }

  return {
    id: generateId(),
    transactionDate: normalizedDate,
    description: description.trim(),
    amount: Math.abs(amount),
    type,
    bank,
    isMatched: false,
    createdAt: new Date().toISOString(),
  };
};

const normalizeDate = (dateStr: string): string | null => {
  const cleaned = dateStr.replace(/[年月]/g, '-').replace(/日/g, '').trim();
  
  const formats = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    /^(\d{4})(\d{2})(\d{2})$/,
    /^(\d{2})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      let [_, year, month, day] = match;
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return formatDate(parsed);
  }

  return null;
};

const detectBank = (filename: string): string => {
  const lower = filename.toLowerCase();
  if (lower.includes('工行') || lower.includes('icbc')) return '工商银行';
  if (lower.includes('建行') || lower.includes('ccb')) return '建设银行';
  if (lower.includes('农行') || lower.includes('abc')) return '农业银行';
  if (lower.includes('中行') || lower.includes('boc')) return '中国银行';
  if (lower.includes('招行') || lower.includes('cmb')) return '招商银行';
  if (lower.includes('交行') || lower.includes('bocom')) return '交通银行';
  if (lower.includes('支付宝') || lower.includes('alipay')) return '支付宝';
  if (lower.includes('微信') || lower.includes('wechat')) return '微信支付';
  return '其他银行';
};

export const matchTransactionToBill = (
  transaction: Transaction,
  bills: Bill[],
  leases: Lease[]
): string | null => {
  if (transaction.type !== 'income' || transaction.isMatched) {
    return null;
  }

  const amount = transaction.amount;
  const desc = transaction.description.toLowerCase();

  for (const bill of bills) {
    if (bill.status === 'paid' || bill.matchedTransactionId) {
      continue;
    }

    if (Math.abs(bill.totalAmount - amount) < 1) {
      return bill.id;
    }

    const lease = leases.find(l => l.id === bill.leaseId);
    if (lease && Math.abs(lease.monthlyRent - amount) < 1) {
      return bill.id;
    }

    if (desc.length > 0) {
      const lease = leases.find(l => l.id === bill.leaseId);
      if (lease) {
        if (desc.includes(lease.id.substring(0, 6))) {
          return bill.id;
        }
      }
    }
  }

  for (const bill of bills) {
    if (bill.status === 'paid' || bill.matchedTransactionId) {
      continue;
    }

    if (Math.abs(bill.totalAmount - amount) <= bill.totalAmount * 0.1) {
      return bill.id;
    }
  }

  return null;
};

export const autoMatchTransactions = (
  transactions: Transaction[],
  bills: Bill[],
  leases: Lease[]
): {
  updatedTransactions: Transaction[];
  updatedBills: Bill[];
  matchedCount: number;
} => {
  const updatedTransactions = [...transactions];
  const updatedBills = [...bills];
  let matchedCount = 0;

  for (let i = 0; i < updatedTransactions.length; i++) {
    const transaction = updatedTransactions[i];
    if (transaction.isMatched) continue;

    const matchedBillId = matchTransactionToBill(transaction, updatedBills, leases);
    if (matchedBillId) {
      updatedTransactions[i] = {
        ...transaction,
        isMatched: true,
        matchedBillId,
      };

      const billIndex = updatedBills.findIndex(b => b.id === matchedBillId);
      if (billIndex !== -1) {
        updatedBills[billIndex] = {
          ...updatedBills[billIndex],
          status: 'paid',
          paidDate: transaction.transactionDate,
          paidAmount: transaction.amount,
          matchedTransactionId: transaction.id,
        };
      }

      matchedCount++;
    }
  }

  return { updatedTransactions, updatedBills, matchedCount };
};

export const detectRentPayment = (
  transaction: Transaction,
  leases: Lease[]
): { isRent: boolean; leaseId?: string; confidence: number } => {
  if (transaction.type !== 'income') {
    return { isRent: false, confidence: 0 };
  }

  const amount = transaction.amount;
  const desc = transaction.description.toLowerCase();

  for (const lease of leases) {
    if (lease.status !== 'active') continue;

    let confidence = 0;

    if (Math.abs(lease.monthlyRent - amount) < 1) {
      confidence += 50;
    } else if (Math.abs(lease.monthlyRent - amount) <= lease.monthlyRent * 0.1) {
      confidence += 30;
    }

    const rentKeywords = ['租金', '房租', 'rent', '房租费', '季度', '半年'];
    for (const keyword of rentKeywords) {
      if (desc.includes(keyword)) {
        confidence += 20;
        break;
      }
    }

    if (confidence >= 50) {
      return { isRent: true, leaseId: lease.id, confidence: Math.min(confidence, 100) };
    }
  }

  return { isRent: false, confidence: 0 };
};

export const generateFieldMapping = (headers: string[]): Record<string, string> => {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const lower = header.toLowerCase();
    
    if (lower.includes('日期') || lower.includes('date') || lower.includes('时间')) {
      mapping[header] = 'transactionDate';
    } else if (lower.includes('摘要') || lower.includes('描述') || lower.includes('备注')) {
      mapping[header] = 'description';
    } else if (lower.includes('金额') || lower.includes('amount')) {
      mapping[header] = 'amount';
    } else if (lower.includes('收入') && !lower.includes('支出')) {
      mapping[header] = 'income';
    } else if (lower.includes('支出') && !lower.includes('收入')) {
      mapping[header] = 'expense';
    } else if (lower.includes('收支') || lower.includes('方向')) {
      mapping[header] = 'type';
    } else if (lower.includes('余额') || lower.includes('balance')) {
      mapping[header] = 'balance';
    } else if (lower.includes('对方') || lower.includes('payer')) {
      mapping[header] = 'payer';
    }
  }

  return mapping;
};
