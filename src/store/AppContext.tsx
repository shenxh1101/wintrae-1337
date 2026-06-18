// ============================================
// 全局状态管理 - React Context
// ============================================

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import { Tool, Booking, Notice, User, BookingStatus } from '@/types';
import { TOOLS } from '@/data/tools';
import { BOOKINGS } from '@/data/bookings';
import { NOTICES } from '@/data/notices';

const STORAGE_KEYS = {
  tools: 'community_tools',
  bookings: 'community_bookings',
  notices: 'community_notices',
  user: 'community_user',
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = Taro.getStorageSync(key);
    if (raw) return JSON.parse(raw as string) as T;
  } catch (e) {
    console.warn('[AppContext] 读取localStorage失败:', key, e);
  }
  return fallback;
}

function saveStorage(key: string, data: unknown) {
  try {
    Taro.setStorageSync(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[AppContext] 写入localStorage失败:', key, e);
  }
}

interface AppState {
  tools: Tool[];
  bookings: Booking[];
  notices: Notice[];
  currentUser: User;
  isAdmin: boolean;
}

interface AppContextValue extends AppState {
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  cancelBooking: (bookingId: string) => void;
  updateBookingStatus: (bookingId: string, status: BookingStatus, extra?: Partial<Booking>) => void;
  addNotice: (notice: Omit<Notice, 'id' | 'createdAt'>) => void;
  updateTool: (toolId: string, patch: Partial<Tool>) => void;
  markNoticeRead: (noticeId: string) => void;
  toggleRole: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const defaultUser: User = {
  id: 'u001',
  name: '张*明',
  phone: '138****5678',
  role: 'resident',
  address: '阳光社区1号楼3单元502室',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tools, setTools] = useState<Tool[]>(() => loadStorage(STORAGE_KEYS.tools, TOOLS));
  const [bookings, setBookings] = useState<Booking[]>(() => loadStorage(STORAGE_KEYS.bookings, BOOKINGS));
  const [notices, setNotices] = useState<Notice[]>(() => loadStorage(STORAGE_KEYS.notices, NOTICES));
  const [currentUser, setCurrentUser] = useState<User>(() => loadStorage(STORAGE_KEYS.user, defaultUser));

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => { saveStorage(STORAGE_KEYS.tools, tools); }, [tools]);
  useEffect(() => { saveStorage(STORAGE_KEYS.bookings, bookings); }, [bookings]);
  useEffect(() => { saveStorage(STORAGE_KEYS.notices, notices); }, [notices]);
  useEffect(() => { saveStorage(STORAGE_KEYS.user, currentUser); }, [currentUser]);

  const addBooking = useCallback((bookingData: Omit<Booking, 'id' | 'createdAt'>) => {
    const newBooking: Booking = {
      ...bookingData,
      id: `bk-${Date.now()}`,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    };
    setBookings(prev => [newBooking, ...prev]);
    console.log('[AppContext] addBooking:', newBooking);
  }, []);

  const cancelBooking = useCallback((bookingId: string) => {
    setBookings(prev =>
      prev.map(b =>
        b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b
      )
    );
    console.log('[AppContext] cancelBooking:', bookingId);
  }, []);

  const updateBookingStatus = useCallback(
    (bookingId: string, status: BookingStatus, extra?: Partial<Booking>) => {
      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? {
                ...b,
                status,
                ...extra,
                returnedAt:
                  status === 'returned'
                    ? new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
                    : b.returnedAt,
              }
            : b
        )
      );
      console.log('[AppContext] updateBookingStatus:', bookingId, status, extra);
    },
    []
  );

  const markNoticeRead = useCallback((noticeId: string) => {
    setNotices(prev =>
      prev.map(n => (n.id === noticeId ? { ...n, isRead: true } : n))
    );
  }, []);

  const updateTool = useCallback((toolId: string, patch: Partial<Tool>) => {
    setTools(prev => prev.map(t => (t.id === toolId ? { ...t, ...patch } : t)));
    console.log('[AppContext] updateTool:', toolId, patch);
  }, []);

  const addNotice = useCallback((noticeData: Omit<Notice, 'id' | 'createdAt'>) => {
    const newNotice: Notice = {
      ...noticeData,
      id: `nt-${Date.now()}`,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    };
    setNotices(prev => [newNotice, ...prev]);
    console.log('[AppContext] addNotice:', newNotice);

    if (newNotice.type === 'maintenance' && newNotice.relatedToolId) {
      const toolId = newNotice.relatedToolId;
      const patch: Partial<Tool> = {
        maintenanceNotice: newNotice.content,
        maintenanceStartDate: newNotice.maintenanceStartDate,
        maintenanceEndDate: newNotice.maintenanceEndDate,
        status: 'maintenance',
      };
      setTools(prev => prev.map(t => (t.id === toolId ? { ...t, ...patch } : t)));
      console.log('[AppContext] 维护公告同步到工具:', toolId, patch);

      if (newNotice.maintenanceStartDate && newNotice.maintenanceEndDate) {
        const start = newNotice.maintenanceStartDate;
        const end = newNotice.maintenanceEndDate;
        setBookings(prev => prev.map(b => {
          if (b.toolId !== toolId) return b;
          if (b.status === 'cancelled' || b.status === 'returned') return b;
          if (b.endDate < start || b.startDate > end) return b;
          return {
            ...b,
            affectedByMaintenance: true,
            relatedNoticeId: newNotice.id,
          };
        }));
        console.log('[AppContext] 标记受影响的预约:', toolId, start, end);
      }
    }

    return newNotice;
  }, []);

  const toggleRole = useCallback(() => {
    setCurrentUser(prev => ({
      ...prev,
      role: prev.role === 'resident' ? 'admin' : 'resident',
    }));
  }, []);

  const value: AppContextValue = {
    tools,
    bookings,
    notices,
    currentUser,
    isAdmin,
    addBooking,
    cancelBooking,
    updateBookingStatus,
    addNotice,
    updateTool,
    markNoticeRead,
    toggleRole,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
