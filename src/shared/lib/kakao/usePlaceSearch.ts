import { useEffect, useState } from 'react';
import { searchKakaoAddress, searchKakaoPlaces, type KakaoPlaceResult } from './kakaoPlaceSearch';

// 장소/주소 검색 입력 한 벌(모드 전환 + 300ms 디바운스 + 결과 목록 + 선택)을
// 연애 기록/연애 일정/임신 일정/결혼 일정/상담노트 5개 화면이 각자 복사해 쓰고 있었다.
// 로직만 여기로 모으고, 화면은 반환값을 그대로 렌더링한다(2026-09-01 정리).
export type PlaceSearchMode = 'place' | 'address';

export interface PlaceSearchModeOption {
  key: PlaceSearchMode;
  label: string;
  placeholder: string;
}

const DEBOUNCE_MS = 300;

export interface UsePlaceSearchOptions {
  // 화면마다 예시 문구가 다르다.
  placePlaceholder: string;
  addressPlaceholder: string;
  initial?: { placeName?: string; address?: string; coords?: { lat: number; lng: number } | null };
}

export function usePlaceSearch({ placePlaceholder, addressPlaceholder, initial }: UsePlaceSearchOptions) {
  const [mode, setMode] = useState<PlaceSearchMode>('place');
  const [placeName, setPlaceName] = useState(initial?.placeName ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initial?.coords ?? null);
  const [isListOpen, setIsListOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<KakaoPlaceResult[]>([]);

  const modes: PlaceSearchModeOption[] = [
    { key: 'place', label: '장소검색', placeholder: placePlaceholder },
    { key: 'address', label: '주소검색', placeholder: addressPlaceholder },
  ];

  useEffect(() => {
    const query = placeName.trim();
    // 이미 목록에서 고른 상태(coords 있음)면 다시 검색하지 않는다 — 고른 이름을 그대로 두기 위함.
    if (!query || coords) {
      setSuggestions([]);
      return;
    }
    const search = mode === 'address' ? searchKakaoAddress : searchKakaoPlaces;
    const timer = setTimeout(() => {
      search(query).then(setSuggestions);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [placeName, coords, mode]);

  function switchMode(next: PlaceSearchMode) {
    setMode(next);
    setPlaceName('');
    setAddress('');
    setCoords(null);
    setSuggestions([]);
  }

  // 입력 중에는 이전에 고른 좌표·주소를 버린다. 이름만 바뀌고 좌표가 남으면 엉뚱한 위치가 저장된다.
  function changeQuery(value: string) {
    setPlaceName(value);
    setAddress('');
    setCoords(null);
    setIsListOpen(true);
  }

  function selectPlace(place: KakaoPlaceResult) {
    setPlaceName(place.placeName);
    setAddress(place.addressName);
    setCoords({ lat: place.lat, lng: place.lng });
    setIsListOpen(false);
  }

  function reset(next?: { placeName?: string; address?: string; coords?: { lat: number; lng: number } | null }) {
    setMode('place');
    setPlaceName(next?.placeName ?? '');
    setAddress(next?.address ?? '');
    setCoords(next?.coords ?? null);
    setSuggestions([]);
    setIsListOpen(false);
  }

  const activePlaceholder = modes.find((m) => m.key === mode)!.placeholder;

  return {
    mode,
    modes,
    activePlaceholder,
    placeName,
    address,
    coords,
    suggestions,
    isListOpen,
    setIsListOpen,
    switchMode,
    changeQuery,
    selectPlace,
    reset,
  };
}
