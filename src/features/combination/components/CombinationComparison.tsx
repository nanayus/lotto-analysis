import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AnalysisPeriod } from '@/domain/analytics/types';
import type { CombinationAnalysis } from '@/domain/combination/types';
import { AnalysisControls } from '@/features/explore/components/AnalysisControls';
import { colors, radius, spacing, typography } from '@/theme';

function bestRank(analysis: CombinationAnalysis) { return ([1,2,3,4,5] as const).find((rank) => analysis.prizeCounts[rank] > 0); }
function recentRank(analysis: CombinationAnalysis) { return analysis.recentMeaningfulMatch?.prizeRank; }
function consecutive(analysis: CombinationAnalysis) { return analysis.shape.consecutiveGroups.length ? analysis.shape.consecutiveGroups.map((g) => `${g[0]}–${g.at(-1)}`).join(' · ') : '없음'; }

export function CombinationComparison({ a, b, bonusIncluded, firstRound, latestRound, onBack, onBonusChange, onPeriodChange, period }: {
  a: CombinationAnalysis; b: CombinationAnalysis; bonusIncluded:boolean; firstRound:number; latestRound:number; onBack:()=>void;
  onBonusChange:(value:boolean)=>void; onPeriodChange:(period:AnalysisPeriod)=>void; period:AnalysisPeriod;
}) {
  const rows = [
    ['과거 최고 일치', bestRank(a) ? `${bestRank(a)}등 상당` : '없음', bestRank(b) ? `${bestRank(b)}등 상당` : '없음'],
    ['가장 최근 일치', recentRank(a) ? `${recentRank(a)}등 상당` : '없음', recentRank(b) ? `${recentRank(b)}등 상당` : '없음'],
    ['평균 출현', `${a.groupFrequency.selectedAverage.toFixed(1)}회`, `${b.groupFrequency.selectedAverage.toFixed(1)}회`],
    ['홀수 : 짝수', `${a.shape.oddCount} : ${a.shape.evenCount}`, `${b.shape.oddCount} : ${b.shape.evenCount}`],
    ['번호 합계', String(a.shape.sum), String(b.shape.sum)], ['연속 번호', consecutive(a), consecutive(b)],
  ];
  const common = a.numbers.filter((number) => b.numbers.includes(number));
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Text style={styles.action}>‹ 결과</Text></Pressable><Text style={styles.title}>조합 비교</Text></View>
    <View style={styles.sets}><View><Text style={styles.label}>A</Text><Text style={styles.numbers}>{a.numbers.map(n=>String(n).padStart(2,'0')).join(' · ')}</Text></View><View><Text style={styles.label}>B</Text><Text style={styles.numbers}>{b.numbers.map(n=>String(n).padStart(2,'0')).join(' · ')}</Text></View></View>
    <AnalysisControls bonusIncluded={bonusIncluded} firstRound={firstRound} latestRound={latestRound} onBonusChange={onBonusChange} onPeriodChange={onPeriodChange} period={period}/>
    <View style={styles.table}><View style={styles.row}><Text style={styles.name}/><Text style={styles.value}>A</Text><Text style={styles.value}>B</Text></View>{rows.map(([name,av,bv])=><View key={name} style={styles.row}><Text style={styles.name}>{name}</Text><Text style={styles.value}>{av}</Text><Text style={styles.value}>{bv}</Text></View>)}</View>
    <View style={styles.common}><Text style={styles.label}>공통 번호</Text><Text style={styles.numbers}>{common.length ? common.map(n=>String(n).padStart(2,'0')).join(' · ') : '없음'}</Text></View>
    <Text style={styles.note}>같은 기간과 보너스 조건의 과거 기록을 나란히 표시합니다.</Text>
  </ScrollView>;
}
const styles=StyleSheet.create({content:{padding:spacing.lg,paddingBottom:spacing.xxxl,gap:spacing.lg},header:{flexDirection:'row',alignItems:'center',gap:spacing.lg},back:{minHeight:44,justifyContent:'center'},action:{color:colors.accentPrimary,fontSize:typography.sizes.small},title:{color:colors.textPrimary,fontSize:typography.sizes.section,fontWeight:typography.weights.semibold},sets:{gap:spacing.md,padding:spacing.lg,borderRadius:radius.lg,borderWidth:1,borderColor:colors.divider,backgroundColor:colors.surface},label:{color:colors.textSecondary,fontSize:typography.sizes.caption,marginBottom:spacing.xs},numbers:{color:colors.textPrimary,fontSize:typography.sizes.small,fontWeight:typography.weights.semibold},table:{borderRadius:radius.lg,borderWidth:1,borderColor:colors.divider,overflow:'hidden'},row:{flexDirection:'row',minHeight:48,alignItems:'center',paddingHorizontal:spacing.md,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.divider},name:{width:'40%',color:colors.textSecondary,fontSize:typography.sizes.caption},value:{width:'30%',textAlign:'right',color:colors.textPrimary,fontSize:typography.sizes.caption},common:{padding:spacing.lg,borderRadius:radius.lg,backgroundColor:colors.surface},note:{color:colors.textSecondary,fontSize:typography.sizes.caption,textAlign:'center'}});
