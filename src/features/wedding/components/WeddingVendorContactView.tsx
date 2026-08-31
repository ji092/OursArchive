import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWeddingActionsHost } from '../actionsPortal';
import {
  useConsultNotes,
  useCreateVendorContact,
  useDeleteVendorContact,
  useUpdateVendorContact,
  useVendorContacts,
} from '../hooks/useWeddingData';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import { WEDDING_CATEGORIES, type VendorContact } from '../types';
import styles from './WeddingVendorContactView.module.css';

// 업체 연락처(vendor_contact) — 상담노트와 별개로 담당자·연락처·계약정보만 간단히 관리하는 명단
// (2026-07-30 사용자 지정 신규 화면). 다른 챕터에 재사용하지 않는다.
export function WeddingVendorContactView() {
  const workspaceId = useCurrentWorkspaceId();
  const { data: contacts } = useVendorContacts(workspaceId);
  const { data: consultNotes } = useConsultNotes(workspaceId);
  const createContact = useCreateVendorContact(workspaceId);
  const updateContact = useUpdateVendorContact(workspaceId);
  const deleteContact = useDeleteVendorContact(workspaceId);
  const actionsHost = useWeddingActionsHost();

  const [editing, setEditing] = useState<VendorContact | 'new' | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState<VendorContact['category']>(null);
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [contractInfo, setContractInfo] = useState('');
  const [consultNoteId, setConsultNoteId] = useState('');

  function openNew() {
    setVendorName('');
    setCategory(null);
    setManagerName('');
    setPhone('');
    setContractInfo('');
    setConsultNoteId('');
    setEditing('new');
  }

  function openEdit(contact: VendorContact) {
    setVendorName(contact.vendorName);
    setCategory(contact.category);
    setManagerName(contact.managerName);
    setPhone(contact.phone);
    setContractInfo(contact.contractInfo);
    setConsultNoteId(contact.consultNoteId ?? '');
    setEditing(contact);
  }

  function handleSubmit() {
    if (!vendorName.trim()) return;
    const input = {
      vendorName: vendorName.trim(),
      category,
      managerName: managerName.trim(),
      phone: phone.trim(),
      contractInfo: contractInfo.trim(),
      consultNoteId: consultNoteId || null,
    };
    if (editing === 'new') {
      createContact.mutate(input, { onSuccess: () => setEditing(null) });
    } else if (editing) {
      updateContact.mutate({ id: editing.id, input }, { onSuccess: () => setEditing(null) });
    }
  }

  const noteById = new Map((consultNotes ?? []).map((n) => [n.id, n]));

  return (
    <div className={styles.wrap}>
      {actionsHost &&
        createPortal(
          <button type="button" className={styles.addButton} onClick={openNew}>
            + 업체 추가
          </button>,
          actionsHost,
        )}

      {editing && (
        <div className={styles.overlay} onClick={() => setEditing(null)}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHead}>
              <p className={styles.formTitle}>{editing === 'new' ? '업체 추가' : '업체 수정'}</p>
              <button type="button" className={styles.closeButton} onClick={() => setEditing(null)} aria-label="닫기">
                ✕
              </button>
            </div>
            <input className={styles.input} placeholder="업체명" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />

            <p className={styles.label}>항목</p>
            <div className={styles.chipRow}>
              {WEDDING_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={c === category ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => setCategory((prev) => (prev === c ? null : c))}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className={styles.formRow}>
              <input className={styles.input} placeholder="담당자" value={managerName} onChange={(e) => setManagerName(e.target.value)} />
              <input type="tel" className={styles.input} placeholder="연락처" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <input className={styles.input} placeholder="계약 정보" value={contractInfo} onChange={(e) => setContractInfo(e.target.value)} />
            <select className={styles.select} value={consultNoteId} onChange={(e) => setConsultNoteId(e.target.value)}>
              <option value="">연결된 상담노트 없음</option>
              {(consultNotes ?? []).map((note) => (
                <option key={note.id} value={note.id}>
                  {note.vendorName} ({note.vendorType})
                </option>
              ))}
            </select>

            <div className={styles.formRow}>
              <button type="button" className={styles.submit} onClick={handleSubmit}>
                {editing === 'new' ? '추가하기' : '저장하기'}
              </button>
              {editing !== 'new' && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => {
                    deleteContact.mutate(editing.id);
                    setEditing(null);
                  }}
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {(contacts ?? []).map((contact) => (
          <button key={contact.id} type="button" className={styles.row} onClick={() => openEdit(contact)}>
            <p className={styles.rowVendor}>
              {contact.vendorName}
              {contact.category && <span className={styles.rowCategory}>{contact.category}</span>}
            </p>
            <p className={styles.rowMeta}>
              {[contact.managerName, contact.phone, contact.contractInfo].filter(Boolean).join(' · ') || '메모 없음'}
            </p>
            {contact.consultNoteId && noteById.get(contact.consultNoteId) && (
              <p className={styles.rowMeta}>연결된 상담노트: {noteById.get(contact.consultNoteId)!.vendorName}</p>
            )}
          </button>
        ))}
        {(contacts ?? []).length === 0 && <p className={styles.empty}>등록된 업체 연락처가 없어요.</p>}
      </div>
    </div>
  );
}
