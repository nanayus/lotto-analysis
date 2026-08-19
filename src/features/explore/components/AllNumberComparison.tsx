import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import type { AnalyticsSnapshot } from '@/domain/analytics/types';
import { colors, radius, spacing, typography } from '@/theme';

export type ComparisonSort = 'appearance' | 'gap' | 'recent52';

export function AllNumberComparison({ onBack, onSelect, recent52Snapshot, snapshot }: {
  onBack: () => void; onSelect: (number: number) => void; recent52Snapshot: AnalyticsSnapshot; snapshot: AnalyticsSnapshot;
}) {
  const [sort, setSort] = useState<ComparisonSort>('appearance');
  const source = sort === 'recent52' ? recent52Snapshot : snapshot;
  const rows = Object.values(source.numbers).sort((a, b) => {
    const value = sort === 'gap' ? b.currentGap - a.currentGap
      : sort === 'recent52' ? b.recent52Count - a.recent52Count
      : b.appearanceCount - a.appearanceCount;
    return value || a.number - b.number;
  });
  const metric = sort === 'gap' ? '현재 미출현' : '출현';
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹ 탐색</Text></Pressable>
      <Text style={styles.title}>45개 번호 비교</Text></View>
    <View style={styles.chips}>{([['appearance','출현'],['gap','미출현'],['recent52','최근 52회']] as const).map(([key,label]) =>
      <Pressable key={key} onPress={() => setSort(key)} style={[styles.chip, sort === key && styles.chipActive]}>
        <Text style={[styles.chipText, sort === key && styles.chipTextActive]}>{label}</Text></Pressable>)}</View>
    <View style={styles.tableHead}><Text style={styles.rank}>순위</Text><Text style={styles.number}>번호</Text><Text style={styles.metric}>{metric}</Text></View>
    {rows.map((item, index) => <Pressable accessibilityRole="button" key={item.number} onPress={() => onSelect(item.number)} style={styles.row}>
      <Text style={styles.rank}>{String(index + 1).padStart(2,'0')}</Text><Text style={styles.number}>{String(item.number).padStart(2,'0')}</Text>
      <Text style={styles.metric}>{sort === 'gap' ? `${item.currentGap}회째` : `${sort === 'recent52' ? item.recent52Count : item.appearanceCount}회`}</Text>
    </Pressable>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content:{padding:spacing.lg,paddingBottom:spacing.xxxl}, header:{flexDirection:'row',alignItems:'center',gap:spacing.lg,marginBottom:spacing.xl},
  back:{minHeight:44,justifyContent:'center'},backText:{color:colors.accentPrimary,fontSize:typography.sizes.small},title:{color:colors.textPrimary,fontSize:typography.sizes.section,fontWeight:typography.weights.semibold},
  chips:{flexDirection:'row',gap:spacing.sm,marginBottom:spacing.xl},chip:{paddingHorizontal:spacing.md,minHeight:38,justifyContent:'center',borderRadius:radius.round,borderWidth:1,borderColor:colors.divider},chipActive:{backgroundColor:colors.accentPrimary,borderColor:colors.accentPrimary},chipText:{color:colors.textSecondary,fontSize:typography.sizes.caption},chipTextActive:{color:colors.background,fontWeight:typography.weights.semibold},
  tableHead:{flexDirection:'row',paddingVertical:spacing.sm,borderBottomWidth:1,borderBottomColor:colors.divider},row:{flexDirection:'row',alignItems:'center',minHeight:48,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.divider},rank:{width:'24%',color:colors.textSecondary,fontSize:typography.sizes.caption},number:{width:'28%',color:colors.textPrimary,fontSize:typography.sizes.small,fontWeight:typography.weights.semibold},metric:{flex:1,textAlign:'right',color:colors.textSecondary,fontSize:typography.sizes.small},
});
