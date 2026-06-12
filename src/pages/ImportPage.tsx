import React, { useState, useRef, useMemo } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, TrendingDown, HelpCircle, RefreshCw, Link2,
  Search, Filter, ChevronDown, Download, Info,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency } from '../utils/date';
import { generateFieldMapping } from '../utils/import';
import type { Transaction, Bill } from '../types';

const fieldMappingInfo = [
  { field: 'transactionDate', label: '交易日期', examples: ['日期', 'date', '时间'] },
  { field: 'description', label: '交易描述', examples: ['摘要', '描述', '备注'] },
  { field: 'amount', label: '交易金额', examples: ['金额', 'amount'] },
  { field: 'type', label: '收支类型', examples: ['收支', '方向', '收入/支出'] },
  { field: 'balance', label: '账户余额', examples: ['余额', 'balance'] },
  { field: 'payer', label: '付款方', examples: ['对方', 'payer'] },
];

const ImportPage: React.FC = () => {
  const {
    transactions, bills, leases, tenants, properties,
    importTransactions, autoMatchAll, reconcileTransaction,
    updateTransaction, deleteTransaction,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState<Transaction | null>(null);
  const [importResults, setImportResults] = useState<{
    total: number;
    income: number;
    expense: number;
    suspected: number;
  } | null>(null);

  const fieldMapping = useMemo(() => generateFieldMapping([]), []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter === 'matched' && !t.isMatched) return false;
      if (statusFilter === 'unmatched' && t.isMatched) return false;
      if (statusFilter === 'suspected' && !t.isSuspected) return false;
      if (statusFilter === 'income' && t.type !== 'income') return false;
      if (statusFilter === 'expense' && t.type !== 'expense') return false;

      const searchLower = searchQuery.toLowerCase();
      return (
        t.description.toLowerCase().includes(searchLower) ||
        t.amount.toString().includes(searchQuery) ||
        t.bank.toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [transactions, searchQuery, statusFilter]);

  const unmatchedBills = useMemo(() => {
    return bills.filter(b => b.status !== 'paid').sort((a, b) => {
      const statusOrder = { overdue: 0, pending: 1, partial: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [bills, leases]);

  const stats = useMemo(() => {
    return {
      total: transactions.length,
      matched: transactions.filter(t => t.isMatched).length,
      unmatched: transactions.filter(t => !t.isMatched).length,
      suspected: transactions.filter(t => t.isSuspected).length,
      totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      totalExpense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    };
  }, [transactions]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      alert('请上传 CSV 或 Excel 格式的银行流水文件');
      return;
    }

    setIsImporting(true);
    try {
      const imported = await importTransactions(file);
      
      const incomeCount = imported.filter(t => t.type === 'income').length;
      const expenseCount = imported.filter(t => t.type === 'expense').length;
      const suspectedCount = imported.filter(t => t.isSuspected).length;

      setImportResults({
        total: imported.length,
        income: incomeCount,
        expense: expenseCount,
        suspected: suspectedCount,
      });

      setTimeout(() => setImportResults(null), 5000);
    } catch (error) {
      alert('文件解析失败，请检查文件格式');
      console.error(error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAutoMatch = () => {
    const count = autoMatchAll();
    alert(`成功自动匹配 ${count} 笔交易`);
  };

  const handleManualMatch = (transaction: Transaction, bill: Bill) => {
    reconcileTransaction(transaction.id, bill.id);
    setShowMatchModal(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income': return <TrendingUp size={16} className="text-emerald-500" />;
      case 'expense': return <TrendingDown size={16} className="text-rose-500" />;
      default: return <HelpCircle size={16} className="text-slate-500" />;
    }
  };

  const getMatchedBillInfo = (transaction: Transaction) => {
    if (!transaction.matchedBillId) return null;
    return bills.find(b => b.id === transaction.matchedBillId);
  };

  const downloadSample = () => {
    const sampleCSV = `交易日期,摘要,收入金额,支出金额,交易机构
2025-01-05,张三 房租,3500.00,,招商银行
2025-01-06,物业费,500.00,建设银行
2025-01-10,李四 租金,2800.00,,工商银行
2025-01-12,维修费,350.00,建设银行`;

    const blob = new Blob(['\ufeff' + sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '银行流水示例.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">流水导入</h1>
          <p className="text-slate-500 text-sm mt-1">
            导入银行流水，自动识别租金收入，智能匹配账单
          </p>
        </div>
        <button className="btn-primary" onClick={handleAutoMatch}>
          <RefreshCw size={16} className="mr-2" />
          自动匹配
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">总交易笔数</p>
              <p className="stat-value text-slate-800">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <FileSpreadsheet size={24} className="text-primary-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">已匹配</p>
              <p className="stat-value text-emerald-600">{stats.matched}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={24} className="text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">待匹配</p>
              <p className="stat-value text-amber-600">{stats.unmatched}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Link2 size={24} className="text-amber-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">可疑交易</p>
              <p className="stat-value text-rose-600">{stats.suspected}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {importResults && (
        <div className="card bg-gradient-to-r from-primary-50 to-emerald-50 border-primary-200 mb-6 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <CheckCircle size={24} className="text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-primary-800">导入成功！</h3>
              <p className="text-sm text-primary-600">
                共导入 {importResults.total} 笔交易，
                收入 {importResults.income} 笔，
                支出 {importResults.expense} 笔，
                {importResults.suspected > 0 && (
                  <span className="text-rose-600">可疑 {importResults.suspected} 笔</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={`card border-2 border-dashed p-8 mb-6 text-center transition-all ${
          isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />
        
        {isImporting ? (
          <div className="py-8">
            <RefreshCw size={48} className="mx-auto mb-4 text-primary-500 animate-spin" />
            <p className="text-lg font-medium text-slate-700">正在解析文件...</p>
            <p className="text-sm text-slate-500 mt-1">请稍候</p>
          </div>
        ) : (
          <>
            <Upload size={48} className={`mx-auto mb-4 ${isDragging ? 'text-primary-500' : 'text-slate-400'}`} />
            <p className="text-lg font-medium text-slate-700 mb-2">
              拖拽文件到此处，或
              <button
                className="text-primary-600 hover:underline mx-1"
                onClick={() => fileInputRef.current?.click()}
              >
                点击选择文件
              </button>
            </p>
            <p className="text-sm text-slate-500 mb-4">
              支持 CSV、Excel 格式，最大 10MB
            </p>
            <button
              className="text-sm text-primary-600 hover:underline flex items-center gap-1 mx-auto"
              onClick={downloadSample}
            >
              <Download size={14} />
              下载示例文件
            </button>
          </>
        )}
      </div>

      <div className="card bg-slate-50 mb-6">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-primary-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-slate-800 mb-2">智能识别规则</h4>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>自动识别包含"房租"、"租金"、"房费"等关键词的收入</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>匹配金额与合同租金相近的交易</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>识别每月固定日期的 recurring 收入</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                <span>金额偏差超过 ±20% 的交易会标记为可疑</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">支持的字段映射：</p>
              <div className="flex flex-wrap gap-2">
                {fieldMappingInfo.map((item) => (
                  <span key={item.field} className="text-xs bg-white px-2 py-1 rounded-md border border-slate-200">
                    {item.label}: {item.examples.join('/')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索交易描述、金额、银行..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={16} />
              筛选
              <ChevronDown size={16} />
            </button>
            {showFilterDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[140px] z-20">
                {[
                  { value: 'all', label: '全部交易' },
                  { value: 'matched', label: '已匹配' },
                  { value: 'unmatched', label: '待匹配' },
                  { value: 'suspected', label: '可疑交易' },
                  { value: 'income', label: '仅收入' },
                  { value: 'expense', label: '仅支出' },
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
                <th className="table-header">交易日期</th>
                <th className="table-header">交易描述</th>
                <th className="table-header">金额</th>
                <th className="table-header">银行</th>
                <th className="table-header">匹配状态</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction, index) => {
                const matchedBill = getMatchedBillInfo(transaction);
                
                return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-slate-50 transition-colors animate-slide-up ${
                      transaction.isSuspected ? 'bg-rose-50/50' : ''
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="table-cell">
                      <span className="text-slate-700">{formatDate(transaction.transactionDate)}</span>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-slate-800">{transaction.description}</p>
                        {transaction.isSuspected && transaction.suspicionReason && (
                          <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            {transaction.suspicionReason}
                          </p>
                        )}
                        {matchedBill && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle size={12} />
                            已匹配账单：{matchedBill.period.replace('-', '年')}月
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        <span className={`font-bold ${
                          transaction.type === 'income' ? 'text-emerald-600' :
                          transaction.type === 'expense' ? 'text-rose-600' : 'text-slate-600'
                        }`}>
                          {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-slate-600">{transaction.bank}</span>
                    </td>
                    <td className="table-cell">
                      {transaction.isMatched ? (
                        <span className="badge bg-emerald-100 text-emerald-700">
                          <CheckCircle size={12} className="mr-1" />
                          已匹配
                        </span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-700">
                          <Link2 size={12} className="mr-1" />
                          待匹配
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        {!transaction.isMatched && (
                          <button
                            onClick={() => setShowMatchModal(transaction)}
                            className="p-2 rounded-lg hover:bg-primary-50 transition-colors"
                            title="手动匹配"
                          >
                            <Link2 size={16} className="text-primary-500" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteTransaction(transaction.id)}
                          className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                          title="删除"
                        >
                          <XCircle size={16} className="text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-16">
            <FileSpreadsheet size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-2">暂无交易记录</p>
            <p className="text-sm text-slate-400">导入银行流水开始对账</p>
          </div>
        )}
      </div>

      {showMatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">手动匹配账单</h2>
              <button
                onClick={() => setShowMatchModal(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <p className="text-sm text-slate-600 mb-1">当前交易：</p>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{showMatchModal.description}</span>
                <span className={`font-bold ${
                  showMatchModal.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatCurrency(showMatchModal.amount)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {formatDate(showMatchModal.transactionDate)} · {showMatchModal.bank}
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <p className="text-sm font-medium text-slate-700 mb-3">选择要匹配的账单：</p>
              <div className="space-y-3">
                {unmatchedBills.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">暂无待匹配的账单</p>
                ) : (
                  unmatchedBills.map((bill) => {
                    const lease = leases.find(l => l.id === bill.leaseId);
                    const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null;
                    const property = lease ? properties.find(p => p.id === lease.propertyId) : null;
                    const diff = Math.abs(bill.totalAmount - showMatchModal.amount);
                    const isAmountMatch = diff / bill.totalAmount < 0.1;

                    return (
                      <div
                        key={bill.id}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isAmountMatch
                            ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                            : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50'
                        }`}
                        onClick={() => handleManualMatch(showMatchModal, bill)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">
                              {bill.period.replace('-', '年')}月账单
                            </span>
                            {isAmountMatch && (
                              <span className="badge bg-emerald-100 text-emerald-700 text-xs">
                                金额匹配
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-slate-800">
                            {formatCurrency(bill.totalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{tenant?.name}</span>
                          <span>·</span>
                          <span>{property?.name}</span>
                        </div>
                        {diff > 0 && (
                          <p className="text-xs text-slate-500 mt-2">
                            差额：{diff > 0 ? '+' : ''}{formatCurrency(showMatchModal.amount - bill.totalAmount)}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200">
              <button
                className="btn-secondary w-full"
                onClick={() => setShowMatchModal(null)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportPage;
