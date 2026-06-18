// ============================================
// ToolCard - 工具卡片组件
// ============================================

import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { Tool, ToolStatus } from '@/types';
import StatusTag from '@/components/StatusTag';
import styles from './index.module.scss';

const STATUS_CONFIG: Record<ToolStatus, { label: string; color: string; bgColor: string }> = {
  available: { label: '可借用', color: '#52C41A', bgColor: 'rgba(82, 196, 26, 0.1)' },
  borrowed: { label: '已借出', color: '#FF4D4F', bgColor: 'rgba(255, 77, 79, 0.1)' },
  maintenance: { label: '维护中', color: '#FAAD14', bgColor: 'rgba(250, 173, 20, 0.1)' },
  reserved: { label: '已预约', color: '#165DFF', bgColor: 'rgba(22, 93, 255, 0.1)' },
};

interface ToolCardProps {
  tool: Tool;
  onClick?: () => void;
  className?: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onClick, className }) => {
  const statusConf = STATUS_CONFIG[tool.status];

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    Taro.navigateTo({
      url: `/pages/tool-detail/index?id=${tool.id}`,
    });
  };

  return (
    <View className={classnames(styles.card, className)} onClick={handleClick}>
      <View className={styles.imageWrap}>
        <Image
          className={styles.image}
          src={tool.image}
          mode="aspectFill"
          onError={e => console.error('[ToolCard] 图片加载失败:', tool.id, e)}
        />
      </View>
      <View className={styles.content}>
        <View className={styles.header}>
          <Text className={styles.name}>{tool.name}</Text>
          <StatusTag
            label={statusConf.label}
            color={statusConf.color}
            bgColor={statusConf.bgColor}
            size="sm"
          />
        </View>
        <Text className={styles.desc}>{tool.description}</Text>
        <View className={styles.meta}>
          <View className={styles.metaItem}>
            <Text className={styles.metaIcon}>📂</Text>
            <Text>{tool.categoryName}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaIcon}>📍</Text>
            <Text>{tool.location}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaIcon}>⏱</Text>
            <Text>最长{tool.maxBorrowDays}天</Text>
          </View>
        </View>
        <View className={styles.footer}>
          <View className={styles.deposit}>
            <Text className={styles.depositLabel}>押金</Text>
            <Text className={styles.depositValue}>{tool.deposit}</Text>
            <Text className={styles.depositUnit}>元</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ToolCard;
