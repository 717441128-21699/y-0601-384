import { Property, Tenant, Lease, Bill, Transaction, Expense, Deposit, Reminder } from '../types';
import { generateId, formatDate, getCurrentPeriod, getPreviousMonths } from '../utils/date';
import { subMonths, addMonths, parseISO } from 'date-fns';

const today = new Date();

export const mockProperties: Property[] = [
  {
    id: 'prop-001',
    name: '阳光花园A座1201',
    address: '北京市朝阳区阳光花园A座1201室',
    area: 85,
    monthlyRent: 4500,
    propertyType: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    status: 'occupied',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20bright%20apartment%20living%20room%20with%20large%20windows&image_size=square',
    notes: '精装修，家电齐全',
    createdAt: subMonths(today, 12).toISOString(),
  },
  {
    id: 'prop-002',
    name: '翠湖苑3栋502',
    address: '北京市海淀区翠湖苑3栋502室',
    area: 65,
    monthlyRent: 3800,
    propertyType: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    status: 'occupied',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cozy%20one%20bedroom%20apartment%20interior&image_size=square',
    notes: '近地铁，交通便利',
    createdAt: subMonths(today, 10).toISOString(),
  },
  {
    id: 'prop-003',
    name: '金域华府2号楼1503',
    address: '北京市丰台区金域华府2号楼1503室',
    area: 110,
    monthlyRent: 6200,
    propertyType: 'apartment',
    bedrooms: 3,
    bathrooms: 2,
    status: 'occupied',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spacious%20modern%203%20bedroom%20apartment&image_size=square',
    notes: '三居室，适合家庭居住',
    createdAt: subMonths(today, 8).toISOString(),
  },
];

export const mockTenants: Tenant[] = [
  {
    id: 'tenant-001',
    name: '张三',
    phone: '13800138001',
    idCard: '110101199001011234',
    email: 'zhangsan@example.com',
    emergencyContact: '李四 13900139001',
    notes: 'IT工程师，作息规律',
    createdAt: subMonths(today, 12).toISOString(),
  },
  {
    id: 'tenant-002',
    name: '王五',
    phone: '13800138002',
    idCard: '110101199202022345',
    email: 'wangwu@example.com',
    emergencyContact: '赵六 13900139002',
    notes: '教师，每年有寒暑假',
    createdAt: subMonths(today, 10).toISOString(),
  },
  {
    id: 'tenant-003',
    name: '孙七',
    phone: '13800138003',
    idCard: '110101198803033456',
    email: 'sunqi@example.com',
    emergencyContact: '周八 13900139003',
    notes: '三口之家，有一个小孩',
    createdAt: subMonths(today, 8).toISOString(),
  },
];

export const mockLeases: Lease[] = [
  {
    id: 'lease-001',
    propertyId: 'prop-001',
    tenantId: 'tenant-001',
    startDate: formatDate(subMonths(today, 12)),
    endDate: formatDate(addMonths(today, 1)),
    monthlyRent: 4500,
    depositAmount: 9000,
    paymentCycle: 'monthly',
    rentDay: 5,
    status: 'active',
    notes: '租期1年，续租可谈',
    createdAt: subMonths(today, 12).toISOString(),
  },
  {
    id: 'lease-002',
    propertyId: 'prop-002',
    tenantId: 'tenant-002',
    startDate: formatDate(subMonths(today, 10)),
    endDate: formatDate(addMonths(today, 14)),
    monthlyRent: 3800,
    depositAmount: 7600,
    paymentCycle: 'monthly',
    rentDay: 10,
    status: 'active',
    notes: '租期2年，租金年付有优惠',
    createdAt: subMonths(today, 10).toISOString(),
  },
  {
    id: 'lease-003',
    propertyId: 'prop-003',
    tenantId: 'tenant-003',
    startDate: formatDate(subMonths(today, 8)),
    endDate: formatDate(addMonths(today, 16)),
    monthlyRent: 6200,
    depositAmount: 12400,
    paymentCycle: 'monthly',
    rentDay: 1,
    status: 'active',
    notes: '租期2年，物业费由房东承担',
    createdAt: subMonths(today, 8).toISOString(),
  },
];

const generateBills = (): Bill[] => {
  const bills: Bill[] = [];
  const months = getPreviousMonths(6);
  const currentPeriod = getCurrentPeriod();

  for (const lease of mockLeases) {
    for (let i = 0; i < months.length; i++) {
      const period = months[i];
      const dueDate = parseISO(`${period}-${lease.rentDay.toString().padStart(2, '0')}`);
      
      const isCurrentMonth = period === currentPeriod;
      const isLastMonth = i === months.length - 2;
      
      let status: Bill['status'] = 'paid';
      let paidDate: string | undefined = formatDate(addMonths(dueDate, -1));
      let paidAmount: number | undefined = lease.monthlyRent + 200;

      if (isCurrentMonth) {
        status = 'pending';
        paidDate = undefined;
        paidAmount = undefined;
      } else if (isLastMonth && lease.id === 'lease-001') {
        status = 'overdue';
        paidDate = undefined;
        paidAmount = undefined;
      }

      const bill: Bill = {
        id: `bill-${lease.id}-${period}`,
        leaseId: lease.id,
        period,
        rentAmount: lease.monthlyRent,
        waterFee: Math.floor(Math.random() * 80) + 30,
        electricFee: Math.floor(Math.random() * 200) + 100,
        propertyFee: lease.id === 'lease-003' ? 0 : 150,
        otherFee: 0,
        totalAmount: 0,
        status,
        dueDate: formatDate(dueDate),
        paidDate,
        paidAmount,
        notes: '',
        createdAt: subMonths(today, i).toISOString(),
      };

      bill.totalAmount = bill.rentAmount + bill.waterFee + bill.electricFee + bill.propertyFee + bill.otherFee;
      if (paidAmount) {
        paidAmount = bill.totalAmount;
        bill.paidAmount = paidAmount;
      }

      bills.push(bill);
    }
  }

  return bills;
};

export const mockBills: Bill[] = generateBills();

const generateTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  
  for (let i = 0; i < 5; i++) {
    const date = subMonths(today, i);
    transactions.push({
      id: generateId(),
      transactionDate: formatDate(date),
      description: '张三 转账',
      amount: 4830,
      type: 'income',
      bank: '招商银行',
      matchedBillId: `bill-lease-001-${formatDate(subMonths(today, i), 'yyyy-MM')}`,
      isMatched: true,
      createdAt: date.toISOString(),
    });
  }

  for (let i = 0; i < 5; i++) {
    const date = subMonths(today, i);
    transactions.push({
      id: generateId(),
      transactionDate: formatDate(date),
      description: '王五 房租',
      amount: 4100,
      type: 'income',
      bank: '工商银行',
      matchedBillId: `bill-lease-002-${formatDate(subMonths(today, i), 'yyyy-MM')}`,
      isMatched: true,
      createdAt: date.toISOString(),
    });
  }

  for (let i = 0; i < 5; i++) {
    const date = subMonths(today, i);
    transactions.push({
      id: generateId(),
      transactionDate: formatDate(date),
      description: '孙七 租金',
      amount: 6480,
      type: 'income',
      bank: '支付宝',
      matchedBillId: `bill-lease-003-${formatDate(subMonths(today, i), 'yyyy-MM')}`,
      isMatched: true,
      createdAt: date.toISOString(),
    });
  }

  transactions.push({
    id: generateId(),
    transactionDate: formatDate(today),
    description: '物业维修',
    amount: 850,
    type: 'expense',
    bank: '建设银行',
    isMatched: false,
    createdAt: today.toISOString(),
  });

  transactions.push({
    id: generateId(),
    transactionDate: formatDate(subMonths(today, 1)),
    description: '购买家电',
    amount: 2200,
    type: 'expense',
    bank: '微信支付',
    isMatched: false,
    createdAt: subMonths(today, 1).toISOString(),
  });

  return transactions;
};

export const mockTransactions: Transaction[] = generateTransactions();

const generateExpenses = (): Expense[] => {
  const expenses: Expense[] = [];
  const categories: Expense['category'][] = ['maintenance', 'property', 'water', 'electric', 'insurance', 'tax', 'other'];

  for (let i = 0; i < 15; i++) {
    const date = subMonths(today, Math.floor(Math.random() * 6));
    const propertyIndex = Math.floor(Math.random() * 3);
    
    expenses.push({
      id: generateId(),
      propertyId: mockProperties[propertyIndex].id,
      category: categories[Math.floor(Math.random() * categories.length)],
      amount: Math.floor(Math.random() * 2000) + 100,
      expenseDate: formatDate(date),
      description: `日常${categories[Math.floor(Math.random() * categories.length)]}支出`,
      notes: '',
      createdAt: date.toISOString(),
    });
  }

  return expenses;
};

export const mockExpenses: Expense[] = generateExpenses();

export const mockDeposits: Deposit[] = mockLeases.map(lease => ({
  id: `deposit-${lease.id}`,
  tenantId: lease.tenantId,
  propertyId: lease.propertyId,
  amount: lease.depositAmount,
  receivedDate: lease.startDate,
  status: 'held',
  notes: '',
  createdAt: lease.startDate,
}));

export const mockReminders: Reminder[] = [
  {
    id: 'reminder-001',
    type: 'bill_overdue',
    relatedId: 'bill-lease-001-2026-05',
    title: '账单已逾期 8 天',
    content: '张三 的 阳光花园A座1201 2026-05 月账单已逾期 8 天，应缴金额 ¥4,830.00',
    dueDate: formatDate(new Date(subMonths(today, 1).setDate(5))),
    isRead: false,
    isCompleted: false,
    createdAt: today.toISOString(),
  },
  {
    id: 'reminder-002',
    type: 'lease_expiry',
    relatedId: 'lease-001',
    title: '合同即将到期（28 天后）',
    content: '张三 的 阳光花园A座1201 租约将于 2026-07-13 到期，请提前确认是否续租',
    dueDate: formatDate(addMonths(today, 1)),
    isRead: false,
    isCompleted: false,
    createdAt: today.toISOString(),
  },
  {
    id: 'reminder-003',
    type: 'rent_due',
    relatedId: 'bill-lease-002-2026-06',
    title: '账单即将到期（3 天后）',
    content: '王五 的 翠湖苑3栋502 2026-06 月账单将于 3 天后到期，应缴金额 ¥4,100.00',
    dueDate: formatDate(new Date(today.setDate(10))),
    isRead: true,
    isCompleted: false,
    createdAt: today.toISOString(),
  },
];

export const getAllMockData = () => ({
  properties: mockProperties,
  tenants: mockTenants,
  leases: mockLeases,
  bills: mockBills,
  transactions: mockTransactions,
  expenses: mockExpenses,
  deposits: mockDeposits,
  reminders: mockReminders,
});
