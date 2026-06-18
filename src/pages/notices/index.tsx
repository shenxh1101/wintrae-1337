// ============================================
// 公告中心页 (TabBar 第5页)
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useApp } from '@/store/AppContext';
import {
  NOTICE_FILTERS,
  NOTICE_TYPE_STYLES,
  PRIORITY_LABELS,
} from '@/data/notices';
import EmptyState from '@/components/EmptyState';
import { Notice, Tool } from '@/types';
import styles from './index.module.scss';

const NoticesPage: React.FC = () => {
  const { notices, markNoticeRead, addNotice, isAdmin, tools } = useApp();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({
    toolId: '',
    toolName: '',
    startDate: '',
    endDate: '',
    reason: '',
    alternativeToolId: '',
    alternativeToolName: '',
  });

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

  const handlePublishMaintenance = () => {
    const { toolId, startDate, endDate, reason, alternativeToolId, alternativeToolName } = publishForm;
    if (!toolId) {
      Taro.showToast({ title: '请选择维护工具', icon: 'none' });
      return;
    }
    if (!startDate || !endDate) {
      Taro.showToast({ title: '请选择维护日期范围', icon: 'none' });
      return;
    }
    if (startDate > endDate) {
      Taro.showToast({ title: '结束日期不能早于开始日期', icon: 'none' });
      return;
    }
    if (!reason.trim()) {
      Taro.showToast({ title: '请填写维护原因', icon: 'none' });
      return;
    }

    const tool = tools.find(t => t.id === toolId);
    const content = `${reason}${alternativeToolName ? `\n建议替代工具：${alternativeToolName}` : ''}`;

    Taro.showModal({
      title: '确认发布维护公告',
      content: `工具：${tool?.name}\n时间：${startDate} ~ ${endDate}\n原因：${reason}${alternativeToolName ? `\n替代工具：${alternativeToolName}` : ''}`,
      confirmText: '确认发布',
      success: res => {
        if (!res.confirm) return;

        addNotice({
          title: `【维护通知】${tool?.name} 停用维护`,
          type: 'maintenance',
          typeName: '维护通知',
          content,
          summary: `${tool?.name} 将于 ${startDate} 至 ${endDate} 进行维护`,
          priority: 'high',
          relatedToolId: toolId,
          relatedToolName: tool?.name,
          maintenanceStartDate: startDate,
          maintenanceEndDate: endDate,
          alternativeToolId,
          alternativeToolName,
        });

        setShowPublishModal(false);
        setPublishForm({
          toolId: '',
          toolName: '',
          startDate: '',
          endDate: '',
          reason: '',
          alternativeToolId: '',
          alternativeToolName: '',
        });
        Taro.showToast({ title: '维护公告已发布', icon: 'success' });
      },
    });
  };

  const availableTools = useMemo(() => {
    return tools.filter(t => t.status !== 'maintenance');
  }, [tools]);

  const otherTools = useMemo(() => {
    if (!publishForm.toolId) return tools;
    return tools.filter(t => t.id !== publishForm.toolId);
  }, [tools, publishForm.toolId]);

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
          gap: '16rpx',
        }}
      >
        {isAdmin && (
          <Text
            style={{
              fontSize: '24rpx',
              color: '#FAAD14',
              padding: '8rpx 20rpx',
              background: 'rgba(250,173,20,0.1)',
              borderRadius: '24rpx',
            }}
            onClick={() => setShowPublishModal(true)}
          >
            🔧 发布维护
          </Text>
        )}
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

      {showPublishModal && (
        <View className={styles.modalOverlay}>
          <View className={styles.modalContent} style={{ maxHeight: '90vh', width: '90%' }}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>🔧 发布维护通知</Text>
              <View className={styles.closeBtn} onClick={() => setShowPublishModal(false)}>
                ×
              </View>
            </View>

            <ScrollView className={styles.modalBody} scrollY>
              <View className={styles.formSection}>
                <Text className={styles.formLabel}>选择维护工具</Text>
                <View className={styles.formRow}>
                  <Picker
                    mode="selector"
                    range={availableTools.map(t => t.name)}
                    rangeKey="name"
                    value={availableTools.findIndex(t => t.id === publishForm.toolId)}
                    onChange={e => {
                      const idx = Number(e.detail.value);
                      const tool = availableTools[idx];
                      if (tool) {
                        setPublishForm(f => ({ ...f, toolId: tool.id, toolName: tool.name }));
                      }
                    }}
                  >
                    <View className={styles.formPicker}>
                      <Text>{publishForm.toolName || '请选择维护工具'}</Text>
                      <Text>▼</Text>
                    </View>
                  </Picker>
                </View>
              </View>

              <View className={styles.formSection}>
                <Text className={styles.formLabel}>维护日期范围</Text>
                <View className={styles.formDateRow}>
                  <Picker
                    mode="date"
                    value={publishForm.startDate}
                    onChange={e => {
                      setPublishForm(f => ({ ...f, startDate: e.detail.value }));
                    }}
                  >
                    <View className={styles.formPicker}>
                      <Text>{publishForm.startDate || '开始日期'}</Text>
                      <Text>▼</Text>
                    </View>
                  </Picker>
                  <Text className={styles.dateDivider}>至</Text>
                  <Picker
                    mode="date"
                    value={publishForm.endDate}
                    onChange={e => {
                      setPublishForm(f => ({ ...f, endDate: e.detail.value }));
                    }}
                  >
                    <View className={styles.formPicker}>
                      <Text>{publishForm.endDate || '结束日期'}</Text>
                      <Text>▼</Text>
                    </View>
                  </Picker>
                </View>
              </View>

              <View className={styles.formSection}>
                <Text className={styles.formLabel}>维护原因</Text>
                <View className={styles.formRow}>
                  <textarea
                    className={styles.formTextarea}
                    placeholder="请输入维护原因（如：定期检修、故障维修、配件更换等）"
                    value={publishForm.reason}
                    onInput={e => setPublishForm(f => ({ ...f, reason: e.detail.value }))}
                    maxlength={200}
                  />
                </View>
              </View>

              <View className={styles.formSection}>
                <Text className={styles.formLabel}>建议替代工具（可选）</Text>
                <View className={styles.formRow}>
                  <Picker
                    mode="selector"
                    range={otherTools.map(t => t.name)}
                    rangeKey="name"
                    value={otherTools.findIndex(t => t.id === publishForm.alternativeToolId)}
                    onChange={e => {
                      const idx = Number(e.detail.value);
                      const tool = otherTools[idx];
                      if (tool) {
                        setPublishForm(f => ({
                          ...f,
                          alternativeToolId: tool.id,
                          alternativeToolName: tool.name,
                        }));
                      }
                    }}
                  >
                    <View className={styles.formPicker}>
                      <Text>{publishForm.alternativeToolName || '请选择替代工具（可选）'}</Text>
                      <Text>▼</Text>
                    </View>
                  </Picker>
                </View>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View className={styles.modalFooter}>
              <Button
                className={classnames(styles.footerBtn, styles.btnSecondary)}
                onClick={() => setShowPublishModal(false)}
              >
                取消
              </Button>
              <Button
                className={classnames(styles.footerBtn, styles.btnPrimary)}
                onClick={handlePublishMaintenance}
              >
                发布维护通知
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default NoticesPage;
