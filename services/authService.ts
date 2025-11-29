
import { User, UserRole } from '../types';

const USERS_KEY = 'pharma_csv_users';
const CURRENT_USER_KEY = 'pharma_csv_current_user';

// Initialize default admin if no users exist
const initUsers = () => {
  const users = localStorage.getItem(USERS_KEY);
  if (!users) {
    const defaultAdmin: User = {
      id: 'admin-001',
      name: 'System Administrator',
      username: 'admin',
      role: UserRole.ADMIN,
      password: 'admin' // In production, use hashing
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([defaultAdmin]));
  }
};

export const authService = {
  login: async (username: string, password: string): Promise<User | null> => {
    initUsers();
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const usersData = localStorage.getItem(USERS_KEY);
    const users: User[] = usersData ? JSON.parse(usersData) : [];

    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      const safeUser = { ...user };
      delete safeUser.password; // Don't keep password in session
      safeUser.lastLogin = new Date().toISOString();
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
      return safeUser;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  getAllUsers: (): User[] => {
    initUsers();
    const usersData = localStorage.getItem(USERS_KEY);
    const users: User[] = usersData ? JSON.parse(usersData) : [];
    // Return users without passwords for display
    return users.map(u => {
      const { password, ...rest } = u;
      return rest as User;
    });
  },

  addUser: async (newUser: Partial<User>): Promise<void> => {
    const usersData = localStorage.getItem(USERS_KEY);
    const users: User[] = usersData ? JSON.parse(usersData) : [];

    if (users.find(u => u.username === newUser.username)) {
      throw new Error("Username already exists");
    }

    const user: User = {
      id: Date.now().toString(),
      name: newUser.name || 'Unknown',
      username: newUser.username!,
      password: newUser.password!,
      role: newUser.role || UserRole.OPERATOR
    };

    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  changePassword: async (userId: string, newPassword: string): Promise<void> => {
    const usersData = localStorage.getItem(USERS_KEY);
    const users: User[] = usersData ? JSON.parse(usersData) : [];
    
    // Allow users to change their own password, or Admin to change anyone's
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].password = newPassword;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else {
        throw new Error("User not found");
    }
  }
};
