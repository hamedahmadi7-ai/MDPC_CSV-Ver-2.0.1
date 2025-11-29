
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { Plus, UserPlus, Shield, User as UserIcon, Lock } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    role: UserRole.OPERATOR
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(authService.getAllUsers());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    try {
      await authService.addUser(newUser);
      setNewUser({ name: '', username: '', password: '', role: UserRole.OPERATOR });
      setIsAdding(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error adding user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-lg font-bold text-gray-800">User Management</h3>
           <p className="text-sm text-gray-500">Create accounts and assign roles for the CSV system.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-indigo-700 shadow-sm"
        >
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {isAdding && (
        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl animate-fade-in">
          <h4 className="font-semibold text-indigo-800 mb-4 flex items-center gap-2">
            <UserPlus size={18} /> New Account Details
          </h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input 
                required
                type="text" 
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Dr. Ali Rezaei"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input 
                required
                type="text" 
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="login_username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Initial Password</label>
              <input 
                required
                type="password" 
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select 
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value={UserRole.OPERATOR}>{UserRole.OPERATOR}</option>
                <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
               <button 
                 type="button" 
                 onClick={() => setIsAdding(false)}
                 className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
               >
                 Cancel
               </button>
               <button 
                 type="submit"
                 className="px-6 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
               >
                 Create User
               </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">User Info</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Username</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">User ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className={`p-2 rounded-full ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                    {user.role === UserRole.ADMIN ? <Shield size={16} /> : <UserIcon size={16} />}
                  </div>
                  <span className="font-medium text-gray-800">{user.name}</span>
                </td>
                <td className="px-6 py-4 text-gray-600 font-mono text-xs">{user.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs">{user.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
