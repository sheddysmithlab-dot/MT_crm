import TabbedPage from '@/components/TabbedPage';
import StockTab from './inventory/StockTab';
import StockMovements from './inventory/StockMovements';
import CategoryManager from './inventory/CategoryManager';

const tabs = [
  { id: 'stock', label: 'Stock List', component: StockTab },
  { id: 'movements', label: 'Stock Movements', component: StockMovements },
  { id: 'categories', label: 'Manage Categories', component: CategoryManager },
];

const Inventory = () => <TabbedPage tabs={tabs} title="Inventory Management" />;

export default Inventory;
