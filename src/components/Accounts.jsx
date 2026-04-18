import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Search as LucideSearch, X as LucideX, Settings as LucideSettings, Eye as LucideEye, Download as LucideDownload, RefreshCw as LucideRefreshCw, Info as LucideInfo, Filter as LucideFilter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'sonner';

const ACCOUNTS_TABLE = 'accounts';

const Accounts = () => {
  const { user } = useContext(AuthContext);
  const [accountsData, setAccountsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'All',
    partyName: 'All',
    transporterName: 'All',
    typeOfRate: 'All'
  });
  const [visibleColumns, setVisibleColumns] = useState({});
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const columns = [
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'liftNumber', label: 'Lift Number' },
    { key: 'type', label: 'Type' },
    { key: 'billNo', label: 'Bill No.' },
    { key: 'partyName', label: 'Party Name' },
    { key: 'productName', label: 'Product Name' },
    { key: 'qty', label: 'Qty' },
    { key: 'areaLifting', label: 'Area Lifting' },
    { key: 'truckNo', label: 'Truck No.' },
    { key: 'transporterName', label: 'Transporter Name' },
    { key: 'billImage', label: 'Bill Image' },
    { key: 'biltyNo', label: 'Bilty No.' },
    { key: 'typeOfRate', label: 'Type Of Rate' },
    { key: 'rate', label: 'Rate' },
    { key: 'truckQty', label: 'Truck Qty' },
    { key: 'biltyImage', label: 'Bilty Image' },
    { key: 'qtyDifferenceStatus', label: 'Qty Difference Status' },
    { key: 'differenceQty', label: 'Difference Qty' },
    { key: 'weightSlip', label: 'Weight Slip' },
    { key: 'totalFreight', label: 'Total Freight' }
  ];

  useEffect(() => {
    const initialVisibleColumns = columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
    setVisibleColumns(initialVisibleColumns);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      return `${d}-${m}-${y}`;
    } catch (e) {
      return dateString;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: rows, error: fetchError } = await supabase
        .from(ACCOUNTS_TABLE)
        .select('*')
        .order('Timestamp', { ascending: false });

      if (fetchError) throw fetchError;

      const parsedData = rows.map((row) => ({
        id: row.id || Math.random().toString(36).substr(2, 9),
        timestamp: row.Timestamp || '',
        liftNumber: row['Lift Number'] || '',
        type: row.Type || '',
        billNo: row['Bill No.'] || '',
        partyName: row['Party Name'] || '',
        productName: row['Product Name'] || '',
        qty: row.Qty || '',
        areaLifting: row['Area Lifting'] || '',
        truckNo: row['Truck No.'] || '',
        transporterName: row['Transporter Name'] || '',
        billImage: row['Bill Image'] || '',
        biltyNo: row['Bilty No.'] || '',
        typeOfRate: row['Type Of Rate'] || '',
        rate: row.Rate || '',
        truckQty: row['Truck Qty'] || '',
        biltyImage: row['Bilty Image'] || '',
        qtyDifferenceStatus: row['Qty Difference Status'] || '',
        differenceQty: row['Difference Qty'] || '',
        weightSlip: row['Weight Slip'] || '',
        totalFreight: row['Total Freight'] || ''
      }));
      
      setAccountsData(parsedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      toast.error("Fetch Error", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUniqueValues = (key) => {
    const values = [...new Set(accountsData.map(item => item[key]).filter(Boolean))];
    return ['All', ...values];
  };

  const filteredData = useMemo(() => {
    return accountsData.filter(item => {
      const matchesSearch = Object.values(item).some(value => 
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (value === 'All') return true;
        return item[key] === value;
      });

      return matchesSearch && matchesFilters;
    });
  }, [searchTerm, filters, accountsData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      type: 'All',
      partyName: 'All',
      transporterName: 'All',
      typeOfRate: 'All'
    });
  };

  const handleViewImage = (url) => {
    if (url) window.open(url, '_blank');
  };

  const handleExport = () => {
    toast.info("Exporting Data", { description: "Preparing CSV download..." });
    const headers = columns.filter(c => visibleColumns[c.key]).map(c => c.label).join(",");
    const csvContent = filteredData.map(row => 
      columns.filter(c => visibleColumns[c.key])
        .map(c => `"${String(row[c.key] || '').replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    
    const blob = new Blob([`${headers}\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Accounts_Data_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  return (
    <div className="p-4 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <LucideRefreshCw className={`w-5 h-5 text-blue-600 ${loading ? 'animate-spin' : ''}`} onClick={fetchData} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Step 7: Accounts Audit & Payment Settlement</h1>
              <p className="text-sm text-gray-500 italic">Bill mismatch check and final payment auditing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <LucideSettings className="w-4 h-4 mr-1.5" />
              Column Settings
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <LucideDownload className="w-4 h-4 mr-1.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <LucideSearch className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Bill No, Truck No, Party Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            {searchTerm && (
              <LucideX 
                className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:text-gray-600" 
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['type', 'partyName', 'transporterName', 'typeOfRate'].map((filterKey) => (
              <select
                key={filterKey}
                value={filters[filterKey]}
                onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
              >
                <option value="All">{filterKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: All</option>
                {getUniqueValues(filterKey).filter(v => v !== 'All').map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            ))}
          </div>
          
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        </div>

        {showColumnSettings && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <LucideSettings className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Toggle Column Visibility</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-2 gap-x-4">
              {columns.map(column => (
                <label key={column.key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.key]}
                    onChange={() => toggleColumn(column.key)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900">{column.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                {columns.filter(col => visibleColumns[col.key]).map(column => (
                  <th key={column.key} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={columns.filter(c => visibleColumns[c.key]).length} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <LucideRefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-sm text-gray-500 font-medium">Loading Audit Records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.filter(c => visibleColumns[c.key]).length} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <LucideInfo className="w-8 h-8 text-gray-300" />
                      <p className="font-medium text-gray-500">No records found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    {columns.filter(col => visibleColumns[col.key]).map(column => (
                      <td key={column.key} className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">
                        {column.key === 'timestamp' 
                          ? formatDate(row[column.key])
                          : ['billImage', 'biltyImage', 'weightSlip'].includes(column.key)
                            ? row[column.key] ? (
                                <button 
                                  onClick={() => handleViewImage(row[column.key])}
                                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium group"
                                >
                                  <LucideEye className="w-3.5 h-3.5 mr-1 group-hover:scale-110 transition-transform" />
                                  View File
                                </button>
                              ) : <span className="text-gray-300">-</span>
                            : row[column.key] || <span className="text-gray-300">-</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer Info */}
        {!loading && filteredData.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
            {/* <p className="text-xs text-gray-500">
              Generated from direct database fetch. Audit timestamps reflect server time.
            </p> */}
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs font-semibold text-gray-700">Total: {accountsData.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-semibold text-gray-700">Filtered: {filteredData.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Accounts;