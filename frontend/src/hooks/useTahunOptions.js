import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

// Tahun renja diambil dari tabel periode_renja (via /api/periode).
// Fallback [2025..2030] bila tabel kosong (mis. awal setup).
export function useTahunOptions() {
  const { data, isLoading } = useQuery({
    queryKey: ['periode-list'],
    queryFn: () => api.list('periode', { limit: 100 }),
  });

  const periodeList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  const years = periodeList.map(p => p.tahun).filter(Boolean).sort((a, b) => b - a);
  const options = years.length > 0 ? years : [2030, 2029, 2028, 2027, 2026, 2025];

  return { tahunOptions: options, periodeList, isLoading };
}
