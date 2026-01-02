import { useState } from 'react';
import { FiDownload, FiFileText, FiUsers, FiDollarSign, FiShoppingCart } from 'react-icons/fi';

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleGenerateReport = (type: string, format: string) => {
    alert(`Generating ${type} report in ${format} format...\nDate Range: ${dateFrom || 'All'} to ${dateTo || 'All'}`);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      {/* Date Range Filter */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Report */}
        <div className="card">
          <div className="flex items-center mb-4">
            <FiUsers className="text-primary mr-3" size={32} />
            <div>
              <h2 className="text-xl font-bold">Customer Report</h2>
              <p className="text-sm text-gray-600">Customer details, risk flags, and balances</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerateReport('Customer', 'PDF')}
              className="btn btn-primary flex items-center"
            >
              <FiDownload className="mr-2" /> PDF
            </button>
            <button
              onClick={() => handleGenerateReport('Customer', 'Excel')}
              className="btn btn-secondary flex items-center"
            >
              <FiDownload className="mr-2" /> Excel
            </button>
          </div>
        </div>

        {/* Sales Report */}
        <div className="card">
          <div className="flex items-center mb-4">
            <FiShoppingCart className="text-green-600 mr-3" size={32} />
            <div>
              <h2 className="text-xl font-bold">Sales Report</h2>
              <p className="text-sm text-gray-600">Sales orders and revenue summary</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerateReport('Sales', 'PDF')}
              className="btn btn-primary flex items-center"
            >
              <FiDownload className="mr-2" /> PDF
            </button>
            <button
              onClick={() => handleGenerateReport('Sales', 'Excel')}
              className="btn btn-secondary flex items-center"
            >
              <FiDownload className="mr-2" /> Excel
            </button>
          </div>
        </div>

        {/* Payment Report */}
        <div className="card">
          <div className="flex items-center mb-4">
            <FiDollarSign className="text-purple-600 mr-3" size={32} />
            <div>
              <h2 className="text-xl font-bold">Payment Report</h2>
              <p className="text-sm text-gray-600">Payment history and collection summary</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerateReport('Payment', 'PDF')}
              className="btn btn-primary flex items-center"
            >
              <FiDownload className="mr-2" /> PDF
            </button>
            <button
              onClick={() => handleGenerateReport('Payment', 'Excel')}
              className="btn btn-secondary flex items-center"
            >
              <FiDownload className="mr-2" /> Excel
            </button>
          </div>
        </div>

        {/* Outstanding Report */}
        <div className="card">
          <div className="flex items-center mb-4">
            <FiFileText className="text-red-600 mr-3" size={32} />
            <div>
              <h2 className="text-xl font-bold">Outstanding Report</h2>
              <p className="text-sm text-gray-600">Pending invoices and overdue accounts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerateReport('Outstanding', 'PDF')}
              className="btn btn-primary flex items-center"
            >
              <FiDownload className="mr-2" /> PDF
            </button>
            <button
              onClick={() => handleGenerateReport('Outstanding', 'Excel')}
              className="btn btn-secondary flex items-center"
            >
              <FiDownload className="mr-2" /> Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
