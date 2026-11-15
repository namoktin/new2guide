/**
 * 2Guide - Dịch vụ Vi Định Vị BLE Đa Điểm (BLE Multilateration & Trilateration Service)
 * Hỗ trợ xác định vị trí chính xác từ 3 điểm Beacon trở lên (N-point Multilateration)
 * Thiết kế hoàn toàn động: KHÔNG gán cứng 3 trạm, tự động thích ứng khi mở rộng thêm N trạm Beacon trong tương lai.
 */

const siteData = require('../data/siteData.js');

class BleLocationService {
  constructor() {
    this.beacons = new Map();
    
    // Căn chỉnh thực tế theo Nhà Tổng Thống (Google Maps WGS84 Calibration)
    this.center = {
      lat: 20.997715,
      lng: 105.844730
    };
    this.rotationAngle = 75.0; // Góc xoay 75 độ
    this.widthMeters = 18.9;   // Chiều rộng thực tế (mét)
    this.heightMeters = 13.9;  // Chiều cao thực tế (mét)
    this.canvasWidth = 800;
    this.canvasHeight = 500;
    this.mLat = 111320;
    this.mLng = 111320 * Math.cos(this.center.lat * Math.PI / 180);

    // Tỉ lệ chuyển đổi giữa tọa độ SVG gian phòng và thực tế: ~42.33 px/m
    this.PIXELS_PER_METER = this.canvasWidth / this.widthMeters;
    
    // Tọa độ biên phòng mặc định
    this.roomBounds = {
      minX: 30,
      maxX: 770,
      minY: 20,
      maxY: 480
    };

    // Biên GPS phòng Nhà Tổng Thống (Bao quát 4 đỉnh WGS84 xoay)
    this.gpsBounds = {
      latMin: 20.99760,
      latMax: 20.99785,
      lngMin: 105.84462,
      lngMax: 105.84484
    };

    this.loadBeaconsFromSiteData();
  }

  /**
   * Nạp tự động toàn bộ danh sách Beacon từ dữ liệu di tích (siteData.js)
   */
  loadBeaconsFromSiteData() {
    try {
      if (siteData && Array.isArray(siteData.pois)) {
        siteData.pois.forEach((poi, idx) => {
          if (poi.beaconId || (poi.id && poi.id.toLowerCase().includes('beacon'))) {
            const bId = poi.beaconId || poi.id;
            
            // Tọa độ x, y từ poi hoặc trích xuất từ mô tả/mặc định
            let x = poi.x;
            let y = poi.y;
            if (x === undefined || y === undefined) {
              if (poi.description) {
                const match = poi.description.match(/\((\d+),\s*(\d+)\)/);
                if (match) {
                  x = parseInt(match[1], 10);
                  y = parseInt(match[2], 10);
                }
              }
            }
            if (x === undefined || y === undefined) {
              const svgCoord = this.gpsToSvg(poi.lat, poi.lng);
              x = svgCoord.x;
              y = svgCoord.y;
            }

            this.registerBeacon({
              id: bId,
              beaconId: bId,
              name: poi.name || `Trạm Beacon ${idx + 1}`,
              x: x,
              y: y,
              lat: poi.lat,
              lng: poi.lng,
              txPower: poi.txPower || -59,
              n: poi.pathLossExponent || 2.2,
              rssiThreshold: poi.rssiThreshold || -65,
              zone: poi.zoneName || 'Nhà Tổng Thống'
            });
          }
        });
      }
      console.log(`[BLE Service] Đã nạp ${this.beacons.size} trạm Beacon vào hệ thống định vị động.`);
    } catch (e) {
      console.warn('[BLE Service] Lỗi khi nạp Beacon từ siteData:', e.message);
    }
  }

  /**
   * Đăng ký thêm hoặc cập nhật một trạm Beacon động lúc runtime (KHÔNG gán cứng)
   */
  registerBeacon(beacon) {
    if (!beacon || (!beacon.id && !beacon.beaconId)) return false;
    const cleanId = String(beacon.beaconId || beacon.id).trim().toUpperCase();

    let x = beacon.x;
    let y = beacon.y;
    if ((x === undefined || y === undefined) && beacon.lat && beacon.lng) {
      const c = this.gpsToSvg(beacon.lat, beacon.lng);
      x = c.x;
      y = c.y;
    }

    const beaconObj = {
      id: cleanId,
      beaconId: cleanId,
      name: beacon.name || `Trạm ${cleanId}`,
      x: x !== undefined ? Number(x) : 400,
      y: y !== undefined ? Number(y) : 250,
      lat: beacon.lat !== undefined ? Number(beacon.lat) : 20.997715,
      lng: beacon.lng !== undefined ? Number(beacon.lng) : 105.844730,
      txPower: beacon.txPower !== undefined ? Number(beacon.txPower) : -59,
      n: beacon.n !== undefined ? Number(beacon.n) : 2.2,
      rssiThreshold: beacon.rssiThreshold !== undefined ? Number(beacon.rssiThreshold) : -65,
      zone: beacon.zone || 'Khu Di Tích'
    };

    this.beacons.set(cleanId, beaconObj);
    return beaconObj;
  }

  /**
   * Xóa trạm Beacon
   */
  unregisterBeacon(beaconId) {
    if (!beaconId) return false;
    const cleanId = String(beaconId).trim().toUpperCase();
    return this.beacons.delete(cleanId);
  }

  /**
   * Lấy danh sách tất cả Beacon đang có trong hệ thống
   */
  getAllBeacons() {
    return Array.from(this.beacons.values());
  }

  /**
   * Tìm kiếm Beacon theo mã định danh
   */
  getBeacon(id) {
    if (!id) return null;
    return this.beacons.get(String(id).trim().toUpperCase()) || null;
  }

  /**
   * Tính cự ly (mét) từ độ mạnh tín hiệu RSSI (dBm)
   * Sử dụng Log-Distance Path Loss Model: RSSI = TxPower - 10 * n * log10(d)
   */
  rssiToDistance(rssi, txPower = -59, n = 2.2) {
    const r = Number(rssi);
    if (isNaN(r) || r === 0) return 999;
    if (r >= txPower) return 0.2; // Rất gần nguồn phát
    const exponent = (txPower - r) / (10.0 * n);
    return Math.max(0.1, Math.min(100.0, Math.pow(10.0, exponent)));
  }

  /**
   * Phép quay 2D quanh gốc tọa độ theo góc xoay độ (deg)
   */
  rotatePoint(dx, dy, deg) {
    const rad = deg * Math.PI / 180;
    return {
      dxRot: dx * Math.cos(rad) - dy * Math.sin(rad),
      dyRot: dx * Math.sin(rad) + dy * Math.cos(rad)
    };
  }

  /**
   * Chuyển đổi tọa độ GPS sang điểm trên SVG (hỗ trợ góc xoay 75° Nhà Tổng Thống)
   */
  gpsToSvg(lat, lng) {
    const dxRot = (Number(lng) - this.center.lng) * this.mLng;
    const dyRot = (Number(lat) - this.center.lat) * this.mLat;
    const p = this.rotatePoint(dxRot, dyRot, -this.rotationAngle);
    const x = Math.round(Math.max(10, Math.min(this.canvasWidth - 10, (p.dxRot / this.widthMeters + 0.5) * this.canvasWidth)));
    const y = Math.round(Math.max(10, Math.min(this.canvasHeight - 10, (0.5 - p.dyRot / this.heightMeters) * this.canvasHeight)));
    return { x, y };
  }

  /**
   * Chuyển đổi tọa độ SVG sang GPS (hỗ trợ góc xoay 75° Nhà Tổng Thống)
   */
  svgToGps(x, y) {
    const localDx = (Number(x) / this.canvasWidth - 0.5) * this.widthMeters;
    const localDy = (0.5 - Number(y) / this.canvasHeight) * this.heightMeters;
    const p = this.rotatePoint(localDx, localDy, this.rotationAngle);
    const lat = Number((this.center.lat + p.dyRot / this.mLat).toFixed(6));
    const lng = Number((this.center.lng + p.dxRot / this.mLng).toFixed(6));
    return { lat, lng };
  }

  /**
   * THUẬT TOÁN ĐỊNH VỊ ĐA ĐIỂM (MULTILATERATION & TRILATERATION)
   * Nhận vào mảng dữ liệu quét sóng Beacon (3 trạm hoặc nhiều hơn)
   * @param {Array} scannedBeacons Mảng [{ beaconId/id, rssi, distance?, txPower? }]
   * @param {Object} options Tùy chọn cấu hình
   * @returns {Object} { success, x, y, lat, lng, accuracy, method, usedBeacons }
   */
  calculateLocation(scannedBeacons, options = {}) {
    if (!Array.isArray(scannedBeacons) || scannedBeacons.length === 0) {
      return { success: false, message: 'Danh sách tín hiệu quét BLE trống' };
    }

    // 1. Đối chiếu động với cơ sở dữ liệu Beacon
    const validBeacons = [];

    scannedBeacons.forEach(scan => {
      const scanId = String(scan.beaconId || scan.id || '').trim().toUpperCase();
      let beaconDef = this.getBeacon(scanId);

      // Nếu trong gói tin có truyền tọa độ ad-hoc của trạm mới, tự động học và đăng ký
      if (!beaconDef && scan.x !== undefined && scan.y !== undefined) {
        beaconDef = this.registerBeacon(scan);
      }

      if (beaconDef) {
        const txPower = scan.txPower !== undefined ? Number(scan.txPower) : beaconDef.txPower;
        const n = scan.n !== undefined ? Number(scan.n) : beaconDef.n;
        
        let distMeter = (scan.distance !== undefined && !isNaN(scan.distance)) 
          ? Number(scan.distance) 
          : this.rssiToDistance(scan.rssi, txPower, n);

        // Chuyển khoảng cách mét sang đơn vị điểm ảnh SVG (pixels)
        const distPixels = distMeter * this.PIXELS_PER_METER;

        validBeacons.push({
          id: beaconDef.id,
          beaconId: beaconDef.id,
          name: beaconDef.name,
          x: beaconDef.x,
          y: beaconDef.y,
          lat: beaconDef.lat,
          lng: beaconDef.lng,
          rssi: scan.rssi !== undefined ? Number(scan.rssi) : -70,
          distanceMeter: parseFloat(distMeter.toFixed(2)),
          distancePixels: parseFloat(distPixels.toFixed(1))
        });
      }
    });

    if (validBeacons.length === 0) {
      return { success: false, message: 'Không đối chiếu được trạm Beacon nào đã đăng ký trong hệ thống' };
    }

    // Sắp xếp theo tín hiệu mạnh nhất / khoảng cách gần nhất
    validBeacons.sort((a, b) => a.distanceMeter - b.distanceMeter);

    // TRƯỜNG HỢP 1: Chỉ có 1 trạm (Định vị tiệm cận - Proximity)
    if (validBeacons.length === 1) {
      const b = validBeacons[0];
      return {
        success: true,
        x: b.x,
        y: b.y,
        lat: b.lat,
        lng: b.lng,
        accuracy: b.distanceMeter,
        method: 'PROXIMITY_SINGLE_BEACON',
        beaconCount: 1,
        usedBeacons: validBeacons
      };
    }

    // TRƯỜNG HỢP 2: Có 2 trạm (Nội suy có trọng số theo cự ly)
    if (validBeacons.length === 2) {
      const b1 = validBeacons[0];
      const b2 = validBeacons[1];
      const w1 = 1 / Math.max(0.2, b1.distanceMeter);
      const w2 = 1 / Math.max(0.2, b2.distanceMeter);
      const sumW = w1 + w2;

      const x = Math.round((w1 * b1.x + w2 * b2.x) / sumW);
      const y = Math.round((w1 * b1.y + w2 * b2.y) / sumW);
      const gps = this.svgToGps(x, y);

      return {
        success: true,
        x,
        y,
        lat: gps.lat,
        lng: gps.lng,
        accuracy: parseFloat(((b1.distanceMeter + b2.distanceMeter) / 2).toFixed(1)),
        method: 'WEIGHTED_TWO_BEACONS',
        beaconCount: 2,
        usedBeacons: validBeacons
      };
    }

    // TRƯỜNG HỢP 3: CÓ TỪ 3 TRẠM TRỞ LÊN (MULTILATERATION & TRILATERATION ĐA ĐIỂM)
    // Áp dụng thuật toán Bình phương tối thiểu có trọng số (Weighted Least Squares Multilateration)
    const result = this._solveMultilateration(validBeacons);

    // Tính độ phân tán sai số ước tính (Estimated Accuracy)
    let totalResidual = 0;
    validBeacons.forEach(b => {
      const actualDistPx = Math.hypot(b.x - result.x, b.y - result.y);
      const expectedDistPx = b.distancePixels;
      const diffMeter = Math.abs(actualDistPx - expectedDistPx) / this.PIXELS_PER_METER;
      totalResidual += diffMeter;
    });
    const estAccuracy = parseFloat(Math.max(0.3, totalResidual / validBeacons.length).toFixed(2));

    const gps = this.svgToGps(result.x, result.y);

    return {
      success: true,
      x: result.x,
      y: result.y,
      lat: gps.lat,
      lng: gps.lng,
      accuracy: estAccuracy,
      method: validBeacons.length === 3 ? 'TRILATERATION_3_POINTS' : `MULTILATERATION_${validBeacons.length}_POINTS`,
      beaconCount: validBeacons.length,
      usedBeacons: validBeacons
    };
  }

  /**
   * Giải hệ phương trình giao thoa N vòng tròn (Linear Least Squares)
   */
  _solveMultilateration(beacons) {
    const N = beacons.length;
    const p0 = beacons[0];
    const x0 = p0.x, y0 = p0.y, r0 = p0.distancePixels;

    let AtA_00 = 0, AtA_01 = 0, AtA_10 = 0, AtA_11 = 0;
    let AtB_0 = 0, AtB_1 = 0;

    // Xây dựng ma trận cho N-1 phương trình giao tuyến
    for (let i = 1; i < N; i++) {
      const pi = beacons[i];
      const xi = pi.x, yi = pi.y, ri = pi.distancePixels;

      const row0 = 2 * (xi - x0);
      const row1 = 2 * (yi - y0);
      const bVal = (r0 * r0 - ri * ri) + (xi * xi - x0 * x0) + (yi * yi - y0 * y0);

      // Trọng số nghịch đảo bình phương cự ly
      const w = 1 / Math.max(1.0, ri * ri);

      AtA_00 += row0 * row0 * w;
      AtA_01 += row0 * row1 * w;
      AtA_10 += row1 * row0 * w;
      AtA_11 += row1 * row1 * w;

      AtB_0 += row0 * bVal * w;
      AtB_1 += row1 * bVal * w;
    }

    const det = AtA_00 * AtA_11 - AtA_01 * AtA_10;

    // Trọng tâm có trọng số (Weighted Centroid Localization - WCL) làm mốc an toàn
    let sumW = 0, sumWx = 0, sumWy = 0;
    for (let i = 0; i < N; i++) {
      const b = beacons[i];
      const w = 1 / Math.max(0.1, b.distanceMeter * b.distanceMeter);
      sumW += w;
      sumWx += w * b.x;
      sumWy += w * b.y;
    }
    const wclX = sumWx / sumW;
    const wclY = sumWy / sumW;

    let finalX, finalY;

    // Nếu ma trận suy biến (các Beacon nằm thẳng hàng) -> Dùng WCL
    if (Math.abs(det) < 1e-5) {
      finalX = wclX;
      finalY = wclY;
    } else {
      const rawX = (AtB_0 * AtA_11 - AtB_1 * AtA_01) / det;
      const rawY = (AtA_00 * AtB_1 - AtA_10 * AtB_0) / det;

      // Kiểm tra xem điểm giải ra có nằm trong khuôn viên phòng không
      const b = this.roomBounds;
      if (rawX < b.minX - 50 || rawX > b.maxX + 50 || rawY < b.minY - 50 || rawY > b.maxY + 50) {
        // Quá xa biên phòng do nhiễu tín hiệu: Dùng trọng tâm WCL
        finalX = wclX;
        finalY = wclY;
      } else {
        // Kết hợp 85% Trilateration và 15% Centroid để hấp thụ nhiễu đa đường (multipath fading)
        finalX = 0.85 * rawX + 0.15 * wclX;
        finalY = 0.85 * rawY + 0.15 * wclY;
      }
    }

    // Giới hạn trong biên hợp lệ
    finalX = Math.max(this.roomBounds.minX, Math.min(this.roomBounds.maxX, Math.round(finalX)));
    finalY = Math.max(this.roomBounds.minY, Math.min(this.roomBounds.maxY, Math.round(finalY)));

    return { x: finalX, y: finalY };
  }
}

module.exports = new BleLocationService();
