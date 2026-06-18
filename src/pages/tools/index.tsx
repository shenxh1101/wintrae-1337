// ============================================
// 工具列表页 (TabBar 首页)
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useApp } from '@/store/AppContext';
import { TOOL_CATEGORIES, TOOL_LOCATIONS } from '@/data/tools';
import ToolCard from '@/components/ToolCard';
import EmptyState from '@/components/EmptyState';
import SectionHeader from '@/components/SectionHeader';
import { ToolCategory } from '@/types';
import styles from './index.module.scss';

const ToolsPage: React.FC = () => {
  const { tools, currentUser, isAdmin, toggleRole, notices } = useApp();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeLocation, setActiveLocation] = useState<string>('全部位置');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

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
        return (
          tool.name.toLowerCase().includes(kw) ||
          tool.description.toLowerCase().includes(kw) ||
          tool.categoryName.includes(kw)
        );
      }
      return true;
    });
  }, [tools, activeCategory, activeLocation, searchKeyword]);

  const handleLocationClick = () => {
    Taro.showActionSheet({
      itemList: TOOL_LOCATIONS,
      success: res => {
        setActiveLocation(TOOL_LOCATIONS[res.tapIndex]);
        console.log('[ToolsPage] 选择位置:', TOOL_LOCATIONS[res.tapIndex]);
      },
    });
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
