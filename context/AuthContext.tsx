import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { TeamMember } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: TeamMember | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1 hour in milliseconds
  const SESSION_TIMEOUT = 60 * 60 * 1000;

  const logout = () => {
    setUser(null);
    localStorage.removeItem('taskflow_user');
    localStorage.removeItem('taskflow_last_activity');
  };

  const updateActivity = () => {
    const now = Date.now();
    localStorage.setItem('taskflow_last_activity', now.toString());
  };

  useEffect(() => {
    const checkSession = async () => {
      const storedUser = localStorage.getItem('taskflow_user');
      const lastActivity = localStorage.getItem('taskflow_last_activity');

      if (storedUser && lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);

        if (timeSinceLastActivity > SESSION_TIMEOUT) {
          // Session expired
          logout();
        } else {
          // Verify user still exists in DB
          const members = await api.getMembers();
          const parsed = JSON.parse(storedUser);
          const freshUser = members.find(m => m.id === parsed.id);

          if (freshUser) {
            setUser(freshUser);
            updateActivity(); // Refresh activity on load
          } else {
            // User no longer exists in DB
            logout();
          }
        }
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  // Activity Monitor
  useEffect(() => {
    if (!user) return;

    // Check for timeout every minute
    const intervalId = setInterval(() => {
      const lastActivity = localStorage.getItem('taskflow_last_activity');
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceLastActivity > SESSION_TIMEOUT) {
          logout();
        }
      }
    }, 60000); // Check every 1 minute

    // Throttle activity updates to persist storage
    let lastUpdate = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      // Only update storage if more than 1 minute has passed since last write
      // preventing massive disk I/O on every mouse move
      if (now - lastUpdate > 60000) {
        updateActivity();
        lastUpdate = now;
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [user]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const members = await api.getMembers();
      const foundUser = members.find(m => m.email === email);

      if (foundUser && foundUser.password === pass) {
        setUser(foundUser);
        localStorage.setItem('taskflow_user', JSON.stringify(foundUser));
        updateActivity();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login failed", e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};