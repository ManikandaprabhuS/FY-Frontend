import React, { useState } from 'react';
import { Settings, Globe, CreditCard, Lock, Bell, Store } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: <Store className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'domains', label: 'Domains', icon: <Globe className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-6 w-full h-full animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manage your store preferences and account configurations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-2">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
          {activeTab === 'general' && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
              <h2 className="text-xl font-semibold text-on-surface mb-6">Store Details</h2>
              <form className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                      Store Name
                    </label>
                    <input
                      type="text"
                      defaultValue="FrameYard Store"
                      className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      defaultValue="contact@frameyard.com"
                      className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    Store Description
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="Premium framing solutions for your best memories."
                    className="w-full p-4 bg-surface border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                      Currency
                    </label>
                    <select className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none">
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                      Timezone
                    </label>
                    <select className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none">
                      <option>Eastern Time (ET)</option>
                      <option>Pacific Time (PT)</option>
                      <option>Central European Time (CET)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-6 mt-2 border-t border-outline-variant">
                  <button
                    type="button"
                    className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-semibold shadow-sm hover:bg-primary/95 transition-all"
                  >
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab !== 'general' && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm animate-fade-in">
              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4 text-on-surface-variant">
                <Settings className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface capitalize">{activeTab} Settings</h3>
              <p className="text-sm text-on-surface-variant mt-2 max-w-sm">
                This section is under construction. More configuration options will be available soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
