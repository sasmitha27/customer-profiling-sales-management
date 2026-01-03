import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { FiPlus, FiEye, FiX, FiTrash2, FiPrinter } from 'react-icons/fi';

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
    installment_months: '6',
    payment_day_of_month: '1',
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
        payment_day_of_month: parseInt(formData.payment_day_of_month),
        down_payment: formData.down_payment ? parseFloat(formData.down_payment) : 0,
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
        installment_months: '6',
        payment_day_of_month: '1',
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

  const printInvoice = async (sale: any) => {
    try {
      // Fetch detailed sale information
      const response = await api.get(`/sales/${sale.id}`);
      const saleDetails = response.data.data;
      
      // Helper function for ordinal suffix
      const getOrdinalSuffix = (day: number) => {
        if (day >= 11 && day <= 13) return 'th';
        switch (day % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
        }
      };
      
      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to print the invoice');
        return;
      }

      // Generate invoice HTML
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice #${saleDetails.invoice_number || sale.id}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              padding: 40px;
              color: #333;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
            }
            .header {
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 5px;
            }
            .company-details {
              font-size: 12px;
              color: #666;
              line-height: 1.6;
            }
            .invoice-title {
              font-size: 24px;
              font-weight: bold;
              text-align: right;
              color: #333;
              margin-top: -40px;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .section {
              flex: 1;
            }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 10px;
            }
            .info-line {
              font-size: 14px;
              margin-bottom: 5px;
              line-height: 1.6;
            }
            .info-label {
              font-weight: bold;
              display: inline-block;
              width: 120px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            thead {
              background-color: #f3f4f6;
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              font-weight: bold;
              color: #666;
              text-transform: uppercase;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .summary {
              margin-top: 30px;
              display: flex;
              justify-content: flex-end;
            }
            .summary-table {
              width: 300px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .summary-row.total {
              border-top: 2px solid #333;
              margin-top: 10px;
              padding-top: 15px;
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .payment-info {
              background-color: #f9fafb;
              padding: 15px;
              border-radius: 5px;
              margin-top: 20px;
              margin-bottom: 20px;
            }
            .payment-info h3 {
              font-size: 14px;
              margin-bottom: 10px;
              color: #333;
            }
            .installment-details {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              font-size: 13px;
            }
            @media print {
              body {
                padding: 0;
              }
              .invoice-container {
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-name">FurniTrack</div>
              <div class="company-details">
                Customer Profiling & Sales Management System<br>
                Phone: +94 11 234 5678 | Email: info@furnitrack.com<br>
                Address: 123 Main Street, Colombo 00700, Sri Lanka
              </div>
              <div class="invoice-title">INVOICE</div>
            </div>

            <div class="invoice-info">
              <div class="section">
                <div class="section-title">Bill To:</div>
                <div class="info-line"><strong>${saleDetails.customer_name || sale.customer_name}</strong></div>
                <div class="info-line">${saleDetails.customer_nic || 'N/A'}</div>
                <div class="info-line">${saleDetails.customer_mobile || 'N/A'}</div>
                <div class="info-line">${saleDetails.customer_address || ''}</div>
              </div>
              <div class="section" style="text-align: right;">
                <div class="info-line">
                  <span class="info-label">Invoice #:</span>
                  <strong>${saleDetails.invoice_number || `INV-${sale.id}`}</strong>
                </div>
                <div class="info-line">
                  <span class="info-label">Date:</span>
                  ${new Date(saleDetails.created_at || sale.created_at).toLocaleDateString()}
                </div>
                <div class="info-line">
                  <span class="info-label">Due Date:</span>
                  ${saleDetails.due_date ? new Date(saleDetails.due_date).toLocaleDateString() : 'N/A'}
                </div>
                <div class="info-line">
                  <span class="info-label">Payment Type:</span>
                  <strong style="text-transform: uppercase;">${saleDetails.payment_type || 'INSTALLMENT'}</strong>
                </div>
              </div>
            </div>

            ${saleDetails.payment_type === 'installment' ? `
            <div class="payment-info">
              <h3>📅 Installment Plan Details</h3>
              <div class="installment-details">
                <div><strong>Duration:</strong> ${saleDetails.installment_duration || 0} months</div>
                <div><strong>Payment Day:</strong> ${saleDetails.payment_day_of_month || 1}${getOrdinalSuffix(saleDetails.payment_day_of_month || 1)} of each month</div>
                <div><strong>Monthly Payment:</strong> LKR ${parseFloat(saleDetails.monthly_installment || 0).toLocaleString()}</div>
                <div><strong>Down Payment:</strong> LKR ${parseFloat(saleDetails.down_payment || 0).toLocaleString()}</div>
                <div><strong>Total Amount:</strong> LKR ${parseFloat(saleDetails.total_amount || sale.total_amount).toLocaleString()}</div>
              </div>
            </div>
            ` : ''}

            <table>
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>Product</th>
                  <th class="text-center" style="width: 100px;">Quantity</th>
                  <th class="text-right" style="width: 150px;">Unit Price</th>
                  <th class="text-right" style="width: 150px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(saleDetails.items || []).map((item: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.product_name || 'Product'}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">LKR ${parseFloat(item.unit_price).toLocaleString()}</td>
                    <td class="text-right">LKR ${parseFloat(item.total_price).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-table">
                <div class="summary-row">
                  <span>Subtotal:</span>
                  <span>LKR ${parseFloat(saleDetails.total_amount || sale.total_amount).toLocaleString()}</span>
                </div>
                ${saleDetails.down_payment && parseFloat(saleDetails.down_payment) > 0 ? `
                <div class="summary-row">
                  <span>Down Payment:</span>
                  <span>- LKR ${parseFloat(saleDetails.down_payment).toLocaleString()}</span>
                </div>
                <div class="summary-row">
                  <span>Remaining Balance:</span>
                  <span>LKR ${(parseFloat(saleDetails.total_amount) - parseFloat(saleDetails.down_payment)).toLocaleString()}</span>
                </div>
                ` : ''}
                <div class="summary-row total">
                  <span>Total Amount:</span>
                  <span>LKR ${parseFloat(saleDetails.total_amount || sale.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p><strong>Thank you for your business!</strong></p>
              <p style="margin-top: 10px;">This is a computer-generated invoice and does not require a signature.</p>
              <p style="margin-top: 5px;">For any queries, please contact us at info@furnitrack.com or +94 11 234 5678</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
    } catch (error) {
      console.error('Error printing invoice:', error);
      alert('Error loading invoice details. Please try again.');
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
                      {new Date(sale.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      LKR {parseFloat(sale.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge badge-green">Completed</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => printInvoice(sale)}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50"
                          title="Print Invoice"
                        >
                          <FiPrinter size={18} />
                        </button>
                        <button 
                          className="text-primary hover:text-blue-700 p-2 rounded hover:bg-gray-50"
                          title="View Details"
                        >
                          <FiEye size={18} />
                        </button>
                      </div>
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

                  <div className="mt-4 text-right space-y-2">
                    <div>
                      <span className="text-lg font-bold">
                        Total: LKR {calculateTotal().toLocaleString()}
                      </span>
                    </div>
                    {formData.down_payment && parseFloat(formData.down_payment) > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600">Down Payment: LKR {parseFloat(formData.down_payment).toLocaleString()}</span>
                        <br />
                        <span className="text-green-600 font-semibold">
                          Remaining Balance: LKR {(calculateTotal() - parseFloat(formData.down_payment)).toLocaleString()}
                        </span>
                      </div>
                    )}
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
                      max={calculateTotal()}
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
                      <option value="1">1 month</option>
                      <option value="2">2 months</option>
                      <option value="3">3 months</option>
                      <option value="4">4 months</option>
                      <option value="5">5 months</option>
                      <option value="6">6 months</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Day of Month</label>
                    <select
                      value={formData.payment_day_of_month}
                      onChange={(e) => setFormData({...formData, payment_day_of_month: e.target.value})}
                      className="input"
                      title="Day of month customer will make payments"
                    >
                      {Array.from({length: 28}, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of month</option>
                      ))}
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
