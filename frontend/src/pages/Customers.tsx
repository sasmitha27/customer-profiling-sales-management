import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { FiPlus, FiSearch, FiAlertCircle } from 'react-icons/fi';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [search, riskFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (riskFilter) params.append('risk_flag', riskFilter);

      const response = await api.get(`/customers?${params.toString()}`);
      
      if (response.data && response.data.success) {
        setCustomers(response.data.data || []);
      } else {
        setCustomers([]);
      }
    } catch (error: any) {
      console.error('Error loading customers:', error);
      setError(error.response?.data?.message || 'Failed to load customers. Please try again.');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerClick = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Link to="/customers/new" className="btn btn-primary flex items-center">
          <FiPlus className="mr-2" /> Add Customer
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, NIC, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="input"
          >
            <option value="">All Risk Levels</option>
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="red">Red</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">Loading customers...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center text-red-600">
              <FiAlertCircle className="mx-auto mb-4" size={48} />
              <p className="text-lg font-semibold mb-2">Error Loading Customers</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={loadCustomers}
                className="mt-4 btn btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center text-gray-500">
              <p className="text-lg font-semibold mb-2">No customers found</p>
              <p className="text-sm mb-4">
                {search || riskFilter ? 'Try adjusting your filters' : 'Get started by adding your first customer'}
              </p>
              {!search && !riskFilter && (
                <Link to="/customers/new" className="btn btn-primary">
                  <FiPlus className="mr-2" /> Add Customer
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">NIC</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Mobile</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Risk</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Outstanding</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t hover:bg-gray-50 cursor-pointer transition-colors">
                    <td 
                      className="px-4 py-3 text-sm font-medium text-primary hover:text-blue-700 cursor-pointer"
                      onClick={() => handleCustomerClick(customer.id)}
                    >
                      {customer.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.nic}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.mobile_primary}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge badge-${customer.risk_flag}`}>
                        {customer.risk_flag?.toUpperCase() || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      LKR {parseFloat(customer.outstanding_balance || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCustomerClick(customer.id);
                        }}
                        className="text-primary hover:text-blue-700 text-sm font-medium hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Table Footer */}
            <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
              Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
