
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { SystemList } from './components/SystemList';
import { SystemForm } from './components/SystemForm';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { PharmaSystem, SystemType, ValidationStage, ComplianceStatus, User, UserRole } from './types';
import { authService } from './services/authService';
import { storageService } from './services/storageService';
import { LayoutDashboard, List, PlusCircle, FlaskConical, Thermometer, Droplets, Fan, UserCircle, LogOut, Settings, Users, AlertTriangle, ArrowLeft, Code, Moon, Sun } from 'lucide-react';

// --- MOCK SYSTEM DATA ---
const INITIAL_SYSTEMS: PharmaSystem[] = [
  {
    id: '1',
    name: 'WFI-Generator-01',
    type: SystemType.WATER_SYSTEM,
    location: 'Utility Block A',
    riskLevel: 'High',
    currentStage: ValidationStage.OQ,
    status: ComplianceStatus.IN_PROGRESS,
    progress: 65,
    lastValidationDate: '2023-10-15',
    deviationsCount: 1
  },
  {
    id: '2',
    name: 'HPLC-Agilent-1260',
    type: SystemType.LAB_EQUIPMENT,
    location: 'QC Lab Main',
    riskLevel: 'Medium',
    currentStage: ValidationStage.PQ,
    status: ComplianceStatus.COMPLIANT,
    progress: 100,
    lastValidationDate: '2024-01-20',
    deviationsCount: 0
  },
  {
    id: '3',
    name: 'AHU-Cleanroom-C',
    type: SystemType.HVAC,
    location: 'Production Line 2',
    riskLevel: 'High',
    currentStage: ValidationStage.IQ,
    status: ComplianceStatus.DEVIATION,
    progress: 30,
    lastValidationDate: 'Pending',
    deviationsCount: 3
  },
  {
    id: '4',
    name: 'Cold-Storage-Mon-04',
    type: SystemType.MONITORING,
    location: 'Warehouse B',
    riskLevel: 'Medium',
    currentStage: ValidationStage.OQ,
    status: ComplianceStatus.IN_PROGRESS,
    progress: 45,
    lastValidationDate: 'Pending',
    deviationsCount: 0
  },
  {
    id: '5',
    name: 'LIMS-Software-v2',
    type: SystemType.SOFTWARE,
    location: 'Server Room 1',
    riskLevel: 'High',
    currentStage: ValidationStage.VSR,
    status: ComplianceStatus.COMPLIANT,
    progress: 95,
    lastValidationDate: '2023-12-05',
    deviationsCount: 0
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'systems' | 'users'>('dashboard');
  const [systems, setSystems] = useState<PharmaSystem[]>(INITIAL_SYSTEMS);
  const [isAdding, setIsAdding] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(false);
  
  // Dashboard Drill-down state
  const [activeFilters, setActiveFilters] = useState<{type?: string, status?: string, risk?: string}>({});

  // Check auth and theme on load
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setIsAuthChecking(false);

    // Theme Check
    const isDark = localStorage.getItem('mdpc_theme') === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('mdpc_theme', newMode ? 'dark' : 'light');
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const initiateLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = (saveChanges: boolean) => {
    if (currentUser) {
      if (saveChanges) {
        // "Yes, save changes"
        console.log("Saving user profile data...");
      } else {
        // "No, discard changes"
        storageService.clearUserDrafts(currentUser.id);
      }
    }

    authService.logout();
    setCurrentUser(null);
    setIsLogoutConfirmOpen(false);
  };

  const handleAddSystem = (newSystem: PharmaSystem) => {
    setSystems([newSystem, ...systems]);
    setIsAdding(false);
    setActiveTab('systems');
  };

  const handleUpdateProgress = (id: string, newProgress: number) => {
    setSystems(systems.map(sys => {
      if (sys.id === id) {
        let newStatus = sys.status;
        if (newProgress === 100) newStatus = ComplianceStatus.COMPLIANT;
        else if (newProgress > 0 && newProgress < 100) {
           if (sys.status !== ComplianceStatus.DEVIATION) {
             newStatus = ComplianceStatus.IN_PROGRESS;
           }
        }
        else if (newProgress === 0) newStatus = ComplianceStatus.NOT_STARTED;
        return { ...sys, progress: newProgress, status: newStatus };
      }
      return sys;
    }));
  };

  // Handle drill-down from Dashboard
  const handleDrillDown = (type?: string, status?: string, risk?: string) => {
    setActiveFilters({ type, status, risk });
    setActiveTab('systems');
  };

  // Clear filters and reset states when switching to tabs manually
  const handleTabChange = (tab: 'dashboard' | 'systems' | 'users') => {
    if (tab !== 'systems') {
        setIsAdding(false);
    }
    if (tab === 'dashboard' || tab === 'users') {
      setActiveFilters({});
    }
    setActiveTab(tab);
  };

  if (isAuthChecking) return null;

  if (!currentUser) {
    return <Login onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col md:flex-row font-sans relative transition-colors duration-300">
      
      {/* Settings / Password Modal */}
      {isChangePasswordOpen && currentUser && (
        <ChangePasswordModal 
          userId={currentUser.id} 
          userRole={currentUser.role}
          onClose={() => setIsChangePasswordOpen(false)} 
        />
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm relative">
             <div className="flex flex-col items-center text-center">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full text-yellow-600 dark:text-yellow-500 mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Unsaved Session Data</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Do you want to save changes on your user-profile? <br/>
                  (Pending inspection forms and uploaded files will be drafted).
                </p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => confirmLogout(false)}
                    className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium"
                  >
                    No, Discard
                  </button>
                  <button 
                    onClick={() => confirmLogout(true)}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm"
                  >
                    Yes, Save
                  </button>
                </div>
                <button 
                   onClick={() => setIsLogoutConfirmOpen(false)}
                   className="mt-4 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex-shrink-0 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-700/50 flex flex-col items-center text-center">
           {/* Text Logo Replacement */}
           <div className="mb-4">
             <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-purple-400 to-blue-300 tracking-tighter">MDPC</h1>
           </div>
           <h1 className="text-sm font-bold">PharmaCSV Validator</h1>
           <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Computer System Validation</p>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          <button 
            onClick={() => handleTabChange('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          
          <button 
            onClick={() => handleTabChange('systems')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'systems' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
          >
            <List size={20} />
            Systems List
          </button>

          {currentUser.role === UserRole.ADMIN && (
            <button 
              onClick={() => handleTabChange('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <Users size={20} />
              User Management
            </button>
          )}

          <div className="mt-8 pt-8 border-t border-slate-700/50">
             <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-3">Asset Categories</p>
             <div className="px-4 space-y-4 text-sm text-slate-400">
                <button 
                  onClick={() => handleDrillDown(SystemType.WATER_SYSTEM)}
                  className="w-full flex items-center gap-3 group cursor-pointer hover:text-blue-300 transition-colors text-left"
                >
                  <Droplets size={28} className="text-blue-500 group-hover:text-blue-400 animate-[bounce_1s_infinite]"/> 
                  Water Systems
                </button>
                <button 
                  onClick={() => handleDrillDown(SystemType.HVAC)}
                  className="w-full flex items-center gap-3 group cursor-pointer hover:text-cyan-300 transition-colors text-left"
                >
                  <Fan size={28} className="text-cyan-500 group-hover:text-cyan-400 animate-[spin_3s_linear_infinite]"/> 
                  HVAC
                </button>
                <button 
                  onClick={() => handleDrillDown(SystemType.LAB_EQUIPMENT)}
                  className="w-full flex items-center gap-3 group cursor-pointer hover:text-purple-300 transition-colors text-left"
                >
                  <div className="relative">
                    <FlaskConical size={28} className="text-purple-500 group-hover:text-purple-400"/> 
                    {/* Real Bubbles animation for Lab - From Inside Bulb */}
                    <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-purple-300 rounded-full opacity-0" style={{ animation: 'bubbleFloat 2s infinite ease-in' }}></div>
                    <div className="absolute bottom-3 left-4 w-1 h-1 bg-purple-200 rounded-full opacity-0" style={{ animation: 'bubbleFloat 2.5s infinite 0.8s ease-in' }}></div>
                    <div className="absolute bottom-2 left-2 w-1 h-1 bg-purple-200 rounded-full opacity-0" style={{ animation: 'bubbleFloat 1.8s infinite 1.2s ease-in' }}></div>
                  </div>
                  Lab (HPLC/TOC)
                </button>
                <button 
                  onClick={() => handleDrillDown(SystemType.MONITORING)}
                  className="w-full flex items-center gap-3 group cursor-pointer hover:text-rose-300 transition-colors text-left"
                >
                  <Thermometer size={28} className="text-rose-500 group-hover:text-rose-400 animate-[pulse_1s_infinite]"/> 
                  Monitoring
                </button>
                <button 
                  onClick={() => handleDrillDown(SystemType.SOFTWARE)}
                  className="w-full flex items-center gap-3 group cursor-pointer hover:text-green-300 transition-colors text-left"
                >
                  <Code size={28} className="text-green-500 group-hover:text-green-400 animate-pulse"/> 
                  GAMP 5 Software
                </button>
             </div>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-700/50">
           {/* Theme Toggle */}
           <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-xs text-slate-500 font-medium">Appearance</span>
              <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Toggle Dark Mode"
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
           </div>

           <div className="flex items-center gap-3 mb-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${currentUser.role === UserRole.ADMIN ? 'bg-purple-600' : 'bg-green-600'}`}>
               <UserCircle size={24} />
             </div>
             <div>
               <p className="text-sm font-semibold truncate w-32" title={currentUser.name}>{currentUser.name}</p>
               <p className="text-xs text-slate-400 truncate w-32">{currentUser.role}</p>
             </div>
           </div>
           <div className="flex gap-2">
             <button 
               onClick={() => setIsChangePasswordOpen(true)}
               className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 flex items-center justify-center gap-1 transition-colors"
             >
               <Settings size={14} /> Profile
             </button>
             <button 
               onClick={initiateLogout}
               className="flex-1 px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded text-xs flex items-center justify-center gap-1 transition-colors"
             >
               <LogOut size={14} /> Logout
             </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6 flex-shrink-0 z-10 grid grid-cols-3 items-center transition-colors duration-300">
           
           {/* Left: Page Title */}
           <div className="flex flex-col justify-center">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                {activeTab === 'dashboard' && 'Validation Overview'}
                {activeTab === 'systems' && 'System Assets Inventory'}
                {activeTab === 'users' && 'User Administration'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'dashboard' && 'Real-time GxP compliance monitoring.'}
                {activeTab === 'systems' && 'Manage water, air, and lab equipment validation status.'}
                {activeTab === 'users' && 'Manage system access and roles.'}
              </p>
           </div>

           {/* Center: Back Button (Only for sub-pages) */}
           <div className="flex justify-center">
             {activeTab !== 'dashboard' && (
                <button 
                  onClick={() => handleTabChange('dashboard')}
                  className="px-10 py-4 text-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-full shadow-sm flex items-center gap-3 transition-transform hover:-translate-y-0.5"
                >
                  <ArrowLeft size={24} /> Back to Main
                </button>
             )}
           </div>

           {/* Right: Actions */}
           <div className="flex justify-end items-center gap-3">
             {activeTab === 'systems' && !isAdding && (
               <button 
                 onClick={() => setIsAdding(true)}
                 className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-colors"
               >
                 <PlusCircle size={20} /> Add System
               </button>
             )}
           </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 relative scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
          {activeTab === 'dashboard' && <Dashboard systems={systems} onDrillDown={handleDrillDown} />}
          
          {activeTab === 'systems' && (
            isAdding ? (
              <SystemForm onAdd={handleAddSystem} onCancel={() => setIsAdding(false)} />
            ) : (
              <SystemList 
                systems={systems} 
                currentUser={currentUser}
                onUpdateStatus={handleUpdateProgress} 
                initialFilters={activeFilters}
                onClearFilters={() => setActiveFilters({})}
                onBackToDashboard={() => handleTabChange('dashboard')}
              />
            )
          )}

          {activeTab === 'users' && <UserManagement />}
        </div>
      </main>
    </div>
  );
};

export default App;
