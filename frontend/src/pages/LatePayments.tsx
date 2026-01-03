import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiFilter, FiPhone, FiUser } from 'react-icons/fi';
import api from '../utils/api';

interface LatePayment {
  id: number;
  installment_id: number;
  invoice_number: string;
  customer_name: string;
  customer_nic: string;
  customer_mobile: string;
  risk_flag: string;
  installment_number: number;
  due_date: string;
  amount_due: string;
  days_overdue: number;
  status: string;
  notes: string;
  invoice_total: string;
  invoice_remaining: string;
}

interface Stats {
  total_late_payments: number;
  pending_count: number;
  escalated_count: number;
  resolved_count: number;
  total_amount_overdue: string;
  avg_days_overdue: string;
  affected_customers: number;
}

export default function LatePayments() {
  const [latePayments, setLatePayments] = useState<LatePayment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedPayment, setSelectedPayment] = useState<LatePayment | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '' });

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, statsRes] = await Promise.all([
        api.get(`/late-payments?status=${filterStatus}`),
        api.get('/late-payments/stats')
      ]);
      
      setLatePayments(paymentsRes.data.data);
      setStats(statsRes.data.data.stats);
    } catch (error) {
      console.error('Error loading late payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayment) return;

    try {
      await api.patch(`/late-payments/${selectedPayment.id}`, updateForm);
      setShowUpdateModal(false);
      setSelectedPayment(null);
      setUpdateForm({ status: '', notes: '' });
      loadData();
      alert('Late payment status updated successfully');
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Error updating status');
    }
  };

  const handleEscalate = async (daysThreshold: number = 30) => {
    if (!confirm(`Escalate all late payments over ${daysThreshold} days?`)) return;

    try {
      const response = await api.post('/late-payments/escalate', { days_threshold: daysThreshold });
      alert(`Escalated ${response.data.count} late payment(s)`);
      loadData();
    } catch (error: any) {
      console.error('Error escalating:', error);
      alert(error.response?.data?.message || 'Error escalating late payments');
    }
  };

  const openUpdateModal = (payment: LatePayment) => {
    setSelectedPayment(payment);
    setUpdateForm({ status: payment.status, notes: payment.notes || '' });
    setShowUpdateModal(true);
  };

  const getRiskBadgeColor = (flag: string) => {
    switch (flag) {
      case 'red': return 'bg-red-100 text-red-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'green': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'escalated':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Escalated</span>;
      case 'resolved':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Resolved</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FiAlertTriangle className="text-red-600" />
          Late Payments
        </h1>
        <button 
          onClick={() => handleEscalate(30)}
          className="btn btn-danger flex items-center"
        >
          <FiAlertTriangle className="mr-2" />
          Auto-Escalate (30+ days)
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  LKR {parseFloat(stats.total_amount_overdue).toLocaleString()}
                </p>
              </div>
              <FiAlertTriangle className="text-red-600 text-3xl" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.total_late_payments} installments
            </p>
          </div>

          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_count}</p>
              </div>
              <FiClock className="text-yellow-600 text-3xl" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Awaiting action</p>
          </div>

          <div className="card bg-orange-50 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Escalated</p>
                <p className="text-2xl font-bold text-orange-600">{stats.escalated_count}</p>
              </div>
              <FiAlertTriangle className="text-orange-600 text-3xl" />
            </div>
            <p className="text-xs text-gray-500 mt-2">High priority</p>
          </div>

          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Days Overdue</p>
                <p className="text-2xl font-bold text-blue-600">
                  {parseFloat(stats.avg_days_overdue).toFixed(0)}
                </p>
              </div>
              <FiClock className="text-blue-600 text-3xl" />
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats.affected_customers} customers</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded ${filterStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <FiClock className="inline mr-2" />
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('escalated')}
            className={`px-4 py-2 rounded ${filterStatus === 'escalated' ? 'bg-red-100 text-red-800 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <FiAlertTriangle className="inline mr-2" />
            Escalated
          </button>
          <button
            onClick={() => setFilterStatus('resolved')}
            className={`px-4 py-2 rounded ${filterStatus === 'resolved' ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <FiCheckCircle className="inline mr-2" />
            Resolved
          </button>
        </div>
      </div>

      {/* Late Payments Table */}
      <div className="card">
        {loading ? (
          <p>Loading late payments...</p>
        ) : latePayments.length === 0 ? (
          <div className="text-center py-12">
            <FiCheckCircle className="mx-auto text-6xl text-green-500 mb-4" />
            <p className="text-xl font-semibold text-gray-700">
              {filterStatus === 'pending' ? 'No pending late payments' : 
               filterStatus === 'escalated' ? 'No escalated payments' : 
               'No resolved payments'}
            </p>
            <p className="text-gray-500 mt-2">Great job keeping payments on track!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Invoice</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Installment</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Due Date</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount Due</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Days Overdue</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Risk</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {latePayments.map((payment) => (
                  <tr key={payment.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <FiUser className="text-gray-400 mt-1" />
                        <div>
                          <p className="font-medium text-sm">{payment.customer_name}</p>
                          <p className="text-xs text-gray-500">{payment.customer_nic}</p>
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <FiPhone className="text-xs" />
                            {payment.customer_mobile}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{payment.invoice_number}</p>
                      <p className="text-xs text-gray-500">
                        Balance: LKR {parseFloat(payment.invoice_remaining).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold">#{payment.installment_number}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(payment.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-red-600">
                        LKR {parseFloat(payment.amount_due).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        payment.days_overdue > 60 ? 'bg-red-100 text-red-800' :
                        payment.days_overdue > 30 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.days_overdue} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full uppercase font-semibold ${getRiskBadgeColor(payment.risk_flag)}`}>
                        {payment.risk_flag}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openUpdateModal(payment)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Status Modal */}
      {showUpdateModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Update Late Payment Status</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">Customer: <span className="font-semibold">{selectedPayment.customer_name}</span></p>
              <p className="text-sm text-gray-600">Invoice: <span className="font-semibold">{selectedPayment.invoice_number}</span></p>
              <p className="text-sm text-gray-600">Amount: <span className="font-semibold text-red-600">LKR {parseFloat(selectedPayment.amount_due).toLocaleString()}</span></p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={updateForm.status}
                onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                className="input"
              >
                <option value="pending">Pending</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={updateForm.notes}
                onChange={(e) => setUpdateForm({...updateForm, notes: e.target.value})}
                className="input"
                rows={3}
                placeholder="Add notes about this late payment..."
              />
            </div>

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setSelectedPayment(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className="btn btn-primary"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
