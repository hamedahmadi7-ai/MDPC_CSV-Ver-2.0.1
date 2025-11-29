
import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Lock, User, Loader2, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Customization State
  const DEFAULT_BG = "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80";
  const [bgImage, setBgImage] = useState<string>(DEFAULT_BG);

  useEffect(() => {
    // Load Custom Background
    const savedBg = localStorage.getItem('pharma_login_bg');
    if (savedBg) {
      setBgImage(savedBg);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authService.login(username, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50">
      
      {/* Background Image - Cover */}
      <div 
        className="absolute inset-0 z-0 bg-no-repeat transition-all duration-700 ease-in-out"
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Light Overlay */}
      <div 
        className="absolute inset-0 z-0 backdrop-blur-[1px]"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
      ></div>

      {/* Login Card */}
      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/50 relative z-10 animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          {/* Logo Section - Bold MDPC Text Only */}
          <div className="mb-4 text-center">
             <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-800 to-indigo-700 drop-shadow-sm tracking-tight leading-tight">MDPC</h1>
             <p className="text-xs font-bold text-gray-600 tracking-[0.2em] uppercase mt-2">Masoon Darou Co.</p>
          </div>
          
          <h2 className="text-xl font-bold text-gray-800 mt-4">PharmaCSV Validator</h2>
          <p className="text-sm text-gray-500 mt-1">Authorized Access Only (GAMP 5)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100">
               <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
               {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-800 to-indigo-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl hover:opacity-95 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                Sign In <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
          <p className="font-semibold text-gray-700">Masoon Darou Biotechnology</p>
          <p className="mt-1">Computer System Validation Platform v1.2.0</p>
        </div>
      </div>
    </div>
  );
};
