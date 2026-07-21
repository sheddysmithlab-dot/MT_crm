import { useState } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from '@/store/authManagementStore';

const AdminPasswordModal = ({ isOpen, onSuccess, onCancel }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleVerify = async () => {
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        toast.error("User not authenticated");
        setLoading(false);
        return;
      }

      const validCredentials = [
        { email: 'malwatrolley@gmail.com', password: 'Malwa822' },
        { email: 'Shahidmultaniii', password: 'S#d_8224' }
      ];

      const isValid = validCredentials.some(
        cred => cred.email === user.email && cred.password === password
      );

      if (!isValid) {
        toast.error("Invalid password");
        setLoading(false);
        return;
      }

      toast.success("Access granted");
      setPassword("");
      onSuccess();
    } catch (error) {
      console.error("Password verification error:", error);
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Admin Access Verification">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Please re-enter your password to access administrative settings
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleVerify()}
            placeholder="Enter your password"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminPasswordModal;
