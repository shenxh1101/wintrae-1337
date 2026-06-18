// ============================================
// 公告中心页 (TabBar 第5页)
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useApp } from '@/store/AppContext';
import {
  NOTICE_FILTERS,
  NOTICE_TYPE_STYLES,
  PRIORITY_LABELS,
} from '@/data/notices';
import EmptyState from '@/components/EmptyState';
import { Notice } from '@/types';
import styles from './index.module.scss';

const NoticesPage: React.FC = () => {
  const { notices, markNoticeRead } = useApp();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const highPriorityCount = useMemo(
    () => notices.filter(n => n.priority === 'high' && !n.isRead).length,
    [notices]
  );
  const unreadCount = useMemo(
    () => notices.filter(n => !n.isRead).length,
    [notices]
  );

  const filteredNotices = useMemo(() => {
    let list = [...notices];
    if (activeFilter !== 'all') {
      list = list.filter(n => n.type === activeFilter);
    }
    list.sort((a, b) => {
      const priorityWeight = { high: 0, medium: 1, low: 2 };
      const wa = priorityWeight[a.priority];
      const wb = priorityWeight[b.priority];
      if (wa !== wb) return wa - wb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [notices, activeFilter]);

  const typeCount = (type: string): number => {
    if (type === 'all') return unreadCount;
    return notices.filter(n => n.type === type && !n.isRead).length;
  };

  const handleOpenDetail = (notice: Notice) => {
    setSelectedNotice(notice);
    if (!notice.isRead) {
      markNoticeRead(notice.id);
    }
    console.log('[Notices] 查看公告:', notice.title);
  };

  const handleCloseDetail = () => {
    setSelectedNotice(null);
  };

  const handleGoTool = (toolId?: string) => {
    if (!toolId) return;
    handleCloseDetail();
    Taro.navigateTo({
      url: `/pages/tool-detail/index?id=${toolId}`,
    });
  };

  const handleMarkAllRead = () => {
    Taro.showModal({
      title: '全部标为已读',
      content: `确定将所有 ${unreadCount} 条未读公告标为已读吗？`,
      success: res => {
        if (res.confirm) {
          notices.forEach(n => !n.isRead && markNoticeRead(n.id));
          Taro.showToast({ title: '已全部标为已读', icon: 'success' });
        }
      },
    });
  };

  return (
    <ScrollView
      className={styles.page}
      scrollY
      refresherEnabled
      onRefresherRefresh={() => Taro.showToast({ title: '刷新成功', icon: 'success' })}
    >
      <View className={styles.header}>
        <View className={styles.headerLeft}>
          <Text className={styles.headerTitle}>📢 社区公告中心</Text>
          <Text className={styles.headerDesc}>
            维护通知、使用教程、重要提醒，及时掌握社区动态
          </Text>
          <View className={styles.counts}>
            <View className={styles.countItem}>
              <Text className={styles.countValue}>{notices.length}</Text>
              <Text className={styles.countLabel}>公告总数</Text>
            </View>
            <View className={styles.countItem}>
              <Text className={styles.countValue} style={{ color: '#FFD591' }}>
                {unreadCount}
              </Text>
              <Text className={styles.countLabel}>未读</Text>
            </View>
            <View className={styles.countItem}>
              <Text className={styles.countValue} style={{ color: '#FFB4B4' }}>
                {highPriorityCount}
              </Text>
              <Text className={styles.countLabel}>重要</Text>
            </View>
          </View>
        </View>
        <View className={styles.headerIcon}>🔔</View>
      </View>

      <View
        style={{
          padding: '0 32rpx',
          marginBottom: '16rpx',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        {unreadCount > 0 && (
          <Text
            style={{
              fontSize: '24rpx',
              color: '#165DFF',
              padding: '8rpx 20rpx',
              background: 'rgba(22,93,255,0.08)',
              borderRadius: '24rpx',
            }}
            onClick={handleMarkAllRead}
          >
            全部标为已读
          </Text>
        )}
      </View>

      <ScrollView className={styles.filters} scrollX>
        {NOTICE_FILTERS.map(f => {
          const unread = typeCount(f.key);
          return (
            <View
              key={f.key}
              className={classnames(
                styles.filterChip,
                activeFilter === f.key && styles.active
              )}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
              {unread > 0 && <View className={styles.badgeDot} />}
            </View>
          );
        })}
      </ScrollView>

      <View className={styles.list}>
        {filteredNotices.length > 0 ? (
          filteredNotices.map(notice => {
            const typeStyle = NOTICE_TYPE_STYLES[notice.type];
            return (
              <View
                key={notice.id}
                className={classnames(
                  styles.noticeCard,
                  notice.priority === 'high' && styles.priorityHigh,
                  notice.priority === 'medium' && styles.priorityMedium
                )}
                onClick={() => handleOpenDetail(notice)}
              >
                <View className={styles.cardHeader}>
                  <View className={styles.titleRow}>
                    {notice.priority !== 'low' && (
                      <Text
                        className={classnames(
                          styles.priorityBadge,
                          styles[notice.priority]
                        )}
                      >
                        {PRIORITY_LABELS[notice.priority].label}
                      </Text>
                    )}
                    <Text className={styles.title}>{notice.title}</Text>
                  </View>
                  {!notice.isRead && <View className={styles.unreadDot} />}
                </View>

                <View className={styles.typeRow}>
                  <Text
                    className={styles.typeTag}
                    style={{
                      background: typeStyle.bgColor,
                      color: typeStyle.color,
                    }}
                  >
                    {notice.typeName}
                  </Text>
                  <Text className={styles.time}>🕒 {notice.createdAt}</Text>
                </View>

                <Text className={styles.summary}>{notice.summary}</Text>

                <View className={styles.cardFooter}>
                  <View className={styles.related}>
                    {notice.relatedToolName && (
                      <>
                        <Text className={styles.relatedLabel}>相关工具：</Text>
                        <Text className={styles.relatedTool}>
                          🔧 {notice.relatedToolName}
                        </Text>
                      </>
                    )}
                  </View>
                  <Text className={styles.readMore}>
                    查看详情
                    <Text className={styles.arrow}>›</Text>
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState
            icon="📭"
            title="暂无相关公告"
            desc={
              activeFilter === 'all'
                ? '社区暂时没有公告，一切安好~'
                : `${NOTICE_FILTERS.find(f => f.key === activeFilter)?.label}类公告暂无内容`
            }
          />
        )}
      </View>

      {selectedNotice && (
        <View className={styles.detailModal} onClick={handleCloseDetail}>
          <View className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <View className={styles.placeholder} />
              <Text className={styles.modalTitle}>公告详情</Text>
              <View className={styles.closeBtn} onClick={handleCloseDetail}>
                ×
              </View>
            </View>

            <ScrollView className={styles.modalBody} scrollY>
              <Text className={styles.detailTitle}>{selectedNotice.title}</Text>

              <View className={styles.detailMeta}>
                <Text
                  className={styles.typeTag}
                  style={{
                    background: NOTICE_TYPE_STYLES[selectedNotice.type].bgColor,
                    color: NOTICE_TYPE_STYLES[selectedNotice.type].color,
                  }}
                >
                  {selectedNotice.typeName}
                </Text>
                {selectedNotice.priority !== 'low' && (
                  <Text
                    className={classnames(
                      styles.priorityBadge,
                      styles[selectedNotice.priority]
                    )}
                    style={{ fontSize: '22rpx' }}
                  >
                    {PRIORITY_LABELS[selectedNotice.priority].label}
                  </Text>
                )}
                <Text className={styles.time}>🕒 {selectedNotice.createdAt}</Text>
              </View>

              <Text className={styles.contentText}>{selectedNotice.content}</Text>
            </ScrollView>

            <View className={styles.modalFooter}>
              <Button className={classnames(styles.footerBtn, styles.btnSecondary)} onClick={handleCloseDetail}>
                关闭
              </Button>
              {selectedNotice.relatedToolId ? (
                <Button
                  className={classnames(styles.footerBtn, styles.btnPrimary)}
                  onClick={() => handleGoTool(selectedNotice.relatedToolId)}
                >
                  查看相关工具
                </Button>
              ) : (
                <Button
                  className={classnames(styles.footerBtn, styles.btnPrimary)}
                  onClick={handleCloseDetail}
                >
                  我已知晓
                </Button>
              )}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default NoticesPage;
