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

const MAX_TRANSCRIPT_LINES = 100;

export const TranscriptOverlay = memo(function TranscriptOverlay({ lines, visible }: TranscriptOverlayProps) {
  const scrollRef = useRef<ScrollView>(null);

  // Cap displayed lines to prevent unbounded memory growth
  const displayLines = lines.length > MAX_TRANSCRIPT_LINES
    ? lines.slice(-MAX_TRANSCRIPT_LINES)
    : lines;

  useEffect(() => {
    if (scrollRef.current && displayLines.length > 0) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [displayLines.length]);

  if (!visible || displayLines.length === 0) return null;

  return (
    <View style={styles.container} accessibilityRole="summary" accessibilityLiveRegion="polite" accessibilityLabel="Conversation transcript">
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {displayLines.map((line, index) => (
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
