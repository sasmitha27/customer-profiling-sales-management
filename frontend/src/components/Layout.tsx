import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiUsers, FiPackage, FiShoppingCart, FiDollarSign, FiAlertTriangle, FiFileText, FiSettings, FiLogOut } from 'react-icons/fi';

export default function Layout() {
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', to: '/', icon: FiHome },
    { name: 'Customers', to: '/customers', icon: FiUsers },
    { name: 'Products', to: '/products', icon: FiPackage },
    { name: 'Sales', to: '/sales', icon: FiShoppingCart },
    { name: 'Payments', to: '/payments', icon: FiDollarSign },
    { name: 'Late Payments', to: '/late-payments', icon: FiAlertTriangle },
    { name: 'Reports', to: '/reports', icon: FiFileText },
  ];

  if (user?.role === 'admin') {
    navigation.push({ name: 'Users', to: '/users', icon: FiSettings });
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-4">
          <h1 className="text-2xl font-bold">FurniTrack</h1>
          <p className="text-sm text-gray-400">Sales Management</p>
        </div>

        <nav className="mt-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.to}
              className="flex items-center px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              <item.icon className="mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
