import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, X, Edit2 } from 'lucide-react';

const TakeEntryTallyPage = () => {
  const [accountsData, setAccountsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null); // Changed from editingRows object
  const [formData, setFormData] = useState({}); // Simplified form data structure
  const [submitting, setSubmitting] = useState(false); // Changed from submitting object
  const [submittedRows, setSubmittedRows] = useState(new Set());

  const SHEET_ID = "1nOwuz2pnGMQRXKYjKu7QXggvWEnUFVeeh4Vxqe1LXBg";
  const SHEET_NAME = "ACCOUNTS";

  // Updated date format function to handle Date(year,month,day,hour,minute,second) format
  const formatDate = (dateString) => {
    if (!dateString || dateString === '') return '-';
    
    try {
      let date;
      
      // Handle Google Sheets Date(YYYY,MM,DD,HH,MM,SS) format
      const dateMatch = dateString.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
      if (dateMatch) {
        const [, year, month, day, hours, minutes, seconds] = dateMatch.map(Number);
        date = new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
      }
      // Handle Excel serial number format from Google Sheets
      else if (!isNaN(dateString) && parseFloat(dateString) > 30000) {
        const serialNumber = parseFloat(dateString);
        date = new Date((serialNumber - 25569) * 86400 * 1000);
      }
      // Handle regular date formats
      else if (dateString.includes('/') || dateString.includes('-')) {
        date = new Date(dateString);
      }
      else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      
      // Format matching the second code: DD/MM/YYYY HH:MM:SS
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  const getCellValue = (row, colIndex) => {
    const cell = row.c?.[colIndex];
    if (!cell) return null;
    if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
    return null;
  };

  const calculateDelayDays = (timestampString) => {
    if (!timestampString || timestampString === '' || timestampString === '-') return 0;
    
    try {
      let originalDate;
      
      if (!isNaN(timestampString) && parseFloat(timestampString) > 30000) {
        const serialNumber = parseFloat(timestampString);
        originalDate = new Date((serialNumber - 25569) * 86400 * 1000);
      } else if (timestampString.includes('/') || timestampString.includes('-')) {
        originalDate = new Date(timestampString);
      } else {
        originalDate = new Date(timestampString);
      }
      
      if (isNaN(originalDate.getTime())) {
        return 0;
      }
      
      const currentDate = new Date();
      const timeDifference = currentDate.getTime() - originalDate.getTime();
      const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));
      
      return Math.max(0, daysDifference);
      
    } catch (error) {
      console.error('Error calculating delay:', error);
      return 0;
    }
  };

  const initializeFormData = (rowId) => {
    setFormData({
      status: 'Not Done',
      remarks: ''
    });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitFormData = async () => {
    if (!editingRow) return;

    const data = formData;
    
    if (!data) {
      alert('No form data to submit');
      return;
    }

    const row = accountsData.find(r => r.id === editingRow);
    if (!row || !row.liftNumber) {
      alert('Error: Could not find lift number for this row');
      return;
    }

    setSubmitting(true);

    try {
      const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbxeWI6jn9sOuAzGIV8cM_1EzL0KOpXMiyTfSWLwJ9YEGiHI280Ki368Ulu3F-V9aEcd/exec';
      
      const currentDate = new Date();
      const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
      const delayDays = calculateDelayDays(row.timestamp);
      
      const submitFormData = {
        actual: actualDateTime,
        delay: String(delayDays),
        status: data.status || 'Not Done',
        remarks: data.remarks || ''
      };

      const requestData = {
        action: 'submitForm',
        sheetName: 'ACCOUNTS',
        liftNo: row.liftNumber,
        type: 'take-entry-tally',
        formData: JSON.stringify(submitFormData)
      };

      const formDataToSend = new FormData();
      Object.keys(requestData).forEach(key => {
        formDataToSend.append(key, requestData[key]);
      });

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: formDataToSend,
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        const responseLower = responseText.toLowerCase();
        const successIndicators = ['success', 'updated', 'submitted', 'complete', 'true'];
        const errorIndicators = ['error', 'failed', 'exception', 'false'];
        
        const hasSuccess = successIndicators.some(indicator => responseLower.includes(indicator));
        const hasError = errorIndicators.some(indicator => responseLower.includes(indicator));
        
        if (hasError && !hasSuccess) {
          throw new Error(`Apps Script error: ${responseText}`);
        } else {
          result = { success: true, message: 'Form submitted successfully' };
        }
      }

      if (result.success === false || (result.error && !result.success)) {
        throw new Error(result.error || result.message || 'Form submission failed');
      }

      setSubmittedRows(prev => new Set([...prev, `tally_${editingRow}`]));
      setEditingRow(null);
      
      alert(`✅ SUCCESS: Form submitted successfully for Lift Number: ${row.liftNumber}\nActual Date: ${actualDateTime}\nDelay: ${delayDays} days`);
      
      setTimeout(() => {
        fetchData();
      }, 2000);
      
    } catch (error) {
      console.error('Submission error:', error);
      alert(`❌ SUBMISSION FAILED: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&cb=${new Date().getTime()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
      }
      
      let text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid response format from Google Sheets.");
      }
      
      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      
      if (!data.table || !data.table.rows) {
        setAccountsData([]);
        return;
      }

      let parsedData = data.table.rows.map((row, index) => {
        if (!row || !row.c) return null;
        
        const firstCellValue = getCellValue(row, 0);
        const secondCellValue = getCellValue(row, 1);
        
        if (firstCellValue === 'Timestamp' || 
            firstCellValue === 'Rectify The Mistake & Bilty Add' ||
            secondCellValue === 'Lift Number' ||
            !firstCellValue || firstCellValue === '') {
          return null;
        }
        
        // Check if column AK (index 36) has data (Actual column for take-entry-tally)
        const actualValue = getCellValue(row, 36);
        if (actualValue && actualValue !== '') {
          return null; // Skip rows where Actual column is not empty
        }
        
        const rowData = {
          id: index,
          timestamp: formatDate(getCellValue(row, 0)) || '',
          liftNumber: getCellValue(row, 1) || '',
          type: getCellValue(row, 2) || '',
          billNo: getCellValue(row, 3) || '',
          partyName: getCellValue(row, 4) || '',
          productName: getCellValue(row, 5) || '',
          qty: getCellValue(row, 6) || '',
          transporterName: getCellValue(row, 9) || ''
        };
        
        const hasData = Object.values(rowData).some(value => 
          value && value !== '' && value !== index
        );
        
        return hasData ? rowData : null;
      }).filter(Boolean);
      
      // Filter out submitted rows
      parsedData = parsedData.filter(item => {
        const submittedKey = `tally_${item.id}`;
        return !submittedRows.has(submittedKey);
      });
      
      setAccountsData(parsedData);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderModal = () => {
    if (!editingRow) return null;
    
    const row = accountsData.find(r => r.id === editingRow);
    if (!row) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Add Tally Entry</h3>
              <button
                onClick={() => setEditingRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Lift Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Lift Number:</span> {row.liftNumber}</div>
                <div><span className="text-gray-600">Timestamp:</span> {row.timestamp}</div>
                <div><span className="text-gray-600">Party:</span> {row.partyName}</div>
                <div><span className="text-gray-600">Product:</span> {row.productName}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status || 'Not Done'}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                >
                  <option value="Done">Done</option>
                  <option value="Not Done">Not Done</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={formData.remarks || ''}
                  onChange={(e) => handleFormChange('remarks', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  placeholder="Enter your remarks..."
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
              <button
                onClick={() => setEditingRow(null)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={submitFormData}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {submitting ? 'Submitting...' : 'Submit Entry'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading tally data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-2xl w-full">
          <div className="flex items-center mb-4">
            <X className="w-8 h-8 text-red-500 mr-3" />
            <h3 className="text-xl font-semibold text-red-800">Error Loading Data</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {renderModal()}
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Take Entry By Tally</h1>
                <p className="text-sm text-gray-600 mt-1">Record entries using tally verification</p>
              </div>
              <button
                onClick={fetchData}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          <div className="px-6 py-3">
            <p className="text-sm text-gray-500">
              Showing {accountsData.length} records available for tally entry
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lift Number</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No.</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountsData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <p className="text-lg font-medium mb-2">No records available</p>
                        <p className="text-sm">All entries have been processed or no data is available for tally entry.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  accountsData.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.timestamp || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.liftNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.type || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.billNo || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.partyName || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.productName || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.qty || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.transporterName || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingRow(row.id);
                            initializeFormData(row.id);
                          }}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Add Entry
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeEntryTallyPage;
