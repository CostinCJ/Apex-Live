import { useRef, useEffect, memo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface TranscriptLine {
  text: string;
  role: 'user' | 'coach';
  timestamp: number;
}

interface TranscriptOverlayProps {
  lines: TranscriptLine[];
  visible: boolean;
}

export const TranscriptOverlay = memo(function TranscriptOverlay({ lines, visible }: TranscriptOverlayProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollRef.current && lines.length > 0) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [lines.length]);

  if (!visible || lines.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {lines.map((line, index) => (
          <View
            key={`${line.timestamp}-${index}`}
            style={[
              styles.line,
              line.role === 'user' ? styles.userLine : styles.coachLine,
            ]}
          >
            <Text
              style={[
                styles.lineText,
                line.role === 'user' ? styles.userText : styles.coachText,
              ]}
            >
              {line.text}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    maxHeight: 200,
    backgroundColor: colors.background + 'CC',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
  },
  line: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    maxWidth: '85%',
  },
  userLine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary + '20',
  },
  coachLine: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
  },
  lineText: {
    ...typography.caption,
  },
  userText: {
    color: colors.primary,
  },
  coachText: {
    color: colors.textPrimary,
  },
});
