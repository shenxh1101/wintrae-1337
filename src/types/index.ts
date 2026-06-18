// ============================================
// 全局类型定义
// ============================================

// 工具类型
export type ToolCategory = 'power' | 'ladder' | 'electronic' | 'cleaning' | 'gardening' | 'kitchen' | 'other';

// 工具状态
export type ToolStatus = 'available' | 'borrowed' | 'maintenance' | 'reserved';

// 工具接口
export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  categoryName: string;
  image: string;
  description: string;
  deposit: number;
  maxBorrowDays: number;
  location: string;
  status: ToolStatus;
  rules: string[];
  accessories: Accessory[];
  imageIds: number[];
  currentHolder?: string;
  availableDates?: string[];
}

// 配件接口
export interface Accessory {
  id: string;
  name: string;
  required: boolean;
}

// 预约状态
export type BookingStatus = 'pending' | 'approved' | 'borrowed' | 'returned' | 'cancelled' | 'overdue';

// 借用时段
export type TimeSlotType = 'morning' | 'afternoon' | 'evening' | 'allday';

export const TIME_SLOT_LABELS: Record<TimeSlotType, { label: string; icon: string; time: string }> = {
  morning: { label: '上午', icon: '🌅', time: '08:00-12:00' },
  afternoon: { label: '下午', icon: '☀️', time: '12:00-18:00' },
  evening: { label: '晚上', icon: '🌙', time: '18:00-22:00' },
  allday: { label: '全天', icon: '📅', time: '08:00-22:00' },
};

// 预约接口
export interface Booking {
  id: string;
  toolId: string;
  toolName: string;
  toolImage: string;
  toolCategory: string;
  userId: string;
  userName: string;
  userPhone: string;
  startDate: string;
  endDate: string;
  timeSlot?: TimeSlotType;
  purpose: string;
  status: BookingStatus;
  deposit: number;
  createdAt: string;
  accessoriesChecked?: boolean[];
  conditionPhotos?: string[];
  returnCondition?: 'good' | 'damaged' | 'lost';
  returnNote?: string;
  returnedAt?: string;
}

// 公告类型
export type NoticeType = 'maintenance' | 'overdue' | 'tutorial' | 'general';

// 公告接口
export interface Notice {
  id: string;
  title: string;
  type: NoticeType;
  typeName: string;
  content: string;
  summary: string;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
  isRead?: boolean;
  relatedToolId?: string;
  relatedToolName?: string;
}

// 用户接口
export interface User {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  role: 'resident' | 'admin';
  address: string;
}

// 日历时段
export interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

// 筛选条件
export interface FilterOptions {
  category?: ToolCategory | 'all';
  location?: string;
  date?: string;
  dateEnd?: string;
  timeSlot?: TimeSlotType | 'all';
  keyword?: string;
}
