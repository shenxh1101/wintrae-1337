// ============================================
// 借用记录页 (TabBar 第3页)
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useApp } from '@/store/AppContext';
import { STATUS_LABELS, FILTER_TABS } from '@/data/bookings';
import StatusTag from '@/components/StatusTag';
import EmptyState from '@/components/EmptyState';
import { Booking, TIME_SLOT_LABELS } from '@/types';
import styles from './index.module.scss';

const CONDITION_MAP: Record<string, { label: string; cls: string }> = {
  good: { label: '✓ 完好归还', cls: 'good' },
  damaged: { label: '⚠ 有轻微损坏', cls: 'damaged' },
  lost: { label: '✗ 丢失', cls: 'lost' },
};

const RecordsPage: React.FC = () => {
  const { bookings, currentUser, cancelBooking } = useApp();
  const [activeTab, setActiveTab] = useState<string>('all');

  const myBookings = useMemo(
    () => bookings.filter(b => b.userId === currentUser.id),
    [bookings, currentUser.id]
  );

  const stats = useMemo(() => ({
    total: myBookings.length,
    pending: myBookings.filter(b => b.status === 'pending').length,
    borrowed: myBookings.filter(b => b.status === 'borrowed' || b.status === 'approved').length,
    returned: myBookings.filter(b => b.status === 'returned').length,
  }), [myBookings]);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return myBookings;
    return myBookings.filter(b => b.status === activeTab);
  }, [myBookings, activeTab]);

  const handleCancel = (booking: Booking) => {
    Taro.showModal({
      title: '取消预约',
      content: `确定要取消「${booking.toolName}」的预约吗？`,
      confirmText: '确定取消',
      cancelText: '再想想',
      confirmColor: '#FF4D4F',
      success: res => {
        if (res.confirm) {
          cancelBooking(booking.id);
          Taro.showToast({
            title: '已取消预约',
            icon: 'success',
          });
        }
      },
    });
  };

  const handleGoBooking = (booking: Booking) => {
    Taro.navigateTo({
      url: `/pages/tool-detail/index?id=${booking.toolId}`,
    });
  };

  const renderCard = (booking: Booking) => {
    const statusConf = STATUS_LABELS[booking.status];
    const canCancel = booking.status === 'pending';
    const canAct = booking.status === 'pending' || booking.status === 'approved';
    const condition = booking.returnCondition ? CONDITION_MAP[booking.returnCondition] : null;

    return (
      <View key={booking.id} className={styles.recordCard}>
        <View className={styles.cardHeader}>
          <View className={styles.imageWrap}>
            <Image
              className={styles.image}
              src={booking.toolImage}
              mode="aspectFill"
              onError={e => console.error('[RecordsPage] 图片加载失败:', booking.id, e)}
            />
          </View>
          <View className={styles.headerInfo}>
            <View className={styles.toolRow}>
              <Text className={styles.toolName}>{booking.toolName}</Text>
              <StatusTag
                label={statusConf.label}
                color={statusConf.color}
                bgColor={statusConf.bgColor}
                size="sm"
              />
            </View>
            <View className={styles.metaRow}>
              <View className={styles.metaItem}>
                <Text className={styles.metaIcon}>📂</Text>
                <Text>{booking.toolCategory}</Text>
              </View>
              <View className={styles.metaItem}>
                <Text className={styles.metaIcon}>🕒</Text>
                <Text>申请时间 {booking.createdAt}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className={styles.dateSection}>
          <View>
            <View className={styles.dateLabel}>取件日期</View>
            <View className={styles.dateValue}>{booking.startDate}</View>
          </View>
          <Text className={styles.dateArrow}>→</Text>
          <View style={{ textAlign: 'right' }}>
            <View className={styles.dateLabel}>归还日期</View>
            <View className={styles.dateValue}>{booking.endDate}</View>
          </View>
        </View>

        {booking.timeSlot && (
          <View className={styles.timeSlotBadge}>
            <Text>{TIME_SLOT_LABELS[booking.timeSlot].icon} {TIME_SLOT_LABELS[booking.timeSlot].label} {TIME_SLOT_LABELS[booking.timeSlot].time}</Text>
          </View>
        )}

        <View className={styles.purposeBox}>
          <Text className={styles.purposeLabel}>📝 借用用途</Text>
          <Text className={styles.purposeText}>{booking.purpose}</Text>
        </View>

        {booking.status === 'returned' && condition && (
          <View className={styles.returnedInfo}>
            <Text className={styles.returnTitle}>
              <Text className={styles.returnIcon}>✅</Text>
              归还信息
            </Text>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>归还状态</Text>
              <Text className={classnames(styles.conditionBadge, styles[condition.cls])}>
                {condition.label}
              </Text>
            </View>
            {booking.returnNote && (
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>备注说明</Text>
                <Text className={styles.detailValue} style={{ maxWidth: '60%', textAlign: 'right' }}>
                  {booking.returnNote}
                </Text>
              </View>
            )}
            {booking.returnedAt && (
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>归还时间</Text>
                <Text className={styles.detailValue}>{booking.returnedAt}</Text>
              </View>
            )}
          </View>
        )}

        <View className={styles.bottomBar}>
          <View className={styles.depositInfo}>
            <Text className={styles.depositLabel}>押金</Text>
            <Text className={styles.depositValue}>{booking.deposit}</Text>
            <Text className={styles.depositUnit}>元</Text>
          </View>
          <View className={styles.actions}>
            {canCancel && (
              <Button
                className={classnames(styles.btn, styles.btnDanger)}
                onClick={() => handleCancel(booking)}
              >
                取消预约
              </Button>
            )}
            {canAct && (
              <Button
                className={classnames(styles.btn, styles.btnPrimary)}
                onClick={() => handleGoBooking(booking)}
              >
                查看详情
              </Button>
            )}
            {booking.status === 'borrowed' && (
              <Button
                className={classnames(styles.btn, styles.btnPrimary)}
                onClick={() => Taro.switchTab({ url: '/pages/return-check/index' })}
              >
                归还登记
              </Button>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      className={styles.page}
      scrollY
      refresherEnabled
      onRefresherRefresh={() => Taro.showToast({ title: '刷新成功', icon: 'success' })}
    >
      <View className={styles.summaryCard}>
        <Text className={styles.summaryTitle}>我的借用概览</Text>
        <View className={styles.summaryGrid}>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{stats.total}</Text>
            <Text className={styles.summaryLabel}>累计借用</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{stats.pending}</Text>
            <Text className={styles.summaryLabel}>待确认</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{stats.borrowed}</Text>
            <Text className={styles.summaryLabel}>使用中</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{stats.returned}</Text>
            <Text className={styles.summaryLabel}>已归还</Text>
          </View>
        </View>
      </View>

      <ScrollView className={styles.tabs} scrollX>
        {FILTER_TABS.map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.tab, activeTab === tab.key && styles.active)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </View>
        ))}
      </ScrollView>

      <View className={styles.list}>
        {filteredBookings.length > 0 ? (
          filteredBookings.map(renderCard)
        ) : (
          <EmptyState
            icon="📜"
            title="暂无借用记录"
            desc={activeTab === 'all' ? '快去工具列表挑选需要的共享工具吧' : `当前没有${FILTER_TABS.find(t => t.key === activeTab)?.label}的记录`}
            showButton
            buttonText="浏览工具"
            onButtonClick={() => Taro.switchTab({ url: '/pages/tools/index' })}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default RecordsPage;
