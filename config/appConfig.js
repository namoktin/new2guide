/**
 * 2Guide - Cấu hình ứng dụng toàn cục (Global Configuration)
 */

const dotenv = require('dotenv');
dotenv.config();

const siteData = require('../data/siteData.js');

const PORT = parseInt(process.env.PORT, 10) || 4000;
const SITE_CODE = (process.env.SITE_CODE || siteData.siteCode || 'NEU').trim();
const SITE_NAME = (process.env.SITE_NAME || siteData.siteName || 'Trường Đại Học Kinh Tế Quốc Dân (NEU)').trim();
const ADMIN_SECRET_PATH = (process.env.ADMIN_SECRET_PATH || '/quanly_bql_8869').trim();
const ESP32_SECRET_KEY = (process.env.ESP32_SECRET_KEY || 'esp_sec_2026_98a72b').trim();
const ADMIN_SECRET_KEY = (process.env.ADMIN_SECRET_KEY || 'bql_sec_2026_x89a3f').trim();
const EDITOR_SECRET_PATH = (process.env.EDITOR_SECRET_PATH || '/editor_bql_7749').trim();
const EDITOR_SECRET_KEY = (process.env.EDITOR_SECRET_KEY || 'editor_sec_2026_z91k4c').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const GROQ_MODEL = (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim();
const MONGODB_URI = (process.env.MONGODB_URI || '').trim();

// Chuẩn hóa mã Hub ID (Hỗ trợ HL-01, HL01, HL 01, HL 3, HL-3, 001, 1, NEU001, HUB-001)
function normalizeHubId(rawId) {
  if (!rawId) return 'HL-01';
  let s = String(rawId).trim().toUpperCase();
  if (s.startsWith('HUB-')) s = s.replace('HUB-', '');
  else if (s.startsWith('HUB')) s = s.replace('HUB', '');

  // Chuẩn hóa dạng HL: HL-01, HL01, HL-1, HL1, HL 01, HL 3, HL-3, HL 0, HL0, v.v.
  const hlMatch = s.match(/^HL[\s\-]*0*(\d+)$/);
  if (hlMatch) {
    const num = parseInt(hlMatch[1], 10);
    if (hlMatch[1] === '0' || num === 0) return 'HL-00';
    return 'HL-' + String(num).padStart(2, '0');
  }
  if (s === 'HL0' || s === 'HL-0' || s === 'HL 0' || s === 'HL00' || s === 'HL-00' || s === 'HL 00') return 'HL-00';
  if (s === 'HL' || s === 'HL-' || s === 'HL ') return 'HL-01';

  if (s.startsWith(SITE_CODE)) {
    const numPart = s.slice(SITE_CODE.length);
    if (/^\d+$/.test(numPart)) {
      return `${SITE_CODE}${numPart.padStart(3, '0')}`;
    }
    return s;
  }

  if (/^\d+$/.test(s)) {
    const num = parseInt(s, 10);
    if (num === 0) return 'HL-00';
    return 'HL-' + String(num).padStart(2, '0');
  }

  return s;
}

module.exports = {
  PORT,
  SITE_CODE,
  SITE_NAME,
  ADMIN_SECRET_PATH,
  ESP32_SECRET_KEY,
  ADMIN_SECRET_KEY,
  EDITOR_SECRET_PATH,
  EDITOR_SECRET_KEY,
  GROQ_API_KEY,
  GROQ_MODEL,
  MONGODB_URI,
  normalizeHubId
};
