const PARENT_AUTH_UNTIL_KEY = 'parentAuthedUntil';
const PARENT_AUTH_TTL = 30 * 60 * 1000;

export function getParentAuthUntil(): number {
  return Number(wx.getStorageSync(PARENT_AUTH_UNTIL_KEY) || 0);
}

export function isParentAuthed(): boolean {
  return getParentAuthUntil() > Date.now();
}

export function setParentAuthed(until?: number) {
  wx.setStorageSync(PARENT_AUTH_UNTIL_KEY, until || Date.now() + PARENT_AUTH_TTL);
}

export function clearParentAuth() {
  wx.removeStorageSync(PARENT_AUTH_UNTIL_KEY);
}

export function requireParentAuth(redirect?: string): boolean {
  if (isParentAuthed()) {
    return true;
  }
  const target = redirect || getCurrentRoute();
  wx.navigateTo({ url: `/pages/parent/auth/index?redirect=${encodeURIComponent(target)}` });
  return false;
}

function getCurrentRoute(): string {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as any;
  if (!current) return '/pages/parent/home/index';
  const route = current.route ? `/${current.route}` : '/pages/parent/home/index';
  const options = current.options || {};
  const query = Object.keys(options)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
    .join('&');
  return query ? `${route}?${query}` : route;
}
