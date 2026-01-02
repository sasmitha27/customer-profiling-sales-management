import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { FiArrowLeft, FiEdit, FiFileText, FiDollarSign, FiCalendar } from 'react-icons/fi';

function CustomerForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Info
    name: '',
    nic: '',
    dob: '',
    gender: 'male',
    mobile_primary: '',
    mobile_secondary: '',
    email: '',
    permanent_address: '',
    current_address: '',
    notes: '',
    
    // Employment
    employment_type: '',
    company_name: '',
    job_title: '',
    work_address: '',
    monthly_salary: '',
    payment_type: '',
    start_date: '',
    
    // Guarantor
    guarantor_name: '',
    guarantor_nic: '',
    guarantor_mobile: '',
    guarantor_address: '',
    guarantor_workplace: '',
    guarantor_relationship: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        nic: formData.nic,
        dob: formData.dob,
        gender: formData.gender,
        mobile_primary: formData.mobile_primary,
        permanent_address: formData.permanent_address
      };

      if (formData.mobile_secondary) payload.mobile_secondary = formData.mobile_secondary;
      if (formData.email) payload.email = formData.email;
      if (formData.current_address) payload.current_address = formData.current_address;
      if (formData.notes) payload.notes = formData.notes;

      // Employment - only include if all required fields are present
      if (formData.employment_type || formData.company_name || formData.monthly_salary) {
        // Validate that all required employment fields are provided
        if (!formData.employment_type || !formData.company_name || !formData.monthly_salary) {
          alert('Please fill in all required employment fields (Employment Type, Company Name, and Monthly Salary) or leave the employment section empty.');
          setLoading(false);
          return;
        }

        if (parseFloat(formData.monthly_salary) <= 0) {
          alert('Monthly salary must be greater than 0');
          setLoading(false);
          return;
        }

        payload.employment = {
          employment_type: formData.employment_type,
          company_name: formData.company_name,
          job_title: formData.job_title || null,
          work_address: formData.work_address || null,
          monthly_salary: parseFloat(formData.monthly_salary),
          payment_type: formData.payment_type || null,
          start_date: formData.start_date || null
        };
      }

      // Guarantor - only include if all required fields are present
      if (formData.guarantor_name || formData.guarantor_nic || formData.guarantor_mobile || formData.guarantor_address) {
        // Validate that all required guarantor fields are provided
        if (!formData.guarantor_name || !formData.guarantor_nic || !formData.guarantor_mobile || !formData.guarantor_address) {
          alert('Please fill in all required guarantor fields (Name, NIC, Mobile, and Address) or leave the guarantor section empty.');
          setLoading(false);
          return;
        }

        payload.guarantor = {
          name: formData.guarantor_name,
          nic: formData.guarantor_nic,
          mobile: formData.guarantor_mobile,
          address: formData.guarantor_address,
          workplace: formData.guarantor_workplace || null,
          relationship: formData.guarantor_relationship || null
        };
      }

      const response = await api.post('/customers', payload);
      navigate(`/customers/${response.data.data.id}`);
    } catch (error: any) {
      console.error('Create customer error:', error.response || error);
      const serverMessage = error.response?.data?.error?.message || error.response?.data?.message;
      alert('Error creating customer: ' + (serverMessage || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="mr-4 p-2 hover:bg-gray-100 rounded"
        >
          <FiArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">Add New Customer</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">NIC Number *</label>
              <input
                type="text"
                name="nic"
                value={formData.nic}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth *</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Primary Mobile *</label>
              <input
                type="tel"
                name="mobile_primary"
                value={formData.mobile_primary}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secondary Mobile</label>
              <input
                type="tel"
                name="mobile_secondary"
                value={formData.mobile_secondary}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Permanent Address *</label>
              <textarea
                name="permanent_address"
                value={formData.permanent_address}
                onChange={handleChange}
                className="input"
                rows={2}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Current Address</label>
              <textarea
                name="current_address"
                value={formData.current_address}
                onChange={handleChange}
                className="input"
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Employment Information (Optional)</h2>
          <p className="text-sm text-gray-600 mb-4">If providing employment details, all fields marked with * are required</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Employment Type *</label>
              <select
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select type</option>
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="self-employed">Self-Employed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Salary (LKR) *</label>
              <input
                type="number"
                name="monthly_salary"
                value={formData.monthly_salary}
                onChange={handleChange}
                className="input"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Type</label>
              <select
                name="payment_type"
                value={formData.payment_type}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select type</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Work Address</label>
              <textarea
                name="work_address"
                value={formData.work_address}
                onChange={handleChange}
                className="input"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Guarantor Information */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Guarantor Information (Optional)</h2>
          <p className="text-sm text-gray-600 mb-4">If providing guarantor details, all fields marked with * are required</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Guarantor Name *</label>
              <input
                type="text"
                name="guarantor_name"
                value={formData.guarantor_name}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guarantor NIC *</label>
              <input
                type="text"
                name="guarantor_nic"
                value={formData.guarantor_nic}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guarantor Mobile *</label>
              <input
                type="tel"
                name="guarantor_mobile"
                value={formData.guarantor_mobile}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Relationship</label>
              <input
                type="text"
                name="guarantor_relationship"
                value={formData.guarantor_relationship}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Father, Brother, Friend"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Guarantor Address *</label>
              <textarea
                name="guarantor_address"
                value={formData.guarantor_address}
                onChange={handleChange}
                className="input"
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Guarantor Workplace</label>
              <input
                type="text"
                name="guarantor_workplace"
                value={formData.guarantor_workplace}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CustomerDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If route is '/customers/new' (either param 'new' or path ends with '/new'), show form
    const isNewRoute = id === 'new' || location.pathname.endsWith('/new');
    if (isNewRoute) {
      setLoading(false);
      return;
    }

    // Otherwise load customer data when an id is present
    if (id) {
      loadCustomerData();
    } else {
      setLoading(false);
    }
  }, [id, location.pathname]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const customerRes = await api.get(`/customers/${id}/details`);

      if (customerRes.data && customerRes.data.success) {
        const customerData = customerRes.data.data;
        setCustomer(customerData);
        
        // Extract invoices and payments from customer data
        if (customerData.invoices) {
          setInvoices(customerData.invoices);
        }
        if (customerData.recentPayments) {
          setPayments(customerData.recentPayments);
        }
      } else {
        throw new Error('Failed to load customer data');
      }
    } catch (error: any) {
      console.error('Error loading customer:', error);
      if (error.response?.status === 404) {
        alert('Customer not found');
        navigate('/customers');
      } else {
        alert('Failed to load customer details: ' + (error.response?.data?.message || error.message));
      }
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  const getLastPaymentDate = () => {
    if (payments.length === 0) return 'No payments yet';
    const lastPayment = payments.sort((a, b) => 
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    )[0];
    return new Date(lastPayment.payment_date).toLocaleDateString();
  };

  const getPendingAmount = () => {
    const pending = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    return pending;
  };

  // Show form for new customer
  const isNewRoute = id === 'new' || location.pathname.endsWith('/new');
  if (isNewRoute) {
    return <CustomerForm />;
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading customer details...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8">
        <p>Customer not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/customers')}
            className="mr-4 p-2 hover:bg-gray-100 rounded"
          >
            <FiArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold">{customer.name || 'Unknown'}</h1>
            <p className="text-gray-600">NIC: {customer.nic || 'N/A'}</p>
          </div>
        </div>
        <span className={`badge badge-${customer.risk_flag || 'green'} text-lg px-4 py-2`}>
          {(customer.risk_flag || 'green').toUpperCase()} RISK
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-blue-50">
          <div className="flex items-center">
            <FiFileText className="text-blue-600 mr-3" size={32} />
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-blue-600">{invoices.length}</p>
            </div>
          </div>
        </div>

        <div className="card bg-red-50">
          <div className="flex items-center">
            <FiDollarSign className="text-red-600 mr-3" size={32} />
            <div>
              <p className="text-sm text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-red-600">
                LKR {getPendingAmount().toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-green-50">
          <div className="flex items-center">
            <FiDollarSign className="text-green-600 mr-3" size={32} />
            <div>
              <p className="text-sm text-gray-600">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">
                LKR {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-purple-50">
          <div className="flex items-center">
            <FiCalendar className="text-purple-600 mr-3" size={32} />
            <div>
              <p className="text-sm text-gray-600">Last Payment</p>
              <p className="text-lg font-bold text-purple-600">{getLastPaymentDate()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Personal Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
            Personal Information
            <button className="btn btn-secondary btn-sm flex items-center">
              <FiEdit className="mr-1" /> Edit
            </button>
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Date of Birth</label>
              <p className="font-medium">{new Date(customer.dob).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Gender</label>
              <p className="font-medium capitalize">{customer.gender}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Mobile (Primary)</label>
              <p className="font-medium">{customer.mobile_primary}</p>
            </div>
            {customer.mobile_secondary && (
              <div>
                <label className="text-sm text-gray-600">Mobile (Secondary)</label>
                <p className="font-medium">{customer.mobile_secondary}</p>
              </div>
            )}
            {customer.email && (
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <p className="font-medium">{customer.email}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-600">Permanent Address</label>
              <p className="font-medium">{customer.permanent_address}</p>
            </div>
            {customer.current_address && (
              <div>
                <label className="text-sm text-gray-600">Current Address</label>
                <p className="font-medium">{customer.current_address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Employment Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Employment Information</h2>
          {customer.employment ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Employment Type</label>
                <p className="font-medium capitalize">{customer.employment.employment_type}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Company</label>
                <p className="font-medium">{customer.employment.company_name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Job Title</label>
                <p className="font-medium">{customer.employment.job_title}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Monthly Salary</label>
                <p className="font-medium">LKR {parseFloat(customer.employment.monthly_salary || 0).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Work Address</label>
                <p className="font-medium">{customer.employment.work_address}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No employment information available</p>
          )}
        </div>
      </div>

      {/* Guarantor Info */}
      {customer.guarantor && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Guarantor Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <p className="font-medium">{customer.guarantor.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">NIC</label>
              <p className="font-medium">{customer.guarantor.nic}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Mobile</label>
              <p className="font-medium">{customer.guarantor.mobile}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Relationship</label>
              <p className="font-medium">{customer.guarantor.relationship}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Address</label>
              <p className="font-medium">{customer.guarantor.address}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Workplace</label>
              <p className="font-medium">{customer.guarantor.workplace}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold mb-4">Recent Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-gray-500">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Invoice #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Paid</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      LKR {parseFloat(invoice.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      LKR {parseFloat(invoice.paid_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${
                        invoice.status === 'paid' ? 'badge-green' :
                        invoice.status === 'partial' ? 'badge-yellow' : 'badge-red'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Recent Payments</h2>
        {payments.length === 0 ? (
          <p className="text-gray-500">No payments yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Invoice #</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map((payment) => (
                  <tr key={payment.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">{payment.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
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