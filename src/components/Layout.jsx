import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useEffect } from 'react';
import { useUiStore } from '@/store/appStateStore';

const Layout = () => {
    const location = useLocation();
    const { isSidebarOpen } = useUiStore();

    // Scroll to top on page change
    useEffect(() => {
        document.querySelector('main')?.scrollTo(0, 0);
    }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-background font-sans">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-dark-background p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
