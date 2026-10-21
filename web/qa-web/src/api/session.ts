export interface IdentityKey {
  role: 'PATIENT' | 'DOCTOR';
  profile: { id: string };
}

// 先确认当前服务端身份，再执行前端演示写操作，避免旧标签页串号。
export async function verifyBeforeAction<T>(
  expected: IdentityKey,
  load: () => Promise<IdentityKey | null>,
  action: () => T | Promise<T>,
): Promise<T> {
  const current = await load();
  if (!current || current.role !== expected.role || current.profile.id !== expected.profile.id) {
    throw new Error('身份已失效或切换，请重新登录');
  }
  return action();
}
