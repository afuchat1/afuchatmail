import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/colors';

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftIcon?: 'delete' | 'archive';
  rightIcon?: 'star' | 'archive';
  leftLabel?: string;
  rightLabel?: string;
}

// Matches website's SwipeableEmailItem:
// swipe right = star/archive (yellow/green BG)
// swipe left  = delete/archive (red/green BG)

export function SwipeableRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftIcon = 'delete',
  rightIcon = 'star',
  leftLabel = 'Delete',
  rightLabel = 'Star',
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const close = () => swipeableRef.current?.close();

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-80, 0],
    });
    const bgColor = rightIcon === 'star' ? '#FBBC04' : '#34A853';
    return (
      <Animated.View style={[styles.actionWrap, { backgroundColor: bgColor, transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            close();
            onSwipeRight?.();
          }}
        >
          <Ionicons
            name={rightIcon === 'star' ? 'star' : 'archive-outline'}
            size={24}
            color="#fff"
          />
          <Text style={styles.actionLabel}>{rightLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    const bgColor = leftIcon === 'archive' ? '#34A853' : colors.danger;
    return (
      <Animated.View style={[styles.actionWrap, { backgroundColor: bgColor, transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            close();
            onSwipeLeft?.();
          }}
        >
          <Ionicons
            name={leftIcon === 'archive' ? 'archive-outline' : 'trash-outline'}
            size={24}
            color="#fff"
          />
          <Text style={styles.actionLabel}>{leftLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={onSwipeRight ? renderLeftActions : undefined}
      renderRightActions={onSwipeLeft ? renderRightActions : undefined}
      friction={2}
      leftThreshold={60}
      rightThreshold={60}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableLeftOpen={() => { close(); onSwipeRight?.(); }}
      onSwipeableRightOpen={() => { close(); onSwipeLeft?.(); }}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionWrap: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
