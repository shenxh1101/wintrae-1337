// ============================================
// 工具详情页
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useApp } from '@/store/AppContext';
import { getToolById } from '@/data/tools';
import StatusTag from '@/components/StatusTag';
import { ToolStatus, TimeSlotType, TIME_SLOT_LABELS } from '@/types';
import styles from './index.module.scss';

const TIME_SLOTS: Array<{ key: TimeSlotType; label: string; icon: string }> = [
  { key: 'morning', label: '上午', icon: '🌅' },
  { key: 'afternoon', label: '下午', icon: '☀️' },
  { key: 'evening', label: '晚上', icon: '🌙' },
  { key: 'allday', label: '全天', icon: '📅' },
];

const isSlotOccupied = (
  date: string,
  slot: TimeSlotType,
  toolBookings: Array<{ startDate: string; endDate: string; timeSlot?: TimeSlotType; status: string }>
): boolean => {
  const activeStatuses = ['pending', 'approved', 'borrowed'];
  return toolBookings.some(b => {
    if (!activeStatuses.includes(b.status)) return false;
    if (b.endDate < date || b.startDate > date) return false;
    if (!b.timeSlot || b.timeSlot === 'allday') return true;
    if (slot === 'allday') return true;
    return b.timeSlot === slot;
  });
};

const STATUS_CONFIG: Record<ToolStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  available: { label: '可借用', color: '#52C41A', bgColor: 'rgba(82, 196, 26, 0.1)', icon: '✅' },
  borrowed: { label: '已借出', color: '#FF4D4F', bgColor: 'rgba(255, 77, 79, 0.1)', icon: '📤' },
  maintenance: { label: '维护中', color: '#FAAD14', bgColor: 'rgba(250, 173, 20, 0.1)', icon: '🔧' },
  reserved: { label: '已预约', color: '#165DFF', bgColor: 'rgba(22, 93, 255, 0.1)', icon: '📅' },
};

const ACC_ICONS = ['🔋', '🔌', '💡', '📦', '🛡', '🎒', '🎯', '📏'];

const ToolDetailPage: React.FC = () => {
  const router = useRouter();
  const { bookings } = useApp();
  const toolId = router.params.id || 'tool-001';
  const tool = useMemo(() => getToolById(toolId), [toolId]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isFav, setIsFav] = useState(false);

  if (!tool) {
    return (
      <View className={styles.page} style={{ padding: 100 }}>
        <Text style={{ fontSize: 32, color: '#999' }}>工具不存在</Text>
      </View>
    );
  }

  const statusConf = STATUS_CONFIG[tool.status];

  const heroImages = useMemo(() => {
    if (tool.imageIds && tool.imageIds.length > 0) {
      return tool.imageIds.map(
        id => `https://picsum.photos/id/${id}/800/600`
      );
    }
    return [tool.image];
  }, [tool]);

  const activeImage = heroImages[activeImageIdx] || tool.image;

  const toolBookings = useMemo(() => {
    const activeStatuses: Array<'pending' | 'approved' | 'borrowed'> = [
      'pending',
      'approved',
      'borrowed',
    ];
    return bookings
      .filter(b => b.toolId === tool.id && activeStatuses.includes(b.status as any));
  }, [bookings, tool.id]);

  const next3Days = useMemo(() => {
    const dates: string[] = [];
    const available = tool.availableDates || [];
    const today = dayjs();
    for (let i = 0; i < 3; i++) {
      const d = today.add(i, 'day').format('YYYY-MM-DD');
      if (available.includes(d)) {
        dates.push(d);
      }
    }
    return dates;
  }, [tool.availableDates]);

  const canBook = (tool.status === 'available' || tool.status === 'reserved') && !tool.maintenanceNotice;

  const handleBook = () => {
    if (!canBook) {
      if (tool.status === 'maintenance') {
        Taro.showToast({ title: '工具维护中，暂不可预约', icon: 'none' });
      } else if (tool.status === 'borrowed') {
        Taro.showToast({ title: '工具已借出，请查看排期', icon: 'none' });
      }
      return;
    }
    Taro.navigateTo({
      url: `/pages/booking/index?toolId=${tool.id}`,
    });
  };

  const handleContactAdmin = () => {
    Taro.showActionSheet({
      itemList: ['拨打电话：400-888-0000', '发送消息给物业', '前往物业服务中心'],
      success: res => {
        console.log('[ToolDetail] 联系方式选择:', res.tapIndex);
        Taro.showToast({ title: '已记录您的请求', icon: 'success' });
      },
    });
  };

  const formatShortDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    }
    return dateStr;
  };

  const getWeekday = (dateStr: string) => {
    const d = new Date(dateStr.replace(/-/g, '/'));
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[d.getDay()] || '';
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.heroImage}>
        <Image
          src={activeImage}
          mode="aspectFill"
          onError={e => console.error('[ToolDetail] 主图加载失败:', e)}
        />
        <View className={styles.heroOverlay}>
          <Text className={styles.heroTitle}>{tool.name}</Text>
          <View className={styles.heroMeta}>
            <View className={styles.heroMetaItem}>
              <Text>📂</Text>
              <Text>{tool.categoryName}</Text>
            </View>
            <View className={styles.heroMetaItem}>
              <Text>📍</Text>
              <Text>{tool.location}</Text>
            </View>
          </View>
        </View>
      </View>

      {tool.maintenanceNotice && (
        <View className={styles.maintenanceBanner}>
          <Text className={styles.maintenanceBannerIcon}>🔧</Text>
          <View className={styles.maintenanceBannerContent}>
            <Text className={styles.maintenanceBannerTitle}>工具维护停用通知</Text>
            <Text className={styles.maintenanceBannerText}>{tool.maintenanceNotice}</Text>
          </View>
        </View>
      )}

      {heroImages.length > 1 && (
        <View className={styles.pageBody} style={{ marginTop: 16 }}>
          <View className={styles.thumbRow}>
            {heroImages.map((img, idx) => (
              <View
                key={idx}
                className={classnames(styles.thumbItem, activeImageIdx === idx && styles.active)}
                onClick={() => setActiveImageIdx(idx)}
              >
                <Image src={img} mode="aspectFill" />
              </View>
            ))}
          </View>
        </View>
      )}

      <View className={styles.pageBody}>
        <View className={styles.statusBar}>
          <View className={styles.statusLeft}>
            <View className={styles.statusIcon}>{statusConf.icon}</View>
            <View className={styles.statusText}>
              <Text className={styles.statusLabel}>当前状态</Text>
              <View style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Text className={styles.statusValue}>
                  {tool.status === 'borrowed' && tool.currentHolder
                    ? `借出中 · ${tool.currentHolder}`
                    : statusConf.label}
                </Text>
                <StatusTag
                  label={statusConf.label}
                  color={statusConf.color}
                  bgColor={statusConf.bgColor}
                  size="sm"
                />
              </View>
            </View>
          </View>
        </View>

        <View className={styles.infoCard}>
          <View className={styles.cardHeader}>
            <View className={styles.cardIcon}>📋</View>
            <Text className={styles.cardTitle}>基本信息</Text>
          </View>
          <View className={styles.infoGrid}>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>押金金额</Text>
              <Text className={classnames(styles.infoValue, styles.deposit)}>¥{tool.deposit}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>最长借用</Text>
              <Text className={styles.infoValue}>{tool.maxBorrowDays}天</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>存放位置</Text>
              <Text className={styles.infoValue}>{tool.location}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>工具分类</Text>
              <Text className={styles.infoValue}>{tool.categoryName}</Text>
            </View>
          </View>
        </View>

        <View className={styles.infoCard}>
          <View className={styles.cardHeader}>
            <View className={styles.cardIcon}>📝</View>
            <Text className={styles.cardTitle}>工具介绍</Text>
          </View>
          <Text className={styles.descText}>{tool.description}</Text>
        </View>

        <View className={styles.infoCard}>
          <View className={styles.cardHeader}>
            <View className={styles.cardIcon}>⚠️</View>
            <Text className={styles.cardTitle}>借用规则</Text>
          </View>
          <View className={styles.ruleList}>
            {tool.rules.map((rule, idx) => (
              <View key={idx} className={styles.ruleItem}>
                <View className={styles.ruleIndex}>{idx + 1}</View>
                <Text className={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.infoCard}>
          <View className={styles.cardHeader}>
            <View className={styles.cardIcon}>🧰</View>
            <Text className={styles.cardTitle}>
              配件清单（{tool.accessories.length}件）
            </Text>
          </View>
          <View className={styles.accList}>
            {tool.accessories.map((acc, idx) => (
              <View key={acc.id} className={styles.accItem}>
                <View className={styles.accLeft}>
                  <View className={styles.accIcon}>
                    {ACC_ICONS[idx % ACC_ICONS.length]}
                  </View>
                  <Text className={styles.accName}>{acc.name}</Text>
                </View>
                <View
                  className={classnames(
                    styles.accBadge,
                    acc.required ? styles.required : styles.optional
                  )}
                >
                  {acc.required ? '必选配件' : '可选配件'}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.infoCard}>
          <View className={styles.cardHeader}>
            <View className={styles.cardIcon}>📅</View>
            <Text className={styles.cardTitle}>当前排期</Text>
          </View>
          <View className={styles.scheduleWrap}>
            <Text className={styles.scheduleHint}>
              💡 绿底=可预约，红底=已占用，灰底=不可预约。点击可前往预约页。
            </Text>

            {next3Days.length > 0 && (
              <View className={styles.slotSection}>
                <Text className={styles.slotSectionTitle}>近3天可约时段</Text>
                {next3Days.map(date => (
                  <View key={date} className={styles.slotDateRow}>
                    <View className={styles.slotDateInfo}>
                      <Text className={styles.slotDateValue}>{formatShortDate(date)}</Text>
                      <Text className={styles.slotWeekday}>{getWeekday(date)}</Text>
                    </View>
                    <View className={styles.slotChips}>
                      {TIME_SLOTS.map(slot => {
                        const occupied = isSlotOccupied(date, slot.key, toolBookings);
                        return (
                          <View
                            key={slot.key}
                            className={classnames(
                              styles.slotChip,
                              occupied && styles.slotOccupied,
                            )}
                          >
                            <Text className={styles.slotChipIcon}>{slot.icon}</Text>
                            <Text className={styles.slotChipLabel}>{slot.label}</Text>
                            {occupied && <Text className={styles.slotChipStatus}>已占</Text>}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {tool.availableDates && tool.availableDates.length > 0 ? (
              <View className={styles.dateChips}>
                {tool.availableDates.map(date => (
                  <View key={date} className={classnames(styles.dateChip)}>
                    <Text className={styles.dateChipDate}>{formatShortDate(date)}</Text>
                    <Text className={styles.dateChipLabel}>{getWeekday(date)}</Text>
                  </View>
                ))}
                {toolBookings.length > 0 && (
                  <View className={classnames(styles.dateChip, styles.unavailable)}>
                    <Text className={styles.dateChipDate}>{toolBookings.length}笔占用</Text>
                    <Text className={styles.dateChipLabel}>点击查看</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className={styles.dateChips}>
                <View className={classnames(styles.dateChip, styles.unavailable)}>
                  <Text className={styles.dateChipDate}>近期排期满</Text>
                  <Text className={styles.dateChipLabel}>请稍后再试</Text>
                </View>
              </View>
            )}

            {toolBookings.length > 0 ? (
              <View className={styles.scheduleList}>
                {toolBookings.map(b => (
                  <View key={b.id} className={styles.scheduleItem}>
                    <View className={styles.scheduleAvatar}>
                      {b.userName.charAt(0)}
                    </View>
                    <View className={styles.scheduleInfo}>
                      <Text className={styles.scheduleUser}>{b.userName}</Text>
                      <Text className={styles.scheduleDate}>
                        {b.startDate} ~ {b.endDate} · 用途：{b.purpose}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className={styles.emptySchedule}>
                暂无借用记录，成为第一个预约的人吧 ✨
              </View>
            )}
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.priceWrap}>
          <Text className={styles.priceLabel}>需支付押金</Text>
          <Text className={styles.priceValue}>
            <Text>¥</Text>
            {tool.deposit}
          </Text>
        </View>
        <View className={styles.btnGroup}>
          <Button
            className={classnames(styles.btn, styles.btnFav)}
            onClick={() => {
              setIsFav(!isFav);
              Taro.showToast({ title: isFav ? '已取消收藏' : '收藏成功', icon: 'none' });
            }}
          >
            {isFav ? '❤️' : '🤍'}
          </Button>
          <Button
            className={classnames(styles.btn, styles.btnSecondary)}
            onClick={handleContactAdmin}
          >
            咨询
          </Button>
          <Button
            className={classnames(styles.btn, canBook ? styles.btnPrimary : styles.btnDisabled)}
            onClick={handleBook}
            disabled={!canBook}
          >
            {tool.status === 'available'
              ? '立即预约'
              : tool.status === 'reserved'
              ? '排队预约'
              : tool.status === 'borrowed'
              ? '已借出'
              : '维护中'}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

export default ToolDetailPage;
