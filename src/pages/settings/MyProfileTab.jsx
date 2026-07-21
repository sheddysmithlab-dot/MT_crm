import { useState, useEffect, useRef } from 'react';
import { User, Mail, Shield, Calendar, Lock, Building, Phone, MapPin, Briefcase, Clock, Edit2, Save, X, Camera, Upload } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authManagementStore';
import useSettingsStore from '@/store/settingsStore';
import { dbOperations } from '@/lib/db';
import { toast } from 'sonner';

const MyProfileTab = () => {
  const { user, profile: authProfile, updateProfile } = useAuthStore();
  const { saveUserProfile, loadUserProfile, saveUserImage, loadUserImage } = useSettingsStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    department: '',
  });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        // Try to load from new Settings backend structure first
        const profileResult = await loadUserProfile(user.id);
        if (profileResult.success && profileResult.data) {
          const profileData = profileResult.data;
          setProfile(profileData);
          setEditedProfile({
            name: profileData?.name || '',
            email: profileData?.email || user?.email || '',
            phone: profileData?.phone || '',
            address: profileData?.address || '',
            department: profileData?.department || '',
          });

          // Load photo from new Settings backend
          const imageResult = await loadUserImage(user.id);
          if (imageResult.success && imageResult.data?.imageData) {
            setPhotoPreview(imageResult.data.imageData);
          }
          setLoading(false);
          return;
        }

        // Fallback to old profile system
        if (window.electron?.profile?.loadData) {
          const result = await window.electron.profile.loadData(user.id);
          if (result.success && result.profileData) {
            const profileData = result.profileData;
            setProfile(profileData);
            setEditedProfile({
              name: profileData?.name || '',
              email: profileData?.email || user?.email || '',
              phone: profileData?.phone || '',
              address: profileData?.address || '',
              department: profileData?.department || '',
            });

            const photoResult = await window.electron.profile.loadPhoto(user.id);
            if (photoResult.success && photoResult.photoData) {
              setPhotoPreview(photoResult.photoData);
            }
            setLoading(false);
            return;
          }
        }

        // Final fallback to IndexedDB
        const userProfile = await dbOperations.getById('profiles', user.id);
        const profileData = userProfile || authProfile || user;
        setProfile(profileData);
        setEditedProfile({
          name: profileData?.name || '',
          email: profileData?.email || user?.email || '',
          phone: profileData?.phone || '',
          address: profileData?.address || '',
          department: profileData?.department || '',
        });
        setPhotoPreview(profileData?.photo || null);
      } else {
        const profileData = authProfile || user;
        setProfile(profileData);
        setEditedProfile({
          name: profileData?.name || '',
          email: profileData?.email || '',
          phone: profileData?.phone || '',
          address: profileData?.address || '',
          department: profileData?.department || '',
        });
        setPhotoPreview(profileData?.photo || null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      const profileData = authProfile || user;
      setProfile(profileData);
      setEditedProfile({
        name: profileData?.name || '',
        email: profileData?.email || '',
        phone: profileData?.phone || '',
        address: profileData?.address || '',
        department: profileData?.department || '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(profile?.photo || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      if (!editedProfile.name.trim()) {
        toast.error('Name is required');
        return;
      }

      if (!editedProfile.email.trim()) {
        toast.error('Email is required');
        return;
      }

      const updatedProfile = {
        ...profile,
        name: editedProfile.name,
        email: editedProfile.email,
        phone: editedProfile.phone,
        address: editedProfile.address,
        department: editedProfile.department,
        userId: user.id,
        updated_at: new Date().toISOString(),
      };

      // Save to new Settings backend structure first
      const profileResult = await saveUserProfile(user.id, updatedProfile);
      if (profileResult.success) {
        // Save photo if changed
        if (photoPreview && photoPreview !== profile?.photo) {
          const imageResult = await saveUserImage(user.id, photoPreview);
          if (!imageResult.success) {
            console.error('Failed to save photo:', imageResult.error);
            toast.warning('Profile saved but photo upload failed');
          }
        }
      } else {
        // Fallback to old profile system
        if (window.electron?.profile?.saveData) {
          const saveResult = await window.electron.profile.saveData(user.id, updatedProfile);
          if (!saveResult.success) {
            throw new Error(saveResult.error || 'Failed to save profile data');
          }

          if (photoPreview && photoPreview !== profile?.photo) {
            const photoResult = await window.electron.profile.savePhoto(user.id, photoPreview);
            if (!photoResult.success) {
              console.error('Failed to save photo:', photoResult.error);
              toast.warning('Profile saved but photo upload failed');
            }
          }
        } else {
          // Final fallback to IndexedDB
          updatedProfile.photo = photoPreview;
          await dbOperations.update('profiles', user.id, updatedProfile);
        }
      }

      // Update auth store
      updateProfile({
        name: editedProfile.name,
        email: editedProfile.email,
        phone: editedProfile.phone,
        address: editedProfile.address,
        department: editedProfile.department,
        photo: photoPreview,
      });

      setProfile(updatedProfile);
      setIsEditing(false);
      setSelectedPhoto(null);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile({
      name: profile?.name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      department: profile?.department || '',
    });
    setSelectedPhoto(null);
    setPhotoPreview(profile?.photo || null);
    setIsEditing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-blue-200 dark:border-blue-800"></div>
          <div className="absolute top-0 h-20 w-20 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role) => {
    const colors = {
      'Director': 'from-purple-500 to-pink-600',
      'Super Admin': 'from-red-500 to-orange-600',
      'Manager': 'from-blue-500 to-indigo-600',
      'Accountant': 'from-green-500 to-emerald-600',
      'Viewer': 'from-gray-500 to-slate-600',
    };
    return colors[role] || 'from-blue-500 to-indigo-600';
  };

  const getStatusColor = (status) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="space-y-2">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-2 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Profile Avatar */}
              <div className="relative group">
                <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-30 animate-pulse"></div>
                <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-white to-blue-100 flex items-center justify-center text-indigo-600 shadow-2xl border-2 border-white/30 overflow-hidden">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt={profile?.name || 'User'} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </div>
                {isEditing && (
                  <>
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-white hover:text-gray-300"
                        disabled={isUploadingPhoto}
                      >
                        {isUploadingPhoto ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                        ) : (
                          <Camera size={24} />
                        )}
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoSelect}
                      accept="image/*"
                      className="hidden"
                    />
                  </>
                )}
              </div>
              
              {/* Profile Info */}
              <div className="flex-1">
                <h1 className="text-xl font-bold tracking-tight mb-1">{profile?.name || 'User'}</h1>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${getRoleColor(profile?.role)} text-white text-xs font-medium shadow-lg`}>
                    <Shield size={12} />
                    {profile?.role || 'User'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${getStatusColor(profile?.status)} text-xs font-medium`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${profile?.status === 'Active' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                    {profile?.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Edit Button */}
            <div>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-sm px-3 py-1.5 rounded-lg font-medium shadow-lg transition-all flex items-center gap-1.5 text-sm"
                >
                  <Edit2 size={14} />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancelEdit}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-sm px-3 py-1.5 rounded-lg font-medium shadow-lg transition-all flex items-center gap-1.5 text-sm"
                  >
                    <X size={14} />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    className="bg-white hover:bg-white/90 text-indigo-600 border border-white backdrop-blur-sm px-3 py-1.5 rounded-lg font-medium shadow-lg transition-all flex items-center gap-1.5 text-sm"
                  >
                    <Save size={14} />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 shadow-lg">
              <User className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Account Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {/* Full Name */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <User size={12} className="text-blue-600 dark:text-blue-400" />
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editedProfile.name}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile?.name || 'N/A'}</p>
              )}
            </div>

            {/* Email */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <Mail size={12} className="text-purple-600 dark:text-purple-400" />
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editedProfile.email}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter your email"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile?.email || user?.email || 'N/A'}</p>
              )}
            </div>

            {/* Role */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <Shield size={12} className="text-green-600 dark:text-green-400" />
                Role
              </label>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile?.role || 'User'}</p>
              {isEditing && <p className="text-xs text-gray-500">(Cannot be changed)</p>}
            </div>

            {/* Status */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <Briefcase size={12} className="text-amber-600 dark:text-amber-400" />
                Account Status
              </label>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile?.status || 'Active'}</p>
            </div>

            {/* Department */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/20 dark:to-teal-950/20 border border-cyan-200 dark:border-cyan-800">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <Building size={12} className="text-cyan-600 dark:text-cyan-400" />
                Department
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="department"
                  value={editedProfile.department}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-cyan-300 dark:border-cyan-700 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Enter department"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile?.department || 'N/A'}</p>
              )}
            </div>

            {/* Phone */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 border border-rose-200 dark:border-rose-800">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <Phone size={12} className="text-rose-600 dark:text-rose-400" />
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={editedProfile.phone}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-rose-300 dark:border-rose-700 rounded focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile?.phone || 'N/A'}</p>
              )}
            </div>

            {/* Address */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 border border-violet-200 dark:border-violet-800 md:col-span-2">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <MapPin size={12} className="text-violet-600 dark:text-violet-400" />
                Address
              </label>
              {isEditing ? (
                <textarea
                  name="address"
                  value={editedProfile.address}
                  onChange={handleInputChange}
                  rows="1"
                  className="w-full px-2 py-1 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-violet-300 dark:border-violet-700 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter your address"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile?.address || 'N/A'}</p>
              )}
            </div>

            {/* User ID */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border border-slate-200 dark:border-slate-800 md:col-span-2">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <Lock size={12} className="text-slate-600 dark:text-slate-400" />
                User ID
              </label>
              <p className="text-xs font-mono font-semibold text-gray-900 dark:text-gray-100">{user?.id || 'N/A'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Activity Information */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 shadow-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Activity Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Created Date */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <Calendar size={12} className="text-emerald-600 dark:text-emerald-400" />
                Account Created
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatDate(profile?.created_at)}</p>
            </div>

            {/* Last Updated */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 border border-sky-200 dark:border-sky-800">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <Clock size={12} className="text-sky-600 dark:text-sky-400" />
                Last Updated
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatDate(profile?.updated_at)}</p>
            </div>

            {/* Last Login */}
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                <Lock size={12} className="text-indigo-600 dark:text-indigo-400" />
                Last Login
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatDate(profile?.last_login)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Permissions Info */}
      <Card className="border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 shadow-lg">
        <div className="p-2">
          <div className="flex items-start gap-2">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 shadow-xl">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                Account Permissions
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Your current role is <span className="font-bold text-indigo-600 dark:text-indigo-400">{profile?.role || 'User'}</span>. 
                This determines what features and data you can access in the system.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">View your profile information</p>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">Access assigned modules</p>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">View activity logs</p>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">Contact system administrator</p>
                </div>
              </div>
              <div className="mt-2 p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  💡 <strong>Note:</strong> To update your profile information, please contact your system administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MyProfileTab;

