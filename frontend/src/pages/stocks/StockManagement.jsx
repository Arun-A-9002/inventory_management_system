import { useEffect, useState } from "react";
import api from "../../api";

export default function StockManagement() {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState("");
  const [qty, setQty] = useState("");

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      const res = await api.get("/stocks/");
      if (res.data && res.data.length > 0) {
        setStocks(res.data);
      } else {
        // Fallback: load from items master but with 0 quantities
        const itemsRes = await api.get("/items/");
        const items = itemsRes.data || [];
        const stockData = items.map(item => ({
          id: item.id,
          item_code: item.item_code,
          item_name: item.name,
          brand: item.brand || '',
          category: item.category || '',
          total_qty: 0,
          available_qty: 0,
          uom: item.uom || '',
          min_stock: item.min_stock || 0,
          mrp: item.mrp || 0,
          cost_per_piece: item.fixing_price || 0,
          mrp_per_piece: item.mrp || 0
        }));
        setStocks(stockData);
      }
    } catch (error) {
      console.error("Error loading stocks:", error);
      setStocks([]);
    }
  };

  const handleAdjustment = async () => {
    if (!selectedStock || !qty) {
      alert("Select item and quantity");
      return;
    }

    await api.post("/stocks/adjust", {
      stock_id: selectedStock,
      adjustment_type: "INCREASE",
      store: "Main Store",
      quantity: qty,
      reason: "Manual adjustment",
    });

    alert("Stock adjusted successfully");
    setQty("");
    loadStocks();
  };

  return (
    <div className="p-6 space-y-12">

      {/* ================================================= */}
      {/* STOCK OVERVIEW & LEDGER */}
      {/* ================================================= */}
      <section>
        <h2 className="text-xl font-bold mb-4">Stock Overview & Ledger</h2>

        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Item</th>
              <th className="border p-2">Location</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => (
              <tr key={s.id}>
                <td className="border p-2">
                  <div className="font-medium">{s.item_name}</div>
                  <div className="text-xs text-gray-500">{s.item_code}</div>
                </td>
                <td className="border p-2">pharmacy</td>
                <td className="border p-2 font-semibold">{s.available_qty}</td>
                <td className="border p-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    s.available_qty <= s.min_stock ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {s.available_qty <= s.min_stock ? 'Low' : 'Good'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ================================================= */}
      {/* STOCK ADJUSTMENTS & OPENING */}
      {/* ================================================= */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          Stock Adjustments & Opening Stock
        </h2>

        <div className="grid grid-cols-2 gap-4 max-w-xl">
          <select
            className="border p-2"
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
          >
            <option value="">Select Item</option>
            {stocks.map((s) => (
              <option key={s.id} value={s.id}>
                {s.item_name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Quantity"
            className="border p-2"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />

          <button
            onClick={handleAdjustment}
            className="bg-cyan-700 text-white px-4 py-2 rounded"
          >
            Save Adjustment
          </button>
        </div>
      </section>

      {/* ================================================= */}
      {/* STOCK TRANSFER */}
      {/* ================================================= */}
      <section>
        <h2 className="text-xl font-bold mb-4">Stock Transfer (Inter-Store)</h2>

        <p className="text-gray-600 text-sm">
          Transfer stock between stores (workflow ready)
        </p>
      </section>

      {/* ================================================= */}
      {/* STOCK ISSUE */}
      {/* ================================================= */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          Stock Issue to Departments
        </h2>

        <p className="text-gray-600 text-sm">
          Issue items directly to departments
        </p>
      </section>

      {/* ================================================= */}
      {/* DASHBOARD & ALERTS */}
      {/* ================================================= */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          Real-Time Stock Dashboard & Alerts
        </h2>

        <p className="text-gray-600 text-sm">
          Reorder alerts, expiry alerts, stock movement
        </p>
      </section>

    </div>
  );
}