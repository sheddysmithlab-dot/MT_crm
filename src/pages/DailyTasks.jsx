import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Factory, 
  Truck, 
  Wrench, 
  ClipboardCheck, 
  Plus, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  Edit,
  Trash2,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { dbOperations, ensureStore } from '@/lib/db';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/PageHeader';

const TASK_TYPES = {
  FACTORY_SHUTDOWN: 'factory_shutdown',
  VEHICLE_DELIVERY: 'vehicle_delivery',
  FACTORY_MAINTENANCE: 'factory_maintenance',
  STOCK_CHECK: 'stock_check'
};

const TaskForm = ({ task, taskType, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    task || {
      task_type: taskType,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: '',
      // Factory Shutdown specific
      shutdown_reason: '',
      shutdown_start: '',
      shutdown_end: '',
      affected_departments: '',
      // Vehicle Delivery specific
      vehicle_no: '',
      customer_name: '',
      delivery_status: 'pending',
      delivery_person: '',
      // Factory Maintenance specific
      maintenance_area: '',
      maintenance_type: '',
      responsible_person: '',
      // Stock Check specific
      checked_items: '',
      discrepancies: '',
      checked_by: ''
    }
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const renderFormFields = () => {
    switch (taskType) {
      case TASK_TYPES.FACTORY_SHUTDOWN:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shutdown Reason *
              </label>
              <input
                type="text"
                name="shutdown_reason"
                value={formData.shutdown_reason}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
                placeholder="e.g., Power outage, Maintenance"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shutdown Start Time
                </label>
                <input
                  type="time"
                  name="shutdown_start"
                  value={formData.shutdown_start}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shutdown End Time
                </label>
                <input
                  type="time"
                  name="shutdown_end"
                  value={formData.shutdown_end}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Affected Departments
              </label>
              <input
                type="text"
                name="affected_departments"
                value={formData.affected_departments}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="e.g., Painting, Assembly"
              />
            </div>
          </>
        );

      case TASK_TYPES.VEHICLE_DELIVERY:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vehicle Number *
              </label>
              <input
                type="text"
                name="vehicle_no"
                value={formData.vehicle_no}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
                placeholder="e.g., MH12AB1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delivery Status
                </label>
                <select
                  name="delivery_status"
                  value={formData.delivery_status}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="pending">Pending</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delivery Person
                </label>
                <input
                  type="text"
                  name="delivery_person"
                  value={formData.delivery_person}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </>
        );

      case TASK_TYPES.FACTORY_MAINTENANCE:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maintenance Area *
              </label>
              <input
                type="text"
                name="maintenance_area"
                value={formData.maintenance_area}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
                placeholder="e.g., Machine Shop, Electrical Room"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maintenance Type *
              </label>
              <select
                name="maintenance_type"
                value={formData.maintenance_type}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              >
                <option value="">Select Type</option>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="emergency">Emergency</option>
                <option value="routine">Routine</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Responsible Person
              </label>
              <input
                type="text"
                name="responsible_person"
                value={formData.responsible_person}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </>
        );

      case TASK_TYPES.STOCK_CHECK:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Checked Items *
              </label>
              <textarea
                name="checked_items"
                value={formData.checked_items}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
                rows="3"
                placeholder="List items checked (one per line or comma-separated)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Discrepancies Found
              </label>
              <textarea
                name="discrepancies"
                value={formData.discrepancies}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                rows="2"
                placeholder="List any discrepancies or issues found"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Checked By *
              </label>
              <input
                type="text"
                name="checked_by"
                value={formData.checked_by}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date *
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {renderFormFields()}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Additional Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          rows="3"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Save Task
        </Button>
      </div>
    </form>
  );
};

const TaskCard = ({ tasks, taskType, title, icon: Icon, color, onAdd, onEdit, onDelete }) => {
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {completedCount}/{tasks.length} completed
            </p>
          </div>
        </div>
        <Button onClick={() => onAdd(taskType)} size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
            No tasks found
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {task.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {task.vehicle_no || task.maintenance_area || task.shutdown_reason || 'Task'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {new Date(task.date).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  {task.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                      {task.notes.substring(0, 50)}
                      {task.notes.length > 50 ? '...' : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(task)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Edit className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

const DailyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTaskType, setCurrentTaskType] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Ensure the daily_tasks store exists before loading
        await ensureStore('daily_tasks');
        await loadTasks();
      } catch (error) {
        console.error('Failed to initialize Daily Tasks page:', error);
        toast.error(error.message || 'Failed to initialize. Please refresh the page.');
      }
    };
    
    initializePage();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await dbOperations.getAll('daily_tasks');
      // Sort by created_at descending (newest first)
      const sorted = (data || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setTasks(sorted);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = (taskType) => {
    setCurrentTaskType(taskType);
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task) => {
    setCurrentTaskType(task.task_type);
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        await dbOperations.update('daily_tasks', editingTask.id, taskData);
        toast.success('Task updated successfully');
      } else {
        await dbOperations.insert('daily_tasks', {
          ...taskData,
          created_at: new Date().toISOString()
        });
        toast.success('Task added successfully');
      }
      await loadTasks();
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await dbOperations.delete('daily_tasks', taskId);
      toast.success('Task deleted successfully');
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const getModalTitle = () => {
    const titles = {
      [TASK_TYPES.FACTORY_SHUTDOWN]: 'Factory Shutdown Report',
      [TASK_TYPES.VEHICLE_DELIVERY]: 'Vehicle Delivery Check',
      [TASK_TYPES.FACTORY_MAINTENANCE]: 'Factory Maintenance Report',
      [TASK_TYPES.STOCK_CHECK]: 'Manual Stock Check Report'
    };
    return editingTask ? `Edit ${titles[currentTaskType]}` : `Add ${titles[currentTaskType]}`;
  };

  const filterTasksByType = (type) => tasks.filter(t => t.task_type === type);

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const taskDate = new Date(task.date);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);

      const isInDateRange = taskDate >= fromDate && taskDate <= toDate;

      const matchesCategory = selectedCategory === 'all' || task.task_type === selectedCategory;

      const matchesSearch = searchTerm === '' || 
        task.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.shutdown_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.maintenance_area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.checked_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      return isInDateRange && matchesSearch && matchesCategory;
    });
  };

  const filteredTasks = getFilteredTasks();

  // Group tasks by type for display
  const taskGroups = [
    {
      type: TASK_TYPES.FACTORY_SHUTDOWN,
      title: 'Factory Shutdown Reports',
      icon: Factory,
      color: 'bg-red-500',
      tasks: filteredTasks.filter(t => t.task_type === TASK_TYPES.FACTORY_SHUTDOWN)
    },
    {
      type: TASK_TYPES.VEHICLE_DELIVERY,
      title: 'Vehicle Delivery Check',
      icon: Truck,
      color: 'bg-blue-500',
      tasks: filteredTasks.filter(t => t.task_type === TASK_TYPES.VEHICLE_DELIVERY)
    },
    {
      type: TASK_TYPES.FACTORY_MAINTENANCE,
      title: 'Factory Maintenance',
      icon: Wrench,
      color: 'bg-orange-500',
      tasks: filteredTasks.filter(t => t.task_type === TASK_TYPES.FACTORY_MAINTENANCE)
    },
    {
      type: TASK_TYPES.STOCK_CHECK,
      title: 'Manual Stock Check',
      icon: ClipboardCheck,
      color: 'bg-green-500',
      tasks: filteredTasks.filter(t => t.task_type === TASK_TYPES.STOCK_CHECK)
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Daily Tasks & Reports" 
        subtitle="Manage factory operations, deliveries, maintenance, and stock checks"
      />

      {/* Task Category Buttons */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add New Task
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {taskGroups.map((group) => {
            const completedCount = group.tasks.filter(t => t.status === 'completed').length;
            const totalCount = group.tasks.length;
            
            return (
              <button
                key={group.type}
                onClick={() => handleAddTask(group.type)}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all hover:shadow-md group"
              >
                <div className={`p-3 rounded-lg ${group.color} flex-shrink-0`}>
                  <group.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200">
                    {group.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {completedCount}/{totalCount} completed
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Filters at Bottom */}
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Tasks
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by vehicle no, customer, area, etc..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-w-[180px]"
                >
                  <option value="all">All Categories</option>
                  <option value={TASK_TYPES.FACTORY_SHUTDOWN}>Factory Shutdown</option>
                  <option value={TASK_TYPES.VEHICLE_DELIVERY}>Vehicle Delivery</option>
                  <option value={TASK_TYPES.FACTORY_MAINTENANCE}>Factory Maintenance</option>
                  <option value={TASK_TYPES.STOCK_CHECK}>Stock Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold">{filteredTasks.length}</span> task(s) 
            {searchTerm && <span> matching "{searchTerm}"</span>}
          </div>
        </div>
      </Card>

      {/* All Tasks List */}
      {filteredTasks.length > 0 && (
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            All Tasks List
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="py-1 px-2 text-left">Date</th>
                  <th className="py-1 px-2 text-left">Category</th>
                  <th className="py-1 px-2 text-left">Details</th>
                  <th className="py-1 px-2 text-left">Status</th>
                  <th className="py-1 px-2 text-left">Notes</th>
                  <th className="py-1 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const categoryName = {
                    [TASK_TYPES.FACTORY_SHUTDOWN]: 'Factory Shutdown',
                    [TASK_TYPES.VEHICLE_DELIVERY]: 'Vehicle Delivery',
                    [TASK_TYPES.FACTORY_MAINTENANCE]: 'Maintenance',
                    [TASK_TYPES.STOCK_CHECK]: 'Stock Check'
                  }[task.task_type];

                  const details = task.vehicle_no || task.maintenance_area || task.shutdown_reason || task.checked_items || '-';

                  return (
                    <tr key={task.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-1 px-2">
                        {new Date(task.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-1 px-2">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700">
                          {categoryName}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <div className="max-w-xs truncate">{details}</div>
                        {task.customer_name && (
                          <div className="text-xs text-gray-500">{task.customer_name}</div>
                        )}
                      </td>
                      <td className="py-1 px-2">
                        {task.status === 'completed' ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">Completed</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs capitalize">{task.status || 'Pending'}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-1 px-2">
                        <div className="max-w-xs truncate text-xs text-gray-600 dark:text-gray-400">
                          {task.notes || '-'}
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        title={getModalTitle()}
      >
        <TaskForm
          task={editingTask}
          taskType={currentTaskType}
          onSave={handleSaveTask}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default DailyTasks;
