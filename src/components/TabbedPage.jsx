import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const TabbedPage = ({ tabs, title, headerActions }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const validTab = tabs.find(t => t.id === tabParam);
    setActiveTab(validTab ? validTab.id : tabs[0].id);
  }, [searchParams, tabs]);

  const handleTabClick = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component;

  return (
    <div className="space-y-6">
       {title && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <h1 className="text-2xl font-bold text-brand-dark dark:text-dark-text mb-2 sm:mb-0">{title}</h1>
                <div className="flex items-center space-x-2">{headerActions}</div>
            </div>
        )}
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white dark:bg-dark-card p-4 sm:p-6 rounded-xl shadow-card dark:shadow-dark-card border border-gray-100 dark:border-gray-700"
        >
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`relative whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none transition-colors ${
                        activeTab === tab.id 
                            ? 'border-brand-red text-brand-red' 
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-brand-red'
                    }`}
                    >
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="tab-underline"
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        exit={{ scaleX: 0, opacity: 0 }}
                        transition={{ 
                            duration: 0.2, 
                            ease: 'easeOut',
                            type: 'tween'
                        }}
                        className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand-red" 
                      />
                    )}
                    {tab.label}
                  </button>
                ))}
                </nav>
            </div>
            <div className="pt-6">
                {ActiveComponent ? <ActiveComponent /> : <p>Select a tab</p>}
            </div>
        </motion.div>
    </div>
  );
};

export default TabbedPage;
