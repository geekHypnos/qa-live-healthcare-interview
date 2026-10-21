import { shallowRef } from 'vue';
import zh from './zh-CN';
import en from './en-US';

type Locale = 'zh-CN' | 'en-US';
function savedLocale(): Locale {
  try { return localStorage.getItem('qa-locale') === 'en-US' ? 'en-US' : 'zh-CN'; }
  catch { return 'zh-CN'; }
}
export const locale = shallowRef<Locale>(savedLocale());
export function setLocale(value: string) {
  locale.value = value === 'en-US' ? 'en-US' : 'zh-CN';
  try { localStorage.setItem('qa-locale', locale.value); } catch { /* 禁用存储时仍可在本页切换。 */ }
  document.documentElement.lang = locale.value;
}
// 资料仍来自接口；资源只负责展示文字，不作为医生数据或身份的回退来源。
export function t(text: string): string {
  const resource: Record<string, string> = locale.value === 'en-US' ? en : zh;
  return resource[text] ?? text;
}
