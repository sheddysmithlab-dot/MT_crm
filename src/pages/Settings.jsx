import { useState, useEffect } from "react";
import TabbedPage from "@/components/TabbedPage";
import UserManagementTab from "./settings/UserManagementTab";
import GeneralSettingsTab from "./settings/GeneralSettingsTab";
import MyProfileTab from "./settings/MyProfileTab";
import RateListMemoryTab from "./settings/RateListMemoryTab";
import SecuritySettingsTab from "./settings/SecuritySettingsTab";
import AuditLogsTab from "./settings/AuditLogsTab";
import AboutTab from "./settings/AboutTab";
import CompanyMasterTab from "./settings/CompanyMasterTab";
import ErrorDashboard from "@/components/ErrorDashboard";
import AdminPasswordModal from "@/components/AdminPasswordModal";
import { useAuthStore } from '@/store/authManagementStore';
import { useNavigate } from "react-router-dom";
import { dbOperations } from "@/lib/db";

const allTabs = [
  { id: "general", label: "General", component: GeneralSettingsTab },
  { id: "myprofile", label: "My Profile", component: MyProfileTab },
  { id: "company", label: "Company Master", component: CompanyMasterTab },
  { id: "ratelist", label: "Memory", component: RateListMemoryTab },
  { id: "users", label: "User Management", component: UserManagementTab },
  { id: "security", label: "Security", component: SecuritySettingsTab },
  { id: "audit", label: "Audit Logs", component: AuditLogsTab, directorOnly: true },
  { id: "errors", label: "Error Dashboard", component: ErrorDashboard, directorOnly: true },
  { id: "about", label: "About", component: AboutTab }
];

const Settings = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, [user]);

  const checkUserRole = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      let role = user.role || "Accountant";

      if (user.id) {
        const profile = await dbOperations.getById("profiles", user.id);
        if (profile) {
          role = profile.role;
        }
      }

      setUserRole(role);

      if (role === "Director") {
        setShowPasswordModal(true);
      } else {
        setIsVerified(true);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking user role:", error);
      setUserRole(user.role || "Accountant");
      setIsVerified(true);
      setLoading(false);
    }
  };

  const handlePasswordSuccess = () => {
    setIsVerified(true);
    setShowPasswordModal(false);
  };

  const handlePasswordCancel = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (userRole === "Director" && !isVerified) {
    return (
      <AdminPasswordModal
        isOpen={showPasswordModal}
        onSuccess={handlePasswordSuccess}
        onCancel={handlePasswordCancel}
      />
    );
  }

  const availableTabs = allTabs.filter(tab =>
    !tab.directorOnly || userRole === "Director"
  );

  return <TabbedPage tabs={availableTabs} title="Settings" />;
};

export default Settings;
