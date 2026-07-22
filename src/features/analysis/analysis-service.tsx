import * as ImageManipulator from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { AnalysisCandidateInput } from '../../domain/models';
import { appEnv } from '../../lib/env';
import { supabase } from '../../lib/supabase';

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
}

export async function prepareIngredientImage(asset: ImagePickerAsset): Promise<PreparedImage> {
  const longest = Math.max(asset.width, asset.height);
  const scale = longest > 1568 ? 1568 / longest : 1;
  const width = Math.round(asset.width * scale);
  const height = Math.round(asset.height * scale);
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    scale < 1 ? [{ resize: { width, height } }] : [],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, width: result.width, height: result.height };
}

interface AnalyzeResponse {
  analysisId: string;
  status: 'DONE';
  candidates: Array<{
    id: string;
    raw_name: string;
    matched_master_id: string | null;
    display_name: string;
    category: AnalysisCandidateInput['category'];
    quantity_type: AnalysisCandidateInput['quantityType'];
    estimated_count: number | null;
    unit: string | null;
    remaining_level: AnalysisCandidateInput['remainingLevel'];
    confidence: number;
    duplicate_of_item_id: string | null;
  }>;
}

export async function uploadAndAnalyzeImage(
  image: PreparedImage,
  storageLocationHint?: string,
): Promise<AnalysisCandidateInput[] | null> {
  if (appEnv.aiMode === 'mock') return null;
  if (!supabase) throw new Error('Supabase 환경 변수가 필요해요.');

  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .limit(1)
    .single();
  if (membershipError || !membership) throw new Error('참여 중인 household를 찾을 수 없어요.');

  const response = await fetch(image.uri);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 1_572_864) throw new Error('압축 후 사진이 1.5MB를 넘었어요.');
  const path = `${membership.household_id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('ingredient-images')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('로그인이 필요해요.');
  const { data: imageRow, error: imageError } = await supabase
    .from('ingredient_images')
    .insert({
      household_id: membership.household_id,
      storage_path: path,
      width: image.width,
      height: image.height,
      bytes: bytes.byteLength,
      uploaded_by: userData.user.id,
    })
    .select('id')
    .single();
  if (imageError || !imageRow) throw imageError ?? new Error('사진 정보를 저장하지 못했어요.');

  const { data, error } = await supabase.functions.invoke<AnalyzeResponse>('analyze-image', {
    body: { imageId: imageRow.id, storageLocationHint },
  });
  if (error || !data) throw error ?? new Error('사진 분석에 실패했어요.');
  return data.candidates.map((candidate) => ({
    id: candidate.id,
    rawName: candidate.raw_name,
    matchedMasterId: candidate.matched_master_id,
    displayName: candidate.display_name,
    category: candidate.category,
    quantityType: candidate.quantity_type,
    estimatedCount: candidate.estimated_count,
    unit: candidate.unit,
    remainingLevel: candidate.remaining_level,
    confidence: candidate.confidence,
    duplicateOfItemId: candidate.duplicate_of_item_id,
  }));
}

