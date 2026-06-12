import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Filter, MoreVertical, Edit2, Trash2,
  Home, MapPin, Users, DollarSign, Calendar, BedDouble, Bath,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/date';
import { getPropertyStatusLabel, getPropertyStatusColor } from '../utils/finance';
import type { Property } from '../types';

const PropertyList: React.FC = () => {
  const {
    properties, leases, tenants, bills, expenses,
    addProperty, updateProperty, deleteProperty,
    getPropertyIncome, getPropertyExpense,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    area: '',
    monthlyRent: '',
    propertyType: 'apartment' as Property['propertyType'],
    bedrooms: '1',
    bathrooms: '1',
    status: 'vacant' as Property['status'],
    notes: '',
  });

  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTenantForProperty = (propertyId: string) => {
    const lease = leases.find(l => l.propertyId === propertyId && l.status === 'active');
    if (!lease) return null;
    return tenants.find(t => t.id === lease.tenantId);
  };

  const getLeaseForProperty = (propertyId: string) => {
    return leases.find(l => l.propertyId === propertyId && l.status === 'active');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      area: parseFloat(formData.area),
      monthlyRent: parseFloat(formData.monthlyRent),
      bedrooms: parseInt(formData.bedrooms),
      bathrooms: parseInt(formData.bathrooms),
    };

    if (editingProperty) {
      updateProperty(editingProperty.id, data);
    } else {
      addProperty(data);
    }

    setShowAddModal(false);
    setEditingProperty(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      area: '',
      monthlyRent: '',
      propertyType: 'apartment',
      bedrooms: '1',
      bathrooms: '1',
      status: 'vacant',
      notes: '',
    });
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      area: property.area.toString(),
      monthlyRent: property.monthlyRent.toString(),
      propertyType: property.propertyType,
      bedrooms: property.bedrooms.toString(),
      bathrooms: property.bathrooms.toString(),
      status: property.status,
      notes: property.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该房源吗？相关的合同和账单也会被删除。')) {
      deleteProperty(id);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">房源管理</h1>
          <p className="text-slate-500 text-sm mt-1">
            共 {properties.length} 套房源，{properties.filter(p => p.status === 'occupied').length} 套在租
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} className="mr-2" />
          新增房源
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索房源名称或地址..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select
              className="input w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">全部状态</option>
              <option value="occupied">已出租</option>
              <option value="vacant">空置中</option>
              <option value="maintenance">维修中</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property, index) => {
          const tenant = getTenantForProperty(property.id);
          const lease = getLeaseForProperty(property.id);
          const income = getPropertyIncome(property.id);
          const expense = getPropertyExpense(property.id);
          const profit = income - expense;

          return (
            <div
              key={property.id}
              className="card card-hover animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative h-40 overflow-hidden">
                {property.imageUrl ? (
                  <img
                    src={property.imageUrl}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <Home size={48} className="text-primary-400" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span className={`badge ${getPropertyStatusColor(property.status)}`}>
                    {getPropertyStatusLabel(property.status)}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <h3 className="font-semibold text-white">{property.name}</h3>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-2 text-sm text-slate-500 mb-3">
                  <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{property.address}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <BedDouble size={16} className="mx-auto mb-1 text-slate-500" />
                    <span className="text-slate-700 font-medium">{property.bedrooms}室</span>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <Bath size={16} className="mx-auto mb-1 text-slate-500" />
                    <span className="text-slate-700 font-medium">{property.bathrooms}卫</span>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">面积</span>
                    <p className="text-slate-700 font-medium">{property.area}㎡</p>
                  </div>
                </div>

                {tenant && lease && (
                  <div className="p-3 bg-primary-50 rounded-lg mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">当前租客</span>
                      <span className="text-sm font-medium text-slate-800">{tenant.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        <Calendar size={12} className="inline mr-1" />
                        至 {formatDate(lease.endDate)}
                      </span>
                      <span className="font-medium text-primary-700">
                        {formatCurrency(lease.monthlyRent)}/月
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                  <div className="text-center">
                    <p className="text-slate-500">月租金</p>
                    <p className="font-semibold text-slate-800">{formatCurrency(property.monthlyRent)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">累计收入</p>
                    <p className="font-semibold text-emerald-600">{formatCurrency(income)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">净利润</p>
                    <p className={`font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(profit)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/properties/${property.id}`}
                    className="btn-secondary flex-1 text-sm py-2"
                  >
                    查看详情
                  </Link>
                  <button
                    onClick={() => handleEdit(property)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 size={16} className="text-slate-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="p-2 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={16} className="text-rose-500" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-16">
          <Home size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">暂无房源信息</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary mt-4"
          >
            <Plus size={16} className="mr-2" />
            添加第一套房源
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingProperty ? '编辑房源' : '新增房源'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">房源名称</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：阳光花园A座1201"
                  required
                />
              </div>

              <div>
                <label className="label">详细地址</label>
                <input
                  type="text"
                  className="input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="请输入详细地址"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">面积（㎡）</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="85"
                    required
                  />
                </div>
                <div>
                  <label className="label">月租金（元）</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                    placeholder="4500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">户型</label>
                  <select
                    className="input"
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as Property['propertyType'] })}
                  >
                    <option value="apartment">公寓</option>
                    <option value="house">别墅</option>
                    <option value="studio">单间</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="label">卧室</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="input"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">卫生间</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="input"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">状态</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Property['status'] })}
                >
                  <option value="vacant">空置中</option>
                  <option value="occupied">已出租</option>
                  <option value="maintenance">维修中</option>
                </select>
              </div>

              <div>
                <label className="label">备注</label>
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
                    setEditingProperty(null);
                    resetForm();
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingProperty ? '保存修改' : '添加房源'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyList;
