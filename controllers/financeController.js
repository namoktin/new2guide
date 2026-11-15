/**
 * 2Guide - Controller: FinanceController
 * Quản lý báo cáo tài chính, tổng quan vận hành và sổ cái giao dịch từ MongoDB Atlas
 */

const dbService = require('../services/dbService');

class FinanceController {
  // GET /api/finance/overview
  async getOverview(req, res) {
    try {
      const data = await dbService.getFinancialOverview();
      res.json({
        success: true,
        data
      });
    } catch (err) {
      console.error('[Finance] Lỗi lấy báo cáo tổng quan:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/finance/transactions
  async getTransactions(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const data = await dbService.getTransactions(limit);
      res.json({
        success: true,
        count: data.length,
        data
      });
    } catch (err) {
      console.error('[Finance] Lỗi lấy sổ cái giao dịch:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/finance/chart
  async getUsageChart(req, res) {
    try {
      const overview = await dbService.getFinancialOverview();
      const timeframe = req.query.timeframe || 'day';
      const chartData = (overview.timelineUsage && overview.timelineUsage[timeframe]) || [];
      res.json({
        success: true,
        timeframe,
        data: chartData
      });
    } catch (err) {
      console.error('[Finance] Lỗi lấy biểu đồ sử dụng:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/devices
  async getAllDevices(req, res) {
    try {
      const hubModel = require('../models/hubModel');
      const data = await dbService.getAllDevices(hubModel.getMap());
      res.json({
        success: true,
        count: data.length,
        data
      });
    } catch (err) {
      console.error('[Finance] Lỗi lấy danh sách thiết bị MongoDB:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/devices/reset - Đặt lại 5 Hub về tọa độ và hướng nhìn chuẩn đồng bộ
  async resetDevices(req, res) {
    try {
      const hubModel = require('../models/hubModel');
      const standardHubs = {
        'HL-18': { x: 380, y: 260, lat: 20.997710, lng: 105.844731, yaw: 68, battery: 95, location: 'Khu vực Trung tâm gian phòng Tổng Thống' },
        'HL-37': { x: 680, y: 240, lat: 20.997773, lng: 105.844744, yaw: 105, battery: 85, location: 'Khu vực Cung Đông (gần Bàn Họp Đá Cổ)' },
        'HL-44': { x: 270, y: 310, lat: 20.997684, lng: 105.844738, yaw: 144, battery: 78, location: 'Khu vực Tiền sảnh Tây Nam (gần Cột Trụ Nam)' },
        'HL-45': { x: 530, y: 110, lat: 20.997751, lng: 105.844701, yaw: 270, battery: 96, location: 'Khu vực Cổng Bắc & Hành lang vòm' },
        'HL-48': { x: 450, y: 380, lat: 20.997717, lng: 105.844767, yaw: 288, battery: 64, location: 'Khu vực Tiền sảnh đón tiếp phía Nam' }
      };

      const socketManager = require('../websocket/socketManager');
      const updatedList = [];

      for (const [hubId, info] of Object.entries(standardHubs)) {
        const updated = hubModel.updateTelemetry(hubId, {
          x: info.x,
          y: info.y,
          lat: info.lat,
          lng: info.lng,
          yaw: info.yaw,
          battery: info.battery,
          isStep: false
        });
        if (updated) {
          updated.isReset = true;
          updated.location = info.location;
          updatedList.push(updated);
          socketManager.broadcastTelemetry({
            ...updated,
            isReset: true
          });
        }
      }

      if (dbService.isMongoConnected && dbService.HubModel) {
        for (const [hubId, info] of Object.entries(standardHubs)) {
          await dbService.HubModel.updateOne(
            { hubId },
            { $set: { x: info.x, y: info.y, lat: info.lat, lng: info.lng, yaw: info.yaw, battery: info.battery, location: info.location } }
          );
        }
      }

      console.log('[API] Đã đặt lại 5 Hub về tọa độ chuẩn:', updatedList.map(h => `${h.hubId}(${h.x},${h.y})`).join(', '));
      res.json({ success: true, message: 'Đã đặt lại 5 Hub về tọa độ chuẩn đồng bộ', data: updatedList });
    } catch (err) {
      console.error('[Finance] Lỗi reset thiết bị:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new FinanceController();
