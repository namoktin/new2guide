/**
 * 2Guide - Model: Hub (Thiết bị định vị đeo cho khách tham quan)
 */

const { SITE_CODE, normalizeHubId } = require('../config/appConfig');

class HubModel {
  constructor() {
    this.hubs = {};
  }

  rotatePoint(dx, dy, deg) {
    const rad = deg * Math.PI / 180;
    return {
      dxRot: dx * Math.cos(rad) - dy * Math.sin(rad),
      dyRot: dx * Math.sin(rad) + dy * Math.cos(rad)
    };
  }

  calculateSvgRoomCoords(lat, lng) {
    const centerLat = 20.997715;
    const centerLng = 105.844730;
    const widthMeters = 18.9;
    const heightMeters = 13.9;
    const rotationAngle = 75.0;
    const mLat = 111320;
    const mLng = 111320 * Math.cos(centerLat * Math.PI / 180);

    const dxRot = (Number(lng) - centerLng) * mLng;
    const dyRot = (Number(lat) - centerLat) * mLat;
    const p = this.rotatePoint(dxRot, dyRot, -rotationAngle);
    const x = Math.round(Math.max(10, Math.min(790, (p.dxRot / widthMeters + 0.5) * 800)));
    const y = Math.round(Math.max(10, Math.min(490, (0.5 - p.dyRot / heightMeters) * 500)));
    return { x, y };
  }

  calculateGpsFromSvg(x, y) {
    const centerLat = 20.997715;
    const centerLng = 105.844730;
    const widthMeters = 18.9;
    const heightMeters = 13.9;
    const rotationAngle = 75.0;
    const mLat = 111320;
    const mLng = 111320 * Math.cos(centerLat * Math.PI / 180);

    const localDx = (Number(x) / 800 - 0.5) * widthMeters;
    const localDy = (0.5 - Number(y) / 500) * heightMeters;
    const p = this.rotatePoint(localDx, localDy, rotationAngle);
    const lat = Number((centerLat + p.dyRot / mLat).toFixed(6));
    const lng = Number((centerLng + p.dxRot / mLng).toFixed(6));
    return { lat, lng };
  }

  /**
   * Khởi tạo danh sách Hub và nạp từ dữ liệu đã lưu bền vững (MongoDB / JSON)
   */
  init(savedHubs = {}, siteCenter = { lat: 20.997715, lng: 105.844730 }) {
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

    // Nếu chưa có dữ liệu, tạo mặc định 5 Hub chuẩn Nhà Tổng Thống
    const numbers = [18, 37, 44, 45, 48];
    const spots = [
      { x: 380, y: 260, lat: 20.997710, lng: 105.844731, area: 'Khu vực Trung tâm gian phòng Tổng Thống' },
      { x: 680, y: 240, lat: 20.997773, lng: 105.844744, area: 'Khu vực Cung Đông (gần Bàn Họp Đá Cổ)' },
      { x: 270, y: 310, lat: 20.997684, lng: 105.844738, area: 'Khu vực Tiền sảnh Tây Nam (gần Cột Trụ Nam)' },
      { x: 530, y: 110, lat: 20.997751, lng: 105.844701, area: 'Khu vực Cổng Bắc & Hành lang vòm' },
      { x: 450, y: 380, lat: 20.997717, lng: 105.844767, area: 'Khu vực Tiền sảnh đón tiếp phía Nam' }
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

  findOrCreate(rawId, defaultCenter = { lat: 20.997715, lng: 105.844730 }) {
    const hubId = this.resolveTargetHubId(rawId);
    if (this.hubs[hubId]) return this.hubs[hubId];
    const validKeys = this.getValidDbHubKeys();
    return this.hubs[validKeys[0]];
  }

  updateTelemetry(rawId, { lat, lng, alt, yaw, pitch, roll, battery, isCharging, ble, rawGps, imu, ax, ay, az, accel, isStep, x, y }) {
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

    // Tiếp nhận gia tốc 3 trục MPU6050 (ax, ay, az) và nhận diện trạng thái bước chân / di chuyển
    const incomingAx = ax !== undefined ? Number(ax) : (accel && accel.ax !== undefined ? Number(accel.ax) : undefined);
    const incomingAy = ay !== undefined ? Number(ay) : (accel && accel.ay !== undefined ? Number(accel.ay) : undefined);
    const incomingAz = az !== undefined ? Number(az) : (accel && accel.az !== undefined ? Number(accel.az) : undefined);

    let stepTriggered = !!isStep || (accel && !!accel.isStep);

    if (incomingAx !== undefined || incomingAy !== undefined || incomingAz !== undefined) {
      const curAx = incomingAx !== undefined ? incomingAx : (target.accel ? target.accel.ax : 0);
      const curAy = incomingAy !== undefined ? incomingAy : (target.accel ? target.accel.ay : 0);
      const curAz = incomingAz !== undefined ? incomingAz : (target.accel ? target.accel.az : 1.0);
      const magnitude = Math.hypot(curAx, curAy, curAz);
      stepTriggered = stepTriggered || (magnitude > 1.32 && (Date.now() - (target.lastStepTime || 0) > 350));
      const isMoving = (Math.abs(magnitude - 1.0) > 0.15) || (Math.hypot(curAx, curAy) > 0.12) || stepTriggered;

      target.accel = {
        ax: Number(curAx.toFixed(3)),
        ay: Number(curAy.toFixed(3)),
        az: Number(curAz.toFixed(3)),
        magnitude: Number(magnitude.toFixed(3)),
        isMoving,
        isStep: stepTriggered
      };

      if (stepTriggered) {
        target.stepCount = (target.stepCount || 0) + 1;
        target.lastStepTime = Date.now();
      }
    }

    // Cập nhật vị trí tọa độ: Ưu tiên x, y trực tiếp hoặc tính bước chân tịnh tiến
    if (x !== undefined && y !== undefined) {
      target.x = Number(x);
      target.y = Number(y);
      if (lat === undefined || lng === undefined) {
        const gps = this.calculateGpsFromSvg(target.x, target.y);
        target.lat = gps.lat;
        target.lng = gps.lng;
      }
    } else if (stepTriggered) {
      const rad = ((target.yaw || 0) * Math.PI) / 180.0;
      const stepPx = 14; // ~0.35m thực tế trong phòng
      target.x = Math.max(30, Math.min(770, (target.x || 380) + stepPx * Math.sin(rad)));
      target.y = Math.max(20, Math.min(480, (target.y || 260) - stepPx * Math.cos(rad)));
      const gps = this.calculateGpsFromSvg(target.x, target.y);
      target.lat = gps.lat;
      target.lng = gps.lng;
    } else if (lat !== undefined && lng !== undefined) {
      // Chỉ tính lại x, y từ GPS nếu hub chưa từng có tọa độ x, y
      if (target.x === undefined || target.y === undefined) {
        const coords = this.calculateSvgRoomCoords(target.lat, target.lng);
        target.x = coords.x;
        target.y = coords.y;
      } else {
        // Đang đứng yên: Bảo lưu tuyệt đối x, y và đồng bộ ngược ra GPS tương ứng
        const gps = this.calculateGpsFromSvg(target.x, target.y);
        target.lat = gps.lat;
        target.lng = gps.lng;
      }
    }

    target.lastSeen = Date.now();
    target.isOnline = true;
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
