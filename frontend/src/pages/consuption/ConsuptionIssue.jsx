import { useState } from "react";
import api from "../../api";

export default function ConsumptionIssue() {
  const [issueType, setIssueType] = useState("DEPARTMENT");
  const [items, setItems] = useState([]);

  const addItem = () => {
    setItems([
      ...items,
      {
        item_name: "",
        qty: "",
        uom: "",
        batch_no: "",
        item_type: "CONSUMABLE",
        remarks: ""
      }
    ]);
  };

  const submitIssue = async () => {
    await api.post("/consumption/issue", {
      issue_type: issueType,
      issue_date: new Date().toISOString().split("T")[0],
      items
    });
    alert("Issue created successfully");
  };

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-xl font-semibold">
        Issue & Consumption Management
      </h1>

      {/* Issue Type */}
      <select
        value={issueType}
        onChange={e => setIssueType(e.target.value)}
        className="border p-2"
      >
        <option value="DEPARTMENT">Department</option>
        <option value="PROJECT">Project / Job</option>
        <option value="EXTERNAL">External / Client</option>
      </select>

      {/* Item Entry */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-medium mb-3">Item Issue Entry</h2>

        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-6 gap-2 mb-2">
            <input placeholder="Item" onChange={e => item.item_name = e.target.value} />
            <input type="number" placeholder="Qty" onChange={e => item.qty = e.target.value} />
            <input placeholder="UOM" onChange={e => item.uom = e.target.value} />
            <select onChange={e => item.item_type = e.target.value}>
              <option value="CONSUMABLE">Consumable</option>
              <option value="NON_CONSUMABLE">Non-consumable</option>
            </select>
            <input placeholder="Batch" onChange={e => item.batch_no = e.target.value} />
            <input placeholder="Remarks" onChange={e => item.remarks = e.target.value} />
          </div>
        ))}

        <button className="mt-2" onClick={addItem}>+ Add Item</button>
      </div>

      <button
        className="bg-teal-600 text-white px-6 py-2 rounded"
        onClick={submitIssue}
      >
        Issue Stock
      </button>
    </div>
  );
}
