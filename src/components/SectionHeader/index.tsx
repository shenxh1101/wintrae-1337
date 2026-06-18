// ============================================
// SectionHeader - 区块标题组件
// ============================================

import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  showMore?: boolean;
  moreText?: string;
  onMore?: () => void;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  showMore = false,
  moreText = '查看全部',
  onMore,
  className,
}) => {
  const handleMore = () => {
    if (onMore) {
      onMore();
    }
  };

  return (
    <View className={classnames(styles.header, className)}>
      <View className={styles.left}>
        <View className={styles.bar} />
        <Text className={styles.title}>{title}</Text>
        {subtitle && <Text className={styles.subtitle}>{subtitle}</Text>}
      </View>
      {showMore && (
        <View className={styles.right} onClick={handleMore}>
          <Text className={styles.more}>
            {moreText}
            <Text className={styles.arrow}> ›</Text>
          </Text>
        </View>
      )}
    </View>
  );
};

export default SectionHeader;
