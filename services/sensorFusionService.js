/**
 * 2Guide - Dịch vụ Dung Hợp Cảm Biến BLE + MPU (Sensor Fusion Service)
 * Kết hợp Định Vị Đa Điểm BLE (Trilateration/Multilateration) và Định Vị Quán Tính MPU (Pedestrian Dead Reckoning - PDR)
 * 
 * Nguyên lý hoạt động:
 * 1. MPU6050 (IMU): Cung cấp góc la bàn hướng nhìn (Yaw), chuyển động bước chân (PDR) liên tục với tần số cao, chuyển động siêu mượt.
 * 2. BLE Beacons (iBeacon): Cung cấp tọa độ tuyệt đối định kỳ không bị trôi (Drift-free) từ 3 trạm Beacon trở lên.
 * 3. Bộ lọc Kalman (Extended Kalman Filter / Complementary Blend): 
 *    - Dự đoán bước đi từ MPU (Predict)
 *    - Hiệu chỉnh sai số từ BLE (Update)
 *    -> Triệt tiêu hoàn toàn độ nhiễu/giật của sóng BLE và loại bỏ hiện tượng trôi dạt tích lũy của cảm biến quán tính MPU!
 */

const bleLocationService = require('./bleLocationService');
const { normalizeHubId } = require('../config/appConfig');

class SensorFusionService {
  constructor() {
    // Trạng thái theo dõi từng Hub: hubId -> { x, y, lat, lng, yaw, pCov, lastStepTime, totalSteps }
    this.hubStates = new Map();

    // 1 mét thực địa = 20 điểm ảnh SVG
    this.PIXELS_PER_METER = 20.0;

    // Chiều dài bước chân mặc định của người lớn (~0.7m)
    this.DEFAULT_STEP_LENGTH_METER = 0.7;

    // Nhiễu chuyển động quán tính Q và nhiễu sóng BLE R
    this.Q_MOTION_NOISE = 0.08;
    this.R_BLE_NOISE = 0.45;
  }

  /**
   * Khởi tạo hoặc lấy trạng thái của Hub
   */
  getOrCreateHubState(hubId, initialPos = {}) {
    const cleanId = (typeof normalizeHubId === 'function') ? normalizeHubId(hubId) : String(hubId).trim().toUpperCase();
    if (!this.hubStates.has(cleanId)) {
      const x = initialPos.x !== undefined ? Number(initialPos.x) : 380;
      const y = initialPos.y !== undefined ? Number(initialPos.y) : 260;
      const gps = bleLocationService.svgToGps(x, y);

      this.hubStates.set(cleanId, {
        hubId: cleanId,
        x: x,
        y: y,
        lat: initialPos.lat !== undefined ? Number(initialPos.lat) : gps.lat,
        lng: initialPos.lng !== undefined ? Number(initialPos.lng) : gps.lng,
        yaw: initialPos.yaw !== undefined ? Number(initialPos.yaw) : 0,
        pitch: 0,
        roll: 0,
        pCov: 1.0,
        lastTimestamp: Date.now(),
        totalSteps: 0,
        lastFixMethod: 'INITIAL'
      });
    }
    return this.hubStates.get(cleanId);
  }

  /**
   * Đặt lại vị trí gốc của Hub (ví dụ khi chọn nhanh từ trạm sạc hoặc bản đồ)
   */
  resetHubPosition(hubId, x, y, yaw = 0) {
    const state = this.getOrCreateHubState(hubId, { x, y, yaw });
    state.x = Number(x);
    state.y = Number(y);
    state.yaw = Number(yaw);
    const gps = bleLocationService.svgToGps(state.x, state.y);
    state.lat = gps.lat;
    state.lng = gps.lng;
    state.pCov = 0.1;
    state.lastTimestamp = Date.now();
    return state;
  }

  /**
   * 1. BƯỚC DỰ ĐOÁN TỪ MPU (PREDICT STEP - PEDESTRIAN DEAD RECKONING)
   * Sử dụng góc Yaw la bàn và gia tốc / bước chân từ MPU6050 để dự đoán vị trí kế tiếp
   */
  predictWithMpu(hubId, mpuData = {}) {
    const state = this.getOrCreateHubState(hubId);

    // Cập nhật góc nhìn MPU
    if (mpuData.yaw !== undefined && !isNaN(mpuData.yaw)) {
      state.yaw = Number(mpuData.yaw);
    }
    if (mpuData.pitch !== undefined && !isNaN(mpuData.pitch)) state.pitch = Number(mpuData.pitch);
    if (mpuData.roll !== undefined && !isNaN(mpuData.roll)) state.roll = Number(mpuData.roll);

    // Tiếp nhận và tính toán gia tốc 3 trục MPU6050
    if (mpuData.ax !== undefined || mpuData.ay !== undefined || mpuData.az !== undefined) {
      const ax = Number(mpuData.ax) || 0;
      const ay = Number(mpuData.ay) || 0;
      const az = Number(mpuData.az) || 1.0;
      const mag = Math.hypot(ax, ay, az);
      state.accel = { ax, ay, az, magnitude: mag };
      const now = Date.now();
      // Nhận diện bước đi PDR qua đỉnh xung gia tốc tổng hợp (|a| > 1.32g)
      if (mag > 1.32 && (now - (state.lastStepTime || 0) > 350)) {
        state.lastStepTime = now;
        mpuData.isStep = true;
      }
    }

    // Tính cự ly di chuyển từ bước chân (PDR)
    let moveDistPixels = 0;
    const isStep = mpuData.isStep || mpuData.step === true || (mpuData.stepCount && mpuData.stepCount > 0);

    if (isStep) {
      const stepLength = Number(mpuData.stepLength || this.DEFAULT_STEP_LENGTH_METER);
      moveDistPixels = stepLength * this.PIXELS_PER_METER;
      state.totalSteps += 1;
    } else if (mpuData.speed && Number(mpuData.speed) > 0) {
      const now = Date.now();
      const dt = Math.min(1.0, (now - state.lastTimestamp) / 1000.0);
      moveDistPixels = Number(mpuData.speed) * this.PIXELS_PER_METER * dt;
    }

    if (moveDistPixels > 0) {
      // Góc Yaw: state.yaw là góc la bàn địa lý WGS84 (0° = Bắc, 90° = Đông, 180° = Nam, 270° = Tây)
      // Mặt bằng kiến trúc Nhà Tổng Thống nằm nghiêng góc 75.0° so với hướng Bắc.
      // Do đó, góc phương vị thực tế trong hệ tọa độ phòng SVG (Yaw_svg) là:
      // Yaw_svg = (state.yaw + 75.0 + 360) % 360
      const yawSvg = (state.yaw + 75.0 + 360.0) % 360.0;
      const radSvg = (yawSvg * Math.PI) / 180.0;
      const dx = moveDistPixels * Math.sin(radSvg);
      const dy = -moveDistPixels * Math.cos(radSvg);

      state.x += dx;
      state.y += dy;

      // Giới hạn trong biên phòng (40-760, 30-470)
      state.x = Math.max(40, Math.min(760, state.x));
      state.y = Math.max(30, Math.min(470, state.y));

      // Tăng độ bất định theo bước đi
      state.pCov += this.Q_MOTION_NOISE;
      state.lastFixMethod = 'MPU_DEAD_RECKONING';
    }

    state.lastTimestamp = Date.now();
    const gps = bleLocationService.svgToGps(state.x, state.y);
    state.lat = gps.lat;
    state.lng = gps.lng;

    return state;
  }

  /**
   * 2. BƯỚC CẬP NHẬT TỪ BLE (UPDATE STEP - KALMAN CORRECTION)
   * Sử dụng kết quả định vị đa điểm BLE để kéo vị trí về mốc chuẩn vật lý
   */
  updateWithBle(hubId, bleLocationResult) {
    const state = this.getOrCreateHubState(hubId);

    if (!bleLocationResult || !bleLocationResult.success) {
      return state;
    }

    const bleX = bleLocationResult.x;
    const bleY = bleLocationResult.y;
    const bleAccuracy = bleLocationResult.accuracy || 1.5;

    // Tính Kalman Gain K: Cân bằng giữa độ bất định MPU và độ nhiễu BLE
    const rNoise = Math.max(0.1, bleAccuracy * 0.15);
    const K = state.pCov / (state.pCov + rNoise);

    // Cập nhật trạng thái vị trí kết hợp
    state.x = state.x + K * (bleX - state.x);
    state.y = state.y + K * (bleY - state.y);
    state.pCov = (1 - K) * state.pCov;

    // Giới hạn biên phòng
    state.x = Math.max(40, Math.min(760, Math.round(state.x * 10) / 10));
    state.y = Math.max(30, Math.min(470, Math.round(state.y * 10) / 10));

    state.lastFixMethod = `FUSED_BLE_MPU_${bleLocationResult.method || 'TRILATERATION'}`;

    const gps = bleLocationService.svgToGps(state.x, state.y);
    state.lat = gps.lat;
    state.lng = gps.lng;

    return state;
  }

  /**
   * 3. HÀM DUNG HỢP TỔNG HỢP: NHẬN ĐỒNG THỜI MPU & TÍN HIỆU BLE ĐA ĐIỂM
   * Tự động tính toán vị trí bản thân chuẩn xác nhất
   */
  fuse(hubId, inputData = {}) {
    const cleanId = (typeof normalizeHubId === 'function') ? normalizeHubId(hubId) : String(hubId).trim().toUpperCase();
    const state = this.getOrCreateHubState(cleanId);

    let bleResult = null;

    // 1. Nếu có mảng quét BLE Beacons -> Tính toán định vị đa điểm (3+ trạm)
    const beacons = inputData.beacons || inputData.bleScans || (inputData.ble && Array.isArray(inputData.ble.beacons) ? inputData.ble.beacons : null);
    if (beacons && Array.isArray(beacons) && beacons.length > 0) {
      bleResult = bleLocationService.calculateLocation(beacons);
    }

    // 2. Cập nhật bước đi & góc hướng nhìn từ MPU
    const mpu = inputData.mpu || {
      yaw: inputData.yaw,
      pitch: inputData.pitch,
      roll: inputData.roll,
      isStep: inputData.isStep || inputData.step,
      stepLength: inputData.stepLength,
      speed: inputData.speed
    };
    this.predictWithMpu(cleanId, mpu);

    // 3. Nếu có vị trí tuyệt đối từ BLE -> Hiệu chỉnh Kalman Filter
    if (bleResult && bleResult.success) {
      this.updateWithBle(cleanId, bleResult);
    }

    return {
      success: true,
      hubId: cleanId,
      x: state.x,
      y: state.y,
      lat: state.lat,
      lng: state.lng,
      yaw: state.yaw,
      pitch: state.pitch,
      roll: state.roll,
      totalSteps: state.totalSteps,
      method: state.lastFixMethod,
      accuracy: bleResult ? bleResult.accuracy : 1.2,
      bleResult: bleResult || null
    };
  }
}

module.exports = new SensorFusionService();
