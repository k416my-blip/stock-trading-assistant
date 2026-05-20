import { Text, type TextProps } from 'react-native';

/** User-facing copy — long-press to select and copy */
export function SelectableText(props: TextProps) {
  return <Text {...props} selectable />;
}
