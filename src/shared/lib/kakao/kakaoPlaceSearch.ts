import { loadKakaoMaps } from './loadKakaoMaps';

// 카카오맵 JS SDK의 services 라이브러리(Places/Geocoder)로 검색한다.
// REST API 키가 필요 없다 — 지도에 쓰는 JS 키 하나로 장소검색·주소검색·지도 표시를 모두 처리한다.
export interface KakaoPlaceResult {
  placeName: string;
  addressName: string;
  lat: number;
  lng: number;
}

interface KakaoKeywordDocument {
  place_name: string;
  road_address_name: string;
  address_name: string;
  y: string; // 위도
  x: string; // 경도
}

// 장소검색: 상호명·건물명 등 키워드로 찾는다 (예: "반포 한강공원", "스타벅스 성수점").
export async function searchKakaoPlaces(query: string): Promise<KakaoPlaceResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  await loadKakaoMaps();
  const kakao = window.kakao;

  return new Promise((resolve) => {
    const places = new kakao.maps.services.Places();
    places.keywordSearch(trimmed, (data: KakaoKeywordDocument[], status: string) => {
      if (status !== kakao.maps.services.Status.OK) {
        resolve([]);
        return;
      }
      resolve(
        data.slice(0, 5).map((doc) => ({
          placeName: doc.place_name,
          addressName: doc.road_address_name || doc.address_name,
          lat: Number(doc.y),
          lng: Number(doc.x),
        })),
      );
    });
  });
}

interface KakaoAddressDocument {
  address_name: string;
  road_address: { building_name: string; address_name: string } | null;
  x: string; // 경도
  y: string; // 위도
}

// 주소검색: 지번·도로명 주소로 찾는다 (예: "서초구 반포동 199", "올림픽대로 지하 91").
export async function searchKakaoAddress(query: string): Promise<KakaoPlaceResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  await loadKakaoMaps();
  const kakao = window.kakao;

  return new Promise((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(trimmed, (data: KakaoAddressDocument[], status: string) => {
      if (status !== kakao.maps.services.Status.OK) {
        resolve([]);
        return;
      }
      resolve(
        data.slice(0, 5).map((doc) => ({
          placeName: doc.road_address?.building_name || doc.address_name,
          addressName: doc.road_address?.address_name || doc.address_name,
          lat: Number(doc.y),
          lng: Number(doc.x),
        })),
      );
    });
  });
}
