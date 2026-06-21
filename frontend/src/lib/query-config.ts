/** React Query staleTime (ms) — sık değişmeyen admin verileri için önbellek. */
export const QUERY_STALE = {
  /** Grup listesi */
  groups: 10 * 60 * 1000,
  /** Grup üyeleri — tıklayınca tekrar fetch etmez (10 dk) */
  groupMembers: 10 * 60 * 1000,
  /** Öğrenci listesi */
  adminUsers: 5 * 60 * 1000,
  /** Meblağ tipleri, seviyeler */
  staticCatalog: 30 * 60 * 1000,
  /** Öğrenci özet listesi */
  studentsSummary: 2 * 60 * 1000,
} as const;
