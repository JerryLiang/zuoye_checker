"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentAuthUntil = getParentAuthUntil;
exports.isParentAuthed = isParentAuthed;
exports.setParentAuthed = setParentAuthed;
exports.clearParentAuth = clearParentAuth;
exports.requireParentAuth = requireParentAuth;
const PARENT_AUTH_UNTIL_KEY = 'parentAuthedUntil';
const PARENT_AUTH_TTL = 30 * 60 * 1000;
function getParentAuthUntil() {
    return Number(wx.getStorageSync(PARENT_AUTH_UNTIL_KEY) || 0);
}
function isParentAuthed() {
    return getParentAuthUntil() > Date.now();
}
function setParentAuthed(until) {
    wx.setStorageSync(PARENT_AUTH_UNTIL_KEY, until || Date.now() + PARENT_AUTH_TTL);
}
function clearParentAuth() {
    wx.removeStorageSync(PARENT_AUTH_UNTIL_KEY);
}
function requireParentAuth(redirect) {
    if (isParentAuthed()) {
        return true;
    }
    const target = redirect || getCurrentRoute();
    wx.navigateTo({ url: `/pages/parent/auth/index?redirect=${encodeURIComponent(target)}` });
    return false;
}
function getCurrentRoute() {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    if (!current)
        return '/pages/parent/home/index';
    const route = current.route ? `/${current.route}` : '/pages/parent/home/index';
    const options = current.options || {};
    const query = Object.keys(options)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
        .join('&');
    return query ? `${route}?${query}` : route;
}
