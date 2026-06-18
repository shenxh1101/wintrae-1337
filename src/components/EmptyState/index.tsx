// ============================================
// EmptyState - 空状态组件
// ============================================

import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import styles from './index.module.scss';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  desc?: string;
  showButton?: boolean;
  buttonText?: string;
  onButtonClick?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📦',
  title = '暂无数据',
  desc = '',
  showButton = false,
  buttonText = '去看看',
  onButtonClick,
}) => {
  return (
    <View className={styles.empty}>
      <View className={styles.icon}>
        <Text>{icon}</Text>
      </View>
      <Text className={styles.title}>{title}</Text>
      {desc && <Text className={styles.desc}>{desc}</Text>}
      {showButton && (
        <Button className={styles.button} onClick={onButtonClick}>
          {buttonText}
        </Button>
      )}
    </View>
  );
};

export default EmptyState;
