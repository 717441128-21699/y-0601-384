import { Bill, Lease, Reminder, Tenant, Property } from '../types';
import { generateId, getDaysOverdue, getDaysUntilDue, formatDate, formatCurrency } from './date';
import { getLeaseByBill, getTenantByLease, getPropertyByLease } from './finance';
import { addDays, parseISO, isBefore, isAfter, differenceInDays } from 'date-fns';
import { Bell, Calendar, FileText, AlertTriangle, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const generateReminders = (
  bills: Bill[],
  leases: Lease[],
  tenants: Tenant[],
  properties: Property[]
): Reminder[] => {
  const reminders: Reminder[] = [];
  const today = new Date();

  for (const bill of bills) {
    if (bill.status === 'paid') continue;

    const daysOverdue = getDaysOverdue(bill.dueDate);
    const daysUntilDue = getDaysUntilDue(bill.dueDate);

    if (daysOverdue > 0) {
      const lease = getLeaseByBill(bill, leases);
      if (!lease) continue;
      
      const tenant = getTenantByLease(lease, tenants);
      const property = getPropertyByLease(lease, properties);

      reminders.push({
        id: generateId(),
        type: 'bill_overdue',
        relatedId: bill.id,
        title: `账单已逾期 ${daysOverdue} 天`,
        content: `${tenant?.name || '租客'} 的 ${property?.name || '房源'} ${bill.period} 月账单已逾期 ${daysOverdue} 天，应缴金额 ${formatCurrency(bill.totalAmount)}`,
        dueDate: bill.dueDate,
        isRead: false,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      });
    } else if (daysUntilDue <= 3 && daysUntilDue >= 0) {
      const lease = getLeaseByBill(bill, leases);
      if (!lease) continue;
      
      const tenant = getTenantByLease(lease, tenants);
      const property = getPropertyByLease(lease, properties);

      reminders.push({
        id: generateId(),
        type: 'rent_due',
        relatedId: bill.id,
        title: `账单即将到期（${daysUntilDue} 天后）`,
        content: `${tenant?.name || '租客'} 的 ${property?.name || '房源'} ${bill.period} 月账单将于 ${daysUntilDue} 天后到期，应缴金额 ${formatCurrency(bill.totalAmount)}`,
        dueDate: bill.dueDate,
        isRead: false,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  for (const lease of leases) {
    if (lease.status !== 'active') continue;

    const endDate = parseISO(lease.endDate);
    const daysUntilExpiry = differenceInDays(endDate, today);

    if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
      const tenant = getTenantByLease(lease, tenants);
      const property = getPropertyByLease(lease, properties);

      reminders.push({
        id: generateId(),
        type: 'lease_expiry',
        relatedId: lease.id,
        title: `合同即将到期（${daysUntilExpiry} 天后）`,
        content: `${tenant?.name || '租客'} 的 ${property?.name || '房源'} 租约将于 ${formatDate(lease.endDate)} 到期，请提前确认是否续租`,
        dueDate: lease.endDate,
        isRead: false,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return reminders.sort((a, b) => {
    const aDate = parseISO(a.dueDate);
    const bDate = parseISO(b.dueDate);
    return aDate.getTime() - bDate.getTime();
  });
};

export const generateCollectionText = (
  bill: Bill,
  lease: Lease | undefined,
  tenant: Tenant | undefined,
  property: Property | undefined,
  type: 'sms' | 'wechat' = 'sms'
): string => {
  const daysOverdue = getDaysOverdue(bill.dueDate);
  const tenantName = tenant?.name || '尊敬的租客';
  const propertyName = property?.name || '房屋';
  const amount = formatCurrency(bill.totalAmount);
  const dueDate = formatDate(bill.dueDate);

  if (type === 'sms') {
    if (daysOverdue === 0) {
      return `【房东管家】${tenantName}您好，您租赁的${propertyName}${bill.period}月租金${amount}，应于${dueDate}前缴纳，请及时安排。如有疑问请联系房东。`;
    } else if (daysOverdue > 0 && daysOverdue <= 7) {
      return `【房东管家】${tenantName}您好，您租赁的${propertyName}${bill.period}月租金${amount}已逾期${daysOverdue}天，请尽快缴纳，避免产生滞纳金。如有特殊情况请及时沟通。`;
    } else if (daysOverdue > 7 && daysOverdue <= 30) {
      return `【房东管家】重要提醒：${tenantName}，您租赁的${propertyName}${bill.period}月租金${amount}已逾期${daysOverdue}天，请立即缴纳。根据合同约定，逾期将按日收取滞纳金，请务必重视。`;
    } else {
      return `【房东管家】最后通知：${tenantName}，您租赁的${propertyName}${bill.period}月租金${amount}已严重逾期${daysOverdue}天。请于3日内缴清所有费用，否则我们将按照合同约定采取进一步措施。`;
    }
  } else {
    if (daysOverdue === 0) {
      return `${tenantName}您好～\n\n提醒一下，您租赁的${propertyName}${bill.period}月的房租${amount}将于${dueDate}到期，请记得按时缴纳哦！\n\n缴费方式：\n- 支付宝：xxx\n- 微信：xxx\n- 银行卡：xxx\n\n如有任何问题随时联系我～`;
    } else if (daysOverdue > 0 && daysOverdue <= 7) {
      return `${tenantName}您好～\n\n您租赁的${propertyName}${bill.period}月的房租${amount}已经逾期${daysOverdue}天了，麻烦您最近安排一下哦，谢谢！\n\n如果有任何困难或者需要延期，请随时跟我沟通～`;
    } else if (daysOverdue > 7 && daysOverdue <= 30) {
      return `${tenantName}您好，\n\n您租赁的${propertyName}${bill.period}月房租${amount}已经逾期${daysOverdue}天了。\n\n根据合同约定，逾期会产生滞纳金，为了不影响您的信用记录和后续租住，请尽快安排缴费。\n\n有任何问题请及时联系我，谢谢配合！`;
    } else {
      return `${tenantName}您好，\n\n很抱歉打扰您，但您租赁的${propertyName}${bill.period}月房租${amount}已经严重逾期${daysOverdue}天了。\n\n请您务必在3个工作日内缴清所有费用。如果您遇到困难需要商量，请立即与我联系，我们可以协商解决方案。\n\n否则按照合同约定，我们将不得不采取包括收回房屋在内的法律措施，希望您能理解并配合。\n\n盼复！`;
    }
  }
};

export const getReminderTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    rent_due: '租金到期',
    lease_expiry: '合同到期',
    bill_overdue: '账单逾期',
    maintenance: '维修提醒',
    other: '其他提醒',
  };
  return labels[type] || type;
};

export const getReminderTypeColor = (type: string): { bg: string; text: string; badge: string } => {
  const colors: Record<string, { bg: string; text: string; badge: string }> = {
    rent_due: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-800' },
    lease_expiry: { bg: 'bg-amber-100', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-800' },
    bill_overdue: { bg: 'bg-rose-100', text: 'text-rose-600', badge: 'bg-rose-100 text-rose-800' },
    maintenance: { bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-800' },
    other: { bg: 'bg-gray-100', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-800' },
  };
  return colors[type] || { bg: 'bg-gray-100', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-800' };
};

export const getReminderTypeIcon = (type: string): LucideIcon => {
  const icons: Record<string, LucideIcon> = {
    rent_due: Calendar,
    lease_expiry: FileText,
    bill_overdue: AlertTriangle,
    maintenance: Wrench,
    other: Bell,
  };
  return icons[type] || Bell;
};
