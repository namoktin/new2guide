/**
 * 2Guide - Controller: RentalController
 * Quản lý thuê máy, đẩy dữ liệu lên MongoDB và phát sóng thời gian thực cho Ban Quản Lý
 */

const dbService = require('../services/dbService');
const socketManager = require('../websocket/socketManager');

class RentalController {
  // POST /api/rentals/rent
  async createRental(req, res) {
    try {
      const { hubId, renterName, phoneNumber, rentalFee, depositAmount, paymentMethod, notes } = req.body;

      if (!hubId) {
        return res.status(400).json({ success: false, error: 'Thiếu mã thiết bị (hubId)' });
      }

      const result = await dbService.createRental({
        hubId,
        renterName: renterName || 'Khách tham quan',
        phoneNumber: phoneNumber || '',
        rentalFee: Number(rentalFee) || 50000,
        depositAmount: Number(depositAmount) || 200000,
        paymentMethod: paymentMethod || 'VietQR',
        notes: notes || 'Thuê máy tại Nhà Tổng Thống'
      });

      // Lấy báo cáo tài chính mới nhất sau khi tăng lượt thuê
      const updatedOverview = await dbService.getFinancialOverview();

      // Phát sóng realtime cho Ban Quản Lý (manager-demo.html)
      socketManager.broadcastToAdmins({
        type: 'RENTAL_UPDATED',
        action: 'RENT',
        rentalId: result.rentalId,
        txId: result.txId,
        hubId: result.hubId,
        renterName: result.renterName,
        rentalFee: result.rentalFee,
        depositAmount: result.depositAmount,
        timeStr: result.timeStr,
        overview: updatedOverview,
        timestamp: Date.now()
      });

      console.log(`[Rental API] Khách "${result.renterName}" đã thuê máy ${result.hubId} thành công -> Đã lưu MongoDB & Báo Quản lý!`);

      res.json({
        success: true,
        message: 'Đã kích hoạt thuê máy thành công và đẩy lên hệ thống Quản lý!',
        data: result,
        overview: updatedOverview
      });
    } catch (err) {
      console.error('[Rental API] Lỗi kích hoạt thuê máy:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/rentals/return
  async returnRental(req, res) {
    try {
      const { hubId } = req.body;
      if (!hubId) {
        return res.status(400).json({ success: false, error: 'Thiếu mã thiết bị (hubId)' });
      }
      const result = await dbService.returnRental(hubId);
      const updatedOverview = await dbService.getFinancialOverview();

      socketManager.broadcastToAdmins({
        type: 'RENTAL_UPDATED',
        action: 'RETURN',
        hubId: result.hubId,
        overview: updatedOverview,
        timestamp: Date.now()
      });

      res.json({
        success: true,
        message: `Đã thu hồi máy ${result.hubId} về Dock Sạc A!`,
        data: result,
        overview: updatedOverview
      });
    } catch (err) {
      console.error('[Rental API] Lỗi thu hồi máy:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/rentals/active
  async getActiveRentals(req, res) {
    try {
      if (dbService.isMongoConnected) {
        const list = await dbService.RentalModel.find({ status: 'ACTIVE' }).sort({ startTime: -1 });
        return res.json({ success: true, count: list.length, data: list });
      }
      res.json({ success: true, count: 0, data: [] });
    } catch (err) {
      console.error('[Rental API] Lỗi lấy danh sách thuê:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new RentalController();
