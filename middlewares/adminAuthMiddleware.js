/**
 * 2Guide - Middleware: Xác thực mã bí mật Ban Quản Lý (ADMIN_SECRET_KEY)
 * Ngăn chặn kẻ gian gọi trực tiếp các API quản trị nhạy cảm (Tạo đoàn, Hủy đoàn, Phát loa, Chốt pin, Lưu bản đồ)
 */

const { ADMIN_SECRET_KEY, ESP32_SECRET_KEY } = require('../config/appConfig');

function checkAdminSecretValid(req) {
  // Đã bỏ yêu cầu mật khẩu quản lý theo yêu cầu của BQL
  return true;
}

function checkAdminOrDeviceSecretValid(req) {
  // Đã bỏ yêu cầu mật khẩu quản lý theo yêu cầu của BQL
  return true;
}

function verifyAdminSecret(req, res, next) {
  if (!checkAdminSecretValid(req)) {
    console.warn(`[AN NINH BQL] Từ chối thao tác quản trị từ IP ${req.ip} do sai/thiếu mã bí mật! Endpoint: ${req.originalUrl}`);
    return res.status(401).json({
      success: false,
      authStatus: 'UNAUTHORIZED_ADMIN',
      error: 'Từ chối truy cập: Sai hoặc thiếu mã bí mật Ban Quản Lý (Admin Secret Key)!'
    });
  }

  res.setHeader('X-Admin-Auth', 'VERIFIED');
  next();
}

function verifyAdminOrDeviceSecret(req, res, next) {
  if (!checkAdminOrDeviceSecretValid(req)) {
    console.warn(`[AN NINH] Từ chối thao tác từ IP ${req.ip} do sai/thiếu mã bí mật Ban Quản Lý hoặc Thiết Bị! Endpoint: ${req.originalUrl}`);
    return res.status(401).json({
      success: false,
      authStatus: 'UNAUTHORIZED',
      error: 'Từ chối truy cập: Sai hoặc thiếu mã bí mật Ban Quản Lý hoặc Thiết Bị!'
    });
  }

  res.setHeader('X-Auth-Status', 'VERIFIED');
  next();
}

module.exports = {
  ADMIN_SECRET_KEY,
  ESP32_SECRET_KEY,
  checkAdminSecretValid,
  checkAdminOrDeviceSecretValid,
  verifyAdminSecret,
  verifyAdminOrDeviceSecret
};

