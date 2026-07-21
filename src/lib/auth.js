import { dbOperations } from './db';

const AUTH_KEY = 'malwa_crm_auth';
const SESSION_KEY = 'malwa_crm_session';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const authService = {
  async signUp({ email, password, name, role = 'Accountant' }) {
    try {
      // Removed uniqueness check - allow duplicate usernames
      
      const hashedPassword = await hashPassword(password);
      const userId = generateUUID();

      const user = await dbOperations.insert('users', {
        id: userId,
        email,
        password: hashedPassword,
        created_at: new Date().toISOString()
      });

      const isSuperAdmin = role === 'Super Admin' || role === 'Admin' || role === 'Director';

      await dbOperations.insert('profiles', {
        id: userId,
        name: name || email,
        email,
        role,
        permissions: {
          dashboard: 'full',
          jobs: 'full',
          customer: 'full',
          vendors: 'full',
          labour: 'full',
          supplier: 'full',
          inventory: 'full',
          accounts: 'full',
          summary: 'full',
          dailyTasks: 'full',
          settings: isSuperAdmin ? 'full' : 'none'
        },
        status: 'Active'
      });

      return { user: { id: userId, email }, error: null };
    } catch (error) {
      return { user: null, error };
    }
  },

  async signIn({ email, password }) {
    try {
      console.log('Login attempt for:', email);
      
      // SPECIAL CASE: Super Admin hardcoded credentials
      const superAdminCredentials = [
        { email: 'malwatrolley@gmail.com', password: 'Malwa822', name: 'Malwa Trolley', role: 'Super Admin' },
        { email: 'Shahidmultaniii', password: 'S#d_8224', name: 'Shahid Admin', role: 'Super Admin' }
      ];
      
      const superAdmin = superAdminCredentials.find(cred => cred.email === email && cred.password === password);
      
      if (superAdmin) {
        console.log('✅ [AUTH] Super Admin login detected');
        
        // Create/update super admin profile
        const superAdminId = 'super-admin-' + email.split('@')[0].toLowerCase();
        
        // Check if super admin exists in database
        let existingUser = await dbOperations.getById('users', superAdminId);
        
        if (!existingUser) {
          // Create super admin user
          const hashedPassword = await hashPassword(password);
          await dbOperations.insert('users', {
            id: superAdminId,
            email: email,
            password: hashedPassword,
            created_at: new Date().toISOString()
          });
          
          await dbOperations.insert('profiles', {
            id: superAdminId,
            name: superAdmin.name,
            email: email,
            role: 'Super Admin',
            status: 'Active',
            permissions: ['*'], // Wildcard - all permissions
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        const profile = await dbOperations.getById('profiles', superAdminId);
        
        const session = {
          user: {
            id: superAdminId,
            email: email
          },
          profile,
          expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
          persistent: true
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        
        console.log('✅ [AUTH] Super Admin login successful');
        return { user: session.user, profile, error: null };
      }
      
      // Regular user login flow
      // First try to find user by username (stored in users.email field)
      let users = await dbOperations.getByIndex('users', 'email', email);
      
      // If not found, search by actual email in profiles table
      if (users.length === 0) {
        console.log('Not found by username, searching by email in profiles...');
        const profiles = await dbOperations.getAll('profiles');
        const profileByEmail = profiles.find(p => p.email === email);
        
        if (profileByEmail) {
          // Get user by profile ID
          const user = await dbOperations.getById('users', profileByEmail.id);
          if (user) {
            users = [user];
          }
        }
      }
      
      console.log('Users found:', users.length);

      if (users.length === 0) {
        console.error('User not found');
        throw new Error('Invalid username/email or password');
      }

      const user = users[0];
      const hashedPassword = await hashPassword(password);

      console.log('🔐 [AUTH] Password Debug:', {
        inputEmail: email,
        inputPassword: password,
        hashedInput: hashedPassword,
        storedHash: user.password,
        match: user.password === hashedPassword
      });

      if (user.password !== hashedPassword) {
        console.error('Password mismatch');
        throw new Error('Invalid email or password');
      }

      const profile = await dbOperations.getById('profiles', user.id);
      console.log('📋 [AUTH] Profile loaded:', {
        id: profile?.id,
        name: profile?.name,
        email: profile?.email,
        role: profile?.role,
        status: profile?.status,
        hasPermissions: !!profile?.permissions,
        permissionsType: typeof profile?.permissions
      });

      // Check if user is active
      if (profile?.status !== 'Active') {
        console.error('User account is not active:', profile?.status);
        throw new Error('Your account is not active. Please contact administrator.');
      }
      
      // CRITICAL FIX: Ensure role exists, default to 'Employee' if missing
      if (!profile?.role) {
        console.warn('⚠️ [AUTH] Profile missing role, defaulting to Employee');
        await dbOperations.update('profiles', user.id, {
          ...profile,
          role: 'Employee',
          updated_at: new Date().toISOString()
        });
        profile.role = 'Employee';
      }

      // Update last login timestamp
      try {
        await dbOperations.update('profiles', user.id, {
          ...profile,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Also update user's individual JSON file in backend
        if (window.electron?.fs?.updateUserLogin) {
          await window.electron.fs.updateUserLogin(user.id);
        }
      } catch (updateError) {
        console.warn('Failed to update last login:', updateError);
        // Don't fail login if timestamp update fails
      }

      const session = {
        user: {
          id: user.id,
          email: user.email
        },
        profile,
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year expiry
        persistent: true
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      return { user: session.user, profile, error: null };
    } catch (error) {
      console.error('Login failed:', error.message);
      return { user: null, profile: null, error };
    }
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    return { error: null };
  },

  getSession() {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;

    try {
      const session = JSON.parse(sessionData);
      if (session.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  },

  async getUser() {
    const session = this.getSession();
    if (!session) return null;

    return session.user;
  },

  async getProfile() {
    const session = this.getSession();
    if (!session) return null;

    const profile = await dbOperations.getById('profiles', session.user.id);
    return profile;
  },

  isAuthenticated() {
    return this.getSession() !== null;
  },

  onAuthStateChange(callback) {
    const checkAuth = () => {
      const session = this.getSession();
      if (session) {
        callback('SIGNED_IN', session);
      } else {
        callback('SIGNED_OUT', null);
      }
    };

    checkAuth();

    const interval = setInterval(checkAuth, 1000);

    return {
      unsubscribe: () => clearInterval(interval)
    };
  }
};

export const seedDefaultUser = async () => {
  try {
    console.log('🔍 Checking for existing users...');
    const userCount = await dbOperations.count('users');
    console.log('📊 User count:', userCount);

    if (userCount > 0) {
      console.log('ℹ️ Users already exist, skipping seed');
      return;
    }

    // Simplified initialization without immediate async operations
    // Super Admin will be created on first successful login

    if (result.error) {
      console.error('❌ Failed to create Super Admin:', result.error);
    } else {
      console.log('✅ Super Admin setup completed');
    }
  } catch (error) {
    console.error('❌ Error seeding super admin:', error);
  }
};
