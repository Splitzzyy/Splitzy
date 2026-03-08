import { MotiView } from "moti";

interface AnimatedListItemProps {
  index: number;
  children: React.ReactNode;
}

/**
 * Wraps a list item with a staggered fade-in + slide-up entrance animation.
 * Use inside FlatList/SectionList renderItem.
 */
export function AnimatedListItem({ index, children }: AnimatedListItemProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: "timing",
        duration: 350,
        delay: Math.min(index * 60, 300),
      }}
    >
      {children}
    </MotiView>
  );
}
