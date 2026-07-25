import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, LoaderCircle } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { uploadAndAnalyzeImage } from '../../src/features/analysis/analysis-service';
import { appEnv } from '../../src/lib/env';
import { useAppStore } from '../../src/stores/app-store';
import { useIconColors } from '../../src/theme/icon-colors';

export default function AnalyzingScreen() {
  const iconColors = useIconColors();
  const [stage, setStage] = useState<'upload' | 'analyze'>('upload');
  const [error, setError] = useState('');
  const params = useLocalSearchParams<{ imageUri?: string; width?: string; height?: string; storageLocationHint?: string }>();
  const setReviewCandidates = useAppStore((state) => state.setReviewCandidates);
  useEffect(() => {
    let active = true;
    const run = async () => {
      setStage('analyze');
      try {
        if (appEnv.aiMode === 'mock') await new Promise((resolve) => setTimeout(resolve, 1200));
        const result = params.imageUri
          ? await uploadAndAnalyzeImage({ uri: params.imageUri, width: Number(params.width), height: Number(params.height) }, params.storageLocationHint)
          : null;
        if (!active) return;
        if (result) setReviewCandidates(result.candidates, params.storageLocationHint, result.analysisId);
        router.replace('/capture/review');
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : '사진 분석에 실패했어요.');
      }
    };
    void run();
    return () => { active = false; };
  }, [params.height, params.imageUri, params.storageLocationHint, params.width, setReviewCandidates]);
  if (error) return <AppScreen title="분석하지 못했어요" subtitle={error}><Card className="gap-3"><Text className="font-sans text-[15px] leading-6 text-ink-light dark:text-ink-dark">사진은 보존했어요. 다시 시도하거나 직접 재료를 추가할 수 있어요.</Text><Button label="다시 촬영" onPress={() => router.replace('/capture')} /><Button label="직접 추가" variant="secondary" onPress={() => router.replace('/inventory/add')} /></Card></AppScreen>;
  return (
    <AppScreen scroll={false} testID="analyzing-screen">
      <View className="min-h-full justify-center gap-6 py-8">
        <View className="items-center gap-4"><LoaderCircle color={iconColors.primary} size={64} strokeWidth={1.5} /><Text className="font-sans text-2xl font-bold text-ink-light dark:text-ink-dark">재료를 찾고 있어요</Text><Text className="text-center font-sans text-[15px] leading-6 text-muted-light dark:text-muted-dark">AI 결과는 바로 저장되지 않아요.{`\n`}잠시 후 직접 확인할 수 있어요.</Text></View>
        <Card className="gap-4"><View className="flex-row items-center gap-3">{stage === 'upload' ? <LoaderCircle color={iconColors.primary} size={20} /> : <Check color={iconColors.primary} size={20} />}<Text className="font-sans text-[15px] text-ink-light dark:text-ink-dark">사진 안전하게 준비</Text></View><View className="flex-row items-center gap-3"><LoaderCircle color={stage === 'analyze' ? iconColors.primary : iconColors.muted} size={20} /><Text className="font-sans text-[15px] text-ink-light dark:text-ink-dark">재료 이름과 수량 후보 분석</Text></View></Card>
        <Button label="분석 취소" variant="ghost" onPress={() => router.replace('/capture')} />
      </View>
    </AppScreen>
  );
}
