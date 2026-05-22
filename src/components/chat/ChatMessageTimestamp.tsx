import { StyleSheet, Text } from 'react-native';
import type { AiChatMessage } from '../../types/aiChat';
import { formatChatTimestampLocal } from '../../utils/chatTimestamp';
import { theme } from '../../theme';

type Props = {
  message: AiChatMessage;
  compact?: boolean;
};

export function ChatMessageTimestamp({ message, compact = true }: Props) {
  const label = formatChatTimestampLocal(message.createdAt, { compact });
  return <Text style={styles.timestamp}>{label}</Text>;
}

const styles = StyleSheet.create({
  timestamp: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 2,
  },
});
