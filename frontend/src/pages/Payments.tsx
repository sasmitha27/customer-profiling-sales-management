import { useState, useEffect } from 'react';
import api from '../utils/api';
import { FiPlus, FiDollarSign, FiX, FiSearch, FiUser, FiPhone, FiMapPin } from 'react-icons/fi';

interface InvoiceData {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  nic: string;
  mobile_primary: string;
  address: string;
  risk_flag: string;
  total_amount: string;
  paid_amount: string;
  remaining_balance: string;
  due_date: string;
  status: string;
  payment_type: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const response = await api.get('/payments');
      setPayments(response.data.data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchInvoice = async () => {
    if (!invoiceNumber.trim()) {
      setError('Please enter an invoice number');
      return;
    }

    setLoadingInvoice(true);
    setError('');
    setInvoiceData(null);

    try {
      const response = await api.get(`/payments/invoice/${invoiceNumber.trim()}`);
      if (response.data.success) {
        setInvoiceData(response.data.data);
        // Auto-populate the amount with remaining balance
        setFormData(prev => ({
          ...prev,
          amount: response.data.data.remaining_balance,
        }));
      } else {
        setError(response.data.message || 'Invoice not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error fetching invoice details');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoiceData) {
      setError('Please search for an invoice first');
      return;
    }

    const paymentAmount = parseFloat(formData.amount);
    if (paymentAmount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (paymentAmount > parseFloat(invoiceData.remaining_balance)) {
      setError(`Payment amount cannot exceed remaining balance (LKR ${parseFloat(invoiceData.remaining_balance).toLocaleString()})`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/payments', {
        invoice_id: invoiceData.id,
        amount: paymentAmount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        notes: formData.notes,
      });

      // Reset form and close modal
      setShowModal(false);
      setInvoiceNumber('');
      setInvoiceData(null);
      setFormData({
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      
      // Reload payments
      loadPayments();
      
      // Show success message (you can use a toast library)
      alert('Payment recorded successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error recording payment');
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setInvoiceNumber('');
    setInvoiceData(null);
    setFormData({
      amount: '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setError('');
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payments</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center"
        >
          <FiPlus className="mr-2" /> Record Payment
        </button>
      </div>

      {/* Payments Table */}
      <div className="card">
        {loading ? (
          <p>Loading payments...</p>
        ) : payments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Invoice #</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">{payment.customer_name}</td>
                    <td className="px-4 py-3 text-sm">{payment.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      <FiDollarSign className="inline mr-1" />
                      LKR {parseFloat(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{payment.payment_method}</td>
                    <td className="px-4 py-3 text-sm">{payment.reference_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">Record Payment</h2>
              <button onClick={resetModal} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Invoice Search Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Enter invoice number (e.g., INV-12345)"
                    className="input flex-1"
                    disabled={!!invoiceData}
                  />
                  {!invoiceData && (
                    <button
                      onClick={searchInvoice}
                      disabled={loadingInvoice}
                      className="btn btn-secondary flex items-center"
                    >
                      <FiSearch className="mr-2" />
                      {loadingInvoice ? 'Searching...' : 'Search'}
                    </button>
                  )}
                  {invoiceData && (
                    <button
                      onClick={() => {
                        setInvoiceData(null);
                        setInvoiceNumber('');
                        setFormData(prev => ({ ...prev, amount: '' }));
                      }}
                      className="btn btn-secondary"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              {/* Customer Information */}
              {invoiceData && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-blue-900">Customer & Invoice Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FiUser className="text-blue-600" />
                        <span className="font-medium">Customer:</span>
                      </p>
                      <p className="text-base font-semibold ml-6">{invoiceData.customer_name}</p>
                      <p className="text-sm text-gray-600 ml-6">NIC: {invoiceData.nic}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FiPhone className="text-blue-600" />
                        <span className="font-medium">Contact:</span>
                      </p>
                      <p className="text-base ml-6">{invoiceData.mobile_primary}</p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FiMapPin className="text-blue-600" />
                        <span className="font-medium">Address:</span>
                      </p>
                      <p className="text-sm ml-6">{invoiceData.address}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Invoice Number</p>
                        <p className="font-semibold">{invoiceData.invoice_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Due Date</p>
                        <p className="font-semibold">{new Date(invoiceData.due_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="font-semibold">LKR {parseFloat(invoiceData.total_amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Paid Amount</p>
                        <p className="font-semibold text-green-600">LKR {parseFloat(invoiceData.paid_amount).toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Remaining Balance</p>
                        <p className="text-2xl font-bold text-red-600">LKR {parseFloat(invoiceData.remaining_balance).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Form */}
              {invoiceData && (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Amount (LKR) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="Enter payment amount"
                        className="input w-full"
                        required
                        max={invoiceData.remaining_balance}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum: LKR {parseFloat(invoiceData.remaining_balance).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                      </label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="input w-full"
                        required
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card</option>
                        <option value="online">Online Payment</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        className="input w-full"
                        required
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes (optional)"
                        className="input w-full"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button
                      type="button"
                      onClick={resetModal}
                      className="btn btn-secondary"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Recording...' : 'Record Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
