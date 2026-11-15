/**
 * 2Guide - Routes: ApiRoutes
 * Định tuyến toàn bộ REST APIs của hệ thống (Hub, Đoàn khách, Bản đồ, AI & Phần cứng)
 * Áp dụng xác thực mã bí mật nghiêm ngặt cho toàn bộ các tác vụ đọc/ghi dữ liệu quản trị
 */

const express = require('express');
const router = express.Router();

const hubController = require('../controllers/hubController');
const groupController = require('../controllers/groupController');
const siteController = require('../controllers/siteController');
const voiceAiController = require('../controllers/voiceAiController');
const deviceAuthController = require('../controllers/deviceAuthController');
const adminController = require('../controllers/adminController');
const viewController = require('../controllers/viewController');
const financeController = require('../controllers/financeController');
const rentalController = require('../controllers/rentalController');

const upload = require('../middlewares/uploadMiddleware');
const { verifyEsp32Secret } = require('../middlewares/esp32AuthMiddleware');
const {
  verifyAdminSecret,
  checkAdminSecretValid,
  verifyAdminOrDeviceSecret,
  checkAdminOrDeviceSecretValid
} = require('../middlewares/adminAuthMiddleware');
const { verifyEditorSecret, checkEditorSecretValid } = require('../middlewares/editorAuthMiddleware');
const { ADMIN_SECRET_PATH, EDITOR_SECRET_PATH, ADMIN_SECRET_KEY, EDITOR_SECRET_KEY, ESP32_SECRET_KEY } = require('../config/appConfig');


// ==========================================
// 1. DI TÍCH & BẢN ĐỒ (SITE DATA)
// ==========================================
router.get('/site-data', siteController.getSiteData.bind(siteController));

// Lưu bản đồ - Yêu cầu xác thực mã bí mật Map Studio (EDITOR_SECRET_KEY)
router.post('/editor/save', verifyEditorSecret, siteController.saveEditorData.bind(siteController));

// Xác thực key đăng nhập Map Studio Editor
router.post('/editor/verify-key', (req, res) => {
  const isValid = checkEditorSecretValid(req);
  if (isValid) {
    res.setHeader('Set-Cookie', 'editor_session_key=; Path=/; Max-Age=0');
    return res.json({ success: true, message: 'Xác thực Map Studio thành công', redirect: EDITOR_SECRET_PATH });
  }
  return res.status(401).json({ success: false, error: 'Mã bí mật Map Studio Editor không chính xác!' });
});

// Mở khóa giao diện Map Studio (Chỉ trả về HTML Dashboard khi nhập đúng Secret Key)
router.post('/editor/unlock-dashboard', (req, res) => {
  const isValid = checkEditorSecretValid(req);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Mã bí mật Map Studio không chính xác!' });
  }
  const html = viewController.getEditorDashboardHtml();
  return res.json({ success: true, html });
});

router.get('/editor/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'editor_session_key=; Path=/; Max-Age=0');
  res.redirect(EDITOR_SECRET_PATH);
});

// ==========================================
// 2. THIẾT BỊ HUB & PIN
// ==========================================
// Danh sách Hubs - Yêu cầu xác thực quyền Ban Quản Lý hoặc Trạm Giả Lập Kỹ Thuật
router.get('/hubs', verifyAdminOrDeviceSecret, hubController.getAllHubs.bind(hubController));

// Thông tin chi tiết một Hub (Dành cho khách tham quan quét QR trên Hub của họ)
router.get('/hubs/:hubId/info', hubController.getHubInfo.bind(hubController));

// Chốt pin ca - Yêu cầu xác thực mã bí mật Ban Quản Lý (ADMIN_SECRET_KEY)
router.post('/hubs/shift-battery', verifyAdminSecret, hubController.updateShiftBattery.bind(hubController));

// Nhận telemetry (GPS, IMU, Pin) - Yêu cầu xác thực mã bí mật ESP32
router.post('/telemetry', verifyEsp32Secret, hubController.updateTelemetry.bind(hubController));

// Nhận tín hiệu nhìn hiện vật 3s - Yêu cầu xác thực mã bí mật ESP32
router.post('/hubs/gaze-poi', verifyEsp32Secret, hubController.triggerPoiGaze.bind(hubController));

// ==========================================
// 3. ĐOÀN KHÁCH & MÃ QR TOKEN DÙNG 1 LẦN
// ==========================================
// Danh sách đoàn khách & Mã QR - Yêu cầu xác thực quyền Ban Quản Lý
router.get('/groups', verifyAdminSecret, groupController.getAllGroups.bind(groupController));

// Tạo đoàn mới & Kết thúc tour - Ban Quản Lý hoặc Trạm Giả Lập Kỹ Thuật
router.post(['/groups', '/groups/create'], verifyAdminOrDeviceSecret, groupController.createGroup.bind(groupController));
router.get('/groups/:identifier', verifyAdminSecret, groupController.getGroupDetails.bind(groupController));
router.post('/groups/:identifier/end', verifyAdminSecret, groupController.endGroup.bind(groupController));

// ==========================================
// 3.1. TRẠM GIẢ LẬP THỰC ĐỊA (/simulate)
// ==========================================
// Xác thực key đăng nhập trạm giả lập kỹ thuật (Chấp nhận mã BQL hoặc mã ESP32)
router.post('/simulate/verify-key', (req, res) => {
  const isValid = checkAdminOrDeviceSecretValid(req);
  if (isValid) {
    return res.json({
      success: true,
      message: 'Xác thực trạm giả lập thành công'
    });
  }
  return res.status(401).json({
    success: false,
    error: 'Mã bí mật trạm giả lập không chính xác! (Vui lòng dùng mã Ban Quản Lý hoặc mã Kỹ Thuật ESP32)'
  });
});


// ==========================================
// 4. TRỢ LÝ AI & ÂM THANH PHẦN CỨNG
// ==========================================
// Hỏi đáp AI text chat cho khách tham quan qua web
router.post('/chat/ask', voiceAiController.askChat.bind(voiceAiController));

// Nhận file âm thanh microphone INMP441 (ESP32-S3) - Yêu cầu xác thực mã bí mật ESP32
router.post('/inmp441/audio', upload.single('audio'), verifyEsp32Secret, voiceAiController.handleInmp441Audio.bind(voiceAiController));

// Cổng raw audio tương thích - Yêu cầu xác thực mã bí mật ESP32
router.post('/voice/ask', verifyEsp32Secret, voiceAiController.handleVoiceAsk.bind(voiceAiController));

// Luồng Text-To-Speech (TTS) cho DAC PCM5102A - Yêu cầu xác thực mã bí mật ESP32
router.get('/voice/tts', verifyEsp32Secret, voiceAiController.streamTts.bind(voiceAiController));

// ==========================================
// 5. XÁC THỰC BẢO MẬT THIẾT BỊ ESP32
// ==========================================
router.all('/device/verify', deviceAuthController.verifyDevice.bind(deviceAuthController));

// ==========================================
// 6. QUẢN TRỊ VIÊN & PHÁT THANH KHẨN CẤP
// ==========================================
// Phát thanh khẩn cấp - Yêu cầu xác thực mã bí mật Ban Quản Lý (ADMIN_SECRET_KEY)
router.post('/admin/broadcast', verifyAdminSecret, adminController.broadcastEmergency.bind(adminController));

// Xác thực key đăng nhập Ban Quản Lý
router.post('/admin/verify-key', (req, res) => {
  const isValid = checkAdminSecretValid(req);
  if (isValid) {
    res.setHeader('Set-Cookie', 'admin_session_key=; Path=/; Max-Age=0');
    return res.json({ success: true, message: 'Xác thực Ban Quản Lý thành công', redirect: ADMIN_SECRET_PATH });
  }
  return res.status(401).json({ success: false, error: 'Mã bí mật Ban Quản Lý không chính xác!' });
});

// Mở khóa giao diện Dashboard BQL (Chỉ trả về HTML Dashboard khi nhập đúng Secret Key)
router.post('/admin/unlock-dashboard', (req, res) => {
  const isValid = checkAdminSecretValid(req);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Mã bí mật Ban Quản Lý không chính xác!' });
  }
  const html = viewController.getAdminDashboardHtml();
  return res.json({ success: true, html });
});

router.get('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'admin_session_key=; Path=/; Max-Age=0');
  res.redirect(ADMIN_SECRET_PATH);
});

// ==========================================
// 7. BÁO CÁO TÀI CHÍNH & THIẾT BỊ MONGODB
// ==========================================
router.get('/finance/overview', financeController.getOverview.bind(financeController));
router.get('/finance/transactions', financeController.getTransactions.bind(financeController));
router.get('/finance/chart', financeController.getUsageChart.bind(financeController));
router.get('/devices', financeController.getAllDevices.bind(financeController));

// ==========================================
// 8. NGHIỆP VỤ THUÊ MÁY (ĐẨY LÊN MONGODB)
// ==========================================
router.post('/rentals/rent', rentalController.createRental.bind(rentalController));
router.post('/rentals/return', rentalController.returnRental.bind(rentalController));
router.get('/rentals/active', rentalController.getActiveRentals.bind(rentalController));


// API Dung Hợp Cảm Biến BLE + MPU (Xác định vị trí bản thân chuẩn xác cao)
const sensorFusionService = require('../services/sensorFusionService');

router.post('/location/fuse', (req, res) => {
  try {
    const { hubId, mpu, beacons, yaw, isStep, stepLength, speed, updateHub } = req.body;
    const targetHubId = (typeof normalizeHubId === 'function') ? normalizeHubId(hubId || 'HL-18') : (hubId || 'HL-18');

    const result = sensorFusionService.fuse(targetHubId, {
      mpu: mpu || { yaw, isStep, stepLength, speed },
      beacons: beacons
    });

    if (updateHub !== false) {
      const updatedHub = hubModel.updateTelemetry(targetHubId, {
        lat: result.lat,
        lng: result.lng,
        x: result.x,
        y: result.y,
        yaw: result.yaw,
        pitch: result.pitch,
        roll: result.roll,
        ble: {
          method: result.method,
          accuracy: result.accuracy,
          totalSteps: result.totalSteps,
          fused: true
        }
      });
      if (updatedHub) {
        socketManager.broadcastTelemetry(updatedHub);
      }
    }

    return res.json(result);
  } catch (err) {
    console.error('[API Location Fuse] Lỗi:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


// ==========================================
// 9. ĐỊNH VỊ BLE ĐA ĐIỂM (TRILATERATION & MULTILATERATION DYNAMIC)
// ==========================================
const bleLocationService = require('../services/bleLocationService');
const hubModel = require('../models/hubModel');
const socketManager = require('../websocket/socketManager');
const { normalizeHubId } = require('../config/appConfig');

// API định vị chính xác từ 3 điểm Beacon trở lên (Hỗ trợ mở rộng N trạm động)
router.post('/ble/locate', (req, res) => {
  try {
    const { beacons, hubId, updateHub } = req.body;
    if (!beacons || !Array.isArray(beacons) || beacons.length === 0) {
      return res.status(400).json({ success: false, error: 'Thiếu mảng dữ liệu quét sóng Beacon (beacons)' });
    }

    const result = bleLocationService.calculateLocation(beacons);
    if (!result.success) {
      return res.status(422).json(result);
    }

    // Nếu yêu cầu cập nhật vị trí Hub và phát tán thời gian thực
    if (updateHub && hubId) {
      const cleanHubId = (typeof normalizeHubId === 'function') ? normalizeHubId(hubId) : hubId;
      const updatedHub = hubModel.updateTelemetry(cleanHubId, {
        lat: result.lat,
        lng: result.lng,
        x: result.x,
        y: result.y,
        ble: {
          method: result.method,
          accuracy: result.accuracy,
          beaconCount: result.beaconCount,
          usedBeacons: result.usedBeacons
        }
      });
      if (updatedHub) {
        socketManager.broadcastTelemetry(updatedHub);
      }
      result.hubUpdated = cleanHubId;
    }

    return res.json(result);
  } catch (err) {
    console.error('[API BLE Locate] Lỗi:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy danh sách toàn bộ Beacon đang đăng ký trong hệ thống
router.get('/ble/beacons', (req, res) => {
  return res.json({
    success: true,
    total: bleLocationService.getAllBeacons().length,
    data: bleLocationService.getAllBeacons()
  });
});

// Đăng ký thêm trạm Beacon mới linh hoạt vào hệ thống (Không gán cứng)
router.post('/ble/beacons', (req, res) => {
  try {
    const beacon = req.body;
    const registered = bleLocationService.registerBeacon(beacon);
    if (!registered) {
      return res.status(400).json({ success: false, error: 'Dữ liệu Beacon không hợp lệ' });
    }
    return res.json({
      success: true,
      message: `Đã đăng ký thành công trạm Beacon ${registered.id}`,
      data: registered,
      totalBeacons: bleLocationService.getAllBeacons().length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Xóa trạm Beacon
router.delete('/ble/beacons/:id', (req, res) => {
  const bId = req.params.id;
  const deleted = bleLocationService.unregisterBeacon(bId);
  return res.json({ success: deleted, message: deleted ? `Đã xóa trạm Beacon ${bId}` : 'Không tìm thấy trạm Beacon' });
});

module.exports = router;

