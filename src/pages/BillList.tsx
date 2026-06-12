import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Calendar, DollarSign,
  CheckCircle, Clock, AlertTriangle, XCircle, FileText,
  MessageSquare, Download, RefreshCw, Filter, ChevronDown,
  Home, User, Zap, Droplets, Building, MoreHorizontal,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency, getCurrentPeriod, getPreviousMonths } from '../utils/date';
import { getBillStatusLabel, getBillStatusColor, getLeaseByBill, getTenantByLease, getPropertyByLease } from '../utils/finance';
import type { Bill } from '../types';

const BillList: React.FC = () => {
  const {
    bills, leases, tenants, properties,
    generateMonthlyBills, updateBill, deleteBill,
    markBillPaid, generateCollectionText, exportLedger,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>(getCurrentPeriod());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showCollectionModal, setShowCollectionModal] = useState<Bill | null>(null);
  const [collectionText, setCollectionText] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [formData, setFormData] = useState({
    rentAmount: '',
    waterFee: '',
    electricFee: '',
    propertyFee: '',
    otherFee: '',
    dueDate: '',
    notes: '',
  });

  const periods = useMemo(() => {
    return [getCurrentPeriod(), ...getPreviousMonths(5)];
  }, []);

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      if (periodFilter && bill.period !== periodFilter) return false;
      if (statusFilter !== 'all' && bill.status !== statusFilter) return false;
      
      const lease = getLeaseByBill(bill, leases);
      const tenant = lease ? getTenantByLease(lease, tenants) : null;
      const property = lease ? getPropertyByLease(lease, properties) : null;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        tenant?.name.toLowerCase().includes(searchLower) ||
        property?.name.toLowerCase().includes(searchLower) ||
        property?.address.toLowerCase().includes(searchLower) ||
        bill.totalAmount.toString().includes(searchQuery)
      );
    }).sort((a, b) => {
      const statusOrder = { overdue: 0, pending: 1, partial: 2, paid: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [bills, leases, tenants, properties, searchQuery, statusFilter, periodFilter]);

  const stats = useMemo(() => {
    const periodBills = bills.filter(b => b.period === periodFilter);
    return {
      total: periodBills.length,
      paid: periodBills.filter(b => b.status === 'paid').length,
      pending: periodBills.filter(b => b.status === 'pending').length,
      overdue: periodBills.filter(b => b.status === 'overdue').length,
      partial: periodBills.filter(b => b.status === 'partial').length,
      totalAmount: periodBills.reduce((sum, b) => sum + b.totalAmount, 0),
      paidAmount: periodBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0),
    };
  }, [bills, periodFilter]);

  const handleGenerateBills = () => {
    const count = generateMonthlyBills(periodFilter);
    alert(`成功生成 ${count} 条账单`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingBill) return;

    const data = {
      rentAmount: parseFloat(formData.rentAmount) || 0,
      waterFee: parseFloat(formData.waterFee) || 0,
      electricFee: parseFloat(formData.electricFee) || 0,
      propertyFee: parseFloat(formData.propertyFee) || 0,
      otherFee: parseFloat(formData.otherFee) || 0,
      dueDate: formData.dueDate,
      notes: formData.notes,
    };

    updateBill(editingBill.id, data);
    setShowAddModal(false);
    setEditingBill(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      rentAmount: '',
      waterFee: '',
      electricFee: '',
      propertyFee: '',
      otherFee: '',
      dueDate: '',
      notes: '',
    });
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setFormData({
      rentAmount: bill.rentAmount.toString(),
      waterFee: bill.waterFee.toString(),
      electricFee: bill.electricFee.toString(),
      propertyFee: bill.propertyFee.toString(),
      otherFee: bill.otherFee.toString(),
      dueDate: bill.dueDate,
      notes: bill.notes || '',
    });
    setShowAddModal(true);
  };

  const handleMarkPaid = (bill: Bill) => {
    if (confirm(`确认标记该账单为已收款？金额：${formatCurrency(bill.totalAmount)}`)) {
      markBillPaid(bill.id, formatDate(new Date()), bill.totalAmount);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该账单吗？')) {
      deleteBill(id);
    }
  };

  const handleGenerateCollection = (bill: Bill) => {
    const text = generateCollectionText(bill.id, 'wechat');
    setCollectionText(text);
    setShowCollectionModal(bill);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(collectionText);
    alert('催缴文本已复制到剪贴板');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'pending': return <Clock size={16} className="text-amber-500" />;
      case 'overdue': return <AlertTriangle size={16} className="text-rose-500" />;
      case 'partial': return <Clock size={16} className="text-blue-500" />;
      default: return <XCircle size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">账单管理</h1>
          <p className="text-slate-500 text-sm mt-1">
            管理每月租金账单，记录水电物业费用，跟踪收款状态
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => exportLedger(periodFilter)}>
            <Download size={16} className="mr-2" />
            导出台账
          </button>
          <button className="btn-secondary" onClick={handleGenerateBills}>
            <RefreshCw size={16} className="mr-2" />
            生成账单
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">应收总额</p>
              <p className="stat-value text-slate-800">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <DollarSign size={24} className="text-primary-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">共 {stats.total} 笔账单</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">已收款</p>
              <p className="stat-value text-emerald-600">{formatCurrency(stats.paidAmount)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={24} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{stats.paid} 笔已结清</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">待收款</p>
              <p className="stat-value text-amber-600">
                {formatCurrency(stats.totalAmount - stats.paidAmount)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock size={24} className="text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{stats.pending + stats.partial} 笔待处理</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">已逾期</p>
              <p className="stat-value text-rose-600">{stats.overdue} 笔</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-rose-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">需要及时催收</p>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索租客姓名、房源名称、金额..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative">
            <select
              className="input pr-10 appearance-none"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p} value={p}>{p.replace('-', '年')}月</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={16} />
              状态筛选
              <ChevronDown size={16} />
            </button>
            {showFilterDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[140px] z-20">
                {[
                  { value: 'all', label: '全部状态' },
                  { value: 'pending', label: '待收款' },
                  { value: 'paid', label: '已收款' },
                  { value: 'overdue', label: '已逾期' },
                  { value: 'partial', label: '部分收款' },
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                      statusFilter === option.value ? 'text-primary-600 bg-primary-50' : 'text-slate-700'
                    }`}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setShowFilterDropdown(false);
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

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">账单信息</th>
                <th className="table-header">租客/房源</th>
                <th className="table-header">费用明细</th>
                <th className="table-header">应收金额</th>
                <th className="table-header">截止日期</th>
                <th className="table-header">状态</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill, index) => {
                const lease = getLeaseByBill(bill, leases);
                const tenant = lease ? getTenantByLease(lease, tenants) : null;
                const property = lease ? getPropertyByLease(lease, properties) : null;

                return (
                  <tr
                    key={bill.id}
                    className="hover:bg-slate-50 transition-colors animate-slide-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          bill.status === 'paid' ? 'bg-emerald-100' :
                          bill.status === 'overdue' ? 'bg-rose-100' :
                          bill.status === 'partial' ? 'bg-blue-100' : 'bg-amber-100'
                        }`}>
                          <FileText size={18} className={`
                            ${bill.status === 'paid' ? 'text-emerald-600' :
                              bill.status === 'overdue' ? 'text-rose-600' :
                              bill.status === 'partial' ? 'text-blue-600' : 'text-amber-600'}
                          `} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{bill.period.replace('-', '年')}月账单</p>
                          <p className="text-xs text-slate-500">账单号：{bill.id.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User size={14} className="text-slate-400" />
                          <span className="font-medium text-slate-800">{tenant?.name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Home size={12} className="text-slate-400" />
                          <span>{property?.name || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign size={12} className="text-slate-400" />
                          <span className="text-slate-600">租金 {formatCurrency(bill.rentAmount)}</span>
                        </div>
                        {(bill.waterFee > 0 || bill.electricFee > 0 || bill.propertyFee > 0 || bill.otherFee > 0) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {bill.waterFee > 0 && (
                              <span className="inline-flex items-center gap-1 text-blue-600">
                                <Droplets size={10} /> {formatCurrency(bill.waterFee)}
                              </span>
                            )}
                            {bill.electricFee > 0 && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <Zap size={10} /> {formatCurrency(bill.electricFee)}
                              </span>
                            )}
                            {bill.propertyFee > 0 && (
                              <span className="inline-flex items-center gap-1 text-slate-600">
                                <Building size={10} /> {formatCurrency(bill.propertyFee)}
                              </span>
                            )}
                            {bill.otherFee > 0 && (
                              <span className="inline-flex items-center gap-1 text-purple-600">
                                <MoreHorizontal size={10} /> {formatCurrency(bill.otherFee)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="text-lg font-bold text-slate-800">{formatCurrency(bill.totalAmount)}</p>
                        {bill.paidAmount && bill.paidAmount > 0 && bill.paidAmount < bill.totalAmount && (
                          <p className="text-xs text-slate-500">已收 {formatCurrency(bill.paidAmount)}</p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className={bill.status === 'overdue' ? 'text-rose-600 font-medium' : 'text-slate-600'}>
                          {formatDate(bill.dueDate)}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${getBillStatusColor(bill.status)}`}>
                        {getStatusIcon(bill.status)}
                        <span className="ml-1">{getBillStatusLabel(bill.status)}</span>
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        {bill.status !== 'paid' && (
                          <>
                            <button
                              onClick={() => handleMarkPaid(bill)}
                              className="p-2 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="标记已收款"
                            >
                              <CheckCircle size={16} className="text-emerald-500" />
                            </button>
                            <button
                              onClick={() => handleGenerateCollection(bill)}
                              className="p-2 rounded-lg hover:bg-amber-50 transition-colors"
                              title="生成催缴"
                            >
                              <MessageSquare size={16} className="text-amber-500" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEdit(bill)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                          title="编辑"
                        >
                          <Edit2 size={16} className="text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} className="text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredBills.length === 0 && (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-2">暂无账单记录</p>
            <p className="text-sm text-slate-400 mb-4">点击上方"生成账单"按钮生成本月账单</p>
            <button onClick={handleGenerateBills} className="btn-primary">
              <Plus size={16} className="mr-2" />
              生成本月账单
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">编辑账单</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">租金</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.rentAmount}
                    onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label">截止日期</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">水费</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.waterFee}
                    onChange={(e) => setFormData({ ...formData, waterFee: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label">电费</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.electricFee}
                    onChange={(e) => setFormData({ ...formData, electricFee: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">物业费</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.propertyFee}
                    onChange={(e) => setFormData({ ...formData, propertyFee: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label">其他费用</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.otherFee}
                    onChange={(e) => setFormData({ ...formData, otherFee: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="label">备注（选填）</label>
                <textarea
                  className="input min-h-[80px]"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="其他需要记录的信息..."
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">合计金额</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatCurrency(
                      (parseFloat(formData.rentAmount) || 0) +
                      (parseFloat(formData.waterFee) || 0) +
                      (parseFloat(formData.electricFee) || 0) +
                      (parseFloat(formData.propertyFee) || 0) +
                      (parseFloat(formData.otherFee) || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBill(null);
                    resetForm();
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary flex-1">
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default BillList;
