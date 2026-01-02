import { useState, useEffect } from 'react';
import api from '../utils/api';
import { FiPlus, FiDollarSign } from 'react-icons/fi';

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payments</h1>
        <button className="btn btn-primary flex items-center">
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
    </div>
  );
}
