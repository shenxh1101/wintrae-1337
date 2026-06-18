// ============================================
// 工具列表页 (TabBar 首页)
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useApp } from '@/store/AppContext';
import { TOOL_CATEGORIES, TOOL_LOCATIONS } from '@/data/tools';
import ToolCard from '@/components/ToolCard';
import EmptyState from '@/components/EmptyState';
import SectionHeader from '@/components/SectionHeader';
import { TimeSlotType, TIME_SLOT_LABELS } from '@/types';
import styles from './index.module.scss';

const TIME_SLOTS: TimeSlotType[] = ['morning', 'afternoon', 'evening', 'allday'];

const isTimeSlotConflict = (filterSlot: TimeSlotType, bookingSlot?: TimeSlotType): boolean => {
  if (!bookingSlot) return true;
  if (filterSlot === 'allday' || bookingSlot === 'allday') return true;
  return filterSlot === bookingSlot;
};

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = dayjs(start);
  const e = dayjs(end);
  let cur = s;
  while (cur.isBefore(e) || cur.isSame(e, 'day')) {
    dates.push(cur.format('YYYY-MM-DD'));
    cur = cur.add(1, 'day');
  }
  return dates;
}

const ToolsPage: React.FC = () => {
  const { tools, bookings, currentUser, isAdmin, toggleRole, notices } = useApp();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeLocation, setActiveLocation] = useState<string>('全部位置');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [activeTimeSlot, setActiveTimeSlot] = useState<TimeSlotType | ''>('');

  const hasDateFilter = !!(dateStart || dateEnd || activeTimeSlot);

  const availableCount = useMemo(
    () => tools.filter(t => t.status === 'available').length,
    [tools]
  );
  const unreadNoticeCount = useMemo(
    () => notices.filter(n => !n.isRead && n.priority === 'high').length,
    [notices]
  );

  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
      if (activeCategory !== 'all' && tool.category !== activeCategory) {
        return false;
      }
      if (activeLocation !== '全部位置' && tool.location !== activeLocation) {
        return false;
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        if (
          !tool.name.toLowerCase().includes(kw) &&
          !tool.description.toLowerCase().includes(kw) &&
          !tool.categoryName.includes(kw)
        ) {
          return false;
        }
      }
      if (dateStart || dateEnd) {
        const rangeStart = dateStart || dateEnd;
        const rangeEnd = dateEnd || dateStart;
        const available = tool.availableDates || [];
        const requiredDates = getDateRange(rangeStart, rangeEnd);
        const allAvailable = requiredDates.every(d => available.includes(d));
        if (!allAvailable) return false;
        const hasConflict = bookings.some(booking => {
          if (booking.toolId !== tool.id) return false;
          if (booking.status === 'cancelled' || booking.status === 'returned') return false;
          if (booking.endDate < rangeStart || booking.startDate > rangeEnd) return false;
          if (!activeTimeSlot) {
            return true;
          }
          return isTimeSlotConflict(activeTimeSlot, booking.timeSlot);
        });
        if (hasConflict) return false;
      } else if (activeTimeSlot) {
        const hasConflict = bookings.some(booking => {
          if (booking.toolId !== tool.id) return false;
          if (booking.status === 'cancelled' || booking.status === 'returned') return false;
          return isTimeSlotConflict(activeTimeSlot, booking.timeSlot);
        });
        if (hasConflict) return false;
      }
      return true;
    });
  }, [tools, bookings, activeCategory, activeLocation, searchKeyword, dateStart, dateEnd, activeTimeSlot]);

  const handleLocationClick = () => {
    Taro.showActionSheet({
      itemList: TOOL_LOCATIONS,
      success: res => {
        setActiveLocation(TOOL_LOCATIONS[res.tapIndex]);
        console.log('[ToolsPage] 选择位置:', TOOL_LOCATIONS[res.tapIndex]);
      },
    });
  };

  const handleDateStartChange = (e: any) => {
    const value = e.detail.value;
    setDateStart(value);
    if (dateEnd && value > dateEnd) {
      setDateEnd(value);
    }
  };

  const handleDateEndChange = (e: any) => {
    const value = e.detail.value;
    setDateEnd(value);
    if (dateStart && value < dateStart) {
      setDateStart(value);
    }
  };

  const handleClearDateFilter = () => {
    setDateStart('');
    setDateEnd('');
    setActiveTimeSlot('');
  };

  const handleRoleToggle = () => {
    Taro.showModal({
      title: '切换角色',
      content: isAdmin ? '切换为居民模式吗？' : '切换为管理员模式吗？',
      success: res => {
        if (res.confirm) {
          toggleRole();
          Taro.showToast({
            title: isAdmin ? '已切换为居民' : '已切换为管理员',
            icon: 'success',
          });
        }
      },
    });
  };

  return (
    <ScrollView
      className={styles.page}
      scrollY
      refresherEnabled
      onRefresherRefresh={() => {
        Taro.showToast({ title: '刷新成功', icon: 'success' });
      }}
    >
      <View className={styles.header}>
        <View className={styles.greeting}>
          <View className={styles.greetingLeft}>
            <Text className={styles.hello}>👋 你好，欢迎回来</Text>
            <Text className={styles.title}>{currentUser.name}</Text>
            <View className={styles.roleBadge} onClick={handleRoleToggle}>
              {isAdmin ? '🛡 管理员模式' : '👤 居民模式'}
            </View>
          </View>
          {unreadNoticeCount > 0 && (
            <View
              style={{
                position: 'relative',
                fontSize: '48rpx',
                color: '#fff',
                padding: '8rpx',
              }}
              onClick={() => Taro.switchTab({ url: '/pages/notices/index' })}
            >
              🔔
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  minWidth: '32rpx',
                  height: '32rpx',
                  background: '#FF4D4F',
                  borderRadius: '16rpx',
                  fontSize: '20rpx',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 8rpx',
                }}
              >
                {unreadNoticeCount}
              </View>
            </View>
          )}
        </View>

        <View className={styles.searchBox}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索工具名称、描述..."
            placeholderStyle="color: #9CA3AF"
            value={searchKeyword}
            onInput={e => setSearchKeyword(e.detail.value)}
            confirmType="search"
          />
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{tools.length}</Text>
            <Text className={styles.statLabel}>共享工具</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{availableCount}</Text>
            <Text className={styles.statLabel}>可借用</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{TOOL_CATEGORIES.length - 1}</Text>
            <Text className={styles.statLabel}>工具分类</Text>
          </View>
        </View>
      </View>

      <View className="pageContainer">
        <View className={styles.section}>
          <SectionHeader
            title="工具分类"
            subtitle={`共${filteredTools.length}件`}
          />
          <ScrollView className={styles.categoryScroll} scrollX>
            {TOOL_CATEGORIES.map(cat => (
              <View
                key={cat.key}
                className={classnames(
                  styles.categoryChip,
                  activeCategory === cat.key && styles.active
                )}
                onClick={() => {
                  setActiveCategory(cat.key);
                  console.log('[ToolsPage] 选择分类:', cat.name);
                }}
              >
                {cat.name}
              </View>
            ))}
          </ScrollView>

          <View
            className={styles.locationSelect}
            onClick={handleLocationClick}
          >
            <Text className={styles.locationIcon}>📍</Text>
            <Text>{activeLocation}</Text>
            <Text className={styles.locationArrow}>▼</Text>
          </View>

          <View className={styles.dateRow}>
            <Picker
              mode="date"
              value={dateStart}
              start="2020-01-01"
              end="2035-12-31"
              onChange={handleDateStartChange}
            >
              <View
                className={classnames(styles.dateInput, dateStart && styles.dateActive)}
              >
                <Text className={styles.dateIcon}>📅</Text>
                <Text className={classnames(!dateStart && styles.datePlaceholder)}>
                  {dateStart || '开始日期'}
                </Text>
              </View>
            </Picker>
            <Text className={styles.dateSeparator}>~</Text>
            <Picker
              mode="date"
              value={dateEnd}
              start={dateStart || '2020-01-01'}
              end="2035-12-31"
              onChange={handleDateEndChange}
            >
              <View
                className={classnames(styles.dateInput, dateEnd && styles.dateActive)}
              >
                <Text className={styles.dateIcon}>📅</Text>
                <Text className={classnames(!dateEnd && styles.datePlaceholder)}>
                  {dateEnd || '结束日期'}
                </Text>
              </View>
            </Picker>
          </View>

          <View className={styles.timeSlotRow}>
            {TIME_SLOTS.map(slot => (
              <View
                key={slot}
                className={classnames(
                  styles.timeSlotChip,
                  activeTimeSlot === slot && styles.active
                )}
                onClick={() => {
                  setActiveTimeSlot(prev => (prev === slot ? '' : slot));
                }}
              >
                <Text>{TIME_SLOT_LABELS[slot].icon}</Text>
                <Text className={styles.timeSlotLabel}>{TIME_SLOT_LABELS[slot].label}</Text>
              </View>
            ))}
          </View>

          {hasDateFilter && (
            <View className={styles.clearDateRow}>
              <Text className={styles.clearDateLink} onClick={handleClearDateFilter}>
                清除日期筛选
              </Text>
            </View>
          )}
        </View>

        <View className={styles.section}>
          <SectionHeader
            title="可用工具"
            subtitle={searchKeyword ? `"${searchKeyword}"的搜索结果` : ''}
          />
          <View className={styles.listWrap}>
            {filteredTools.length > 0 ? (
              filteredTools.map(tool => (
                <ToolCard key={tool.id} tool={tool} />
              ))
            ) : (
              <EmptyState
                icon="🔧"
                title="暂无符合条件的工具"
                desc="试试调整筛选条件或搜索其他关键词"
              />
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default ToolsPage;
