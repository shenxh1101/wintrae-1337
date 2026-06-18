// ============================================
// 预约日历页 (TabBar 第2页)
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useApp } from '@/store/AppContext';
import { STATUS_LABELS } from '@/data/bookings';
import StatusTag from '@/components/StatusTag';
import EmptyState from '@/components/EmptyState';
import SectionHeader from '@/components/SectionHeader';
import {
  getCalendarMatrix,
  isToday,
  isPast,
  isSameDay,
  WEEKDAYS,
  formatDate,
  formatDisplayDate,
} from '@/utils/date';
import { TIME_SLOT_LABELS } from '@/types';
import styles from './index.module.scss';

const CalendarPage: React.FC = () => {
  const { tools, bookings } = useApp();
  const today = dayjs();
  const [viewYear, setViewYear] = useState(today.year());
  const [viewMonth, setViewMonth] = useState(today.month());
  const [selectedDate, setSelectedDate] = useState<string>(today.format('YYYY-MM-DD'));
  const [selectedToolId, setSelectedToolId] = useState<string>('all');

  const calendarDates = useMemo(
    () => getCalendarMatrix(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const canPrevMonth = useMemo(() => {
    const firstDay = dayjs(`${viewYear}-${viewMonth + 1}-01`);
    return firstDay.isAfter(today.subtract(1, 'month'), 'month');
  }, [viewYear, viewMonth, today]);

  const handlePrevMonth = () => {
    if (!canPrevMonth) return;
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const hasBookingsOnDate = (date: Date): number => {
    const dateStr = formatDate(date);
    return bookings.filter(b => {
      if (selectedToolId !== 'all' && b.toolId !== selectedToolId) return false;
      const start = dayjs(b.startDate);
      const end = dayjs(b.endDate);
      const d = dayjs(dateStr);
      return (d.isSame(start, 'day') || d.isAfter(start)) &&
        (d.isSame(end, 'day') || d.isBefore(end));
    }).length;
  };

  const isDisabled = (date: Date): boolean => {
    return isPast(date) && !isToday(date);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (selectedToolId !== 'all' && b.toolId !== selectedToolId) return false;
      const start = dayjs(b.startDate);
      const end = dayjs(b.endDate);
      const d = dayjs(selectedDate);
      const inRange = (d.isSame(start, 'day') || d.isAfter(start)) &&
        (d.isSame(end, 'day') || d.isBefore(end));
      return inRange && b.status !== 'cancelled';
    });
  }, [bookings, selectedDate, selectedToolId]);

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.toolBar}>
        <View
          className={classnames(styles.toolChip, selectedToolId === 'all' && styles.active)}
          onClick={() => setSelectedToolId('all')}
        >
          全部工具
        </View>
        {tools.slice(0, 6).map(t => (
          <View
            key={t.id}
            className={classnames(styles.toolChip, selectedToolId === t.id && styles.active)}
            onClick={() => {
              setSelectedToolId(t.id);
              console.log('[CalendarPage] 选择工具:', t.name);
            }}
          >
            {t.name.length > 6 ? t.name.slice(0, 6) + '...' : t.name}
          </View>
        ))}
      </View>

      <View className={styles.calendarCard}>
        <View className={styles.calendarHeader}>
          <View
            className={classnames(styles.navBtn, !canPrevMonth && styles.disabled)}
            onClick={handlePrevMonth}
          >
            ‹
          </View>
          <Text className={styles.monthTitle}>
            {viewYear}年{viewMonth + 1}月
          </Text>
          <View className={styles.navBtn} onClick={handleNextMonth}>
            ›
          </View>
        </View>

        <View className={styles.weekdays}>
          {WEEKDAYS.map((wd, idx) => (
            <View
              key={wd}
              className={classnames(
                styles.weekday,
                (idx === 0 || idx === 6) && styles.weekend
              )}
            >
              {wd}
            </View>
          ))}
        </View>

        <View className={styles.datesGrid}>
          {calendarDates.map((date, idx) => {
            if (!date) {
              return <View key={`empty-${idx}`} className={classnames(styles.dateCell, styles.empty)} />;
            }
            const dateStr = formatDate(date);
            const bookingCount = hasBookingsOnDate(date);
            const disabled = isDisabled(date);
            return (
              <View
                key={dateStr}
                className={classnames(
                  styles.dateCell,
                  isToday(date) && styles.today,
                  isSameDay(date, selectedDate) && styles.selected,
                  bookingCount > 0 && styles.hasBooking,
                  disabled && styles.disabled
                )}
                onClick={() => {
                  if (!disabled) {
                    setSelectedDate(dateStr);
                  }
                }}
              >
                <Text className={styles.dateNum}>{dayjs(date).date()}</Text>
                {bookingCount > 0 && (
                  <View className={styles.badge}>
                    {bookingCount}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View className={styles.legend}>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.today)} />
            <Text>今天</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.selected)} />
            <Text>选中</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.booked)} />
            <Text>有预约</Text>
          </View>
        </View>
      </View>

      <View className={styles.selectedInfo}>
        <Text className={styles.selectedDate}>
          📅 {formatDisplayDate(selectedDate)}（{selectedDate}）
        </Text>
        <Text className={styles.selectedCount}>
          当日有 {filteredBookings.length} 条预约记录
        </Text>
      </View>

      <View className={styles.bookingList}>
        <SectionHeader
          title={selectedToolId === 'all' ? '当日预约详情' : '工具排期详情'}
          subtitle={filteredBookings.length > 0 ? `${filteredBookings.length}条记录` : ''}
        />
        {filteredBookings.length > 0 ? (
          filteredBookings.map(b => {
            const statusConf = STATUS_LABELS[b.status];
            return (
              <View
                key={b.id}
                className={styles.bookingItem}
                onClick={() => Taro.switchTab({ url: '/pages/records/index' })}
              >
                <View className={styles.itemImage}>
                  <Image
                    src={b.toolImage}
                    mode="aspectFill"
                    style={{ width: '100%', height: '100%' }}
                    onError={e => console.error('[CalendarPage] 图片加载失败:', b.id, e)}
                  />
                </View>
                <View className={styles.itemContent}>
                  <View className={styles.itemTop}>
                    <Text className={styles.itemName}>{b.toolName}</Text>
                    <StatusTag
                      label={statusConf.label}
                      color={statusConf.color}
                      bgColor={statusConf.bgColor}
                      size="sm"
                    />
                  </View>
                  <View className={styles.itemMeta}>
                    <View className={styles.metaLine}>
                      <Text className={styles.metaIcon}>📂</Text>
                      <Text>{b.toolCategory}</Text>
                    </View>
                    <View className={styles.metaLine}>
                      <Text className={styles.metaIcon}>📆</Text>
                      <Text>{b.startDate} 至 {b.endDate}</Text>
                    </View>
                    {b.timeSlot && (
                      <View className={styles.metaLine}>
                        <Text className={styles.metaIcon}>🕐</Text>
                        <Text>{TIME_SLOT_LABELS[b.timeSlot].icon} {TIME_SLOT_LABELS[b.timeSlot].label} {TIME_SLOT_LABELS[b.timeSlot].time}</Text>
                      </View>
                    )}
                    <View className={styles.metaLine}>
                      <Text className={styles.metaIcon}>💰</Text>
                      <Text>押金 {b.deposit}元</Text>
                    </View>
                  </View>
                  <View className={styles.itemFooter}>
                    <View className={styles.userInfo}>
                      <View className={styles.avatar}>👤</View>
                      <Text>{b.userName}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState
            icon="📋"
            title="当日暂无预约"
            desc={selectedToolId === 'all' ? '去工具列表看看有没有需要的吧' : '该工具在此日期暂无预约记录'}
            showButton
            buttonText="去浏览工具"
            onButtonClick={() => Taro.switchTab({ url: '/pages/tools/index' })}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default CalendarPage;
