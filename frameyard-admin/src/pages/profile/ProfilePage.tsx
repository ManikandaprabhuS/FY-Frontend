import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { User, Mail, Shield, Save, Phone } from 'lucide-react';
import { showError, showSuccess } from '../../utils/toast';

const emptyProfileForm = {
  name: '',
  email: '',
  phoneNumber: '',
  addressLine: '',
  cityName: '',
  stateName: '',
  postalCode: '',
};

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword, error: authError } = useAuth();
  const [formData, setFormData] = useState(emptyProfileForm);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user) return;

    setFormData({
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber?.startsWith('EMP-') ? '' : user.phoneNumber || '',
      addressLine: user.addressLine || '',
      cityName: user.cityName || '',
      stateName: user.stateName || '',
      postalCode: user.postalCode || '',
    });
  }, [user]);

  const handleUpdate = async () => {
    const success = await updateProfile(formData);
    if (success) {
      showSuccess('Profile updated successfully');
    } else {
      showError(authError || 'Failed to update profile');
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.password.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }

    if (passwordData.password !== passwordData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (!passwordData.currentPassword) {
      showError('Current password is required');
      return;
    }

    const success = await changePassword(passwordData.currentPassword, passwordData.password);

    if (success) {
      setPasswordData({ currentPassword: '', password: '', confirmPassword: '' });
      showSuccess('Password updated. Please log in again.');
    } else {
      showError('Failed to update password');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-6 w-full h-full animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">My Profile</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manage your personal information and preferences.</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 md:p-8 border-b border-outline-variant flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-surface">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-xl font-bold text-on-surface">{user?.name || 'Admin User'}</h2>
            <p className="text-sm text-on-surface-variant flex items-center justify-center md:justify-start gap-2 mt-1">
              <Shield className="w-4 h-4" /> {user?.role || 'Administrator'}
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <form className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface-variant transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(event) => setFormData({ ...formData, phoneNumber: event.target.value })}
                    placeholder="Add phone number"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Address</label>
                <textarea
                  rows={3}
                  value={formData.addressLine}
                  onChange={(event) => setFormData({ ...formData, addressLine: event.target.value })}
                  className="w-full p-3 bg-surface border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <input type="text" value={formData.cityName} onChange={(event) => setFormData({ ...formData, cityName: event.target.value })} className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm" placeholder="City" />
                  <input type="text" value={formData.stateName} onChange={(event) => setFormData({ ...formData, stateName: event.target.value })} className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm" placeholder="State" />
                  <input type="text" value={formData.postalCode} onChange={(event) => setFormData({ ...formData, postalCode: event.target.value })} className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm" placeholder="Postal Code" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-outline-variant">
              <button type="button" onClick={handleUpdate} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-semibold shadow-sm hover:bg-primary/95 transition-all">
                <Save className="w-4 h-4" />
                Update Changes
              </button>
            </div>

            <div className="border-t border-outline-variant pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface">Change Password</h3>
              <p className="mt-1 text-xs text-on-surface-variant">Use this after logging in with a generated temporary password.</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(event) => setPasswordData({ ...passwordData, currentPassword: event.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm"
                  placeholder="Current password"
                />
                <input
                  type="password"
                  value={passwordData.password}
                  onChange={(event) => setPasswordData({ ...passwordData, password: event.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm"
                  placeholder="New password"
                />
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(event) => setPasswordData({ ...passwordData, confirmPassword: event.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm"
                  placeholder="Confirm new password"
                />
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={handlePasswordUpdate} className="px-6 py-2.5 border border-outline-variant rounded-xl font-semibold hover:bg-surface-container transition-all">
                  Update Password
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
