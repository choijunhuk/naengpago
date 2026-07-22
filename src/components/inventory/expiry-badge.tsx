import { Badge } from '../ui/badge';
import { formatDday, getDday, getExpiryTone } from '../../domain/inventory';

export function ExpiryBadge({ expirationDate }: { expirationDate: string | null }) {
  const dday = getDday(expirationDate);
  const tone = getExpiryTone(dday);
  return (
    <Badge
      label={formatDday(dday)}
      tone={tone === 'overdue' || tone === 'urgent' ? 'danger' : tone === 'warning' ? 'warning' : 'neutral'}
    />
  );
}

