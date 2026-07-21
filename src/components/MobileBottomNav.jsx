import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Briefcase, Users, Package, FileText } from 'lucide-react';

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/jobs', icon: Briefcase, label: 'Jobs' },
    { path: '/customer', icon: Users, label: 'Customers' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/accounts', icon: FileText, label: 'Accounts' },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-dark-card border-t dark:border-gray-700 shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                active
                  ? 'text-brand-red'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <item.icon className={`h-6 w-6 ${active ? 'text-brand-red' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
