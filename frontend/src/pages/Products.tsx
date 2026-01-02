import { useState, useEffect } from 'react';
import api from '../utils/api';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiX } from 'react-icons/fi';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '',
    sku: ''
  });

  useEffect(() => {
    loadProducts();
  }, [search]);

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form data before submission:', formData);
    
    try {
      // Validate required fields
      if (!formData.name || !formData.sku || !formData.cost_price || !formData.selling_price) {
        alert('Please fill in all required fields');
        return;
      }

      const dataToSend = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        description: formData.description || null,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        stock_quantity: parseInt(formData.stock_quantity) || 0
      };

      console.log('Sending data to API:', dataToSend);
      
      const response = await api.post('/products', dataToSend);
      console.log('Product created successfully:', response.data);
      
      setShowModal(false);
      setFormData({ name: '', category: '', description: '', cost_price: '', selling_price: '', stock_quantity: '', sku: '' });
      loadProducts();
      alert('Product created successfully!');
    } catch (error: any) {
      console.error('Error creating product:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
      alert('Error creating product: ' + errorMessage);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center">
          <FiPlus className="mr-2" /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No products found. Add your first product to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Price</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Stock</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-sm">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      LKR {parseFloat(product.selling_price || product.unit_price || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${product.stock_quantity > 10 ? 'badge-green' : product.stock_quantity > 0 ? 'badge-yellow' : 'badge-red'}`}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-primary hover:text-blue-700 mr-3">
                        <FiEdit size={18} />
                      </button>
                      <button className="text-danger hover:text-red-700">
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Product</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="input"
                    required
                  >
                    <option value="">Select category</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">SKU *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="input"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cost Price (LKR) *</label>
                    <input
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                      className="input"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Selling Price (LKR) *</label>
                    <input
                      type="number"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                      className="input"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    className="input"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
