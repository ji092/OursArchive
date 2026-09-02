import { supabase } from '@/shared/lib/api/supabaseClient';
import { deleteScheduleAck } from '@/shared/lib/schedule/scheduleAckApi';
import { reportFailure } from '@/shared/lib/notice/failureNotice';
import { deleteContentPhotos, resolveContentPhotoUrls, rollbackUploadedPhotos, uploadContentPhotos } from '@/shared/lib/storage/uploadContentPhotos';
import type { BucketItem, BucketPhoto, ConsultNote, Expense, Honeymoon, HoneymoonDay, PaymentMethod, PrepItem, VendorContact, WeddingEventType } from './types';

// backend/policies/0012_wedding_rpc.sql의 create_prep_item/update_prep_item/save_honeymoon RPC를 쓴다 —
// prep_item + 3개 attr 테이블(1:1)을 원자적으로 같이 써야 해서 클라이언트 순차 호출 대신 서버 함수로 처리.
const KO_TO_DB_METHOD: Record<PaymentMethod, 'card' | 'cash'> = { 카드: 'card', 현금: 'cash' };
const DB_TO_KO_METHOD: Record<string, PaymentMethod> = { card: '카드', cash: '현금' };

function toDbMethod(method: PaymentMethod | null): string | null {
  return method ? KO_TO_DB_METHOD[method] : null;
}

function toKoMethod(method: string | null): PaymentMethod | null {
  return method ? (DB_TO_KO_METHOD[method] ?? null) : null;
}

function buildBudgetJson(budget: PrepItem['budget']) {
  if (!budget) return null;
  return {
    plannedAmount: budget.plannedAmount,
    deposit: { amount: budget.deposit.amount, method: toDbMethod(budget.deposit.method), memo: budget.deposit.memo },
    interim: { amount: budget.interim.amount, method: toDbMethod(budget.interim.method), memo: budget.interim.memo },
    balance: { amount: budget.balance.amount, method: toDbMethod(budget.balance.method), memo: budget.balance.memo },
    usedAmount: budget.usedAmount,
  };
}

async function fetchProfileNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('id, nickname, name').in('id', ids);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p.nickname ?? p.name ?? '이름없음']));
}

const PREP_ITEM_SELECT = `
  id, title, category, assignee_id,
  checklist_attr(done, due_date),
  schedule_attr(scheduled_at, location, event_type),
  budget_attr(planned_amount, deposit_amount, deposit_method, deposit_memo, interim_amount, interim_method, interim_memo, balance_amount, balance_method, balance_memo, used_amount),
  prep_item_consult_note(consult_note_id)
`;

function mapPrepItemRow(row: any, nameById: Map<string, string>): PrepItem {
  const checklist = Array.isArray(row.checklist_attr) ? row.checklist_attr[0] : row.checklist_attr;
  const schedule = Array.isArray(row.schedule_attr) ? row.schedule_attr[0] : row.schedule_attr;
  const budget = Array.isArray(row.budget_attr) ? row.budget_attr[0] : row.budget_attr;
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_id ? (nameById.get(row.assignee_id) ?? null) : null,
    checklist: checklist ? { done: checklist.done, dueDate: checklist.due_date } : undefined,
    schedule: schedule ? { scheduledAt: schedule.scheduled_at, location: schedule.location ?? '', eventType: schedule.event_type } : undefined,
    budget: budget
      ? {
          plannedAmount: budget.planned_amount,
          deposit: { amount: budget.deposit_amount, method: toKoMethod(budget.deposit_method), memo: budget.deposit_memo },
          interim: { amount: budget.interim_amount, method: toKoMethod(budget.interim_method), memo: budget.interim_memo },
          balance: { amount: budget.balance_amount, method: toKoMethod(budget.balance_method), memo: budget.balance_memo },
          usedAmount: budget.used_amount,
        }
      : undefined,
    consultNoteIds: (row.prep_item_consult_note ?? []).map((j: { consult_note_id: string }) => j.consult_note_id),
  };
}

export async function fetchPrepItems(workspaceId: string): Promise<PrepItem[]> {
  const { data, error } = await supabase
    .from('prep_item')
    .select(PREP_ITEM_SELECT)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const assigneeIds = Array.from(new Set((data ?? []).map((r) => r.assignee_id).filter((id): id is string => !!id)));
  const nameById = await fetchProfileNames(assigneeIds);
  return (data ?? []).map((row) => mapPrepItemRow(row, nameById));
}

export interface CreatePrepItemInput {
  workspaceId: string;
  title: string;
  category: PrepItem['category'];
  assigneeId: string | null;
  checklist?: { dueDate: string };
  schedule?: { scheduledAt: string; location: string; eventType: WeddingEventType };
  budget?: PrepItem['budget'];
  consultNoteIds?: string[];
}

export async function createPrepItem(input: CreatePrepItemInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_prep_item', {
    ws: input.workspaceId,
    p_title: input.title,
    p_category: input.category,
    p_assignee_id: input.assigneeId,
    p_checklist: input.checklist ? { done: false, dueDate: input.checklist.dueDate } : null,
    p_schedule: input.schedule ?? null,
    p_budget: buildBudgetJson(input.budget),
    p_consult_note_ids: input.consultNoteIds ?? [],
  });
  if (error) throw error;
  return data as string;
}

// update_prep_item RPC는 "전체 교체"다 — 넘기지 않은 속성(checklist/schedule/budget)은 지워진다.
// 그래서 patch는 반드시 현재 값과 합쳐서 완전한 상태로 보내야 한다. 예전에는 호출부가 부분 patch를
// 그대로 넘겨서, 일정 탭에서 체크리스트 항목에 일정을 붙이면 그 항목의 체크리스트·예산이 같이
// 지워졌다(2026-08-31 수정).
//
// null = 그 속성을 지운다 / 생략(undefined) = 현재 값을 그대로 둔다.
export interface PrepItemPatch {
  title?: string;
  category?: PrepItem['category'];
  assigneeId?: string | null;
  checklist?: PrepItem['checklist'] | null;
  schedule?: PrepItem['schedule'] | null;
  budget?: PrepItem['budget'] | null;
  consultNoteIds?: string[];
}

export interface UpdatePrepItemInput {
  id: string;
  patch: PrepItemPatch;
}

// 이 파일 안에서 patch 병합·삭제 판단에만 쓴다(외부로 내보내지 않는다).
async function fetchPrepItem(id: string): Promise<PrepItem> {
  const { data, error } = await supabase.from('prep_item').select(PREP_ITEM_SELECT).eq('id', id).single();
  if (error) throw error;
  return mapPrepItemRow(data, new Map());
}

function pick<T>(patched: T | null | undefined, current: T | undefined): T | null {
  if (patched === undefined) return current ?? null;
  return patched ?? null;
}

export async function updatePrepItem({ id, patch }: UpdatePrepItemInput): Promise<void> {
  // 병합 기준값을 서버에서 다시 읽는다 — 화면 캐시가 오래된 상태에서 저장해 남의 수정을
  // 덮어쓰는 창을 최대한 줄인다(RPC 자체가 전체 교체라 완전한 원자성은 아니다).
  const current = await fetchPrepItem(id);
  const { error } = await supabase.rpc('update_prep_item', {
    item_id: id,
    p_title: patch.title ?? current.title,
    p_category: patch.category ?? current.category,
    p_assignee_id: patch.assigneeId !== undefined ? patch.assigneeId : current.assigneeId,
    p_checklist: pick(patch.checklist, current.checklist),
    p_schedule: pick(patch.schedule, current.schedule),
    p_budget: buildBudgetJson(pick(patch.budget, current.budget) ?? undefined),
    p_consult_note_ids: patch.consultNoteIds ?? current.consultNoteIds,
  });
  if (error) throw error;
}

// 일정만 떼어내기 — 체크리스트·예산이 함께 붙어 있는 항목은 지우지 않고 일정 속성만 없앤다.
// 일정에 걸린 확인 요청(schedule_ack)과 일정 댓글도 같이 정리한다. 안 그러면 지운 일정에
// 리마인더 푸시가 계속 나간다(deleteLovePlan과 같은 규칙).
export async function deleteWeddingSchedule(id: string): Promise<void> {
  const current = await fetchPrepItem(id);
  await deleteScheduleAck('wedding_schedule', id);
  if (current.checklist || current.budget) {
    await updatePrepItem({ id, patch: { schedule: null } });
    return;
  }
  await deletePrepItem(id);
}

export async function deletePrepItem(id: string): Promise<void> {
  // 항목이 사라지면 그 항목의 일정 확인 요청도 의미가 없다. 폴리모픽 참조라 캐스케이드가
  // 없으므로 두 소스(일정 속성 / 체크리스트 기한)를 모두 직접 지운다.
  await deleteScheduleAck('checklist_due', id).catch((cause) =>
    reportFailure('항목은 삭제했지만 기한 알림 설정을 지우지 못했어요. 알림이 계속 올 수 있어요.', cause),
  );
  const { error } = await supabase.from('prep_item').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleChecklistDone(id: string): Promise<void> {
  const { data, error } = await supabase.from('checklist_attr').select('done').eq('prep_item_id', id).single();
  if (error) throw error;
  const done = !data.done;
  const { error: updateError } = await supabase.from('checklist_attr').update({ done }).eq('prep_item_id', id);
  if (updateError) throw updateError;

  // 완료로 바꾸면 기한 확인 요청을 거둔다 — run_schedule_reminders()는 완료 여부를 모르고
  // 댓글로 확인할 때까지 계속 조르기 때문에, 끝낸 항목이 계속 울리는 것을 여기서 막는다.
  if (done) {
    await deleteScheduleAck('checklist_due', id).catch((cause) =>
      reportFailure('완료 처리는 됐지만 기한 알림을 끄지 못했어요. 알림이 계속 올 수 있어요.', cause),
    );
  }
}

export async function fetchConsultNotes(workspaceId: string): Promise<ConsultNote[]> {
  const { data, error } = await supabase
    .from('consult_note')
    .select('id, vendor_name, vendor_type, contact_phone, visit_date, visit_time, status, key_memos, questions, address, lat, lng')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const { data: attachments, error: attachmentError } = await supabase
    .from('attachment')
    .select('link_id, file_url')
    .eq('workspace_id', workspaceId)
    .eq('link_type', 'consult');
  if (attachmentError) throw attachmentError;
  const pathsByNote = new Map<string, string[]>();
  for (const a of attachments ?? []) {
    if (!a.link_id) continue;
    const list = pathsByNote.get(a.link_id) ?? [];
    list.push(a.file_url);
    pathsByNote.set(a.link_id, list);
  }
  const urlByPath = await resolveContentPhotoUrls((attachments ?? []).map((a) => a.file_url));

  return (data ?? []).map((n) => ({
    id: n.id,
    vendorName: n.vendor_name,
    vendorType: n.vendor_type,
    contactPhone: n.contact_phone,
    visitDate: n.visit_date,
    visitTime: n.visit_time ? String(n.visit_time).slice(0, 5) : null,
    status: n.status,
    keyMemos: Array.isArray(n.key_memos) ? n.key_memos : [],
    questions: Array.isArray(n.questions) ? n.questions : [],
    address: n.address,
    lat: n.lat,
    lng: n.lng,
    photos: (pathsByNote.get(n.id) ?? []).map((path) => ({ path, gradient: 'linear-gradient(135deg, #efe3d6, #d9cfc2)', imageUrl: urlByPath[path] })),
  }));
}

export interface CreateConsultNoteInput {
  workspaceId: string;
  vendorName: string;
  vendorType: ConsultNote['vendorType'];
  contactPhone: string;
  visitDate: string;
  visitTime: string | null;
  status: ConsultNote['status'];
  keyMemos: string[];
  questions: string[];
  address: string;
  lat: number | null;
  lng: number | null;
  photoFiles: File[];
}

export async function createConsultNote(input: CreateConsultNoteInput): Promise<string> {
  const { data: note, error } = await supabase
    .from('consult_note')
    .insert({
      workspace_id: input.workspaceId,
      vendor_name: input.vendorName,
      vendor_type: input.vendorType,
      contact_phone: input.contactPhone,
      visit_date: input.visitDate,
      visit_time: input.visitTime,
      status: input.status,
      key_memos: input.keyMemos,
      questions: input.questions,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
    })
    .select('id')
    .single();
  if (error) throw error;

  // 노트는 이미 저장됐으므로 연락처 동기화가 실패해도 저장을 되돌리지 않는다 — 대신 사용자에게 알린다
  // (CLAUDE.md — 되돌릴 수 없는 실패는 재시도가 아니라 알림 대상).
  await syncVendorContactFromConsultNote({
    workspaceId: input.workspaceId,
    consultNoteId: note.id,
    vendorName: input.vendorName,
    category: input.vendorType,
    phone: input.contactPhone,
  }).catch((cause) => reportFailure('상담노트는 저장됐지만 업체 연락처 카드를 만들지 못했어요. 업체 연락처에서 직접 추가해주세요.', cause));

  if (input.photoFiles.length > 0) {
    const paths = await uploadContentPhotos(input.workspaceId, 'consult_note', note.id, input.photoFiles);
    const { error: attachError } = await supabase
      .from('attachment')
      .insert(paths.map((path) => ({ workspace_id: input.workspaceId, file_url: path, file_type: 'image', link_type: 'consult', link_id: note.id })));
    if (attachError) {
      // 업로드만 되고 DB 행이 없으면 아무도 참조하지 않는 파일이 Storage에 남는다.
      await rollbackUploadedPhotos(paths);
      throw attachError;
    }
  }

  // 호출부가 이 id로 schedule_ack(확인 요청)를 만든다 — 상담노트도 알림 대상 일정이다(2026-09-03).
  return note.id;
}

export interface UpdateConsultNoteInput {
  id: string;
  workspaceId: string;
  patch: Partial<{
    vendorName: string;
    vendorType: ConsultNote['vendorType'];
    contactPhone: string;
    visitDate: string;
    visitTime: string | null;
    status: ConsultNote['status'];
    keyMemos: string[];
    questions: string[];
    address: string;
    lat: number | null;
    lng: number | null;
  }>;
  removedPhotoPaths?: string[];
  newPhotoFiles?: File[];
}

export async function updateConsultNote({ id, workspaceId, patch, removedPhotoPaths = [], newPhotoFiles = [] }: UpdateConsultNoteInput): Promise<void> {
  const { error } = await supabase
    .from('consult_note')
    .update({
      vendor_name: patch.vendorName,
      vendor_type: patch.vendorType,
      contact_phone: patch.contactPhone,
      visit_date: patch.visitDate,
      visit_time: patch.visitTime,
      status: patch.status,
      key_memos: patch.keyMemos,
      questions: patch.questions,
      address: patch.address,
      lat: patch.lat,
      lng: patch.lng,
    })
    .eq('id', id);
  if (error) throw error;

  if (patch.vendorName !== undefined && patch.vendorType !== undefined && patch.contactPhone !== undefined) {
    await syncVendorContactFromConsultNote({
      workspaceId,
      consultNoteId: id,
      vendorName: patch.vendorName,
      category: patch.vendorType,
      phone: patch.contactPhone,
    }).catch((cause) => reportFailure('상담노트는 저장됐지만 업체 연락처 카드를 갱신하지 못했어요. 업체 연락처에서 직접 고쳐주세요.', cause));
  }

  if (removedPhotoPaths.length > 0) {
    await supabase.from('attachment').delete().in('file_url', removedPhotoPaths);
    await deleteContentPhotos(removedPhotoPaths);
  }
  if (newPhotoFiles.length > 0) {
    const paths = await uploadContentPhotos(workspaceId, 'consult_note', id, newPhotoFiles);
    const { error: attachError } = await supabase
      .from('attachment')
      .insert(paths.map((path) => ({ workspace_id: workspaceId, file_url: path, file_type: 'image', link_type: 'consult', link_id: id })));
    if (attachError) {
      // 업로드만 되고 DB 행이 없으면 아무도 참조하지 않는 파일이 Storage에 남는다.
      await rollbackUploadedPhotos(paths);
      throw attachError;
    }
  }
}

// 상담노트 삭제 — 노트 행, 붙어 있던 사진(attachment 행 + Storage 파일), 일정 항목과의 연결을
// 함께 정리한다. prep_item_consult_note는 consult_note FK가 on delete cascade라 자동으로 지워진다.
// 순서: Storage 파일 → attachment 행 → 노트 행. 중간에 실패하면 노트는 남고 사용자가 다시 시도할 수
// 있다(반대 순서면 노트만 사라지고 아무도 참조하지 않는 파일이 남는다).
export async function deleteConsultNote(id: string): Promise<void> {
  const { data: attachments, error: attachmentError } = await supabase
    .from('attachment')
    .select('file_url')
    .eq('link_type', 'consult')
    .eq('link_id', id);
  if (attachmentError) throw attachmentError;

  const paths = (attachments ?? []).map((a) => a.file_url);
  if (paths.length > 0) {
    await deleteContentPhotos(paths);
    const { error: rowError } = await supabase.from('attachment').delete().eq('link_type', 'consult').eq('link_id', id);
    if (rowError) throw rowError;
  }

  // 상담노트는 알림 대상 일정이라 schedule_ack/schedule_comment가 붙는다. 폴리모픽 참조라
  // FK 캐스케이드가 없으므로 직접 지운다 — 안 지우면 삭제된 노트로 리마인더가 계속 나간다.
  await deleteScheduleAck('consult_note', id).catch((cause) =>
    reportFailure('상담노트는 삭제했지만 확인 알림 설정을 지우지 못했어요. 알림이 계속 올 수 있어요.', cause),
  );

  const { error } = await supabase.from('consult_note').delete().eq('id', id);
  if (error) throw error;
}

// 상담노트에 연락처를 적으면 업체 연락처 카드가 자동으로 생긴다(2026-09-01 사용자 지정).
// 카드 이름 = 상담노트의 업체명, 항목 = 노트의 카테고리, 전화 = 노트의 담당자 연락처.
// 같은 노트로 이미 만들어진 카드가 있으면 새로 만들지 않고 그 카드를 갱신한다 —
// 노트를 고칠 때마다 카드가 늘어나면 명단이 금방 못 쓰게 된다.
// 담당자·계약 정보는 카드에서 따로 채우는 값이라 건드리지 않는다.
async function syncVendorContactFromConsultNote(input: {
  workspaceId: string;
  consultNoteId: string;
  vendorName: string;
  category: ConsultNote['vendorType'];
  phone: string;
}): Promise<void> {
  const { data: existing, error } = await supabase
    .from('vendor_contact')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('consult_note_id', input.consultNoteId)
    .maybeSingle();
  if (error) throw error;

  if (existing) {
    const { error: updateError } = await supabase
      .from('vendor_contact')
      .update({ vendor_name: input.vendorName, category: input.category, phone: input.phone })
      .eq('id', existing.id);
    if (updateError) throw updateError;
    return;
  }

  // 연락처가 비어 있으면 카드를 새로 만들지 않는다. 이미 있는 카드는 위에서 갱신된다.
  if (!input.phone.trim()) return;

  const { error: insertError } = await supabase.from('vendor_contact').insert({
    workspace_id: input.workspaceId,
    vendor_name: input.vendorName,
    category: input.category,
    manager_name: '',
    phone: input.phone,
    contract_info: '',
    consult_note_id: input.consultNoteId,
  });
  if (insertError) throw insertError;
}

export async function fetchHoneymoon(workspaceId: string): Promise<Honeymoon | null> {
  const { data: hm, error } = await supabase
    .from('honeymoon')
    .select('id, destination, start_date, end_date')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!hm) return null;

  const { data: days, error: daysError } = await supabase
    .from('honeymoon_day')
    .select('id, day_number, title, detail, planned_amount, used_amount, payment_method, payment_memo')
    .eq('honeymoon_id', hm.id)
    .order('day_number', { ascending: true });
  if (daysError) throw daysError;

  const { data: photos, error: photosError } = await supabase
    .from('honeymoon_day_photo')
    .select('day_id, url, sort_order')
    .in('day_id', (days ?? []).map((d) => d.id));
  if (photosError) throw photosError;
  const urlByPath = await resolveContentPhotoUrls((photos ?? []).map((p) => p.url));
  const photosByDay = new Map<string, HoneymoonDay['photos']>();
  for (const p of [...(photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
    const list = photosByDay.get(p.day_id) ?? [];
    list.push({ path: p.url, gradient: 'linear-gradient(135deg, #d8c9ec, #f0e6f5)', imageUrl: urlByPath[p.url] });
    photosByDay.set(p.day_id, list);
  }

  return {
    destination: hm.destination,
    startDate: hm.start_date,
    endDate: hm.end_date,
    days: (days ?? []).map((d) => ({
      id: d.id,
      dayNumber: d.day_number,
      title: d.title,
      detail: d.detail ?? '',
      photos: photosByDay.get(d.id) ?? [],
      budget: { plannedAmount: d.planned_amount, usedAmount: d.used_amount, method: toKoMethod(d.payment_method), memo: d.payment_memo },
    })),
  };
}

export async function updateHoneymoon(workspaceId: string, honeymoon: Honeymoon): Promise<void> {
  const { error } = await supabase.rpc('save_honeymoon', {
    ws: workspaceId,
    p_destination: honeymoon.destination,
    p_start_date: honeymoon.startDate,
    p_end_date: honeymoon.endDate,
    p_days: honeymoon.days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      title: d.title,
      detail: d.detail,
      budget: { plannedAmount: d.budget.plannedAmount, usedAmount: d.budget.usedAmount, method: toDbMethod(d.budget.method), memo: d.budget.memo },
    })),
  });
  if (error) throw error;
}

// honeymoon_day.id는 addDay()에서 미리 생성해 안정적이므로(0012_wedding_rpc.sql save_honeymoon 주석 참조),
// 사진은 전체 저장(RPC)과 분리해 day.id에 바로 CRUD한다.
export async function saveHoneymoonDayPhotos(
  workspaceId: string,
  dayId: string,
  removedPhotoPaths: string[],
  newPhotoFiles: File[],
): Promise<void> {
  if (removedPhotoPaths.length > 0) {
    await supabase.from('honeymoon_day_photo').delete().in('url', removedPhotoPaths);
    await deleteContentPhotos(removedPhotoPaths);
  }
  if (newPhotoFiles.length > 0) {
    const { count } = await supabase.from('honeymoon_day_photo').select('*', { count: 'exact', head: true }).eq('day_id', dayId);
    const paths = await uploadContentPhotos(workspaceId, 'honeymoon_day', dayId, newPhotoFiles);
    const startOrder = count ?? 0;
    const { error } = await supabase
      .from('honeymoon_day_photo')
      .insert(paths.map((url, i) => ({ day_id: dayId, url, sort_order: startOrder + i })));
    if (error) {
      // 업로드만 되고 DB 행이 없으면 아무도 참조하지 않는 파일이 Storage에 남는다.
      await rollbackUploadedPhotos(paths);
      throw error;
    }
  }
}

export async function fetchVendorContacts(workspaceId: string): Promise<VendorContact[]> {
  const { data, error } = await supabase
    .from('vendor_contact')
    .select('id, vendor_name, category, manager_name, phone, contract_info, consult_note_id')
    .eq('workspace_id', workspaceId)
    .order('vendor_name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((v) => ({
    id: v.id,
    vendorName: v.vendor_name,
    category: v.category ?? null,
    managerName: v.manager_name ?? '',
    phone: v.phone ?? '',
    contractInfo: v.contract_info ?? '',
    consultNoteId: v.consult_note_id,
  }));
}

export interface SaveVendorContactInput {
  vendorName: string;
  category: VendorContact['category'];
  managerName: string;
  phone: string;
  contractInfo: string;
  consultNoteId: string | null;
}

export async function createVendorContact(workspaceId: string, input: SaveVendorContactInput): Promise<void> {
  const { error } = await supabase.from('vendor_contact').insert({
    workspace_id: workspaceId,
    vendor_name: input.vendorName,
    category: input.category,
    manager_name: input.managerName,
    phone: input.phone,
    contract_info: input.contractInfo,
    consult_note_id: input.consultNoteId,
  });
  if (error) throw error;
}

export async function updateVendorContact(id: string, input: SaveVendorContactInput): Promise<void> {
  const { error } = await supabase
    .from('vendor_contact')
    .update({
      vendor_name: input.vendorName,
      category: input.category,
      manager_name: input.managerName,
      phone: input.phone,
      contract_info: input.contractInfo,
      consult_note_id: input.consultNoteId,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteVendorContact(id: string): Promise<void> {
  const { error } = await supabase.from('vendor_contact').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchExpenses(workspaceId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expense')
    .select('id, category, amount, status, prep_item_id')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((e) => ({ id: e.id, category: e.category, amount: e.amount, status: e.status, prepItemId: e.prep_item_id }));
}

export interface SaveExpenseInput {
  category: Expense['category'];
  amount: number;
  status: Expense['status'];
  prepItemId: string | null;
}

export async function createExpense(workspaceId: string, input: SaveExpenseInput): Promise<void> {
  const { error } = await supabase.from('expense').insert({
    workspace_id: workspaceId,
    category: input.category,
    amount: input.amount,
    status: input.status,
    prep_item_id: input.prepItemId,
  });
  if (error) throw error;
}

export async function updateExpense(id: string, input: SaveExpenseInput): Promise<void> {
  const { error } = await supabase
    .from('expense')
    .update({ category: input.category, amount: input.amount, status: input.status, prep_item_id: input.prepItemId })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expense').delete().eq('id', id);
  if (error) throw error;
}


// ─────────────────────────────────────────────────────────────────────────────
// 버킷 (wedding_bucket) — 관심 업체 카드. 스키마는 backend/migrations/0022_wedding_bucket.sql.
// 사진 경로 규칙은 다른 챕터와 같다: <workspace_id>/wedding_bucket/<bucket_id>/<n>.webp
// ─────────────────────────────────────────────────────────────────────────────
const BUCKET_PHOTO_TABLE = 'wedding_bucket';
const BUCKET_GRADIENT = 'linear-gradient(135deg, #efe3d6, #d9cfc2)';

// 대표 사진이 맨 앞, 나머지는 등록 순서(sort_order). 카드 썸네일은 이 배열의 첫 장을 쓴다.
function sortBucketPhotos(photos: BucketPhoto[]): BucketPhoto[] {
  return [...photos].sort((a, b) => (a.isCover === b.isCover ? 0 : a.isCover ? -1 : 1));
}

export async function fetchBuckets(workspaceId: string): Promise<BucketItem[]> {
  const { data, error } = await supabase
    .from('wedding_bucket')
    .select('id, category, vendor_name, address, lat, lng, link_url, memo')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const ids = (data ?? []).map((row) => row.id);
  if (ids.length === 0) return [];

  const { data: photoRows, error: photoError } = await supabase
    .from('wedding_bucket_photo')
    .select('id, bucket_id, path, is_cover, sort_order')
    .in('bucket_id', ids);
  if (photoError) throw photoError;

  const urlByPath = await resolveContentPhotoUrls((photoRows ?? []).map((p) => p.path));
  const photosByBucket = new Map<string, BucketPhoto[]>();
  for (const row of [...(photoRows ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
    const list = photosByBucket.get(row.bucket_id) ?? [];
    list.push({ id: row.id, path: row.path, isCover: row.is_cover, gradient: BUCKET_GRADIENT, imageUrl: urlByPath[row.path] });
    photosByBucket.set(row.bucket_id, list);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    vendorName: row.vendor_name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    linkUrl: row.link_url,
    memo: row.memo,
    photos: sortBucketPhotos(photosByBucket.get(row.id) ?? []),
  }));
}

export interface SaveBucketFields {
  category: BucketItem['category'];
  vendorName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  linkUrl: string;
  memo: string;
}

export interface CreateBucketInput extends SaveBucketFields {
  workspaceId: string;
  photoFiles: File[];
  coverIndex: number | null; // photoFiles 중 대표로 쓸 장의 인덱스. null이면 대표 없음.
}

// 카드 행 → 사진 업로드 → 사진 행 순서. 사진 행을 못 만들면 업로드한 파일을 되돌린다
// (아무도 참조하지 않는 파일이 Storage에 남지 않게 — 상담노트와 같은 규칙).
export async function createBucket(input: CreateBucketInput): Promise<void> {
  const { data: bucket, error } = await supabase
    .from('wedding_bucket')
    .insert({
      workspace_id: input.workspaceId,
      category: input.category,
      vendor_name: input.vendorName,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      link_url: input.linkUrl,
      memo: input.memo,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (input.photoFiles.length > 0) {
    await insertBucketPhotos(input.workspaceId, bucket.id, input.photoFiles, input.coverIndex, 0);
  }
}

export interface UpdateBucketInput extends SaveBucketFields {
  id: string;
  workspaceId: string;
  removedPhotoPaths?: string[];
  newPhotoFiles?: File[];
  newCoverIndex?: number | null; // 새로 올리는 사진 중 대표로 지정할 인덱스
}

export async function updateBucket(input: UpdateBucketInput): Promise<void> {
  const { error } = await supabase
    .from('wedding_bucket')
    .update({
      category: input.category,
      vendor_name: input.vendorName,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      link_url: input.linkUrl,
      memo: input.memo,
    })
    .eq('id', input.id);
  if (error) throw error;

  const removed = input.removedPhotoPaths ?? [];
  if (removed.length > 0) {
    const { error: rowError } = await supabase.from('wedding_bucket_photo').delete().in('path', removed);
    if (rowError) throw rowError;
    // 파일 삭제가 실패해도 카드는 이미 맞는 상태다 — 되돌리지 않고 알리기만 한다.
    await deleteContentPhotos(removed).catch((cause) =>
      reportFailure('사진 정보는 지웠지만 저장소 파일을 지우지 못했어요. 용량에만 남습니다.', cause),
    );
  }

  const files = input.newPhotoFiles ?? [];
  if (files.length > 0) {
    const { count } = await supabase
      .from('wedding_bucket_photo')
      .select('*', { count: 'exact', head: true })
      .eq('bucket_id', input.id);
    await insertBucketPhotos(input.workspaceId, input.id, files, input.newCoverIndex ?? null, count ?? 0);
  }
}

// 업로드 + 사진 행 삽입 + (지정 시) 대표 지정. 대표 지정은 RPC로 "기존 해제 → 새로 지정"을
// 한 트랜잭션에 묶는다 — 두 문장을 따로 보내면 대표 유니크 인덱스에 걸리거나 대표 없는 카드가 남는다.
async function insertBucketPhotos(
  workspaceId: string,
  bucketId: string,
  files: File[],
  coverIndex: number | null,
  sortOffset: number,
): Promise<void> {
  const paths = await uploadContentPhotos(workspaceId, BUCKET_PHOTO_TABLE, bucketId, files);
  const { data: inserted, error } = await supabase
    .from('wedding_bucket_photo')
    .insert(paths.map((path, i) => ({ bucket_id: bucketId, path, sort_order: sortOffset + i })))
    .select('id, path');
  if (error) {
    await rollbackUploadedPhotos(paths);
    throw error;
  }

  if (coverIndex !== null && coverIndex >= 0 && coverIndex < paths.length) {
    const coverRow = (inserted ?? []).find((row) => row.path === paths[coverIndex]);
    // 사진은 이미 저장됐다 — 대표 지정만 실패하면 사용자가 상세에서 다시 고르면 된다.
    if (coverRow) await setBucketCoverPhoto(coverRow.id).catch((cause) =>
      reportFailure('사진은 올렸지만 대표 사진 지정에 실패했어요. 자세히 보기에서 다시 골라주세요.', cause),
    );
  }
}

export async function setBucketCoverPhoto(photoId: string): Promise<void> {
  const { error } = await supabase.rpc('set_wedding_bucket_cover', { p_photo_id: photoId });
  if (error) throw error;
}

// 카드 삭제 — 사진 행은 FK cascade로 지워지지만 Storage 파일은 남으므로 먼저 지운다.
// 순서: 경로 조회 → Storage 파일 → 카드 행(사진 행은 cascade).
export async function deleteBucket(id: string): Promise<void> {
  const { data: photos, error: photoError } = await supabase
    .from('wedding_bucket_photo')
    .select('path')
    .eq('bucket_id', id);
  if (photoError) throw photoError;

  const paths = (photos ?? []).map((p) => p.path);
  if (paths.length > 0) {
    await deleteContentPhotos(paths).catch((cause) =>
      reportFailure('사진 파일을 지우지 못했어요. 카드는 삭제를 계속합니다.', cause),
    );
  }

  const { error } = await supabase.from('wedding_bucket').delete().eq('id', id);
  if (error) throw error;
}
