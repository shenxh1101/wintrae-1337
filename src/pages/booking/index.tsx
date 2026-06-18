// ============================================
// 预约提交页
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image, Button, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useApp } from '@/store/AppContext';
import { getToolById } from '@/data/tools';
import StatusTag from '@/components/StatusTag';
import { TIME_SLOT_LABELS, TimeSlotType, Booking } from '@/types';
import styles from './index.module.scss';

const PURPOSE_TAGS = ['家庭装修', '家具组装', '维修作业', '清洁打扫', '聚会活动', '学习办公', '其他'];

const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
};

const parseDate = (str: string): Date => {
  return new Date(str.replace(/-/g, '/'));
};

const diffDays = (start: string, end: string) => {
  const s = parseDate(start).getTime();
  const e = parseDate(end).getTime();
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
};

const addDays = (baseDate: Date, days: number) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
};

const isSameDay = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

interface DayInfo {
  day: number;
  dateStr: string;
  inMonth: boolean;
  disabled: boolean;
  past: boolean;
}

const BookingPage: React.FC = () => {
  const router = useRouter();
  const { bookings, currentUser, addBooking } = useApp();

  const toolId = router.params.toolId || 'tool-001';
  const tool = useMemo(() => getToolById(toolId), [toolId]);

  const today = useMemo(() => new Date(), []);
  const [calendarDate, setCalendarDate] = useState(() => new Date(today));

  const defaultStart = formatDate(today);
  const defaultEnd = formatDate(addDays(today, Math.min(1, (tool?.maxBorrowDays || 1) - 1)));

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [purpose, setPurpose] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeSlot, setTimeSlot] = useState<TimeSlotType>('allday');

  if (!tool) {
    return (
      <ScrollView className={styles.page} scrollY>
        <View style={{ padding: 100 }}>
          <Text style={{ fontSize: 32, color: '#999' }}>工具不存在</Text>
        </View>
      </ScrollView>
    );
  }

  const totalDays = Math.max(1, diffDays(startDate, endDate));
  const exceedsMax = totalDays > tool.maxBorrowDays;

  // 工具现有的预约（用于日历标记）
  const existingBookings = useMemo(() => {
    const actives: Array<'pending' | 'approved' | 'borrowed'> = ['pending', 'approved', 'borrowed'];
    return bookings.filter(
      b => b.toolId === tool.id && actives.includes(b.status as any)
    );
  }, [bookings, tool.id]);

  const hasConflict = useMemo(() => {
    const s = parseDate(startDate).getTime();
    const e = parseDate(endDate).getTime();
    return existingBookings.some(b => {
      const bs = parseDate(b.startDate).getTime();
      const be = parseDate(b.endDate).getTime();
      return s <= be && e >= bs;
    });
  }, [startDate, endDate, existingBookings]);

  const isBookedDates = useMemo(() => {
    const set = new Set<string>();
    existingBookings.forEach(b => {
      const bs = parseDate(b.startDate);
      const be = parseDate(b.endDate);
      const cur = new Date(bs);
      while (cur <= be) {
        set.add(formatDate(cur));
        cur.setDate(cur.getDate() + 1);
      }
    });
    return set;
  }, [existingBookings]);

  const buildCalendarMatrix = (year: number, month: number): DayInfo[][] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const firstWeekday = firstDay.getDay();

    const rows: DayInfo[][] = [];
    let week: DayInfo[] = [];

    for (let i = 0; i < firstWeekday; i++) {
      const d = new Date(year, month, i - firstWeekday + 1);
      week.push({
        day: d.getDate(),
        dateStr: formatDate(d),
        inMonth: false,
        disabled: true,
        past: true,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = formatDate(curDate);
      const isPast = curDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isDisabled = isBookedDates.has(dateStr);
      week.push({
        day: d,
        dateStr,
        inMonth: true,
        disabled: isDisabled,
        past: isPast,
      });

      if (week.length === 7) {
        rows.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      let extra = 1;
      while (week.length < 7) {
        const d = new Date(year, month + 1, extra++);
        week.push({
          day: d.getDate(),
          dateStr: formatDate(d),
          inMonth: false,
          disabled: true,
          past: new Date(d) < today,
        });
      }
      rows.push(week);
    }

    return rows;
  };

  const calendarMatrix = useMemo(
    () => buildCalendarMatrix(calendarDate.getFullYear(), calendarDate.getMonth()),
    [calendarDate, isBookedDates, today]
  );

  const isInRange = (dateStr: string) => {
    const t = parseDate(dateStr).getTime();
    const s = parseDate(startDate).getTime();
    const e = parseDate(endDate).getTime();
    return t > s && t < e;
  };

  const handleDayClick = (day: DayInfo) => {
    if (!day.inMonth || day.disabled || day.past) return;

    if (selecting === 'start') {
      setStartDate(day.dateStr);
      setEndDate(day.dateStr);
      setSelecting('end');
    } else {
      const clicked = parseDate(day.dateStr).getTime();
      const startT = parseDate(startDate).getTime();
      if (clicked < startT) {
        setStartDate(day.dateStr);
        setEndDate(day.dateStr);
        setSelecting('end');
      } else {
        setEndDate(day.dateStr);
        setSelecting('start');
      }
    }
  };

  const handleStartClick = () => {
    setSelecting('start');
  };

  const handleEndClick = () => {
    setSelecting('end');
  };

  const handleTagClick = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag('');
      if (purpose === tag) setPurpose('');
    } else {
      setActiveTag(tag);
      setPurpose(tag);
    }
  };

  const canSubmit =
    !exceedsMax && !hasConflict && purpose.trim().length >= 2 && agree && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) {
      if (exceedsMax) {
        Taro.showToast({ title: `借用天数不能超过${tool.maxBorrowDays}天`, icon: 'none' });
      } else if (hasConflict) {
        Taro.showToast({ title: '所选日期已有预约，请更换', icon: 'none' });
      } else if (purpose.trim().length < 2) {
        Taro.showToast({ title: '请填写借用用途（至少2字）', icon: 'none' });
      } else if (!agree) {
        Taro.showToast({ title: '请先阅读并同意借用协议', icon: 'none' });
      }
      return;
    }

    Taro.showModal({
      title: '确认提交预约',
      content: `确定申请借用「${tool.name}」吗？\n时间：${startDate} 至 ${endDate}\n共${totalDays}天，押金 ¥${tool.deposit}`,
      confirmText: '确认申请',
      success: res => {
        if (!res.confirm) return;

        setSubmitting(true);

        setTimeout(() => {
          const newBooking: Omit<Booking, 'id' | 'createdAt'> = {
            toolId: tool.id,
            toolName: tool.name,
            toolImage: tool.image,
            toolCategory: tool.categoryName,
            userId: currentUser.id,
            userName: currentUser.name,
            userPhone: currentUser.phone,
            startDate,
            endDate,
            timeSlot,
            purpose: purpose.trim(),
            status: 'pending',
            deposit: tool.deposit,
          };
          addBooking(newBooking);

          console.log('[BookingPage] 提交预约:', newBooking);

          Taro.showToast({
            title: '预约申请已提交',
            icon: 'success',
            duration: 1500,
          });

          setTimeout(() => {
            Taro.switchTab({ url: '/pages/records/index' });
          }, 1500);

          setSubmitting(false);
        }, 600);
      },
    });
  };

  const handlePrevMonth = () => {
    setCalendarDate(d => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() - 1);
      return nd;
    });
  };

  const handleNextMonth = () => {
    setCalendarDate(d => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() + 1);
      return nd;
    });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.pageContainer}>
        <View className={styles.toolCard}>
          <View className={styles.toolImage}>
            <Image
              src={tool.image}
              mode="aspectFill"
              onError={e => console.error('[Booking] 工具图加载失败:', e)}
            />
          </View>
          <View className={styles.toolInfo}>
            <View>
              <View className={styles.toolHeader}>
                <Text className={styles.toolName}>{tool.name}</Text>
                <StatusTag
                  label={
                    tool.status === 'available'
                      ? '可借用'
                      : tool.status === 'reserved'
                      ? '已预约'
                      : tool.status === 'borrowed'
                      ? '已借出'
                      : '维护中'
                  }
                  color={
                    tool.status === 'available'
                      ? '#52C41A'
                      : tool.status === 'reserved'
                      ? '#165DFF'
                      : tool.status === 'borrowed'
                      ? '#FF4D4F'
                      : '#FAAD14'
                  }
                  bgColor={
                    tool.status === 'available'
                      ? 'rgba(82,196,26,0.1)'
                      : tool.status === 'reserved'
                      ? 'rgba(22,93,255,0.1)'
                      : tool.status === 'borrowed'
                      ? 'rgba(255,77,79,0.1)'
                      : 'rgba(250,173,20,0.1)'
                  }
                  size="sm"
                />
              </View>
              <View className={styles.toolMeta}>
                <View className={styles.metaTag}>
                  <Text>📂</Text>
                  <Text>{tool.categoryName}</Text>
                </View>
                <View className={styles.metaTag}>
                  <Text>📍</Text>
                  <Text>{tool.location}</Text>
                </View>
                <View className={styles.metaTag}>
                  <Text>⏱</Text>
                  <Text>最长{tool.maxBorrowDays}天</Text>
                </View>
              </View>
            </View>
            <View className={styles.toolDeposit}>
              <Text className={styles.depositLabel}>押金：</Text>
              <Text className={styles.depositValue}>¥{tool.deposit}</Text>
            </View>
          </View>
        </View>

        {hasConflict && (
          <View className={styles.bannerTip}>
            <Text className={styles.bannerIcon}>⚠️</Text>
            <View className={styles.bannerText}>
              <Text className={styles.bannerTitle}>日期冲突提醒</Text>
              <Text>您选择的时间段内已有他人预约，系统将进入排队序列。如前一位用户取消，您将自动递补！</Text>
            </View>
          </View>
        )}

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionIcon}>📅</View>
            <Text className={styles.sectionTitle}>选择借用时间</Text>
            <Text className={styles.sectionHint}>
              {selecting === 'start' ? '请选择开始日期' : '请选择结束日期'}
            </Text>
          </View>

          <View className={styles.datePickerRow}>
            <View className={styles.dateField} onClick={handleStartClick}>
              <Text className={styles.dateLabel}>
                <Text>📅</Text>
                开始日期
              </Text>
              <Text className={styles.dateValue}>{startDate}</Text>
            </View>
            <Text className={styles.dateArrow}>→</Text>
            <View className={styles.dateField} onClick={handleEndClick}>
              <Text className={styles.dateLabel}>
                <Text>📅</Text>
                结束日期
              </Text>
              <Text className={styles.dateValue}>{endDate}</Text>
            </View>
          </View>

          <View className={styles.daysBadge}>共 {totalDays} 天</View>

          <View className={styles.timeSlotRow}>
            {(Object.keys(TIME_SLOT_LABELS) as TimeSlotType[]).map(slot => (
              <View
                key={slot}
                className={classnames(
                  styles.timeSlotChip,
                  timeSlot === slot && styles.timeSlotActive
                )}
                onClick={() => setTimeSlot(slot)}
              >
                <Text>{TIME_SLOT_LABELS[slot].icon} {TIME_SLOT_LABELS[slot].label}</Text>
              </View>
            ))}
          </View>

          {exceedsMax && (
            <Text
              style={{
                color: '#FF4D4F',
                fontSize: 24,
                marginTop: 12,
              }}
            >
              ⚠️ 借用天数超过最长期限（{tool.maxBorrowDays}天）
            </Text>
          )}

          <View className={styles.calendarWrap}>
            <View className={styles.calendarHeader}>
              <View className={styles.calendarNav} onClick={handlePrevMonth}>
                ‹
              </View>
              <Text className={styles.calendarTitle}>
                {calendarDate.getFullYear()}年{calendarDate.getMonth() + 1}月
              </Text>
              <View className={styles.calendarNav} onClick={handleNextMonth}>
                ›
              </View>
            </View>

            <View className={styles.weekdayRow}>
              {['日', '一', '二', '三', '四', '五', '六'].map((w, i) => (
                <Text
                  key={w}
                  className={classnames(
                    styles.weekdayCell,
                    (i === 0 || i === 6) && styles.weekend
                  )}
                >
                  {w}
                </Text>
              ))}
            </View>

            <View className={styles.dateGrid}>
              {calendarMatrix.flat().map((day, idx) => {
                const isStart = day.dateStr === startDate;
                const isEnd = day.dateStr === endDate;
                const isRange = isInRange(day.dateStr);
                const isToday = day.inMonth && isSameDay(parseDate(day.dateStr), today);

                return (
                  <View
                    key={idx}
                    className={classnames(
                      styles.dateCell,
                      !day.inMonth && styles.empty,
                      day.inMonth && day.disabled && styles.disabled,
                      day.inMonth && day.past && styles.past,
                      day.inMonth && isToday && styles.today,
                      day.inMonth && isRange && !isStart && !isEnd && styles.inRange,
                      day.inMonth && isStart && styles.startDate,
                      day.inMonth && isEnd && styles.endDate,
                      day.inMonth && isStart && isEnd && styles.sameDay
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <Text>{day.day}</Text>
                    {day.inMonth && day.disabled && <View className={styles.cellDot} />}
                  </View>
                );
              })}
            </View>
          </View>

          {existingBookings.length > 0 && (
            <View className={styles.bookingList}>
              <Text
                style={{ fontSize: 24, color: '#9CA3AF', marginTop: 8, marginBottom: 4 }}
              >
                📌 已有预约（橙点标记已占用）：
              </Text>
              {existingBookings.slice(0, 3).map(b => (
                <View key={b.id} className={styles.bookingItem}>
                  <View className={styles.bookingBar} />
                  <View className={styles.bookingInfo}>
                    <Text className={styles.bookingName}>{b.userName}</Text>
                    <Text className={styles.bookingDate}>
                      {b.startDate} ~ {b.endDate}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionIcon}>📝</View>
            <Text className={styles.sectionTitle}>填写借用用途</Text>
          </View>

          <View className={styles.purposeTags}>
            {PURPOSE_TAGS.map(tag => (
              <View
                key={tag}
                className={classnames(
                  styles.purposeTag,
                  activeTag === tag && styles.active
                )}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </View>
            ))}
          </View>

          <View className={styles.inputGroup}>
            <Text className={styles.inputLabel}>详细说明（选填，便于管理员审核）</Text>
            <View className={styles.textareaWrap}>
              <Textarea
                className={styles.textarea}
                placeholder="例如：安装客厅挂画，需要钻孔约6个，预计2小时可以完成，归还时会清理工具表面灰尘等..."
                value={purpose === activeTag ? '' : purpose}
                onInput={e => {
                  const val = e.detail.value;
                  setPurpose(val);
                  if (activeTag && val !== activeTag) setActiveTag('');
                }}
                maxlength={200}
              />
              <View className={styles.textareaHint}>
                <Text>💡 清晰的用途说明有助于提高审核通过率</Text>
                <Text>{purpose.length}/200</Text>
              </View>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionIcon}>💰</View>
            <Text className={styles.sectionTitle}>费用明细</Text>
          </View>
          <View className={styles.summaryList}>
            <View className={styles.summaryRow}>
              <Text className={styles.summaryLabel}>借用工具</Text>
              <Text className={styles.summaryValue}>{tool.name}</Text>
            </View>
            <View className={styles.summaryRow}>
              <Text className={styles.summaryLabel}>借用时段</Text>
              <Text className={styles.summaryValue}>
                {startDate} ~ {endDate}（{totalDays}天）{TIME_SLOT_LABELS[timeSlot].icon}{TIME_SLOT_LABELS[timeSlot].label}
              </Text>
            </View>
            <View className={styles.summaryRow}>
              <Text className={styles.summaryLabel}>存放地点</Text>
              <Text className={styles.summaryValue}>{tool.location}</Text>
            </View>
            <View className={styles.summaryRow}>
              <Text className={styles.summaryLabel}>取件方式</Text>
              <Text className={styles.summaryValue}>本人现场核验后自取</Text>
            </View>
            <View className={styles.divider} />
            <View className={classnames(styles.summaryRow, styles.totalRow)}>
              <Text className={styles.summaryLabel}>押金金额（归还后退还）</Text>
              <Text className={styles.totalValue}>
                <Text>¥</Text>
                {tool.deposit}
              </Text>
            </View>
          </View>

          <View className={styles.agreement}>
            <View
              className={classnames(styles.checkbox, agree && styles.checked)}
              onClick={() => setAgree(!agree)}
            >
              <Text className={styles.checkMark}>✓</Text>
            </View>
            <View className={styles.agreementText}>
              我已阅读并同意
              <Text className={styles.linkText}> 《社区共享工具借用协议》</Text>
              ，承诺按时归还、爱惜物品，若有损坏或丢失按规定承担相应赔偿责任。
            </View>
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.priceInfo}>
          <Text className={styles.priceLabel}>需支付押金</Text>
          <Text className={styles.priceValue}>
            <Text>¥</Text>
            {tool.deposit}
          </Text>
        </View>
        <View className={styles.btnGroup}>
          <Button
            className={classnames(styles.btn, styles.btnSecondary)}
            onClick={() => Taro.navigateBack()}
          >
            取消
          </Button>
          <Button
            className={classnames(
              styles.btn,
              canSubmit ? styles.btnPrimary : styles.btnDisabled
            )}
            loading={submitting}
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? '提交中...' : '提交预约'}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

export default BookingPage;
