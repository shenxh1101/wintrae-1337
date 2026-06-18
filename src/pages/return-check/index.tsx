// ============================================
// 归还检查页 (TabBar 第4页，管理员功能)
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image, Button, Textarea, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useApp } from '@/store/AppContext';
import { TOOLS } from '@/data/tools';
import { STATUS_LABELS } from '@/data/bookings';
import StatusTag from '@/components/StatusTag';
import EmptyState from '@/components/EmptyState';
import { Booking } from '@/types';
import styles from './index.module.scss';

type TabType = 'lend' | 'return';

interface CheckState {
  accessoriesChecked: boolean[];
  lendPhotos: string[];
  returnPhotos: string[];
  condition: 'good' | 'damaged' | 'lost' | null;
  note: string;
  deductionAmount: string;
  deductionNote: string;
}

const ReturnCheckPage: React.FC = () => {
  const { bookings, isAdmin, toggleRole, updateBookingStatus } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('return');
  const [checkStates, setCheckStates] = useState<Record<string, CheckState>>({});

  const getOrInitState = (bookingId: string, accLen: number): CheckState => {
    if (!checkStates[bookingId]) {
      const booking = bookings.find(b => b.id === bookingId);
      const legacyPhotos = booking?.conditionPhotos || [];
      return {
        accessoriesChecked: new Array(accLen).fill(false),
        lendPhotos: booking?.lendPhotos || legacyPhotos,
        returnPhotos: booking?.returnPhotos || [],
        condition: null,
        note: '',
        deductionAmount: '',
        deductionNote: '',
      };
    }
    return checkStates[bookingId];
  };

  const updateState = (bookingId: string, patch: Partial<CheckState>) => {
    setCheckStates(prev => {
      const booking = bookings.find(b => b.id === bookingId);
      const accLen = booking
        ? TOOLS.find(t => t.id === booking.toolId)?.accessories.length || 0
        : 0;
      const cur = getOrInitState(bookingId, accLen);
      return { ...prev, [bookingId]: { ...cur, ...patch } };
    });
  };

  const pendingLend = useMemo(
    () => bookings.filter(b => b.status === 'approved' || b.status === 'pending'),
    [bookings]
  );

  const pendingReturn = useMemo(
    () => bookings.filter(b => b.status === 'borrowed'),
    [bookings]
  );

  const currentList = activeTab === 'lend' ? pendingLend : pendingReturn;

  const handleSwitchMode = () => {
    Taro.showModal({
      title: '切换模式',
      content: isAdmin ? '切换到居民模式将无法使用归还检查功能，确定吗？' : '此功能需要管理员权限，是否切换为管理员模式？',
      confirmText: isAdmin ? '切换' : '成为管理员',
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

  const toggleAccessory = (booking: Booking, idx: number) => {
    const tool = TOOLS.find(t => t.id === booking.toolId);
    const state = getOrInitState(booking.id, tool?.accessories.length || 0);
    const newChecked = [...state.accessoriesChecked];
    newChecked[idx] = !newChecked[idx];
    updateState(booking.id, { accessoriesChecked: newChecked });
  };

  const handlePhotoClick = (bookingId: string) => {
    const tool = TOOLS.find(
      t => t.id === bookings.find(b => b.id === bookingId)?.toolId
    );
    const state = getOrInitState(bookingId, tool?.accessories.length || 0);
    const photos = activeTab === 'lend' ? state.lendPhotos : state.returnPhotos;
    if (photos.length >= 6) {
      Taro.showToast({ title: '最多上传6张', icon: 'none' });
      return;
    }
    Taro.chooseImage({
      count: 6 - photos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPhotos = res.tempFilePaths;
        if (activeTab === 'lend') {
          updateState(bookingId, { lendPhotos: [...state.lendPhotos, ...newPhotos] });
        } else {
          updateState(bookingId, { returnPhotos: [...state.returnPhotos, ...newPhotos] });
        }
        Taro.showToast({ title: `已选择${newPhotos.length}张照片`, icon: 'success' });
      },
    });
  };

  const handlePhotoPreview = (photos: string[], index: number) => {
    Taro.previewImage({
      current: photos[index],
      urls: photos,
    });
  };

  const handlePhotoDelete = (bookingId: string, photoIndex: number) => {
    const tool = TOOLS.find(
      t => t.id === bookings.find(b => b.id === bookingId)?.toolId
    );
    const state = getOrInitState(bookingId, tool?.accessories.length || 0);
    if (activeTab === 'lend') {
      const newPhotos = state.lendPhotos.filter((_, i) => i !== photoIndex);
      updateState(bookingId, { lendPhotos: newPhotos });
    } else {
      const newPhotos = state.returnPhotos.filter((_, i) => i !== photoIndex);
      updateState(bookingId, { returnPhotos: newPhotos });
    }
  };

  const handleConfirmLend = (booking: Booking) => {
    const tool = TOOLS.find(t => t.id === booking.toolId);
    const state = getOrInitState(booking.id, tool?.accessories.length || 0);
    const requiredChecked = tool?.accessories
      .filter(a => a.required)
      .every((_, i) => state.accessoriesChecked[i]);

    if (!requiredChecked) {
      Taro.showToast({ title: '请确认所有必选配件齐全', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '确认借出',
      content: `确定将「${booking.toolName}」借给 ${booking.userName}？`,
      confirmText: '确认借出',
      success: res => {
        if (res.confirm) {
          updateBookingStatus(booking.id, 'borrowed', {
            accessoriesChecked: state.accessoriesChecked,
            lendPhotos: state.lendPhotos,
          });
          Taro.showToast({ title: '借出确认成功', icon: 'success' });
        }
      },
    });
  };

  const handleConfirmReturn = (booking: Booking) => {
    const state = getOrInitState(
      booking.id,
      TOOLS.find(t => t.id === booking.toolId)?.accessories.length || 0
    );
    if (!state.condition) {
      Taro.showToast({ title: '请选择归还状态', icon: 'none' });
      return;
    }
    if ((state.condition === 'damaged' || state.condition === 'lost') && !state.deductionAmount) {
      Taro.showToast({ title: '请填写扣款金额', icon: 'none' });
      return;
    }
    const deductionAmount = state.deductionAmount ? Number(state.deductionAmount) : 0;
    if (isNaN(deductionAmount) || deductionAmount < 0) {
      Taro.showToast({ title: '扣款金额无效', icon: 'none' });
      return;
    }
    if (deductionAmount > booking.deposit) {
      Taro.showToast({ title: '扣款不能超过押金', icon: 'none' });
      return;
    }

    const conditionText = state.condition === 'good' ? '完好' : state.condition === 'damaged' ? '有损坏' : '丢失';
    const extraContent = deductionAmount > 0 ? `\n扣款金额：¥${deductionAmount}\n应退押金：¥${booking.deposit - deductionAmount}` : '';

    Taro.showModal({
      title: '确认归还',
      content: `确定「${booking.toolName}」归还完成？\n状态：${conditionText}${extraContent}`,
      confirmText: '确认归还',
      confirmColor: state.condition === 'lost' ? '#FF4D4F' : undefined,
      success: res => {
        if (res.confirm) {
          updateBookingStatus(booking.id, 'returned', {
            accessoriesChecked: state.accessoriesChecked,
            returnPhotos: state.returnPhotos,
            returnCondition: state.condition!,
            returnNote: state.note,
            deductionAmount: deductionAmount > 0 ? deductionAmount : undefined,
            deductionNote: state.deductionNote || undefined,
          });
          Taro.showToast({ title: '归还登记成功', icon: 'success' });
        }
      },
    });
  };

  const renderCheckCard = (booking: Booking) => {
    const tool = TOOLS.find(t => t.id === booking.toolId);
    if (!tool) return null;
    const state = getOrInitState(booking.id, tool.accessories.length);
    const statusConf = STATUS_LABELS[booking.status];

    return (
      <View key={booking.id} className={styles.checkCard}>
        <View className={styles.cardTop}>
          <View className={styles.imageWrap}>
            <Image
              src={booking.toolImage}
              mode="aspectFill"
              style={{ width: '100%', height: '100%' }}
              onError={e => console.error('[ReturnCheck] 图片加载失败:', e)}
            />
          </View>
          <View className={styles.topInfo}>
            <View className={styles.toolRow}>
              <Text className={styles.toolName}>{booking.toolName}</Text>
              <StatusTag
                label={statusConf.label}
                color={statusConf.color}
                bgColor={statusConf.bgColor}
                size="sm"
              />
            </View>
            <View className={styles.userRow}>
              <View className={styles.userInfo}>
                <View className={styles.avatar}>👤</View>
                <Text>{booking.userName}</Text>
              </View>
              <View className={styles.userInfo}>
                <Text>📞</Text>
                <Text>{booking.userPhone}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>📋</Text>
            借用信息
          </Text>
          <View className={styles.infoGrid}>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>取件日期</Text>
              <Text className={styles.infoValue}>{booking.startDate}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>归还日期</Text>
              <Text className={styles.infoValue}>{booking.endDate}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>押金金额</Text>
              <Text className={styles.infoValue} style={{ color: '#F5222D' }}>
                ¥{booking.deposit}
              </Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>存放位置</Text>
              <Text className={styles.infoValue}>{tool.location}</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>🧰</Text>
            配件核对（{state.accessoriesChecked.filter(Boolean).length}/{tool.accessories.length}）
          </Text>
          <View className={styles.accessoryList}>
            {tool.accessories.map((acc, idx) => (
              <View key={acc.id} className={styles.accItem}>
                <View
                  className={styles.accLeft}
                  onClick={() => toggleAccessory(booking, idx)}
                >
                  <View
                    className={classnames(
                      styles.checkbox,
                      state.accessoriesChecked[idx] && styles.checked
                    )}
                  >
                    {state.accessoriesChecked[idx] && (
                      <Text className={styles.checkMark}>✓</Text>
                    )}
                  </View>
                  <Text className={styles.accName}>{acc.name}</Text>
                </View>
                <Text
                  className={classnames(
                    styles.reqBadge,
                    acc.required ? styles.required : styles.optional
                  )}
                >
                  {acc.required ? '必选' : '可选'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>📷</Text>
            {activeTab === 'lend' ? '借出时外观拍照' : '归还时外观拍照'}
          </Text>
          <View className={styles.photoSection}>
            <Text className={styles.photoLabel}>
              建议多角度拍摄（正面、侧面、开关、接口等），最多6张
            </Text>
            <View className={styles.photoGrid}>
              {(activeTab === 'lend' ? state.lendPhotos : state.returnPhotos).map((photo, idx) => (
                <View key={idx} className={classnames(styles.photoItem, styles.filled)}>
                  <Image
                    src={photo}
                    mode="aspectFill"
                    style={{ width: '100%', height: '100%' }}
                    onClick={() => handlePhotoPreview(activeTab === 'lend' ? state.lendPhotos : state.returnPhotos, idx)}
                  />
                  <View
                    className={styles.photoDelete}
                    onClick={() => handlePhotoDelete(booking.id, idx)}
                  >
                    <Text className={styles.photoDeleteIcon}>×</Text>
                  </View>
                </View>
              ))}
              {(activeTab === 'lend' ? state.lendPhotos : state.returnPhotos).length < 6 && (
                <View
                  className={styles.photoItem}
                  onClick={() => handlePhotoClick(booking.id)}
                >
                  <Text className={styles.photoIcon}>📷</Text>
                  <Text>点击拍照</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {activeTab === 'return' && state.lendPhotos.length > 0 && state.returnPhotos.length === 0 && (
          <View className={styles.photoHint}>
            <Text className={styles.photoHintIcon}>💡</Text>
            <Text className={styles.photoHintText}>借出时已拍 {state.lendPhotos.length} 张照片，归还时未补拍也不会丢失</Text>
          </View>
        )}

        {activeTab === 'return' && (
          <>
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>
                <Text className={styles.sectionIcon}>🔍</Text>
                归还状态检查
              </Text>
              <View className={styles.conditionBtns}>
                {(['good', 'damaged', 'lost'] as const).map(cond => (
                  <View
                    key={cond}
                    className={classnames(
                      styles.condBtn,
                      styles[cond],
                      state.condition === cond && styles.active
                    )}
                    onClick={() => updateState(booking.id, { condition: cond })}
                  >
                    {cond === 'good' ? '✓ 完好' : cond === 'damaged' ? '⚠ 有损坏' : '✗ 丢失'}
                  </View>
                ))}
              </View>
            </View>

            {(state.condition === 'damaged' || state.condition === 'lost') && (
              <View className={styles.section}>
                <Text className={styles.sectionTitle}>
                  <Text className={styles.sectionIcon}>💰</Text>
                  损坏/丢失处理
                </Text>
                <View className={styles.deductionSection}>
                  <View className={styles.deductionRow}>
                    <Text className={styles.deductionLabel}>押金金额</Text>
                    <Text className={styles.deductionValue}>¥{booking.deposit}</Text>
                  </View>
                  <View className={styles.deductionRow}>
                    <Text className={styles.deductionLabel}>扣款金额</Text>
                    <Input
                      className={styles.deductionInput}
                      type="digit"
                      placeholder="请输入扣款金额"
                      value={state.deductionAmount}
                      onInput={e => updateState(booking.id, { deductionAmount: e.detail.value })}
                    />
                  </View>
                  {state.deductionAmount && !isNaN(Number(state.deductionAmount)) && (
                    <View className={styles.deductionRow}>
                      <Text className={styles.deductionLabel}>应退押金</Text>
                      <Text className={styles.deductionRefund}>
                        ¥{Math.max(0, booking.deposit - Number(state.deductionAmount))}
                      </Text>
                    </View>
                  )}
                  <View className={styles.deductionNoteWrap}>
                    <Text className={styles.deductionLabel}>处理说明</Text>
                    <Textarea
                      className={styles.deductionNote}
                      placeholder={
                        state.condition === 'lost'
                          ? '请说明丢失原因、赔偿方案等...'
                          : '请描述损坏部位、程度、处理方案等...'
                      }
                      value={state.deductionNote}
                      onInput={e => updateState(booking.id, { deductionNote: e.detail.value })}
                      maxlength={200}
                    />
                  </View>
                </View>
              </View>
            )}

            <View className={styles.section}>
              <Text className={styles.sectionTitle}>
                <Text className={styles.sectionIcon}>📝</Text>
                备注说明
              </Text>
              <View className={styles.inputWrap}>
                <Textarea
                  className={styles.input}
                  placeholder={
                    state.condition === 'damaged'
                      ? '请描述损坏部位和程度，例如：外壳有明显划痕约3cm...'
                      : state.condition === 'lost'
                      ? '请说明丢失原因和情况...'
                      : '选填，记录其他信息...'
                  }
                  value={state.note}
                  onInput={e => updateState(booking.id, { note: e.detail.value })}
                  maxlength={200}
                />
                <Text className={styles.inputTip}>{state.note.length}/200 字</Text>
              </View>
            </View>
          </>
        )}

        <View className={styles.actionBar}>
          {activeTab === 'lend' ? (
            <>
              <Button className={classnames(styles.actionBtn, styles.btnGhost)}>
                联系居民
              </Button>
              <Button
                className={classnames(styles.actionBtn, styles.btnLend)}
                onClick={() => handleConfirmLend(booking)}
              >
                ✓ 确认借出
              </Button>
            </>
          ) : (
            <>
              <Button className={classnames(styles.actionBtn, styles.btnGhost)}>
                联系居民
              </Button>
              <Button
                className={classnames(styles.actionBtn, styles.btnConfirm)}
                onClick={() => handleConfirmReturn(booking)}
              >
                ✓ 确认归还
              </Button>
            </>
          )}
        </View>
      </View>
    );
  };

  if (!isAdmin) {
    return (
      <ScrollView className={styles.page} scrollY>
        <View className={styles.modeBanner}>
          <View className={styles.bannerLeft}>
            <Text className={styles.bannerTitle}>🔐 管理员功能</Text>
            <Text className={styles.bannerDesc}>
              归还检查功能仅限管理员使用，用于借还登记与外观检查
            </Text>
          </View>
          <View className={styles.bannerAction} onClick={handleSwitchMode}>
            切换管理员
          </View>
        </View>
        <View style={{ padding: '0 32rpx' }}>
          <EmptyState
            icon="🛠"
            title="需要管理员权限"
            desc="此页面用于物业管理员确认工具借出、拍照记录、勾选配件和登记归还状态。普通居民可在「借用记录」中查看自己的借用情况。"
            showButton
            buttonText="查看我的借用"
            onButtonClick={() => Taro.switchTab({ url: '/pages/records/index' })}
          />
        </View>
        <View className={styles.noticeTip}>
          <Text className={styles.tipTitle}>💡 功能说明</Text>
          确认借出时：核对配件→拍照留档→登记居民信息\n
          确认归还时：检查外观→核对配件→记录状态→退还押金
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.modeBanner}>
        <View className={styles.bannerLeft}>
          <Text className={styles.bannerTitle}>🛡 管理员工作台</Text>
          <Text className={styles.bannerDesc}>
            今日待处理：借出 {pendingLend.length} 笔 · 归还 {pendingReturn.length} 笔
          </Text>
        </View>
        <View className={styles.bannerAction} onClick={handleSwitchMode}>
          切回居民
        </View>
      </View>

      <View className={styles.tabs}>
        <View
          className={classnames(styles.tab, activeTab === 'lend' && styles.active)}
          onClick={() => setActiveTab('lend')}
        >
          待借出 ({pendingLend.length})
        </View>
        <View
          className={classnames(styles.tab, activeTab === 'return' && styles.active)}
          onClick={() => setActiveTab('return')}
        >
          待归还 ({pendingReturn.length})
        </View>
      </View>

      <View className={styles.list}>
        {currentList.length > 0 ? (
          currentList.map(renderCheckCard)
        ) : (
          <EmptyState
            icon={activeTab === 'lend' ? '📤' : '📥'}
            title={activeTab === 'lend' ? '暂无待借出申请' : '暂无待归还工具'}
            desc={
              activeTab === 'lend'
                ? '居民提交的预约申请将显示在这里'
                : '正在借用中的工具将显示在这里，供归还时登记'
            }
          />
        )}
      </View>
    </ScrollView>
  );
};

export default ReturnCheckPage;
