import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Phone, Mail,
  Home, Calendar, User, FileText, AlertCircle,
  DollarSign, CreditCard, Check, X, BadgeDollarSign,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency, getCurrentPeriod } from '../utils/date';
import { getLeaseStatusLabel, getLeaseStatusColor, getDepositStatusLabel, getDepositStatusColor } from '../utils/finance';
import type { Tenant, Lease, Deposit, Property } from '../types';
import { parseISO, addMonths, differenceInMonths } from 'date-fns';

interface TenantFormData {
  tenant: {
    name: string;
    phone: string;
    idCard: string;
    email: string;
    emergencyContact: string;
    notes: string;
  };
  lease: {
    propertyId: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    paymentCycle: 'monthly' | 'quarterly' | 'yearly';
    rentDay: number;
    notes: string;
  };
  deposit: {
    amount: number;
    receivedDate: string;
    notes: string;
  };
}

const defaultFormData = (): TenantFormData => ({
  tenant: {
    name: '',
    phone: '',
    idCard: '',
    email: '',
    emergencyContact: '',
    notes: '',
  },
  lease: {
    propertyId: '',
    startDate: formatDate(new Date()),
    endDate: formatDate(addMonths(new Date(), 12)),
    monthlyRent: 0,
    paymentCycle: 'monthly',
    rentDay: 5,
    notes: '',
  },
  deposit: {
    amount: 0,
    receivedDate: formatDate(new Date()),
    notes: '',
  },
});

const TenantList: React.FC = () => {
  const {
    tenants, properties, leases, bills, deposits,
    addTenant, updateTenant, deleteTenant,
    addLease, updateLease, deleteLease,
    addDeposit, updateDeposit, deleteDeposit,
    refreshReminders,
    generateMonthlyBills,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<TenantFormData>(defaultFormData());

  const occupiedPropertyIds = useMemo(() => {
    return leases.filter(l => l.status === 'active').map(l => l.propertyId);
  }, [leases]);

  const availableProperties = useMemo(() => {
    if (editingTenant) {
      const existingLease = leases.find(l => l.tenantId === editingTenant.id && l.status === 'active');
      if (existingLease) {
        const current = properties.find(p => p.id === existingLease.propertyId);
        const others = properties.filter(p => !occupiedPropertyIds.includes(p.id) || p.id === existingLease.propertyId);
        return current ? [current, ...others.filter(p => p.id !== current.id)] : others;
      }
    }
    return properties.filter(p => !occupiedPropertyIds.includes(p.id));
  }, [properties, leases, occupiedPropertyIds, editingTenant]);

  const filteredTenants = tenants.filter((t) => {
    return t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery) ||
      t.idCard.includes(searchQuery);
  });

  const getActiveLeaseForTenant = (tenantId: string) => {
    return leases.find(l => l.tenantId === tenantId && l.status === 'active');
  };

  const getPropertyForLease = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    if (!lease) return null;
    return properties.find(p => p.id === lease.propertyId);
  };

  const getOverdueBillsCount = (tenantId: string) => {
    const tenantLeases = leases.filter(l => l.tenantId === tenantId);
    return bills.filter(b =>
      tenantLeases.some(l => l.id === b.leaseId) &&
      b.status === 'overdue'
    ).length;
  };

  const getDepositForTenant = (tenantId: string) => {
    return deposits.find(d => d.tenantId === tenantId && d.status === 'held');
  };

  const setLeaseDefaultsFromProperty = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    if (prop) {
      setFormData(prev => ({
        ...prev,
        lease: {
          ...prev.lease,
          propertyId,
          monthlyRent: prev.lease.monthlyRent || prop.monthlyRent,
        },
        deposit: {
          ...prev.deposit,
          amount: prev.deposit.amount || prop.monthlyRent * 2,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        lease: { ...prev.lease, propertyId },
      }));
    }
  };

  const loadEditingData = (tenant: Tenant) => {
    const existingLease = getActiveLeaseForTenant(tenant.id);
    const existingDeposit = getDepositForTenant(tenant.id);
    const prop = existingLease ? properties.find(p => p.id === existingLease.propertyId) : null;

    setFormData({
      tenant: {
        name: tenant.name,
        phone: tenant.phone,
        idCard: tenant.idCard,
        email: tenant.email || '',
        emergencyContact: tenant.emergencyContact || '',
        notes: tenant.notes || '',
      },
      lease: existingLease ? {
        propertyId: existingLease.propertyId,
        startDate: existingLease.startDate,
        endDate: existingLease.endDate,
        monthlyRent: existingLease.monthlyRent,
        paymentCycle: existingLease.paymentCycle,
        rentDay: existingLease.rentDay,
        notes: existingLease.notes || '',
      } : {
        propertyId: '',
        startDate: formatDate(new Date()),
        endDate: formatDate(addMonths(new Date(), 12)),
        monthlyRent: prop?.monthlyRent || 0,
        paymentCycle: 'monthly',
        rentDay: 5,
        notes: '',
      },
      deposit: existingDeposit ? {
        amount: existingDeposit.amount,
        receivedDate: existingDeposit.receivedDate,
        notes: existingDeposit.notes || '',
      } : {
        amount: prop?.monthlyRent ? prop.monthlyRent * 2 : 0,
        receivedDate: formatDate(new Date()),
        notes: '',
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenant.name || !formData.tenant.phone || !formData.tenant.idCard) {
      alert('请填写租客基本信息：姓名、手机号、身份证号');
      return;
    }
    if (!formData.lease.propertyId) {
      alert('请选择租住房源');
      return;
    }
    if (!formData.lease.startDate || !formData.lease.endDate) {
      alert('请填写合同起止日期');
      return;
    }
    if (!formData.lease.monthlyRent || formData.lease.monthlyRent <= 0) {
      alert('请填写有效月租金金额');
      return;
    }

    if (editingTenant) {
      updateTenant(editingTenant.id, formData.tenant);
      const existingLease = getActiveLeaseForTenant(editingTenant.id);
      const existingDeposit = getDepositForTenant(editingTenant.id);

      if (existingLease) {
        updateLease(existingLease.id, formData.lease);
      } else {
        addLease({
          ...formData.lease,
          tenantId: editingTenant.id,
          depositAmount: formData.deposit.amount,
          status: 'active',
        });
      }

      if (existingDeposit) {
        updateDeposit(existingDeposit.id, {
          ...formData.deposit,
          propertyId: formData.lease.propertyId,
        });
      } else if (formData.deposit.amount > 0) {
        addDeposit({
          tenantId: editingTenant.id,
          propertyId: formData.lease.propertyId,
          amount: formData.deposit.amount,
          receivedDate: formData.deposit.receivedDate,
          status: 'held',
          notes: formData.deposit.notes,
        });
      }
    } else {
      const newTenant: Tenant = {
        ...formData.tenant,
        id: '',
        createdAt: '',
      };
      const tenantId = '';

      let createdTenantId = tenantId;
      const tempTenant = { ...newTenant };

      const created = addTenantAndLinks(tempTenant, formData.lease, formData.deposit);
      createdTenantId = created;
      void createdTenantId;
    }

    setTimeout(() => {
      refreshReminders();
      generateMonthlyBills(getCurrentPeriod());
    }, 50);

    setShowAddModal(false);
    setEditingTenant(null);
    resetForm();
  };

  const addTenantAndLinks = (
    tenantData: Omit<Tenant, 'id' | 'createdAt'>,
    leaseData: Omit<Lease, 'id' | 'tenantId' | 'createdAt' | 'status' | 'depositAmount'> & { depositAmount?: number },
    depositData: { amount: number; receivedDate: string; notes: string }
  ): string => {
    const idResult = addTenantInternal(tenantData);
    if (!idResult) return '';

    const { id: newTenantId } = idResult;

    addLease({
      propertyId: leaseData.propertyId,
      tenantId: newTenantId,
      startDate: leaseData.startDate,
      endDate: leaseData.endDate,
      monthlyRent: leaseData.monthlyRent,
      depositAmount: depositData.amount,
      paymentCycle: leaseData.paymentCycle,
      rentDay: leaseData.rentDay,
      status: 'active',
      notes: leaseData.notes,
    });

    if (depositData.amount > 0) {
      addDeposit({
        tenantId: newTenantId,
        propertyId: leaseData.propertyId,
        amount: depositData.amount,
        receivedDate: depositData.receivedDate,
        status: 'held',
        notes: depositData.notes,
      });
    }

    return newTenantId;
  };

  const addTenantInternal = (data: Omit<Tenant, 'id' | 'createdAt'>): { id: string } | null => {
    const result: any = { id: '' };
    const origSet = (useStore as any).setState;
    void origSet;
    addTenant(data);
    const latest = useStore.getState().tenants[useStore.getState().tenants.length - 1];
    if (latest) {
      result.id = latest.id;
      return result;
    }
    return null;
  };

  const resetForm = () => {
    setFormData(defaultFormData());
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    loadEditingData(tenant);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该租客吗？相关的合同和押金记录也会被删除。')) {
      deleteTenant(id);
    }
  };

  const calcLeaseMonths = (start: string, end: string) => {
    try {
      return differenceInMonths(parseISO(end), parseISO(start));
    } catch {
      return 12;
    }
  };

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">租客管理</h1>
          <p className="text-slate-500 text-sm mt-1">
            共 {tenants.length} 位租客，{leases.filter(l => l.status === 'active').length} 个有效合同
          </p>
        </div>
        <button className="btn-primary" onClick={() => {
          setEditingTenant(null);
          resetForm();
          setShowAddModal(true);
        }}>
          <Plus size={18} className="mr-2" />
          新增租客
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索租客姓名、电话、身份证号..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">租客信息</th>
                <th className="table-header">联系方式</th>
                <th className="table-header">租住房源</th>
                <th className="table-header">合同信息</th>
                <th className="table-header">押金</th>
                <th className="table-header">状态</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant, index) => {
                const lease = getActiveLeaseForTenant(tenant.id);
                const property = lease ? getPropertyForLease(lease.id) : null;
                const overdueCount = getOverdueBillsCount(tenant.id);
                const deposit = getDepositForTenant(tenant.id);
                const leaseMonths = lease ? calcLeaseMonths(lease.startDate, lease.endDate) : 0;

                return (
                  <tr
                    key={tenant.id}
                    className="hover:bg-slate-50 transition-colors animate-slide-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                          <User size={18} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{tenant.name}</p>
                          <p className="text-xs text-slate-500">
                            身份证：{tenant.idCard.replace(/^(.{6})(.+)(.{4})$/, '$1********$3')}
                          </p>
                        </div>
                        {overdueCount > 0 && (
                          <span className="badge bg-rose-100 text-rose-700 ml-2">
                            <AlertCircle size={12} className="mr-1" />
                            欠费 {overdueCount} 笔
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-2">
                          <Phone size={14} className="text-slate-400" />
                          <a href={`tel:${tenant.phone}`} className="text-primary-600 hover:underline">
                            {tenant.phone}
                          </a>
                        </p>
                        {tenant.email && (
                          <p className="text-sm flex items-center gap-2">
                            <Mail size={14} className="text-slate-400" />
                            <span className="text-slate-600">{tenant.email}</span>
                          </p>
                        )}
                        {tenant.emergencyContact && (
                          <p className="text-xs text-slate-500">
                            紧急联系人：{tenant.emergencyContact}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {property ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Home size={14} className="text-slate-400" />
                            <p className="font-medium text-slate-800">{property.name}</p>
                          </div>
                          <p className="text-xs text-slate-500 ml-6">{property.address}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">暂无租住</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {lease ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`badge ${getLeaseStatusColor(lease.status)}`}>
                              {getLeaseStatusLabel(lease.status)}
                            </span>
                            {leaseMonths > 0 && (
                              <span className="badge bg-blue-50 text-blue-700 border border-blue-100">
                                {leaseMonths}个月
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {formatDate(lease.startDate)} 至 {formatDate(lease.endDate)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <BadgeDollarSign size={12} className="text-primary-600" />
                            <span className="text-sm font-medium text-primary-700">
                              {formatCurrency(lease.monthlyRent)}/月
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-500">
                              每月{lease.rentDay}日交租
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">无有效合同</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {deposit ? (
                        <div>
                          <p className={`font-medium ${getDepositStatusColor(deposit.status).replace('bg-', 'text-').split(' ')[0]}`}>
                            {formatCurrency(deposit.amount)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs badge ${getDepositStatusColor(deposit.status)}`}>
                              {getDepositStatusLabel(deposit.status)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDate(deposit.receivedDate)} 收
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {lease ? (
                        <span className={`badge ${getLeaseStatusColor(lease.status)}`}>
                          {getLeaseStatusLabel(lease.status)}
                        </span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-600">
                          未租住
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <LinkToDetail tenantId={tenant.id} />
                        <button
                          onClick={() => handleEdit(tenant)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                          title="编辑"
                        >
                          <Edit2 size={16} className="text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(tenant.id)}
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

        {filteredTenants.length === 0 && (
          <div className="text-center py-16">
            <User size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">暂无租客信息</p>
            <button
              onClick={() => {
                setEditingTenant(null);
                resetForm();
                setShowAddModal(true);
              }}
              className="btn-primary mt-4"
            >
              <Plus size={16} className="mr-2" />
              添加第一位租客
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {editingTenant ? '编辑租客与合同' : '新增租客与合同'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                填写租客信息、合同信息及押金登记，保存后将自动生成合同和押金记录
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <User size={18} className="text-primary-600" />
                  <h3 className="font-semibold text-slate-800">基本信息</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">姓名 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      className="input"
                      value={formData.tenant.name}
                      onChange={(e) => setFormData({ ...formData, tenant: { ...formData.tenant, name: e.target.value } })}
                      placeholder="请输入租客姓名"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">手机号 <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      className="input"
                      value={formData.tenant.phone}
                      onChange={(e) => setFormData({ ...formData, tenant: { ...formData.tenant, phone: e.target.value } })}
                      placeholder="请输入手机号"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">身份证号 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      className="input"
                      value={formData.tenant.idCard}
                      onChange={(e) => setFormData({ ...formData, tenant: { ...formData.tenant, idCard: e.target.value } })}
                      placeholder="请输入身份证号"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">邮箱（选填）</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.tenant.email}
                      onChange={(e) => setFormData({ ...formData, tenant: { ...formData.tenant, email: e.target.value } })}
                      placeholder="请输入邮箱地址"
                    />
                  </div>
                  <div>
                    <label className="label">紧急联系人（选填）</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.tenant.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, tenant: { ...formData.tenant, emergencyContact: e.target.value } })}
                      placeholder="姓名 联系方式"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText size={18} className="text-primary-600" />
                  <h3 className="font-semibold text-slate-800">合同信息</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="label">租住房源 <span className="text-rose-500">*</span></label>
                    <select
                      className="input"
                      value={formData.lease.propertyId}
                      onChange={(e) => setLeaseDefaultsFromProperty(e.target.value)}
                      required
                    >
                      <option value="">请选择房源</option>
                      {availableProperties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {formatCurrency(p.monthlyRent)}/月 ({p.bedrooms}室{p.bathrooms}卫)
                        </option>
                      ))}
                    </select>
                    {availableProperties.length === 0 && !editingTenant && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> 暂无可出租房源，请先在房源管理添加房源或释放已占用房源
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">起租日期 <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      className="input"
                      value={formData.lease.startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setFormData({
                          ...formData,
                          lease: {
                            ...formData.lease,
                            startDate: newStart,
                            endDate: formData.lease.endDate || formatDate(addMonths(parseISO(newStart), 12)),
                          },
                        });
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">到期日期 <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      className="input"
                      value={formData.lease.endDate}
                      onChange={(e) => setFormData({ ...formData, lease: { ...formData.lease, endDate: e.target.value } })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">月租金（元） <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      step="100"
                      value={formData.lease.monthlyRent || ''}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          lease: { ...formData.lease, monthlyRent: v },
                          deposit: {
                            ...formData.deposit,
                            amount: formData.deposit.amount || v * 2,
                          },
                        });
                      }}
                      placeholder="例如：4500"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">付款周期</label>
                    <select
                      className="input"
                      value={formData.lease.paymentCycle}
                      onChange={(e) => setFormData({
                        ...formData,
                        lease: { ...formData.lease, paymentCycle: e.target.value as Lease['paymentCycle'] },
                      })}
                    >
                      <option value="monthly">月付</option>
                      <option value="quarterly">季付</option>
                      <option value="yearly">年付</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">每月交租日</label>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      max="31"
                      value={formData.lease.rentDay}
                      onChange={(e) => setFormData({
                        ...formData,
                        lease: { ...formData.lease, rentDay: Math.max(1, Math.min(31, Number(e.target.value) || 1)) },
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CreditCard size={18} className="text-primary-600" />
                  <h3 className="font-semibold text-slate-800">押金登记</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">押金金额（元）</label>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      step="100"
                      value={formData.deposit.amount || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        deposit: { ...formData.deposit, amount: Number(e.target.value) || 0 },
                      })}
                      placeholder="默认为2个月租金，填0表示不收取押金"
                    />
                  </div>
                  <div>
                    <label className="label">收取日期</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.deposit.receivedDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        deposit: { ...formData.deposit, receivedDate: e.target.value },
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">租客备注（选填）</label>
                    <textarea
                      className="input min-h-[80px]"
                      value={formData.tenant.notes}
                      onChange={(e) => setFormData({ ...formData, tenant: { ...formData.tenant, notes: e.target.value } })}
                      placeholder="租客习惯、特殊要求等"
                    />
                  </div>
                  <div>
                    <label className="label">合同/押金备注（选填）</label>
                    <textarea
                      className="input min-h-[80px]"
                      value={formData.deposit.notes || formData.lease.notes}
                      onChange={(e) => setFormData({
                        ...formData,
                        lease: { ...formData.lease, notes: e.target.value },
                        deposit: { ...formData.deposit, notes: e.target.value },
                      })}
                      placeholder="合同条款、押金抵扣说明等"
                    />
                  </div>
                </div>
              </div>

              {formData.lease.monthlyRent > 0 && (
                <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100">
                  <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                    <DollarSign size={16} className="text-primary-600" />
                    合同摘要预览
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">租期</p>
                      <p className="font-medium text-slate-800">
                        {calcLeaseMonths(formData.lease.startDate, formData.lease.endDate)}个月
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">月租金</p>
                      <p className="font-medium text-emerald-700">
                        {formatCurrency(formData.lease.monthlyRent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">押金</p>
                      <p className="font-medium text-blue-700">
                        {formData.deposit.amount > 0 ? formatCurrency(formData.deposit.amount) : '未收取'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">合同总额</p>
                      <p className="font-medium text-primary-700">
                        {formatCurrency(formData.lease.monthlyRent *
                          calcLeaseMonths(formData.lease.startDate, formData.lease.endDate))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTenant(null);
                    resetForm();
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Check size={16} />
                  {editingTenant ? '保存修改' : '确认登记'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const LinkToDetail = ({ tenantId }: { tenantId: string }) => (
  <button
    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
    title="查看详情"
    onClick={() => {
      alert(`租客详情页面开发中。租客ID: ${tenantId}`);
    }}
  >
    <FileText size={16} className="text-slate-500" />
  </button>
);

export default TenantList;
