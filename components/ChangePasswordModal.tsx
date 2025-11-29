
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { Lock, X, Palette, Image as ImageIcon, CheckCircle, RotateCcw } from 'lucide-react';
import { UserRole } from '../types';

interface ChangePasswordModalProps {
  userId: string;
  userRole: UserRole;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ userId, userRole, onClose }) => {
  const [activeTab, setActiveTab] = useState<'password' | 'branding'>('password');
  
  // Password State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Branding State
  const [bgSuccess, setBgSuccess] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 4) {
      setError("Password is too short");
      return;
    }

    try {
      await authService.changePassword(userId, password);
      setSuccess(true);
      setTimeout(() => {
        if (userRole !== UserRole.ADMIN) onClose(); // Auto close if only password option exists
      }, 1500);
    } catch (err) {
      setError("Failed to update password");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string, successSetter: (v: boolean) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        try {
          localStorage.setItem(key, result);
          successSetter(true);
          setTimeout(() => successSetter(false), 3000);
        } catch (err) {
          alert("Image is too large. Please use a smaller image (under 2MB recommended).");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = (key: string) => {
    localStorage.removeItem(key);
    alert("Reset to default. Please logout to see changes.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative animate-fade-in overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
           <h3 className="text-lg font-bold text-gray-800">Settings & Profile</h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation (Only for Admin) */}
        {userRole === UserRole.ADMIN && (
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'password' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <Lock size={16} /> Security
            </button>
            <button 
              onClick={() => setActiveTab('branding')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'branding' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <Palette size={16} /> Customization
            </button>
          </div>
        )}

        <div className="p-6">
          {activeTab === 'password' && (
            <>
              {success ? (
                <div className="text-center py-6 text-green-600 font-medium flex flex-col items-center gap-2">
                  <CheckCircle size={32} />
                  Password updated successfully!
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  {error && <p className="text-xs text-red-500">{error}</p>}

                  <button 
                    type="submit" 
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Update Password
                  </button>
                </form>
              )}
            </>
          )}

          {activeTab === 'branding' && userRole === UserRole.ADMIN && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">Customize the look of the Login Screen.</p>

              {/* Background Image Upload */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                   <label className="block text-sm font-semibold text-gray-700">Login Background</label>
                   {bgSuccess && <span className="text-xs text-green-600 font-medium animate-pulse">Saved!</span>}
                </div>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-white border border-gray-300 text-gray-600 text-xs rounded py-2 px-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                    <ImageIcon size={16} />
                    {bgSuccess ? "Updated" : "Choose Image..."}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'pharma_login_bg', setBgSuccess)} />
                  </label>
                  <button onClick={() => handleReset('pharma_login_bg')} className="p-2 text-gray-400 hover:text-red-500 border border-transparent hover:border-red-100 rounded" title="Reset to Default">
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                   <label className="block text-sm font-semibold text-gray-700">Login Page Logo</label>
                   {logoSuccess && <span className="text-xs text-green-600 font-medium animate-pulse">Saved!</span>}
                </div>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-white border border-gray-300 text-gray-600 text-xs rounded py-2 px-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                    <ImageIcon size={16} />
                    {logoSuccess ? "Updated" : "Choose Logo..."}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'pharma_login_logo', setLogoSuccess)} />
                  </label>
                  <button onClick={() => handleReset('pharma_login_logo')} className="p-2 text-gray-400 hover:text-red-500 border border-transparent hover:border-red-100 rounded" title="Reset to Default">
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
