import { memo } from 'react';

const LineItem = memo(({ 
  item, 
  index, 
  returnType, 
  items, 
  itemBatches, 
  location, 
  onUpdateItem, 
  onRemoveItem, 
  onFetchBatches, 
  setItemBatches, 
  setReturnForm, 
  returnForm, 
  calculateItemAmount 
}) => {
  const handleItemChange = async (selectedItemName) => {
    onUpdateItem(index, 'item_name', selectedItemName);
    onUpdateItem(index, 'batch_no', '');
    onUpdateItem(index, 'quantity', '');
    
    if (selectedItemName) {
      const batches = await onFetchBatches(selectedItemName);
      setItemBatches(prev => ({ ...prev, [index]: batches }));
    }
  };

  const handleBatchChange = (selectedBatchNo) => {
    const currentBatches = itemBatches[index] || [];
    const selectedBatch = currentBatches.find(b => b.batch_no === selectedBatchNo);
    const quantity = selectedBatch ? selectedBatch.qty : '';
    const rate = selectedBatch ? selectedBatch.rate : 0;
    
    onUpdateItem(index, 'batch_no', selectedBatchNo);
    onUpdateItem(index, 'quantity', quantity);
    onUpdateItem(index, 'rate', rate);
  };

  return (
    <div className={`grid gap-3 p-3 border rounded ${
      returnType === 'INTERNAL' ? 'grid-cols-5' : 'grid-cols-6'
    }`}>
      <select
        value={item.item_name || ''}
        onChange={(e) => handleItemChange(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="">Select item</option>
        {items.map(itm => (
          <option key={itm.id} value={itm.name}>
            {itm.name} ({itm.item_code || 'N/A'})
          </option>
        ))}
      </select>
      
      <select
        value={item.batch_no || ''}
        onChange={(e) => handleBatchChange(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="">Select batch</option>
        {(itemBatches[index] || []).map(batch => (
          <option key={batch.batch_no} value={batch.batch_no}>
            {batch.batch_no} - {batch.location || location} (Qty: {batch.qty}, Rate: ₹{batch.rate || 0})
          </option>
        ))}
      </select>
      
      <input
        type="number"
        placeholder="Quantity"
        value={item.quantity}
        onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
      
      {returnType !== 'INTERNAL' && (
        <div className="border rounded px-2 py-1 text-sm bg-gray-50">
          ₹{calculateItemAmount(item, item.quantity).toFixed(2)}
        </div>
      )}
      
      <input
        type="text"
        placeholder="Reason"
        value={item.reason}
        onChange={(e) => onUpdateItem(index, 'reason', e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
      
      <button
        onClick={() => onRemoveItem(index)}
        className="text-red-600 hover:text-red-800 px-2"
      >
        ×
      </button>
    </div>
  );
});

LineItem.displayName = 'LineItem';

export default LineItem;