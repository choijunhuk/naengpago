import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { QuantityEditor } from '../../src/components/inventory/quantity-editor';
import { AppScreen } from '../../src/components/ui/app-screen';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import type { DuplicateAction } from '../../src/domain/models';
import { useConfirmAnalysis } from '../../src/features/data/analysis';
import { useAppStore } from '../../src/stores/app-store';

const duplicateOptions: Array<{ value: DuplicateAction; label: string }> = [
  { value: 'ADD', label: '기존에 추가' }, { value: 'SEPARATE', label: '별도 등록' }, { value: 'REPLACE', label: '기존 교체' }, { value: 'IGNORE', label: '무시' },
];

export default function ReviewScreen() {
  const draft = useAppStore((state) => state.reviewDraft);
  const analysisId = useAppStore((state) => state.reviewAnalysisId);
  const update = useAppStore((state) => state.updateReviewCandidate);
  const { confirmAnalysis } = useConfirmAnalysis();
  const [saving, setSaving] = useState(false);
  const selectedCount = draft.filter((item) => item.selected && item.duplicateAction !== 'IGNORE').length;
  const save = async () => {
    setSaving(true);
    try {
      const count = await confirmAnalysis(analysisId, draft);
      Alert.alert('재고에 저장했어요', `${count}개 재료를 반영했어요.`, [
        { text: '확인', onPress: () => router.replace('/(tabs)/inventory') },
      ]);
    } catch (cause) {
      Alert.alert('저장하지 못했어요', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <AppScreen title="분석 결과 확인" subtitle="AI가 찾은 후보예요. 저장 전 이름과 수량을 꼭 확인해주세요." testID="review-screen">
      <Card className="h-48 items-center justify-center gap-3 border-primary-light dark:border-primary-dark"><Text className="text-5xl">🥚 🥛 🥩 🥬</Text><Text className="font-sans text-xs text-muted-light dark:text-muted-dark">데모 사진 · 후보 카드를 누르면 실제 앱에서는 박스가 강조돼요</Text></Card>
      <View className="gap-4">{draft.map((candidate) => (
        <Card key={candidate.id} className={`gap-4 ${candidate.selected ? '' : 'opacity-60'}`}>
          <View className="flex-row items-center gap-3"><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: candidate.selected }} accessibilityLabel={`${candidate.displayName} 선택`} className={`h-11 w-11 items-center justify-center rounded-button border ${candidate.selected ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light dark:border-line-dark'}`} onPress={() => update(candidate.id, { selected: !candidate.selected })}><Text className={`font-sans text-lg font-bold ${candidate.selected ? 'text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{candidate.selected ? '✓' : ''}</Text></Pressable><TextInput className="min-h-11 flex-1 rounded-button border border-line-light px-3 font-sans text-[15px] font-semibold text-ink-light dark:border-line-dark dark:text-ink-dark" value={candidate.displayName} onChangeText={(displayName) => update(candidate.id, { displayName })} accessibilityLabel="재료 이름" />{candidate.confidence < 0.5 ? <Badge label="불확실" tone="danger" /> : <Badge label={`AI ${Math.round(candidate.confidence * 100)}%`} />}</View>
          {candidate.selected ? <QuantityEditor quantityType={candidate.quantityType} quantity={candidate.quantity} unit={candidate.unit} remainingLevel={candidate.remainingLevel} onQuantityChange={(quantity) => update(candidate.id, { quantity })} onLevelChange={(remainingLevel) => update(candidate.id, { remainingLevel })} /> : null}
          {candidate.selected && candidate.duplicateOfItemId ? <View className="gap-2"><Text className="font-sans text-sm font-semibold text-warning">비슷한 재고가 이미 있어요</Text><View className="flex-row flex-wrap gap-2">{duplicateOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: candidate.duplicateAction === option.value }} accessibilityLabel={option.label} className={`min-h-11 justify-center rounded-full border px-3 ${candidate.duplicateAction === option.value ? 'border-warning' : 'border-line-light dark:border-line-dark'}`} onPress={() => update(candidate.id, { duplicateAction: option.value })}><Text className={`font-sans text-xs ${candidate.duplicateAction === option.value ? 'font-semibold text-warning' : 'text-muted-light dark:text-muted-dark'}`}>{option.label}</Text></Pressable>)}</View></View> : null}
        </Card>
      ))}</View>
      <Button label={`${selectedCount}개 재고에 저장`} disabled={!selectedCount} loading={saving} onPress={() => void save()} testID="review-save" />
      <Button label="누락 재료 직접 추가" variant="secondary" onPress={() => router.push('/inventory/add')} />
    </AppScreen>
  );
}
