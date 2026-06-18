// ============================================
// 全局状态管理 - React Context
// ============================================

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Tool, Booking, Notice, User, BookingStatus } from '@/types';
import { TOOLS } from '@/data/tools';
import { BOOKINGS } from '@/data/bookings';
import { NOTICES } from '@/data/notices';

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
  const [tools, setTools] = useState<Tool[]>(TOOLS);
  const [bookings, setBookings] = useState<Booking[]>(BOOKINGS);
  const [notices, setNotices] = useState<Notice[]>(NOTICES);
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);

  const isAdmin = currentUser.role === 'admin';

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
