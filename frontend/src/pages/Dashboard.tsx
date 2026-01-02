import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [salesData, setSalesData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [sales, payments, customers, products] = await Promise.all([
        api.get('/dashboard/sales?period=month'),
        api.get('/dashboard/payments'),
        api.get('/dashboard/customers'),
        api.get('/dashboard/products'),
      ]);

      setSalesData(sales.data.data);
      setPaymentData(payments.data.data);
      setCustomerData(customers.data.data);
      setProductData(products.data.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-blue-50">
          <h3 className="text-gray-600 text-sm font-medium">Total Sales (Month)</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{salesData?.summary.total_sales || 0}</p>
          <p className="text-sm text-gray-500 mt-1">LKR {parseFloat(salesData?.summary.total_revenue || 0).toLocaleString()}</p>
        </div>

        <div className="card bg-green-50">
          <h3 className="text-gray-600 text-sm font-medium">Outstanding Amount</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">LKR {parseFloat(paymentData?.summary.total_outstanding || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{paymentData?.summary.pending_invoices || 0} pending invoices</p>
        </div>

        <div className="card bg-red-50">
          <h3 className="text-gray-600 text-sm font-medium">Overdue Amount</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">LKR {parseFloat(paymentData?.summary.overdue_amount || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{paymentData?.summary.overdue_invoices || 0} overdue invoices</p>
        </div>

        <div className="card bg-purple-50">
          <h3 className="text-gray-600 text-sm font-medium">Total Customers</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">{customerData?.summary.total_customers || 0}</p>
          <p className="text-sm text-gray-500 mt-1">
            <span className="text-green-600">{customerData?.summary.green_flag_count || 0}</span> /
            <span className="text-yellow-600"> {customerData?.summary.yellow_flag_count || 0}</span> /
            <span className="text-red-600"> {customerData?.summary.red_flag_count || 0}</span>
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Sales Trend (30 Days)</h2>
          {salesData?.trend && (
            <Line
              data={{
                labels: salesData.trend.map((d: any) => new Date(d.date).toLocaleDateString()),
                datasets: [
                  {
                    label: 'Revenue',
                    data: salesData.trend.map((d: any) => d.revenue),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                  },
                ],
              }}
              options={{ responsive: true, maintainAspectRatio: true }}
            />
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Customer Risk Distribution</h2>
          <Doughnut
            data={{
              labels: ['Green', 'Yellow', 'Red'],
              datasets: [
                {
                  data: [
                    customerData?.summary.green_flag_count || 0,
                    customerData?.summary.yellow_flag_count || 0,
                    customerData?.summary.red_flag_count || 0,
                  ],
                  backgroundColor: ['rgb(34, 197, 94)', 'rgb(234, 179, 8)', 'rgb(239, 68, 68)'],
                },
              ],
            }}
            options={{ responsive: true, maintainAspectRatio: true }}
          />
        </div>
      </div>

      {/* Top Products */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-4">Top 10 Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantity Sold</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {productData?.topProducts.map((product: any) => (
                <tr key={product.id} className="border-t">
                  <td className="px-4 py-3 text-sm">{product.name}</td>
                  <td className="px-4 py-3 text-sm">{product.category}</td>
                  <td className="px-4 py-3 text-sm text-right">{product.total_quantity_sold || 0}</td>
                  <td className="px-4 py-3 text-sm text-right">LKR {parseFloat(product.total_revenue || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* High Value Customers */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">High Value Customers</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">NIC</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Risk</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Spent</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {customerData?.highValue.map((customer: any) => (
                <tr key={customer.id} className="border-t">
                  <td className="px-4 py-3 text-sm">{customer.name}</td>
                  <td className="px-4 py-3 text-sm">{customer.nic}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge badge-${customer.risk_flag}`}>
                      {customer.risk_flag.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">LKR {parseFloat(customer.total_spent || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">LKR {parseFloat(customer.outstanding_balance || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
