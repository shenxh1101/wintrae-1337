// ============================================
// StatusTag - 状态标签组件
// ============================================

import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatusTagProps {
  label: string;
  color: string;
  bgColor: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const StatusTag: React.FC<StatusTagProps> = ({
  label,
  color,
  bgColor,
  size = 'md',
  showDot = true,
  className,
}) => {
  return (
    <View
      className={classnames(
        styles.tag,
        size === 'sm' && styles.sizeSm,
        size === 'lg' && styles.sizeLg,
        className
      )}
      style={{ backgroundColor: bgColor, color }}
    >
      {showDot && (
        <View className={styles.tagDot} style={{ backgroundColor: color }} />
      )}
      <Text>{label}</Text>
    </View>
  );
};

export default StatusTag;
