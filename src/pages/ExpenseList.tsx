import React, { useState, useMemo, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, Calendar, DollarSign,
  Download, Filter, ChevronDown, Home, XCircle,
  Wrench, Building, Droplets, Zap, Wifi, Shield, FileText,
  Receipt, Paperclip,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency, getCurrentPeriod, getPreviousMonths } from '../utils/date';
import { getExpenseCategoryLabel } from '../utils/finance';
import type { Expense } from '../types';

const CATEGORY_OPTIONS: Array<{ value: Expense['category']; label: string; icon: LucideIcon; color: string }> = [
  { value: 'maintenance', label: '维修费', icon: Wrench, color: 'text-rose-600 bg-rose-100' },
  { value: 'property', label: '物业费', icon: Building, color: 'text-slate-600 bg-slate-100' },
  { value: 'water', label: '水费', icon: Droplets, color: 'text-blue-600 bg-blue-100' },
  { value: 'electric', label: '电费', icon: Zap, color: 'text-amber-600 bg-amber-100' },
  { value: 'internet', label: '网络费', icon: Wifi, color: 'text-purple-600 bg-purple-100' },
  { value: 'insurance', label: '保险费', icon: Shield, color: 'text-emerald-600 bg-emerald-100' },
  { value: 'tax', label: '税费', icon: Receipt, color: 'text-orange-600 bg-orange-100' },
  { value: 'other', label: '其他', icon: FileText, color: 'text-gray-600 bg-gray-100' },
];

const getCategoryStyle = (cat: string) => CATEGORY_OPTIONS.find(c => c.value === cat) || CATEGORY_OPTIONS[7];

const ExpenseList: React.FC = () => {
  const {
    expenses, properties,
    addExpense, updateExpense, deleteExpense,
    exportExpenses,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    propertyId: '',
    category: 'maintenance' as Expense['category'],
    amount: '',
    expenseDate: formatDate(new Date()),
    description: '',
    receipt: '',
    notes: '',
  });

  const periods = useMemo(() => {
    return ['all', getCurrentPeriod(), ...getPreviousMonths(11)];
  }, []);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (periodFilter !== 'all' && expense.expenseDate.slice(0, 7) !== periodFilter) return false;
      if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
      if (propertyFilter !== 'all' && expense.propertyId !== propertyFilter) return false;

      const property = properties.find(p => p.id === expense.propertyId);
      const searchLower = searchQuery.toLowerCase();
      return (
        expense.description.toLowerCase().includes(searchLower) ||
        property?.name.toLowerCase().includes(searchLower) ||
        property?.address.toLowerCase().includes(searchLower) ||
        expense.amount.toString().includes(searchQuery) ||
        (expense.notes && expense.notes.toLowerCase().includes(searchLower))
      );
    }).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  }, [expenses, properties, searchQuery, categoryFilter, propertyFilter, periodFilter]);

  const stats = useMemo(() => {
    const list = filteredExpenses;
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const e of list) {
      total += e.amount;
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    }
    return {
      total,
      count: list.length,
      byCategory,
      avg: list.length > 0 ? total / list.length : 0,
    };
  }, [filteredExpenses]);

  const categoryStats = useMemo(() => {
    const today = new Date();
    const thisMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthExpenses = expenses.filter(e => e.expenseDate.slice(0, 7) === thisMonth);
    const result: Record<string, number> = {};
    for (const e of monthExpenses) {
      result[e.category] = (result[e.category] || 0) + e.amount;
    }
    return result;
  }, [expenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      propertyId: formData.propertyId,
      category: formData.category,
      amount: parseFloat(formData.amount) || 0,
      expenseDate: formData.expenseDate,
      description: formData.description || getExpenseCategoryLabel(formData.category),
      receipt: formData.receipt || undefined,
      notes: formData.notes || undefined,
    };

    if (!data.propertyId) {
      alert('请选择关联房源');
      return;
    }
    if (!data.amount || data.amount <= 0) {
      alert('请输入有效金额');
      return;
    }
    if (!data.description.trim()) {
      alert('请填写支出说明');
      return;
    }

    if (editingExpense) {
      updateExpense(editingExpense.id, data);
    } else {
      addExpense(data);
    }
    setShowAddModal(false);
    setEditingExpense(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      propertyId: '',
      category: 'maintenance',
      amount: '',
      expenseDate: formatDate(new Date()),
      description: '',
      receipt: '',
      notes: '',
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      propertyId: expense.propertyId,
      category: expense.category,
      amount: expense.amount.toString(),
      expenseDate: expense.expenseDate,
      description: expense.description,
      receipt: expense.receipt || '',
      notes: expense.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该支出记录吗？此操作不可恢复。')) {
      deleteExpense(id);
    }
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    resetForm();
    setShowAddModal(true);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('图片大小不能超过 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, receipt: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const getPropertyById = (id: string) => properties.find(p => p.id === id);

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">支出管理</h1>
          <p className="text-slate-500 text-sm mt-1">
            记录维修、物业、水电、网络等各类支出，同步报表支出构成
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => exportExpenses()}>
            <Download size={16} className="mr-2" />
            导出明细
          </button>
          <button className="btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} className="mr-2" />
            新增支出
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">筛选后总支出</p>
              <p className="stat-value text-rose-600">{formatCurrency(stats.total)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
              <DollarSign size={24} className="text-rose-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">共 {stats.count} 笔记录</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">本月维修</p>
              <p className="stat-value text-orange-600">{formatCurrency(categoryStats.maintenance || 0)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Wrench size={24} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">维修维护类支出</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">本月物业</p>
              <p className="stat-value text-slate-700">{formatCurrency(categoryStats.property || 0)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Building size={24} className="text-slate-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">物业管理费用</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">本月水电网</p>
              <p className="stat-value text-blue-600">
                {formatCurrency(
                  (categoryStats.water || 0) +
                  (categoryStats.electric || 0) +
                  (categoryStats.internet || 0)
                )}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Droplets size={24} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">水电燃气网络</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {CATEGORY_OPTIONS.slice(0, 8).map((opt) => {
          const Icon = opt.icon;
          const amount = stats.byCategory[opt.value] || 0;
          const active = categoryFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setCategoryFilter(active ? 'all' : opt.value)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                active
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${opt.color.split(' ')[1]}`}>
                  <Icon size={18} className={opt.color.split(' ')[0]} />
                </div>
                <span className="text-xs text-slate-400">{opt.label}</span>
              </div>
              <p className={`text-lg font-bold ${amount > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                {formatCurrency(amount)}
              </p>
            </button>
          );
        })}
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索支出说明、房源名称、金额..."
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
                <option key={p} value={p}>
                  {p === 'all' ? '全部月份' : p.replace('-', '年') + '月'}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              className="input pr-10 appearance-none min-w-[140px]"
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
            >
              <option value="all">全部房源</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Filter size={16} />
              {categoryFilter === 'all' ? '类别筛选' : getExpenseCategoryLabel(categoryFilter)}
              <ChevronDown size={16} />
            </button>
            {showCategoryDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[140px] z-20">
                {[
                  { value: 'all', label: '全部类别' },
                  ...CATEGORY_OPTIONS.map(c => ({ value: c.value, label: c.label })),
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                      categoryFilter === option.value ? 'text-primary-600 bg-primary-50' : 'text-slate-700'
                    }`}
                    onClick={() => {
                      setCategoryFilter(option.value);
                      setShowCategoryDropdown(false);
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
                <th className="table-header">日期/类别</th>
                <th className="table-header">关联房源</th>
                <th className="table-header">支出说明</th>
                <th className="table-header">金额</th>
                <th className="table-header">凭证</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense, index) => {
                const property = getPropertyById(expense.propertyId);
                const catStyle = getCategoryStyle(expense.category);
                const CatIcon = catStyle.icon;

                return (
                  <tr
                    key={expense.id}
                    className="hover:bg-slate-50 transition-colors animate-slide-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${catStyle.color.split(' ')[1]}`}>
                          <CatIcon size={18} className={catStyle.color.split(' ')[0]} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{getExpenseCategoryLabel(expense.category)}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <Calendar size={10} />
                            <span>{formatDate(expense.expenseDate)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Home size={14} className="text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-800">{property?.name || '-'}</p>
                          {property?.address && (
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{property.address}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="text-slate-800">{expense.description}</p>
                        {expense.notes && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">📝 {expense.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-lg font-bold text-rose-600">-{formatCurrency(expense.amount)}</span>
                    </td>
                    <td className="table-cell">
                      {expense.receipt ? (
                        <a
                          href={expense.receipt}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                        >
                          <Paperclip size={12} />
                          查看凭证
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">无</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                          title="编辑"
                        >
                          <Edit2 size={16} className="text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
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

        {filteredExpenses.length === 0 && (
          <div className="text-center py-16">
            <Receipt size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-2">暂无支出记录</p>
            <p className="text-sm text-slate-400 mb-4">点击右上角"新增支出"开始记录</p>
            <button onClick={handleOpenAdd} className="btn-primary">
              <Plus size={16} className="mr-2" />
              新增第一笔支出
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">
                {editingExpense ? '编辑支出' : '新增支出'}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingExpense(null); resetForm(); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="label">支出类别 <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = formData.category === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: opt.value })}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          active
                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${opt.color.split(' ')[1]}`}>
                          <Icon size={16} className={opt.color.split(' ')[0]} />
                        </div>
                        <span className={`text-xs ${active ? 'text-primary-700 font-medium' : 'text-slate-600'}`}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">关联房源 <span className="text-rose-500">*</span></label>
                  <select
                    className="input"
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                  >
                    <option value="">请选择房源</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.address}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">支出日期 <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    className="input"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">支出金额（元） <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">¥</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input pl-8"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">支出说明 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    className="input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={getExpenseCategoryLabel(formData.category) + '，如：马桶维修'}
                  />
                </div>
              </div>

              <div>
                <label className="label">凭证照片（选填，≤2MB）</label>
                <div className="flex items-start gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary-400 hover:bg-primary-50 flex flex-col items-center justify-center cursor-pointer transition-all"
                  >
                    <Paperclip size={20} className="text-slate-400 mb-1" />
                    <span className="text-xs text-slate-500">
                      {formData.receipt ? '更换图片' : '上传凭证'}
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleReceiptUpload}
                  />
                  {formData.receipt && (
                    <div className="relative">
                      <img
                        src={formData.receipt}
                        alt="凭证预览"
                        className="w-28 h-28 rounded-xl object-cover border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, receipt: '' })}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    支持 JPG、PNG 格式，文件保存在浏览器本地
                  </p>
                </div>
              </div>

              <div>
                <label className="label">备注（选填）</label>
                <textarea
                  className="input min-h-[80px]"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="记录其他详细信息，如维修师傅电话、缴费单号等..."
                />
              </div>

              <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-slate-600">本次支出金额</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {getExpenseCategoryLabel(formData.category)} · {formData.expenseDate}
                    </p>
                  </div>
                  <span className="text-3xl font-bold text-rose-600">
                    ¥{formatCurrency(parseFloat(formData.amount) || 0)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => { setShowAddModal(false); setEditingExpense(null); resetForm(); }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingExpense ? '保存修改' : '确认录入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
