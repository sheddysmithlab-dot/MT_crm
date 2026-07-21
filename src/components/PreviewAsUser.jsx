import { useState, useEffect } from 'react';
import { Eye, EyeOff, User } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { dbOperations } from '@/lib/db';
import { usePreviewStore, useAuthStore } from '@/store/authManagementStore';
import { toast } from 'sonner';

const PreviewAsUser = () => {
  const { user: currentUser } = useAuthStore();
  const { isPreviewMode, previewUser, startPreview, endPreview } = usePreviewStore();
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Only show for Super Admin and Admin
  const canPreview = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin';

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const allUsers = await dbOperations.getAll('profiles');
      const filteredUsers = allUsers.filter(u => u.id !== currentUser?.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleStartPreview = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) return;

    const success = await startPreview(selectedUserId, selectedUser.name);
    if (success) {
      toast.success(`Now previewing as ${selectedUser.name}`);
      setIsOpen(false);
      setSelectedUserId('');
    } else {
      toast.error('Failed to start preview mode');
    }
  };

  const handleEndPreview = () => {
    endPreview();
    toast.info('Preview mode ended');
  };

  if (!canPreview) return null;

  return (
    <>
      {/* Preview Mode Indicator */}
      {isPreviewMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white py-2 px-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Eye size={20} />
            <span className="font-semibold">
              Preview Mode: Viewing as {previewUser?.name}
            </span>
          </div>
          <Button onClick={handleEndPreview} variant="outline" size="sm" className="bg-white text-orange-600 hover:bg-orange-50">
            <EyeOff size={16} className="mr-2" />
            End Preview
          </Button>
        </div>
      )}

      {/* Preview As Button */}
      {!isPreviewMode && (
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          title="Preview UI as another user"
        >
          <Eye size={16} />
          <span className="hidden md:inline">Preview As</span>
        </Button>
      )}

      {/* User Selection Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Preview As User">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a user to preview the application as they would see it. This allows you to verify permissions and UI visibility.
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> You'll only see what the selected user can see based on their permissions. Your admin capabilities will be temporarily hidden.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-dark-text">
              Select User to Preview
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-dark-text"
            >
              <option value="">Choose a user...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.email} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={() => setIsOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleStartPreview} className="bg-orange-600 hover:bg-orange-700">
              <Eye size={18} className="mr-2" />
              Start Preview
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PreviewAsUser;
