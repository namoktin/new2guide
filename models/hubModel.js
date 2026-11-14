/**
 * 2Guide - Model: Hub (Thiết bị định vị đeo cho khách tham quan)
 */

const { SITE_CODE, normalizeHubId } = require('../config/appConfig');

class HubModel {
  constructor() {
    this.hubs = {};
  }

  calculateSvgRoomCoords(lat, lng) {
    const latMin = 20.99980;
    const latMax = 21.00030;
    const lngMin = 105.84210;
    const lngMax = 105.84280;

    const normX = (lng - lngMin) / (lngMax - lngMin);
    const x = Math.round(Math.max(60, Math.min(740, 70 + normX * 660)));

    const normY = (lat - latMin) / (latMax - latMin);
    const y = Math.round(Math.max(60, Math.min(440, 440 - normY * 380)));

    return { x, y };
  }

  /**
   * Khởi tạo danh sách Hub và nạp từ dữ liệu đã lưu bền vững (MongoDB / JSON)
   */
  init(savedHubs = {}, siteCenter = { lat: 21.00010, lng: 105.84245 }) {
    this.hubs = {};

    if (savedHubs && Object.keys(savedHubs).length > 0) {
      Object.keys(savedHubs).forEach(hId => {
        // Chỉ lưu các hub dạng HL-xx
        if (/^HL-\d+$/.test(hId)) {
          const h = { ...savedHubs[hId] };
          if (h.lat && h.lng && (!h.x || !h.y)) {
            const { x, y } = this.calculateSvgRoomCoords(h.lat, h.lng);
            h.x = x;
            h.y = y;
          }
          this.hubs[hId] = h;
        }
      });
      if (Object.keys(this.hubs).length > 0) return this.hubs;
    }

    // Nếu chưa có dữ liệu, tạo mặc định 5 Hub ngẫu nhiên
    const numbers = [18, 37, 44, 45, 48];
    const spots = [
      { x: 380, y: 260, lat: 21.00010, lng: 105.84245, area: 'Khu vực Trung tâm gian phòng Tổng Thống' },
      { x: 680, y: 240, lat: 21.00018, lng: 105.84270, area: 'Khu vực Cung Đông (gần Bàn Họp Đá Cổ)' },
      { x: 270, y: 310, lat: 20.99995, lng: 105.84225, area: 'Khu vực Tiền sảnh Tây Nam (gần Cột Trụ Nam)' },
      { x: 530, y: 110, lat: 21.00025, lng: 105.84255, area: 'Khu vực Cổng Bắc & Hành lang vòm' },
      { x: 450, y: 380, lat: 20.99985, lng: 105.84250, area: 'Khu vực Tiền sảnh đón tiếp phía Nam' }
    ];
    const batteries = [92, 85, 78, 96, 64];

    for (let i = 0; i < 5; i++) {
      const hlId = `HL-${String(numbers[i]).padStart(2, '0')}`;
      const spot = spots[i];
      this.hubs[hlId] = {
        hubId: hlId,
        name: `Hub 2Guide v2.1 (${hlId})`,
        serial: `SN-2026-${hlId.replace('-', '')}`,
        status: 'Sẵn sàng',
        battery: batteries[i],
        lang: '🇻🇳 Tiếng Việt',
        group: '-',
        user: '-',
        location: spot.area,
        lat: spot.lat,
        lng: spot.lng,
        x: spot.x,
        y: spot.y,
        alt: 15.0,
        yaw: (i * 72) % 360,
        pitch: 0,
        roll: 0,
        startShiftBattery: 100,
        endShiftBattery: null,
        ble: { beaconId: 'HL-BCN-01', beaconName: 'Cổng chính Maison Centrale', rssi: -68, distance: 2.1 },
        lastSeen: Date.now(),
        currentGroupId: null,
        isOnline: true
      };
    }

    return this.hubs;
  }

  getValidDbHubKeys() {
    const keys = Object.keys(this.hubs).filter(k => /^HL-\d+$/.test(k));
    return keys.length > 0 ? keys : ['HL-18', 'HL-37', 'HL-44', 'HL-45', 'HL-48'];
  }

  resolveTargetHubId(rawId) {
    const validKeys = this.getValidDbHubKeys();
    if (!rawId) return validKeys[0];

    const norm = normalizeHubId(rawId);
    if (this.hubs[norm] && validKeys.includes(norm)) {
      return norm;
    }

    // Ánh xạ trực tiếp từ số (VD: 18 -> HL-18, 45 -> HL-45)
    const numMatch = String(rawId).match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0], 10);
      const directHl = `HL-${String(num).padStart(2, '0')}`;
      if (this.hubs[directHl]) {
        return directHl;
      }
      // Nếu là số thứ tự 1..5 (như NEU001..NEU005 hoặc 1..5)
      if (num >= 1 && num <= validKeys.length) {
        return validKeys[num - 1];
      }
      const idx = (num - 1) % validKeys.length;
      return validKeys[Math.max(0, idx)];
    }

    return validKeys[0];
  }

  getAll() {
    const validKeys = this.getValidDbHubKeys();
    return validKeys.map(k => this.hubs[k]).filter(Boolean);
  }

  getMap() {
    const validKeys = this.getValidDbHubKeys();
    const result = {};
    validKeys.forEach(k => {
      if (this.hubs[k]) result[k] = this.hubs[k];
    });
    return result;
  }

  getById(rawId) {
    const hubId = this.resolveTargetHubId(rawId);
    return this.hubs[hubId] || null;
  }

  findOrCreate(rawId, defaultCenter = { lat: 20.99965, lng: 105.84280 }) {
    const hubId = this.resolveTargetHubId(rawId);
    if (this.hubs[hubId]) return this.hubs[hubId];
    const validKeys = this.getValidDbHubKeys();
    return this.hubs[validKeys[0]];
  }

  updateTelemetry(rawId, { lat, lng, alt, yaw, pitch, roll, battery, isCharging, ble, rawGps, imu }) {
    const hubId = this.resolveTargetHubId(rawId);
    const target = this.hubs[hubId];
    if (!target) return null;

    if (lat !== undefined && !isNaN(Number(lat))) target.lat = Number(lat);
    if (lng !== undefined && !isNaN(Number(lng))) target.lng = Number(lng);
    if (alt !== undefined) target.alt = Number(alt);
    if (yaw !== undefined) target.yaw = Number(yaw);
    if (pitch !== undefined) target.pitch = Number(pitch);
    if (roll !== undefined) target.roll = Number(roll);
    if (battery !== undefined) target.battery = Number(battery);
    if (isCharging !== undefined) target.isCharging = !!isCharging;
    if (ble) target.ble = ble;
    if (rawGps) target.rawGps = rawGps;
    if (imu) target.imu = imu;
    target.lastSeen = Date.now();
    target.isOnline = true;

    // Tính toán tọa độ x, y phòng SVG
    if (target.lat && target.lng) {
      const { x, y } = this.calculateSvgRoomCoords(target.lat, target.lng);
      target.x = x;
      target.y = y;
    }

    return target;
  }

  updateShiftBattery(shiftType, records = []) {
    records.forEach(({ hubId, battery }) => {
      const normId = this.resolveTargetHubId(hubId);
      if (this.hubs[normId]) {
        if (shiftType === 'start') {
          this.hubs[normId].startShiftBattery = Number(battery);
        } else {
          this.hubs[normId].endShiftBattery = Number(battery);
        }
        this.hubs[normId].battery = Number(battery);
      }
    });
    return this.getAll();
  }

  setGroupId(rawId, groupId) {
    const hubId = this.resolveTargetHubId(rawId);
    if (this.hubs[hubId]) {
      this.hubs[hubId].currentGroupId = groupId;
    }
  }
}

module.exports = new HubModel();
