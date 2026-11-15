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
}

module.exports = new FinanceController();
