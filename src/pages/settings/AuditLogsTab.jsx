import { useState, useEffect } from 'react';
import { FileText, Download, Filter, Search, Calendar } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { dbOperations } from '@/lib/db';
import { toast } from 'sonner';

const AuditLogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('All');
  const [filterUser, setFilterUser] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadLogs();
    loadUsers();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await dbOperations.getAll('audit_logs');
      // Sort by created date, newest first
      allLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLogs(allLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await dbOperations.getAll('profiles');
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  const exportLogs = () => {
    try {
      const csvContent = generateCSV(filteredLogs);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Failed to export logs');
    }
  };

  const generateCSV = (data) => {
    const headers = ['Date & Time', 'User', 'Action', 'Entity Type', 'Description'];
    const rows = data.map(log => [
      new Date(log.createdAt).toLocaleString(),
      getUserName(log.userId),
      log.actionType,
      log.entityType,
      log.description,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  };

  const filteredLogs = logs.filter(log => {
    // Search filter
    const searchMatch = searchTerm === '' || 
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(log.userId).toLowerCase().includes(searchTerm.toLowerCase());

    // Action filter
    const actionMatch = filterAction === 'All' || log.actionType === filterAction;

    // User filter
    const userMatch = filterUser === 'All' || log.userId === filterUser;

    // Date range filter
    let dateMatch = true;
    if (dateRange.start && dateRange.end) {
      const logDate = new Date(log.createdAt);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the end date fully
      dateMatch = logDate >= startDate && logDate <= endDate;
    }

    return searchMatch && actionMatch && userMatch && dateMatch;
  });

  const actionTypes = [...new Set(logs.map(log => log.actionType))];

  const getActionColor = (actionType) => {
    const colors = {
      PERMISSION_CHANGE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      USER_CREATED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      USER_UPDATED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      USER_DELETED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      LOGIN: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      DATA_EXPORT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      SETTINGS_CHANGE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[actionType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={24} />
            <div>
              <h3 className="text-xl font-bold dark:text-dark-text">Audit Logs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                System activity and permission changes
              </p>
            </div>
          </div>
          <Button onClick={exportLogs} className="bg-green-600 hover:bg-green-700">
            <Download size={18} className="mr-2" />
            Export Logs
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-dark-text"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-dark-text"
          >
            <option value="All">All Actions</option>
            {actionTypes.map(action => (
              <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-dark-text"
          >
            <option value="All">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-dark-text"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-dark-text"
              placeholder="End Date"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Logs</div>
            <div className="text-2xl font-bold text-blue-600">{logs.length}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Filtered</div>
            <div className="text-2xl font-bold text-green-600">{filteredLogs.length}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Action Types</div>
            <div className="text-2xl font-bold text-purple-600">{actionTypes.length}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
            <div className="text-2xl font-bold text-orange-600">{users.length}</div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm dark:text-dark-text-secondary">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="py-1 px-2">Date & Time</th>
                <th className="py-1 px-2">User</th>
                <th className="py-1 px-2">Action</th>
                <th className="py-1 px-2">Entity</th>
                <th className="py-1 px-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-1 px-2 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(log.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-1 px-2">
                      <div className="font-medium dark:text-dark-text">{getUserName(log.userId)}</div>
                    </td>
                    <td className="py-1 px-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.actionType)}`}>
                        {log.actionType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-xs text-gray-600 dark:text-gray-400">
                      {log.entityType}
                    </td>
                    <td className="py-1 px-2 text-xs dark:text-dark-text max-w-md">
                      <div className="truncate" title={log.description}>
                        {log.description}
                      </div>
                      {log.metadata && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {Object.keys(log.metadata).length} metadata entries
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-1 px-2 text-gray-500 dark:text-dark-text-secondary">
                    No audit logs found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredLogs.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            Showing {filteredLogs.length} of {logs.length} audit logs
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogsTab;

