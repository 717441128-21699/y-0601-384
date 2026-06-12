import React, { useState, useMemo } from 'react';
import {
  Bell, Calendar, AlertTriangle, FileText, Clock,
  CheckCircle, XCircle, MessageSquare, Check, Filter,
  ChevronDown, Home, User, Trash2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency } from '../utils/date';
import { getReminderTypeLabel, getReminderTypeColor, getReminderTypeIcon } from '../utils/reminder';
import { getLeaseByBill, getTenantByLease, getPropertyByLease } from '../utils/finance';
import type { Reminder } from '../types';

const ReminderPage: React.FC = () => {
  const {
    reminders, bills, leases, tenants, properties,
    markReminderRead, markReminderCompleted, markAllRemindersRead,
    generateCollectionText,
  } = useStore();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('uncompleted');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState<Reminder | null>(null);
  const [collectionText, setCollectionText] = useState('');

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterStatus === 'unread' && r.isRead) return false;
      if (filterStatus === 'uncompleted' && r.isCompleted) return false;
      if (filterStatus === 'completed' && !r.isCompleted) return false;
      return true;
    }).sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reminders, filterType, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: reminders.length,
      unread: reminders.filter(r => !r.isRead).length,
      uncompleted: reminders.filter(r => !r.isCompleted).length,
      overdue: reminders.filter(r => r.type === 'bill_overdue' && !r.isCompleted).length,
      leaseExpiry: reminders.filter(r => r.type === 'lease_expiry' && !r.isCompleted).length,
      rentDue: reminders.filter(r => r.type === 'rent_due' && !r.isCompleted).length,
    };
  }, [reminders]);

  const getRelatedInfo = (reminder: Reminder) => {
    if (reminder.type === 'bill_overdue' || reminder.type === 'rent_due') {
      const bill = bills.find(b => b.id === reminder.relatedId);
      if (!bill) return null;
      const lease = getLeaseByBill(bill, leases);
      const tenant = lease ? getTenantByLease(lease, tenants) : null;
      const property = lease ? getPropertyByLease(lease, properties) : null;
      return { bill, lease, tenant, property };
    }
    if (reminder.type === 'lease_expiry') {
      const lease = leases.find(l => l.id === reminder.relatedId);
      if (!lease) return null;
      const tenant = tenants.find(t => t.id === lease.tenantId);
      const property = properties.find(p => p.id === lease.propertyId);
      return { lease, tenant, property };
    }
    return null;
  };

  const handleMarkRead = (id: string) => {
    markReminderRead(id);
  };

  const handleMarkCompleted = (id: string) => {
    markReminderCompleted(id);
  };

  const handleMarkAllRead = () => {
    if (confirm('确定要标记所有提醒为已读吗？')) {
      markAllRemindersRead();
    }
  };

  const handleGenerateCollection = (reminder: Reminder) => {
    if (reminder.type === 'bill_overdue' || reminder.type === 'rent_due') {
      const text = generateCollectionText(reminder.relatedId, 'wechat');
      setCollectionText(text);
      setShowCollectionModal(reminder);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(collectionText);
    alert('催缴文本已复制到剪贴板');
  };

  const typeOptions = [
    { value: 'all', label: '全部类型' },
    { value: 'rent_due', label: '租金到期' },
    { value: 'bill_overdue', label: '账单逾期' },
    { value: 'lease_expiry', label: '合同到期' },
    { value: 'maintenance', label: '维修提醒' },
    { value: 'other', label: '其他提醒' },
  ];

  const statusOptions = [
    { value: 'uncompleted', label: '待处理' },
    { value: 'unread', label: '未读' },
    { value: 'completed', label: '已完成' },
    { value: 'all', label: '全部' },
  ];

  const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
    const Icon = getReminderTypeIcon(type);
    return <Icon size={16} className={className} />;
  };

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">提醒中心</h1>
          <p className="text-slate-500 text-sm mt-1">
            租金到期、账单逾期、合同到期等重要事项提醒
          </p>
        </div>
        <button className="btn-secondary" onClick={handleMarkAllRead}>
          <Check size={16} className="mr-2" />
          全部标记已读
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">待处理</p>
              <p className="stat-value text-amber-600">{stats.uncompleted}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock size={24} className="text-amber-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">账单逾期</p>
              <p className="stat-value text-rose-600">{stats.overdue}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-rose-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">租金到期</p>
              <p className="stat-value text-primary-600">{stats.rentDue}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Bell size={24} className="text-primary-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">合同到期</p>
              <p className="stat-value text-purple-600">{stats.leaseExpiry}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2 min-w-[140px]"
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            >
              <Filter size={16} />
              {typeOptions.find(o => o.value === filterType)?.label}
              <ChevronDown size={16} />
            </button>
            {showTypeDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[140px] z-20">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                      filterType === option.value ? 'text-primary-600 bg-primary-50' : 'text-slate-700'
                    }`}
                    onClick={() => {
                      setFilterType(option.value);
                      setShowTypeDropdown(false);
                    }}
                  >
                    {option.value !== 'all' && <TypeIcon type={option.value} />}
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2 min-w-[140px]"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <Filter size={16} />
              {statusOptions.find(o => o.value === filterStatus)?.label}
              <ChevronDown size={16} />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[140px] z-20">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                      filterStatus === option.value ? 'text-primary-600 bg-primary-50' : 'text-slate-700'
                    }`}
                    onClick={() => {
                      setFilterStatus(option.value);
                      setShowStatusDropdown(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredReminders.map((reminder, index) => {
          const info = getRelatedInfo(reminder);
          const isOverdue = reminder.type === 'bill_overdue';

          return (
            <div
              key={reminder.id}
              className={`card p-4 transition-all animate-slide-up ${
                reminder.isCompleted ? 'opacity-60' : ''
              } ${!reminder.isRead ? 'ring-2 ring-primary-200' : ''}`}
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => !reminder.isRead && handleMarkRead(reminder.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  getReminderTypeColor(reminder.type).bg
                }`}>
                  <TypeIcon type={reminder.type} className={getReminderTypeColor(reminder.type).text} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${
                          reminder.isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'
                        }`}>
                          {reminder.title}
                        </h3>
                        <span className={`badge ${getReminderTypeColor(reminder.type).badge}`}>
                          {getReminderTypeLabel(reminder.type)}
                        </span>
                        {!reminder.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{reminder.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!reminder.isCompleted && (isOverdue || reminder.type === 'rent_due') && (
                        <button
                          className="p-2 rounded-lg hover:bg-amber-50 transition-colors"
                          title="生成催缴"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateCollection(reminder);
                          }}
                        >
                          <MessageSquare size={16} className="text-amber-500" />
                        </button>
                      )}
                      {!reminder.isCompleted && (
                        <button
                          className="p-2 rounded-lg hover:bg-emerald-50 transition-colors"
                          title="标记完成"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkCompleted(reminder.id);
                          }}
                        >
                          <CheckCircle size={16} className="text-emerald-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {info && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex flex-wrap gap-4 text-sm">
                        {info.tenant && (
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-slate-400" />
                            <span className="text-slate-700">{info.tenant.name}</span>
                          </div>
                        )}
                        {info.property && (
                          <div className="flex items-center gap-2">
                            <Home size={14} className="text-slate-400" />
                            <span className="text-slate-700">{info.property.name}</span>
                          </div>
                        )}
                        {info.bill && (
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            <span className="text-slate-700">
                              {info.bill.period.replace('-', '年')}月 · {formatCurrency(info.bill.totalAmount)}
                            </span>
                          </div>
                        )}
                        {info.lease && reminder.type === 'lease_expiry' && (
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-slate-700">
                              到期日：{formatDate(info.lease.endDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                    <span>
                      <Calendar size={12} className="inline mr-1" />
                      {formatDate(reminder.dueDate)}
                    </span>
                    <span>
                      <Clock size={12} className="inline mr-1" />
                      {formatDate(reminder.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredReminders.length === 0 && (
          <div className="card text-center py-16">
            <Bell size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">暂无提醒</p>
            <p className="text-sm text-slate-400 mt-1">系统会自动生成租金到期、账单逾期等提醒</p>
          </div>
        )}
      </div>

      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg animate-slide-up">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">催缴文本</h2>
              <button
                onClick={() => setShowCollectionModal(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {collectionText}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => setShowCollectionModal(null)}
                >
                  关闭
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={copyToClipboard}
                >
                  <MessageSquare size={16} className="mr-2" />
                  复制文本
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderPage;
