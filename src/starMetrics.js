import { characterCount } from './questionWorkbooks';

export function starMetrics(data) {
  const counts = Object.fromEntries(['situation', 'task', 'action', 'result'].map(key => [key, characterCount(data[key] || '', 'excludeSpaces')]));
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { counts, total, actionPercent: total ? Math.round(counts.action / total * 100) : null };
}
