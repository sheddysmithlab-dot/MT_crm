import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/store/appStateStore';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
    const { theme, setTheme } = useThemeStore();
    return (
        <div className="flex items-center space-x-1 p-1 rounded-full bg-gray-200/50 dark:bg-dark-surface border dark:border-dark-border">
           <ToggleButton themeName="light" currentTheme={theme} setTheme={setTheme} Icon={Sun} />
           <ToggleButton themeName="dark" currentTheme={theme} setTheme={setTheme} Icon={Moon} />
           <ToggleButton themeName="system" currentTheme={theme} setTheme={setTheme} Icon={Monitor} />
        </div>
    );
};

const ToggleButton = ({ themeName, currentTheme, setTheme, Icon }) => {
    const isActive = themeName === currentTheme;
    return (
        <button 
            onClick={() => setTheme(themeName)} 
            className="p-1.5 rounded-full relative"
            aria-label={`Switch to ${themeName} theme`}
        >
            {isActive && (
                <motion.div
                    layoutId="theme-active-indicator"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="absolute inset-0 bg-white dark:bg-dark-card rounded-full shadow-sm border dark:border-dark-border"
                    transition={{ 
                        type: 'spring', 
                        stiffness: 300, 
                        damping: 25,
                        duration: 0.3
                    }}
                />
            )}
            <Icon className={`h-5 w-5 relative z-10 transition-colors ${
                isActive 
                    ? 'text-brand-red' 
                    : 'text-gray-700 dark:text-dark-text-secondary'
            }`} />
        </button>
    );
}

export default ThemeToggle;
