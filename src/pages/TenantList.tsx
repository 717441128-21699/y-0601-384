import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, Phone, Mail,
  Home, Calendar, User, FileText, AlertCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency } from '../utils/date';
import { getLeaseStatusLabel, getLeaseStatusColor } from '../utils/finance';
import type { Tenant } from '../types';

const TenantList: React.FC = () => {
  const {
    tenants, properties, leases, bills, deposits,
    addTenant, updateTenant, deleteTenant,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    idCard: '',
    email: '',
    emergencyContact: '',
    notes: '',
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTenant) {
      updateTenant(editingTenant.id, formData);
    } else {
      addTenant(formData);
    }

    setShowAddModal(false);
    setEditingTenant(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      idCard: '',
      email: '',
      emergencyContact: '',
      notes: '',
    });
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      phone: tenant.phone,
      idCard: tenant.idCard,
      email: tenant.email || '',
      emergencyContact: tenant.emergencyContact || '',
      notes: tenant.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该租客吗？相关的合同和押金记录也会被删除。')) {
      deleteTenant(id);
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
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
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
                          <p className="font-medium text-slate-800">{property.name}</p>
                          <p className="text-xs text-slate-500">{property.address}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">暂无租住</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {lease ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`badge ${getLeaseStatusColor(lease.status)}`}>
                              {getLeaseStatusLabel(lease.status)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {formatDate(lease.startDate)} 至 {formatDate(lease.endDate)}
                          </p>
                          <p className="text-sm font-medium text-primary-700">
                            {formatCurrency(lease.monthlyRent)}/月
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">无有效合同</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {deposit ? (
                        <div>
                          <p className="font-medium text-emerald-600">
                            {formatCurrency(deposit.amount)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(deposit.receivedDate)} 收取
                          </p>
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
                        <Link
                          to={`/tenants/${tenant.id}`}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                          title="查看详情"
                        >
                          <FileText size={16} className="text-slate-500" />
                        </Link>
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
              onClick={() => setShowAddModal(true)}
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingTenant ? '编辑租客' : '新增租客'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">姓名 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入租客姓名"
                  required
                />
              </div>

              <div>
                <label className="label">手机号 <span className="text-rose-500">*</span></label>
                <input
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="请输入手机号"
                  required
                />
              </div>

              <div>
                <label className="label">身份证号 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  className="input"
                  value={formData.idCard}
                  onChange={(e) => setFormData({ ...formData, idCard: e.target.value })}
                  placeholder="请输入身份证号"
                  required
                />
              </div>

              <div>
                <label className="label">邮箱（选填）</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="请输入邮箱地址"
                />
              </div>

              <div>
                <label className="label">紧急联系人（选填）</label>
                <input
                  type="text"
                  className="input"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="姓名 联系方式"
                />
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

              <div className="flex gap-3 pt-4">
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
                <button type="submit" className="btn-primary flex-1">
                  {editingTenant ? '保存修改' : '添加租客'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantList;
