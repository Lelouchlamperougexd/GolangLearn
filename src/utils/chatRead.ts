const KEY = 'qonys_chat_read';

function getReadTimes(): Record<number, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}

/** Save timestamp when user opens a chat */
export function markChatRead(applicationId: number): void {
  const times = getReadTimes();
  times[applicationId] = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(times));
}

/** Override is_unread=false for chats opened after their last message */
export function applyReadStatus<T extends { application_id: number; last_message_at: string; is_unread: boolean }>(
  chats: T[]
): T[] {
  const times = getReadTimes();
  return chats.map(c => {
    const readAt = times[c.application_id];
    if (readAt && (!c.last_message_at || new Date(readAt) >= new Date(c.last_message_at))) {
      return { ...c, is_unread: false };
    }
    return c;
  });
}
