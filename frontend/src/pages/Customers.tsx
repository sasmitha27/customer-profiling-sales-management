import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { FiPlus, FiSearch } from 'react-icons/fi';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, [search, riskFilter]);

  const loadCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (riskFilter) params.append('risk_flag', riskFilter);

      const response = await api.get(`/customers?${params.toString()}`);
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
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
          <p>Loading customers...</p>
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
                  <tr key={customer.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{customer.name}</td>
                    <td className="px-4 py-3 text-sm">{customer.nic}</td>
                    <td className="px-4 py-3 text-sm">{customer.mobile_primary}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge badge-${customer.risk_flag}`}>
                        {customer.risk_flag.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      LKR {parseFloat(customer.outstanding_balance || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="text-primary hover:text-blue-700 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </td>
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
