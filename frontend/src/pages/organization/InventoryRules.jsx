import { useState } from "react";

import GlobalRules from "./GlobalRules";
import ItemReorderRules from "./ItemReorderRules";
import LeadTimeRules from "./LeadTimeRules";
import AlertRules from "./AlertRules";

export default function InventoryRules() {
  const [activeTab, setActiveTab] = useState("global");

  const tabs = [
    { key: "global", label: "Global Inventory Rules" },
    { key: "item", label: "Item-Level Reorder Rules" },
    { key: "lead", label: "Lead Time Settings" },
    { key: "alert", label: "Alerts & Notification Rules" },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case "global":
        return <GlobalRules />;
      case "item":
        return <ItemReorderRules />;
      case "lead":
        return <LeadTimeRules />;
      case "alert":
        return <AlertRules />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2 px-4 text-sm font-medium ${
              activeTab === tab.key
                ? "border-b-2 border-cyan-700 text-cyan-700"
                : "text-slate-500 hover:text-cyan-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderTab()}
    </div>
  );
}

