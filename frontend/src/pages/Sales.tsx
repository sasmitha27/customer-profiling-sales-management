import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { FiPlus, FiEye, FiX, FiTrash2 } from 'react-icons/fi';

export default function Sales() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    down_payment: '',
    installment_plan: 'monthly',
    installment_months: '12',
    notes: ''
  });
  const [items, setItems] = useState<any[]>([{ product_id: '', quantity: 1, unit_price: 0 }]);

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    if (showModal) {
      loadCustomers();
      loadProducts();
    }
  }, [showModal]);

  const loadSales = async () => {
    try {
      const response = await api.get('/sales');
      setSales(response.data.data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill price when product is selected
    if (field === 'product_id') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        newItems[index].unit_price = parseFloat(product.selling_price || product.unit_price || 0);
      }
    }
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sales form data:', formData);
    console.log('Sales items:', items);
    
    try {
      // Validate required fields
      if (!formData.customer_id) {
        alert('Please select a customer');
        return;
      }

      if (items.length === 0 || !items[0].product_id) {
        alert('Please add at least one product');
        return;
      }

      const payload = {
        customer_id: parseInt(formData.customer_id),
        payment_type: 'installment',
        installment_duration: parseInt(formData.installment_months),
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      console.log('Sending sales payload to API:', payload);
      
      const response = await api.post('/sales', payload);
      console.log('Sale created successfully:', response.data);
      
      setShowModal(false);
      setFormData({
        customer_id: '',
        sale_date: new Date().toISOString().split('T')[0],
        down_payment: '',
        installment_plan: 'monthly',
        installment_months: '12',
        notes: ''
      });
      setItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
      loadSales();
      alert('Sale created successfully!');
    } catch (error: any) {
      console.error('Error creating sale:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
      alert('Error creating sale: ' + errorMessage);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center">
          <FiPlus className="mr-2" /> New Sale
        </button>
      </div>

      {/* Sales Table */}
      <div className="card">
        {loading ? (
          <p>Loading sales...</p>
        ) : sales.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sales orders yet. Create your first sale to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Order #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">#{sale.id}</td>
                    <td className="px-4 py-3 text-sm">{sale.customer_name}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      LKR {parseFloat(sale.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge badge-green">Completed</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-primary hover:text-blue-700">
                        <FiEye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">New Sales Order</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Customer & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer *</label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                      className="input"
                      required
                    >
                      <option value="">Select customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} - {customer.nic}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Sale Date *</label>
                    <input
                      type="date"
                      value={formData.sale_date}
                      onChange={(e) => setFormData({...formData, sale_date: e.target.value})}
                      className="input"
                      required
                    />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium">Items *</label>
                    <button type="button" onClick={addItem} className="btn btn-secondary text-sm px-3 py-1">
                      <FiPlus className="inline mr-1" size={14} /> Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <label className="block text-xs text-gray-600 mb-1">Product</label>
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                            className="input"
                            required
                          >
                            <option value="">Select product</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name} (Stock: {product.stock_quantity})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                            className="input"
                            min="1"
                            required
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="block text-xs text-gray-600 mb-1">Unit Price</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                            className="input"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {(item.quantity * item.unit_price).toLocaleString()}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-right">
                    <span className="text-lg font-bold">
                      Total: LKR {calculateTotal().toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Down Payment (LKR)</label>
                    <input
                      type="number"
                      value={formData.down_payment}
                      onChange={(e) => setFormData({...formData, down_payment: e.target.value})}
                      className="input"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Installment Plan</label>
                    <select
                      value={formData.installment_plan}
                      onChange={(e) => setFormData({...formData, installment_plan: e.target.value})}
                      className="input"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Installment Period</label>
                    <select
                      value={formData.installment_months}
                      onChange={(e) => setFormData({...formData, installment_months: e.target.value})}
                      className="input"
                    >
                      <option value="3">3 months</option>
                      <option value="6">6 months</option>
                      <option value="12">12 months</option>
                      <option value="24">24 months</option>
                      <option value="36">36 months</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="input"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
