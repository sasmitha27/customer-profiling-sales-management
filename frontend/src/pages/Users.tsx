import { useState, useEffect } from 'react';
import api from '../utils/api';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <button className="btn btn-primary flex items-center">
          <FiPlus className="mr-2" /> Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Full Name</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Role</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{user.username}</td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm">{user.full_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${
                        user.role === 'admin' ? 'badge-red' :
                        user.role === 'manager' ? 'badge-yellow' : 'badge-green'
                      }`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${user.is_active ? 'badge-green' : 'badge-red'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
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
    </div>
  );
}
