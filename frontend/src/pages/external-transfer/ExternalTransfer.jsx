import React, { useState, useEffect } from 'react';
import api from '../../api';
import jsPDF from 'jspdf';

export default function ExternalTransfer() {
  const [transfers, setTransfers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [itemBatches, setItemBatches] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReturnProcessing, setShowReturnProcessing] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState(null);
  const [transferItems, setTransferItems] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [returnStaffChanged, setReturnStaffChanged] = useState(false);
  const [returnStaffDetails, setReturnStaffDetails] = useState({
    staff_name: '',
    staff_phone: '',
    staff_email: '',
    change_reason: ''
  });
  const [form, setForm] = useState({
    return_type: 'External',
    location: '',
    staff_name: '',
    staff_id: '',
    staff_location: '',
    staff_email: '',
    staff_phone: '',
    return_date: '',
    items: []
  });

  useEffect(() => {
    loadTransfers();
    loadLocations();
  }, []);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/external-transfers/');
      setTransfers(response.data || []);
    } catch (err) {
      console.error('Failed to load transfers:', err);
      showMessage('Failed to load transfers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await api.get('/inventory/locations/');
      setLocations(response.data || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const fetchItemsForLocation = async (location) => {
    try {
      const res = await api.get(`/stock-overview/by-location/${encodeURIComponent(location)}`);
      const stockData = res.data || [];
      const locationItems = stockData.map(stock => ({
        id: stock.id,
        name: stock.item_name,
        item_code: stock.item_code
      }));
      return locationItems;
    } catch (err) {
      console.error('Failed to fetch items for location:', err);
      return [];
    }
  };

  const fetchBatchesForItem = async (itemName) => {
    try {
      if (form.location) {
        const res = await api.get(`/stock-overview/by-location/${encodeURIComponent(form.location)}`);
        const stockData = res.data || [];
        const item = stockData.find(stock => stock.item_name === itemName);
        
        if (item && item.batches) {
          return item.batches.filter(batch => batch.qty > 0);
        }
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      return [];
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleSubmit = async () => {
    if (!form.staff_name || !form.staff_id || !form.staff_location || form.items.length === 0) {
      showMessage('All fields and at least one item are required', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        location: form.location || 'Default Location',
        staff_name: form.staff_name,
        staff_id: form.staff_id,
        staff_location: form.staff_location,
        staff_email: form.staff_email,
        staff_phone: form.staff_phone,
        reason: `Staff allocation to ${form.staff_name} (ID: ${form.staff_id})`,
        items: form.items.map(item => ({
          item_name: item.item_name,
          batch_no: item.batch_no,
          quantity: parseInt(item.quantity),
          reason: item.reason || '',
          return_date: item.return_date || null
        }))
      };
      
      console.log('Submitting payload:', payload);
      const response = await api.post('/api/external-transfers/', payload);
      console.log('Response:', response.data);
      
      showMessage(`External transfer created successfully: ${response.data.transfer_no}`, 'success');
      resetForm();
      loadTransfers();
    } catch (err) {
      console.error('Submit error:', err);
      showMessage('Failed to create transfer: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      return_type: 'External',
      location: '',
      staff_name: '',
      staff_id: '',
      staff_location: '',
      staff_email: '',
      staff_phone: '',
      return_date: '',
      items: []
    });
    setItems([]);
    setItemBatches({});
    setShowCreateModal(false);
  };

  const addLineItem = () => {
    setForm({
      ...form,
      items: [...form.items, { item_name: '', quantity: '', batch_no: '', reason: '', return_date: '' }]
    });
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setForm({ ...form, items: updatedItems });
  };

  const removeLineItem = (index) => {
    const updatedItems = form.items.filter((_, idx) => idx !== index);
    setForm({ ...form, items: updatedItems });
  };

  const handleSendTransfer = async (transferId) => {
    try {
      setLoading(true);
      const response = await api.put(`/api/external-transfers/${transferId}/send`);
      showMessage('Transfer sent successfully', 'success');
      loadTransfers();
    } catch (err) {
      console.error('Send error:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message;
      showMessage('Failed to send transfer: ' + errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openReturnProcessing = async (transferId) => {
    try {
      // Clear existing data first
      setTransferItems([]);
      
      // Always fetch fresh data from the database with cache busting
      const res = await api.get(`/api/external-transfers/${transferId}/items?t=${Date.now()}`);
      console.log('Fresh data from API:', res.data);
      setTransferItems(res.data || []);
      setSelectedTransferId(transferId);
      setShowReturnProcessing(true);
    } catch (err) {
      console.error('Failed to fetch transfer items:', err);
      showMessage('Failed to fetch transfer items', 'error');
    }
  };

  const processTransferReturn = async (item, returnQty) => {
    try {
      const res = await api.post(`/api/external-transfers/${selectedTransferId}/process-return`, {
        item_name: item.item_name,
        batch_no: item.batch_no,
        quantity: returnQty
      });
      
      showMessage(res.data.message, 'success');
      
      // Force complete refresh with cache busting
      const refreshRes = await api.get(`/api/external-transfers/${selectedTransferId}/items?t=${Date.now()}`);
      console.log('Refreshed data after return:', refreshRes.data);
      setTransferItems(refreshRes.data || []);
      
    } catch (err) {
      console.error('Return processing error:', err);
      showMessage(err.response?.data?.detail || 'Failed to process return', 'error');
    }
  };

  const handleReturnTransfer = async (transfer) => {
    try {
      // Fetch fresh transfer data with items
      const res = await api.get(`/api/external-transfers/${transfer.id}`);
      const freshTransfer = res.data;
      
      setSelectedTransfer(freshTransfer);
      const items = freshTransfer.items.map(item => ({
        item_id: item.id,
        item_name: item.item_name,
        batch_no: item.batch_no,
        original_quantity: item.quantity,
        already_returned: item.returned_quantity || 0,
        already_damaged: item.damaged_quantity || 0,
        remaining_quantity: item.quantity - ((item.returned_quantity || 0) + (item.damaged_quantity || 0)),
        returned_quantity: 0,
        damaged_quantity: 0,
        return_deadline: '',
        damage_reason: ''
      }));
      setReturnItems(items);
      setShowReturnModal(true);
    } catch (err) {
      console.error('Failed to fetch fresh transfer data:', err);
      // Fallback to original logic
      setSelectedTransfer(transfer);
      const items = transfer.items.map(item => ({
        item_id: item.id,
        item_name: item.item_name,
        batch_no: item.batch_no,
        original_quantity: item.quantity,
        already_returned: (item.returned_quantity || 0) + (item.damaged_quantity || 0),
        remaining_quantity: item.quantity - ((item.returned_quantity || 0) + (item.damaged_quantity || 0)),
        returned_quantity: 0,
        damaged_quantity: 0,
        damage_reason: ''
      }));
      setReturnItems(items);
      setShowReturnModal(true);
    }
  };

  const handleReturnSubmit = async () => {
    // Check if any items have return quantities
    const hasReturns = returnItems.some(item => 
      (parseInt(item.returned_quantity) || 0) > 0 || (parseInt(item.damaged_quantity) || 0) > 0
    );
    
    if (!hasReturns) {
      showMessage('Please enter return quantities for at least one item', 'error');
      return;
    }
    
    // Check if items with return quantities have deadlines
    const itemsWithReturns = returnItems.filter(item => 
      (parseInt(item.returned_quantity) || 0) > 0 || (parseInt(item.damaged_quantity) || 0) > 0
    );
    
    const missingDeadlines = itemsWithReturns.filter(item => !item.return_deadline);
    if (missingDeadlines.length > 0) {
      showMessage('Please set return deadline for all items being returned', 'error');
      return;
    }
    
    // Validate return staff details if staff changed
    if (returnStaffChanged) {
      if (!returnStaffDetails.staff_name || !returnStaffDetails.staff_phone || 
          !returnStaffDetails.staff_email || !returnStaffDetails.change_reason) {
        showMessage('Please fill all return staff details when staff is changed', 'error');
        return;
      }
    }
    
    try {
      setLoading(true);
      const payload = {
        return_deadline: selectedTransfer.return_deadline,
        staff_changed: returnStaffChanged,
        return_staff_details: returnStaffChanged ? returnStaffDetails : {
          staff_name: selectedTransfer.staff_name,
          staff_phone: selectedTransfer.staff_phone,
          staff_email: selectedTransfer.staff_email,
          change_reason: null
        },
        items: returnItems.map(item => ({
          item_id: item.item_id,
          returned_quantity: parseInt(item.returned_quantity) || 0,
          damaged_quantity: parseInt(item.damaged_quantity) || 0,
          return_deadline: item.return_deadline || null,
          damage_reason: item.damage_reason || null,
          returned_by_staff: returnStaffChanged ? returnStaffDetails.staff_name : selectedTransfer.staff_name
        }))
      };
      
      console.log('Return payload:', payload);
      const response = await api.put(`/api/external-transfers/${selectedTransfer.id}/return`, payload);
      console.log('Return response:', response.data);
      showMessage('Items returned successfully', 'success');
      loadTransfers();
      setShowReturnModal(false);
      setReturnItems([]);
      setReturnStaffChanged(false);
      setReturnStaffDetails({ staff_name: '', staff_phone: '', staff_email: '', change_reason: '' });
    } catch (err) {
      console.error('Return error:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message;
      showMessage('Failed to return items: ' + errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateReturnItem = (index, field, value) => {
    const updatedItems = [...returnItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate remaining quantity in real-time
    if (field === 'returned_quantity' || field === 'damaged_quantity') {
      const item = updatedItems[index];
      const currentReturned = parseInt(item.returned_quantity) || 0;
      const currentDamaged = parseInt(item.damaged_quantity) || 0;
      const totalCurrentReturn = currentReturned + currentDamaged;
      
      // Update remaining quantity: original - already_returned - current_return
      item.remaining_quantity = item.original_quantity - item.already_returned - totalCurrentReturn;
    }
    
    setReturnItems(updatedItems);
  };

  const handleEdit = (transfer) => {
    setSelectedTransfer(transfer);
    setForm({
      location: transfer.location,
      staff_name: transfer.staff_name,
      staff_id: transfer.staff_id,
      staff_location: transfer.staff_location,
      staff_email: transfer.staff_email || '',
      staff_phone: transfer.staff_phone || '',
      items: transfer.items || []
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedTransfer) return;
    
    try {
      setLoading(true);
      const payload = {
        location: form.location,
        staff_name: form.staff_name,
        staff_id: form.staff_id,
        staff_location: form.staff_location,
        staff_email: form.staff_email,
        staff_phone: form.staff_phone,
        items: form.items.map(item => ({
          item_name: item.item_name,
          batch_no: item.batch_no,
          quantity: parseInt(item.quantity),
          reason: item.reason || '',
          return_date: item.return_date || null
        }))
      };
      
      await api.put(`/api/external-transfers/${selectedTransfer.id}`, payload);
      showMessage('Transfer updated successfully', 'success');
      loadTransfers();
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      console.error('Edit error:', err);
      showMessage('Failed to update transfer: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintHistory = async (transfer) => {
    try {
      // Fetch transaction history and full transfer details
      const transactionRes = await api.get(`/api/external-transfers/${transfer.id}/transactions`);
      const transactions = transactionRes.data || [];
      
      // Fetch full transfer details including return staff info
      const fullTransferRes = await api.get(`/api/external-transfers/${transfer.id}`);
      const fullTransfer = fullTransferRes.data;
      
      const printContent = `
        <html>
          <head>
            <title>Transfer History - ${transfer.transfer_no}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .info { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .status { padding: 4px 8px; border-radius: 4px; }
              .draft { background-color: #f3f4f6; }
              .sent { background-color: #dbeafe; }
              .returned { background-color: #dcfce7; }
              .transaction-table { margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>External Transfer History</h1>
              <h2>${transfer.transfer_no}</h2>
            </div>
            
            <div class="info">
              <p><strong>Staff:</strong> ${transfer.staff_name} (ID: ${transfer.staff_id})</p>
              <p><strong>Staff Location:</strong> ${transfer.staff_location}</p>
              <p><strong>Transfer Location:</strong> ${transfer.location}</p>
              <p><strong>Status:</strong> <span class="status ${transfer.status.toLowerCase()}">${transfer.status}</span></p>
              <p><strong>Created:</strong> ${new Date(transfer.created_at).toLocaleDateString()}</p>
              ${transfer.sent_at ? `<p><strong>Sent:</strong> ${new Date(transfer.sent_at).toLocaleDateString()}</p>` : ''}
              ${transfer.returned_at ? `<p><strong>Returned:</strong> ${new Date(transfer.returned_at).toLocaleDateString()}</p>` : ''}
              ${transfer.staff_phone ? `<p><strong>Phone:</strong> ${transfer.staff_phone}</p>` : ''}
              ${transfer.staff_email ? `<p><strong>Email:</strong> ${transfer.staff_email}</p>` : ''}
            </div>
            
            <h3>Item Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Batch</th>
                  <th>Original Qty</th>
                  <th>Returned Qty</th>
                  <th>Damaged Qty</th>
                  <th>Remaining</th>
                  <th>Return Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${transfer.items?.map(item => {
                  const totalReturned = (item.returned_quantity || 0) + (item.damaged_quantity || 0);
                  const remaining = item.quantity - totalReturned;
                  const status = remaining <= 0 ? 'Completed' : 'Pending';
                  return `
                    <tr>
                      <td>${item.item_name}</td>
                      <td>${item.batch_no}</td>
                      <td>${item.quantity}</td>
                      <td>${item.returned_quantity || 0}</td>
                      <td>${item.damaged_quantity || 0}</td>
                      <td>${remaining}</td>
                      <td>${item.return_date ? new Date(item.return_date).toLocaleDateString() : '-'}</td>
                      <td>${status}</td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="8">No items found</td></tr>'}
              </tbody>
            </table>
            
            <div class="transaction-table">
              <h3>Transaction History</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Item</th>
                    <th>Batch</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Returned By</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.length > 0 ? transactions.map(txn => {
                    return `
                    <tr>
                      <td>${new Date(txn.transaction_date).toLocaleDateString()} ${new Date(txn.transaction_date).toLocaleTimeString()}</td>
                      <td>${txn.item_name}</td>
                      <td>${txn.batch_no}</td>
                      <td>${txn.transaction_type}</td>
                      <td>${txn.quantity}</td>
                      <td>${txn.returned_by}</td>
                      <td>${txn.remarks}</td>
                    </tr>
                  `}).join('') : '<tr><td colspan="7">No transactions found</td></tr>'}}}
                </tbody>
              </table>
            </div>
            
            <div style="margin-top: 30px; text-align: center; color: #666;">
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      showMessage('Failed to generate print report', 'error');
    }
  };

  const handleDownloadPDF = async (transfer) => {
    try {
      // Fetch transaction history and return staff details
      const transactionRes = await api.get(`/api/external-transfers/${transfer.id}/transactions`);
      const transactions = transactionRes.data || [];
      
      // Fetch full transfer details including return staff info
      const fullTransferRes = await api.get(`/api/external-transfers/${transfer.id}`);
      const fullTransfer = fullTransferRes.data;
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      let yPosition = 20;
      
      // Header
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text('External Transfer History', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFontSize(14);
      pdf.text(transfer.transfer_no, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Transfer Info
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Staff: ${transfer.staff_name} (ID: ${transfer.staff_id})`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Staff Location: ${transfer.staff_location}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Transfer Location: ${transfer.location}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Status: ${transfer.status}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Created: ${new Date(transfer.created_at).toLocaleDateString()}`, 20, yPosition);
      yPosition += 6;
      
      if (transfer.sent_at) {
        pdf.text(`Sent: ${new Date(transfer.sent_at).toLocaleDateString()}`, 20, yPosition);
        yPosition += 6;
      }
      if (transfer.returned_at) {
        pdf.text(`Returned: ${new Date(transfer.returned_at).toLocaleDateString()}`, 20, yPosition);
        yPosition += 6;
      }
      if (transfer.staff_phone) {
        pdf.text(`Phone: ${transfer.staff_phone}`, 20, yPosition);
        yPosition += 6;
      }
      if (transfer.staff_email) {
        pdf.text(`Email: ${transfer.staff_email}`, 20, yPosition);
        yPosition += 6;
      }
      
      // Return Staff Details (if different staff returned)
      if (fullTransfer.return_staff_details) {
        yPosition += 5;
        pdf.setFont(undefined, 'bold');
        pdf.text('Return Staff Details:', 20, yPosition);
        yPosition += 6;
        pdf.setFont(undefined, 'normal');
        pdf.text(`Return Staff: ${fullTransfer.return_staff_details.staff_name}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Return Phone: ${fullTransfer.return_staff_details.staff_phone}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Return Email: ${fullTransfer.return_staff_details.staff_email}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Change Reason: ${fullTransfer.return_staff_details.change_reason}`, 20, yPosition);
        yPosition += 6;
      }
      
      yPosition += 10;
      
      // Item Summary Table
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Item Summary', 20, yPosition);
      yPosition += 10;
      
      // Table headers
      pdf.setFontSize(8);
      const headers = ['Item', 'Batch', 'Orig Qty', 'Ret Qty', 'Dmg Qty', 'Balance', 'Deadline', 'Status'];
      const colWidths = [30, 20, 15, 15, 15, 15, 25, 20];
      let xPosition = 20;
      
      headers.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      yPosition += 8;
      
      // Table data
      pdf.setFont(undefined, 'normal');
      if (transfer.items && transfer.items.length > 0) {
        transfer.items.forEach(item => {
          const totalReturned = (item.returned_quantity || 0) + (item.damaged_quantity || 0);
          const balance = item.quantity - totalReturned;
          const status = balance <= 0 ? 'Completed' : 'Pending';
          
          xPosition = 20;
          const rowData = [
            item.item_name.substring(0, 12),
            item.batch_no,
            item.quantity.toString(),
            (item.returned_quantity || 0).toString(),
            (item.damaged_quantity || 0).toString(),
            balance.toString(),
            item.return_date ? new Date(item.return_date).toLocaleDateString() : '-',
            status
          ];
          
          rowData.forEach((data, index) => {
            pdf.text(data, xPosition, yPosition);
            xPosition += colWidths[index];
          });
          yPosition += 6;
          
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
        });
      } else {
        pdf.text('No items found', 20, yPosition);
        yPosition += 6;
      }
      
      yPosition += 10;
      
      // Summary Statistics
      if (transfer.items && transfer.items.length > 0) {
        const totalItems = transfer.items.length;
        const completedItems = transfer.items.filter(item => {
          const totalReturned = (item.returned_quantity || 0) + (item.damaged_quantity || 0);
          return item.quantity <= totalReturned;
        }).length;
        const pendingItems = totalItems - completedItems;
        
        pdf.setFont(undefined, 'bold');
        pdf.text('Summary:', 20, yPosition);
        yPosition += 6;
        pdf.setFont(undefined, 'normal');
        pdf.text(`Total Items: ${totalItems}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Completed: ${completedItems}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Pending: ${pendingItems}`, 20, yPosition);
        yPosition += 10;
      }
      
      // Transaction History
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Transaction History', 20, yPosition);
      yPosition += 10;
      
      if (transactions.length > 0) {
        pdf.setFontSize(8);
        const txnHeaders = ['Date & Time', 'Item', 'Batch', 'Type', 'Qty', 'Returned By', 'Remarks'];
        const txnColWidths = [30, 25, 15, 15, 10, 25, 35];
        
        xPosition = 20;
        txnHeaders.forEach((header, index) => {
          pdf.text(header, xPosition, yPosition);
          xPosition += txnColWidths[index];
        });
        yPosition += 8;
        
        pdf.setFont(undefined, 'normal');
        transactions.forEach(txn => {
          xPosition = 20;
          const txnData = [
            `${new Date(txn.transaction_date).toLocaleDateString()} ${new Date(txn.transaction_date).toLocaleTimeString()}`,
            txn.item_name.substring(0, 10),
            txn.batch_no,
            txn.transaction_type,
            txn.quantity.toString(),
            txn.returned_by.substring(0, 12),
            (txn.remarks || '').substring(0, 18)
          ];
          
          txnData.forEach((data, index) => {
            pdf.text(data, xPosition, yPosition);
            xPosition += txnColWidths[index];
          });
          yPosition += 6;
          
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
        });
      } else {
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text('No transactions found', 20, yPosition);
      }
      
      // Footer
      const finalPage = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= finalPage; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, 280, { align: 'center' });
        pdf.text(`Page ${i} of ${finalPage}`, pageWidth - 30, 280);
      }
      
      // Save the PDF
      pdf.save(`${transfer.transfer_no}_Transfer_History.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      showMessage('Failed to generate PDF', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'RETURNED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">External Transfer Dashboard</h1>
                <p className="text-slate-600 mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Manage and track external location transfers
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Stats Cards */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <div className="text-white">
                    <div className="text-sm font-medium">Active Transfers</div>
                    <div className="text-xl font-bold">{transfers.length}</div>
                  </div>
                </div>
              </div>
              
              {(() => {
                // Split due dates into 4 parts: 25% each of total timeline
                // Part 1: 75-100% of timeline (earliest)
                // Part 2: 50-75% of timeline  
                // Part 3: 25-50% of timeline
                // Part 4: 0-25% of timeline (Due Soon - last part)
                
                const today = new Date();
                const dueSoonTransfers = transfers.filter(transfer => {
                  // Skip fully returned transfers
                  const allItemsReturned = transfer.items?.every(item => {
                    const totalReturned = (item.returned_quantity || 0) + (item.damaged_quantity || 0);
                    return totalReturned >= item.quantity;
                  });
                  
                  if (allItemsReturned && transfer.items?.length > 0) return false;
                  
                  const nearestDeadline = transfer.items?.reduce((nearest, item) => {
                    if (!item.return_date) return nearest;
                    const itemDate = new Date(item.return_date);
                    return !nearest || itemDate < new Date(nearest) ? item.return_date : nearest;
                  }, null);
                  
                  if (!nearestDeadline) return false;
                  
                  const deadlineDate = new Date(nearestDeadline);
                  const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
                  
                  // Assuming 28-day timeline, last part (0-25%) = 0-7 days
                  return daysUntil >= 0 && daysUntil <= 7; // Last part: Due Soon (0-7 days)
                }).length;
                
                // Calculate date range for last part (Due Soon)
                const startDate = today.toLocaleDateString();
                const endDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000)).toLocaleDateString();
                
                return dueSoonTransfers > 0 ? (
                  <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 rounded-xl shadow-lg animate-pulse">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="text-white">
                        <div className="text-sm font-medium">Due Alert</div>
                        <div className="text-xl font-bold">{dueSoonTransfers}</div>
                        <div className="text-xs opacity-90">{startDate} - {endDate}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 rounded-xl shadow-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-white">
                        <div className="text-sm font-medium">On Track</div>
                        <div className="text-xl font-bold">✓</div>
                        <div className="text-xs opacity-90">{startDate} - {endDate}</div>
                      </div>
                    </div>
                  </div>
                );
              })()} 
            </div>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`mx-6 mt-4 p-3 rounded-lg ${
          message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  External Transfers
                </h2>
                <p className="text-sm text-slate-600 mt-1">Manage transfers to external locations</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Transfer
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500">Loading transfers...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Transfer Details</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Staff Details</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Staff Location</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Date</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Deadline</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-16">
                        <div className="text-slate-400">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <p className="text-lg font-medium text-slate-500">No external transfers found</p>
                          <p className="text-sm text-slate-400 mt-1">Create your first transfer to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-semibold text-slate-900">{transfer.transfer_no}</div>
                            <div className="text-sm text-slate-500">{transfer.reason}</div>
                            <div className="text-xs text-slate-400 mt-1">
                              Items: {transfer.items?.length || 0} | Location: {transfer.location || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{transfer.staff_name || 'N/A'}</div>
                          <div className="text-sm text-slate-500">ID: {transfer.staff_id || 'N/A'}</div>
                          <div className="text-xs text-slate-400">From: {transfer.staff_location || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{transfer.staff_location || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                            {transfer.status || 'DRAFT'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-slate-500">
                            Created: {new Date(transfer.created_at).toLocaleDateString()}
                          </div>
                          {transfer.sent_at && (
                            <div className="text-xs text-blue-600">
                              Sent: {new Date(transfer.sent_at).toLocaleDateString()}
                            </div>
                          )}
                          {transfer.returned_at && (
                            <div className="text-xs text-green-600">
                              Returned: {new Date(transfer.returned_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {(() => {
                            // Check if all items are fully returned
                            const allItemsReturned = transfer.items?.every(item => {
                              const totalReturned = (item.returned_quantity || 0) + (item.damaged_quantity || 0);
                              return totalReturned >= item.quantity;
                            });
                            
                            if (allItemsReturned && transfer.items?.length > 0) {
                              return (
                                <div className="text-sm text-green-600 font-medium">
                                  All Items Returned
                                </div>
                              );
                            }
                            
                            const nearestDeadline = transfer.items?.reduce((nearest, item) => {
                              if (!item.return_date) return nearest;
                              const itemDate = new Date(item.return_date);
                              return !nearest || itemDate < new Date(nearest) ? item.return_date : nearest;
                            }, null);
                            
                            if (!nearestDeadline) return <span className="text-gray-400 text-sm">No deadline</span>;
                            
                            const deadlineDate = new Date(nearestDeadline);
                            const today = new Date();
                            const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
                            
                            let colorClass = 'text-gray-600';
                            let urgencyText = '';
                            
                            if (daysUntil < 0) {
                              colorClass = 'text-red-600 font-medium';
                              urgencyText = 'Overdue';
                            } else if (daysUntil <= 3) {
                              colorClass = 'text-red-600 font-medium';
                              urgencyText = 'Due Soon';
                            } else if (daysUntil <= 7) {
                              colorClass = 'text-orange-600 font-medium';
                              urgencyText = 'Due This Week';
                            }
                            
                            return (
                              <div>
                                <div className={`text-sm ${colorClass}`}>
                                  {deadlineDate.toLocaleDateString()}
                                </div>
                                {urgencyText && (
                                  <div className={`text-xs ${colorClass}`}>
                                    {urgencyText}
                                  </div>
                                )}
                              </div>
                            );
                          })()} 
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePrintHistory(transfer)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Print History"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(transfer)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                              </svg>
                            </button>
                            {transfer.status === 'DRAFT' && (
                              <>
                                <button
                                  onClick={() => handleEdit(transfer)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Edit Transfer"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleSendTransfer(transfer.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                >
                                  Send
                                </button>
                              </>
                            )}
                            {transfer.status === 'SENT' && (
                              <>
                                {(() => {
                                  // Check if there are any items with remaining quantities to return
                                  const hasItemsToReturn = transfer.items?.some(item => {
                                    const totalReturned = (item.returned_quantity || 0) + (item.damaged_quantity || 0);
                                    const remaining = item.quantity - totalReturned;
                                    return remaining > 0;
                                  });
                                  
                                  return hasItemsToReturn ? (
                                    <button
                                      onClick={() => handleReturnTransfer(transfer)}
                                      className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                    >
                                      Return
                                    </button>
                                  ) : (
                                    <div className="text-center">
                                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">Fully Returned</span>
                                    </div>
                                  );
                                })()} 
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">New Transfer (DRAFT)</h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <select
                  value={form.location}
                  onChange={async (e) => {
                    const selectedLocation = e.target.value;
                    setForm({...form, location: selectedLocation});
                    
                    if (selectedLocation) {
                      const locationItems = await fetchItemsForLocation(selectedLocation);
                      setItems(locationItems);
                    } else {
                      setItems([]);
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Location</option>
                  {locations.filter(loc => loc.location_type === 'internal').map(location => (
                    <option key={location.id} value={location.name}>
                      {location.name} ({location.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Name</label>
                  <input
                    type="text"
                    value={form.staff_name}
                    onChange={(e) => setForm({...form, staff_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter staff name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Staff ID</label>
                  <input
                    type="text"
                    value={form.staff_id}
                    onChange={(e) => setForm({...form, staff_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter staff ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Email</label>
                  <input
                    type="email"
                    value={form.staff_email || ''}
                    onChange={(e) => setForm({...form, staff_email: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter staff email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Phone</label>
                  <input
                    type="tel"
                    value={form.staff_phone || ''}
                    onChange={(e) => setForm({...form, staff_phone: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter staff phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Location</label>
                  <select
                    value={form.staff_location}
                    onChange={(e) => setForm({...form, staff_location: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Staff Location</option>
                    {locations.filter(loc => loc.location_type === 'external').map(location => (
                      <option key={location.id} value={location.name}>
                        {location.name} ({location.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium">Line items</label>
                  <button
                    onClick={addLineItem}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    + Add line
                  </button>
                </div>
                
                {form.items.length === 0 ? (
                  <div className="border rounded-lg p-4 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <select className="border rounded px-2 py-1 text-sm" disabled>
                        <option>Select Item</option>
                      </select>
                      <select className="border rounded px-2 py-1 text-sm" disabled>
                        <option>Select Batch</option>
                      </select>
                      <input type="number" placeholder="Quantity" className="border rounded px-2 py-1 text-sm w-20" disabled />
                      <input type="text" placeholder="Reason" className="border rounded px-2 py-1 text-sm" disabled />
                      <input type="date" className="border rounded px-2 py-1 text-sm" disabled />
                    </div>
                    <p className="text-sm mt-2">Click "+ Add line" to add items</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-6 gap-3 p-3 border rounded">
                        <select
                          value={item.item_name || ''}
                          onChange={async (e) => {
                            const selectedItemName = e.target.value;
                            updateLineItem(index, 'item_name', selectedItemName);
                            
                            if (selectedItemName) {
                              const batches = await fetchBatchesForItem(selectedItemName);
                              setItemBatches(prev => ({ ...prev, [index]: batches }));
                            }
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select Item</option>
                          {items.map(itm => (
                            <option key={itm.id} value={itm.name}>
                              {itm.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={item.batch_no || ''}
                          onChange={(e) => {
                            updateLineItem(index, 'batch_no', e.target.value);
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select Batch</option>
                          {(itemBatches[index] || []).map(batch => (
                            <option key={batch.batch_no} value={batch.batch_no}>
                              {batch.batch_no} (Qty: {batch.qty})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Reason"
                          value={item.reason}
                          onChange={(e) => updateLineItem(index, 'reason', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="date"
                          value={item.return_date || ''}
                          onChange={(e) => updateLineItem(index, 'return_date', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-800 px-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Submit Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Transfer - {selectedTransfer.transfer_no}</h2>
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <select
                  value={form.location}
                  onChange={async (e) => {
                    const selectedLocation = e.target.value;
                    setForm({...form, location: selectedLocation});
                    
                    if (selectedLocation) {
                      const locationItems = await fetchItemsForLocation(selectedLocation);
                      setItems(locationItems);
                    } else {
                      setItems([]);
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Location</option>
                  {locations.filter(loc => loc.location_type === 'internal').map(location => (
                    <option key={location.id} value={location.name}>
                      {location.name} ({location.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Name</label>
                  <input
                    type="text"
                    value={form.staff_name}
                    onChange={(e) => setForm({...form, staff_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Staff ID</label>
                  <input
                    type="text"
                    value={form.staff_id}
                    onChange={(e) => setForm({...form, staff_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Email</label>
                  <input
                    type="email"
                    value={form.staff_email || ''}
                    onChange={(e) => setForm({...form, staff_email: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter staff email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Phone</label>
                  <input
                    type="tel"
                    value={form.staff_phone || ''}
                    onChange={(e) => setForm({...form, staff_phone: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter staff phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Staff Location</label>
                <select
                  value={form.staff_location}
                  onChange={(e) => setForm({...form, staff_location: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Staff Location</option>
                  {locations.filter(loc => loc.location_type === 'external').map(location => (
                    <option key={location.id} value={location.name}>
                      {location.name} ({location.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium">Line items</label>
                  <button
                    onClick={addLineItem}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    + Add line
                  </button>
                </div>
                
                {form.items.length === 0 ? (
                  <div className="border rounded-lg p-4 text-center text-gray-500">
                    <p className="text-sm">Click "+ Add line" to add items</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-6 gap-3 p-3 border rounded">
                        <select
                          value={item.item_name || ''}
                          onChange={async (e) => {
                            const selectedItemName = e.target.value;
                            updateLineItem(index, 'item_name', selectedItemName);
                            
                            if (selectedItemName) {
                              const batches = await fetchBatchesForItem(selectedItemName);
                              setItemBatches(prev => ({ ...prev, [index]: batches }));
                            }
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select Item</option>
                          {items.map(itm => (
                            <option key={itm.id} value={itm.name}>
                              {itm.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={item.batch_no || ''}
                          onChange={(e) => {
                            updateLineItem(index, 'batch_no', e.target.value);
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select Batch</option>
                          {(itemBatches[index] || []).map(batch => (
                            <option key={batch.batch_no} value={batch.batch_no}>
                              {batch.batch_no} (Qty: {batch.qty})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Reason"
                          value={item.reason}
                          onChange={(e) => updateLineItem(index, 'reason', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="date"
                          value={item.return_date || ''}
                          onChange={(e) => updateLineItem(index, 'return_date', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-800 px-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Return Items - {selectedTransfer.transfer_no}</h2>
              <button
                onClick={() => { setShowReturnModal(false); setReturnItems([]); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600">Staff: {selectedTransfer.staff_name} ({selectedTransfer.staff_id})</p>
            </div>

            {/* Return Staff Change Section */}
            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="staffChanged"
                  checked={returnStaffChanged}
                  onChange={(e) => setReturnStaffChanged(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="staffChanged" className="text-sm font-medium text-gray-700">
                  Different staff returning items
                </label>
              </div>
              
              {returnStaffChanged && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Staff Name *</label>
                    <input
                      type="text"
                      value={returnStaffDetails.staff_name}
                      onChange={(e) => setReturnStaffDetails({...returnStaffDetails, staff_name: e.target.value})}
                      className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter return staff name"
                      autoFocus
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Staff Phone *</label>
                    <input
                      type="tel"
                      value={returnStaffDetails.staff_phone}
                      onChange={(e) => setReturnStaffDetails({...returnStaffDetails, staff_phone: e.target.value})}
                      className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Staff Email *</label>
                    <input
                      type="email"
                      value={returnStaffDetails.staff_email}
                      onChange={(e) => setReturnStaffDetails({...returnStaffDetails, staff_email: e.target.value})}
                      className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Staff Change *</label>
                    <input
                      type="text"
                      value={returnStaffDetails.change_reason}
                      onChange={(e) => setReturnStaffDetails({...returnStaffDetails, change_reason: e.target.value})}
                      className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Why staff changed?"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Location</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Batch</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Original Qty</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Return Qty</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Damaged Qty</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Good Return</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Damaged</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Deadline *</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Damage Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItems.map((item, index) => {
                    const totalReturned = item.already_returned + (item.already_damaged || 0);
                    const isCompleted = totalReturned >= item.original_quantity;
                    
                    return (
                    <tr key={index} className={`border-t ${isCompleted ? 'bg-green-50' : ''}`}>
                      <td className="px-4 py-2 text-sm">{item.item_name}</td>
                      <td className="px-4 py-2 text-sm">{selectedTransfer.location}</td>
                      <td className="px-4 py-2 text-sm">{item.batch_no}</td>
                      <td className="px-4 py-2 text-sm font-medium">{item.original_quantity}</td>
                      <td className="px-4 py-2 text-sm font-medium">
                        {item.already_returned + (parseInt(item.returned_quantity) || 0)}
                        {isCompleted && <div className="text-xs text-green-600 font-medium">✓ Completed</div>}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">
                        {(item.already_damaged || 0) + (parseInt(item.damaged_quantity) || 0)}
                        <div className="text-xs text-gray-500 mt-1">
                          Total: {item.already_returned + (item.already_damaged || 0) + (parseInt(item.returned_quantity) || 0) + (parseInt(item.damaged_quantity) || 0)}
                        </div>
                        <div className="text-xs text-blue-600 mt-1 font-medium">
                          Balance: {item.original_quantity - (item.already_returned + (item.already_damaged || 0) + (parseInt(item.returned_quantity) || 0) + (parseInt(item.damaged_quantity) || 0))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={item.remaining_quantity - (parseInt(item.damaged_quantity) || 0)}
                          value={item.returned_quantity}
                          onChange={(e) => updateReturnItem(index, 'returned_quantity', e.target.value)}
                          className="w-20 border rounded px-2 py-1 text-sm"
                          disabled={isCompleted}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={item.remaining_quantity - (parseInt(item.returned_quantity) || 0)}
                          value={item.damaged_quantity}
                          onChange={(e) => updateReturnItem(index, 'damaged_quantity', e.target.value)}
                          className="w-20 border rounded px-2 py-1 text-sm"
                          disabled={isCompleted}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={item.return_deadline || ''}
                          onChange={(e) => updateReturnItem(index, 'return_deadline', e.target.value)}
                          className="w-32 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={isCompleted}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.damage_reason}
                          onChange={(e) => updateReturnItem(index, 'damage_reason', e.target.value)}
                          placeholder="Reason for damage"
                          className="w-full border rounded px-2 py-1 text-sm"
                          disabled={!item.damaged_quantity || item.damaged_quantity === '0' || isCompleted}
                        />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => { setShowReturnModal(false); setReturnItems([]); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnSubmit}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Process Returns'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Processing Modal */}
      {showReturnProcessing && selectedTransferId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Return Items - ET{selectedTransferId}</h2>
              <button onClick={() => setShowReturnProcessing(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Item</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Location</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Batch</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Original Qty</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Return Qty</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Good Return</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Damaged</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Damage Reason & Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transferItems.map((item, index) => {
                    const returnedQty = item.returned_qty || 0;
                    const remainingQty = item.remaining_qty || (item.qty - returnedQty);
                    
                    return (
                      <TransferReturnRow
                        key={`${item.id}-${returnedQty}`} // Force re-render when returned qty changes
                        item={item}
                        returnedQty={returnedQty}
                        remainingQty={remainingQty}
                        onProcess={processTransferReturn}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-6">
              <button onClick={() => setShowReturnProcessing(false)} className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">Process Returns</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransferReturnRow({ item, returnedQty, remainingQty, onProcess }) {
  const [returnQty, setReturnQty] = useState(0);
  const [goodReturn, setGoodReturn] = useState(0);
  const [damaged, setDamaged] = useState(0);
  const [damageReason, setDamageReason] = useState('');
  
  // Use the actual returned quantity from props, not local state
  const currentReturnedQty = returnedQty;
  const currentRemainingQty = item.qty - currentReturnedQty;
  
  const handleReturnQtyChange = (value) => {
    const qty = Math.min(value, currentRemainingQty);
    setReturnQty(qty);
    setGoodReturn(qty);
    setDamaged(0);
  };
  
  const handleGoodReturnChange = (value) => {
    const good = Math.min(value, returnQty);
    setGoodReturn(good);
    setDamaged(returnQty - good);
  };
  
  const handleDamagedChange = (value) => {
    const dmg = Math.min(value, returnQty);
    setDamaged(dmg);
    setGoodReturn(returnQty - dmg);
  };
  
  const handleProcessReturn = async () => {
    if (goodReturn > 0) {
      try {
        await onProcess(item, goodReturn);
        // Reset form after successful return
        setReturnQty(0);
        setGoodReturn(0);
        setDamaged(0);
        setDamageReason('');
      } catch (error) {
        console.error('Failed to process return:', error);
      }
    }
  };
  
  return (
    <tr className={currentRemainingQty <= 0 ? 'bg-green-50' : 'bg-white'}>
      <td className="border border-gray-300 px-4 py-3">
        <div className="font-medium">{item.item_name}</div>
        {currentReturnedQty > 0 && <div className="text-sm text-green-600">Returned: {currentReturnedQty}/{item.qty}</div>}
        {currentRemainingQty <= 0 && <div className="text-sm text-green-600 font-medium">✓ Fully Returned</div>}
      </td>
      <td className="border border-gray-300 px-4 py-3">main</td>
      <td className="border border-gray-300 px-4 py-3">{item.batch_no}</td>
      <td className="border border-gray-300 px-4 py-3 text-center">{item.qty}</td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        <div className="font-medium">{currentReturnedQty}</div>
        {currentRemainingQty <= 0 && <div className="text-xs text-green-600">Fully Returned</div>}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        {currentRemainingQty > 0 ? (
          <input 
            type="number" 
            min="0" 
            max={returnQty} 
            value={goodReturn} 
            onChange={(e) => handleGoodReturnChange(parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1 border rounded text-center" 
          />
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        {currentRemainingQty > 0 ? (
          <input 
            type="number" 
            min="0" 
            max={returnQty} 
            value={damaged} 
            onChange={(e) => handleDamagedChange(parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1 border rounded text-center" 
          />
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td className="border border-gray-300 px-4 py-3">
        {currentRemainingQty > 0 ? (
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min="1" 
              max={currentRemainingQty} 
              value={returnQty} 
              onChange={(e) => handleReturnQtyChange(parseInt(e.target.value) || 0)}
              placeholder="Qty to return"
              className="w-24 px-2 py-1 border rounded text-sm" 
            />
            <input 
              type="text" 
              placeholder="Reason for damage" 
              value={damageReason}
              onChange={(e) => setDamageReason(e.target.value)}
              className="flex-1 px-2 py-1 border rounded text-sm" 
            />
            {goodReturn > 0 && (
              <button
                onClick={handleProcessReturn}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Return {goodReturn}
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
    </tr>
  );
}