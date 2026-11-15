const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DB_FILE_PATH = path.join(__dirname, '..', 'data', 'db_store.json');

// 1. Mongoose Schema cho Thiết Bị Hub
const HubSchema = new mongoose.Schema({
  hubId: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: 'Hub 2Guide v2.1' },
  serial: String,
  status: { type: String, default: 'Sẵn sàng' },
  battery: { type: Number, default: 100 },
  lang: { type: String, default: '🇻🇳 Tiếng Việt' },
  group: { type: String, default: '-' },
  user: { type: String, default: '-' },
  location: { type: String, default: 'Dock Sạc A' },
  lat: { type: Number, default: 20.997715 },
  lng: { type: Number, default: 105.844730 },
  x: { type: Number, default: 380 },
  y: { type: Number, default: 260 },
  alt: { type: Number, default: 0 },
  yaw: { type: Number, default: 0 },
  pitch: { type: Number, default: 0 },
  roll: { type: Number, default: 0 },
  startShiftBattery: { type: Number, default: 100 },
  endShiftBattery: { type: Number, default: null },
  lastSeen: { type: Number, default: Date.now },
  currentGroupId: { type: String, default: null },
  isOnline: { type: Boolean, default: true }
}, { timestamps: true });

// 2. Mongoose Schema cho Đoàn Khách Tham Quan (Tour Groups)
const TourGroupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true, index: true },
  token: { type: String, index: true },
  groupName: String,
  leaderName: String,
  memberCount: Number,
  hubIds: [String],
  userAccessUrl: String,
  qrCodeDataUrl: String,
  createdAt: String,
  endedAt: String,
  status: { type: String, default: 'ACTIVE' },
  trajectories: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// 3. Mongoose Schema cho Dữ Liệu Khuôn Viên / Di Tích
const SiteDataSchema = new mongoose.Schema({
  siteCode: { type: String, default: 'NEU', unique: true },
  siteName: String,
  englishName: String,
  locationName: String,
  center: Object,
  zoom: Number,
  minZoom: Number,
  maxZoom: Number,
  zones: Array,
  pois: { type: Array, default: [] },
  artifacts: Array,
  tourRoute: Array
}, { timestamps: true });

// 4. Mongoose Schema cho Báo Cáo Tài Chính & Tổng Quan (Overview & Finance)
const FinanceSchema = new mongoose.Schema({
  reportCode: { type: String, default: 'FIN_TODAY', unique: true },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  rentalsToday: { type: Number, default: 48 },
  rentalsActive: { type: Number, default: 24 },
  devicesTotal: { type: Number, default: 50 },
  devicesReady: { type: Number, default: 22 },
  devicesCharging: { type: Number, default: 4 },
  revenueToday: { type: Number, default: 2400000 },
  rentalPrice: { type: Number, default: 50000 },
  serviceRevenue: { type: Number, default: 68500000 },
  depositHeld: { type: Number, default: 12500000 },
  depositRefunded: { type: Number, default: 45000000 },
  feesPenalty: { type: Number, default: 1250000 },
  timelineUsage: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      day: [
        { time: '08:00', used: 12 },
        { time: '09:00', used: 28 },
        { time: '10:00', used: 38 },
        { time: '11:00', used: 42 },
        { time: '12:00', used: 20 },
        { time: '13:00', used: 32 },
        { time: '14:00', used: 45 },
        { time: '15:00', used: 36 },
        { time: '16:00', used: 24 },
        { time: '17:00', used: 8 }
      ],
      week: [
        { time: 'Thứ 2', used: 140 },
        { time: 'Thứ 3', used: 185 },
        { time: 'Thứ 4', used: 210 },
        { time: 'Thứ 5', used: 240 },
        { time: 'Thứ 6', used: 320 },
        { time: 'Thứ 7', used: 480 },
        { time: 'Chủ Nhật', used: 520 }
      ],
      month: [
        { time: 'Tuần 1', used: 1250 },
        { time: 'Tuần 2', used: 1420 },
        { time: 'Tuần 3', used: 1680 },
        { time: 'Tuần 4', used: 1950 }
      ]
    }
  }
}, { timestamps: true });

// 5. Mongoose Schema cho Sổ Cái Giao Dịch Tài Chính (Transactions Ledger)
const TransactionSchema = new mongoose.Schema({
  txId: { type: String, required: true, unique: true, index: true },
  timestamp: { type: Date, default: Date.now },
  timeStr: { type: String },
  customerName: { type: String, required: true },
  hubId: { type: String },
  deviceCount: { type: Number, default: 1 },
  paymentMethod: { type: String, default: 'Chuyển khoản VietQR' },
  amount: { type: Number, required: true },
  depositAmount: { type: Number, default: 0 },
  cashier: { type: String, default: 'Quầy Tiếp Đón BQL' },
  status: { type: String, default: 'COMPLETED' },
  notes: String
}, { timestamps: true });

// 6. Mongoose Schema cho Thuê Máy (Rentals)
const RentalSchema = new mongoose.Schema({
  rentalId: { type: String, required: true, unique: true, index: true },
  hubId: { type: String, required: true, index: true },
  renterName: { type: String, required: true },
  phoneNumber: { type: String },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  rentalFee: { type: Number, default: 50000 },
  depositAmount: { type: Number, default: 200000 },
  paymentMethod: { type: String, default: 'VietQR' },
  status: { type: String, default: 'ACTIVE' },
  notes: String
}, { timestamps: true });

class DatabaseService {
  constructor() {
    this.isMongoConnected = false;
    this.mongoose = mongoose;
    this.saveTimeout = null;

    // Models
    this.HubModel = mongoose.models.Hub || mongoose.model('Hub', HubSchema);
    this.TourGroupModel = mongoose.models.TourGroup || mongoose.model('TourGroup', TourGroupSchema);
    this.SiteDataModel = mongoose.models.SiteData || mongoose.model('SiteData', SiteDataSchema);
    this.FinanceModel = mongoose.models.Finance || mongoose.model('Finance', FinanceSchema);
    this.TransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
    this.RentalModel = mongoose.models.Rental || mongoose.model('Rental', RentalSchema);
  }

  // Khởi tạo kết nối MongoDB Atlas và đồng bộ dữ liệu ban đầu
  async init(context = {}) {
    const mongoUri = (process.env.MONGODB_URI || '').trim();

    if (mongoUri && mongoUri.startsWith('mongodb')) {
      try {
        console.log('[MongoDB Atlas] Đang kết nối tới cơ sở dữ liệu...');
        await mongoose.connect(mongoUri, {
          dbName: '2guide',
          serverSelectionTimeoutMS: 8000
        });
        this.isMongoConnected = true;
        console.log('[MongoDB Atlas] Đã kết nối MongoDB Atlas thành công (Database: 2guide)!');

        await this.syncSiteData(context.siteData);
        await this.syncHubs(context.hubs);
        await this.syncGroups(context.groups, context.groupTokens);

      } catch (err) {
        console.warn('[MongoDB Atlas] Lỗi kết nối MongoDB Atlas, chuyển sang lưu trữ an toàn db_store.json:', err.message);
      }
    } else {
      console.log('[Database] MONGODB_URI chưa được cấu hình. Sử dụng bộ lưu trữ an toàn data/db_store.json.');
    }

    return this.loadInitialData();
  }

  async syncSiteData(siteData) {
    if (!this.isMongoConnected || !siteData) return;
    try {
      const existing = await this.SiteDataModel.findOne({ siteCode: siteData.siteCode || 'NEU' });
      if (existing) {
        siteData.siteName = existing.siteName || siteData.siteName;
        siteData.locationName = existing.locationName || siteData.locationName;
        siteData.center = existing.center || siteData.center;
        siteData.zoom = existing.zoom || siteData.zoom;
        siteData.zones = existing.zones || siteData.zones;
        if (existing.pois && existing.pois.length > 0) {
          siteData.pois = existing.pois;
        } else {
          await this.SiteDataModel.updateOne(
            { siteCode: siteData.siteCode || 'NEU' },
            { $set: { pois: siteData.pois || [] } }
          );
        }
        siteData.artifacts = existing.artifacts || siteData.artifacts;
        siteData.tourRoute = [];
        console.log('[MongoDB Atlas] Đã nạp dữ liệu bản đồ từ MongoDB Atlas.');
      }
    } catch (e) {
      console.error('[MongoDB Atlas] Lỗi đồng bộ SiteData:', e.message);
    }
  }

  async syncHubs(inMemoryHubs) {
    if (!this.isMongoConnected) return;
    try {
      const mongoHubs = await this.HubModel.find({});
      if (mongoHubs && mongoHubs.length > 0) {
        const validIds = mongoHubs.map(h => h.hubId);
        if (inMemoryHubs) {
          Object.keys(inMemoryHubs).forEach(k => {
            if (!validIds.includes(k)) {
              delete inMemoryHubs[k];
            }
          });
          mongoHubs.forEach(h => {
            if (inMemoryHubs[h.hubId]) {
              inMemoryHubs[h.hubId].battery = h.battery;
              inMemoryHubs[h.hubId].status = h.status || inMemoryHubs[h.hubId].status;
              inMemoryHubs[h.hubId].user = h.user || inMemoryHubs[h.hubId].user;
              inMemoryHubs[h.hubId].location = h.location || inMemoryHubs[h.hubId].location;
              inMemoryHubs[h.hubId]._id = h._id;
              if (h.x) inMemoryHubs[h.hubId].x = h.x;
              if (h.y) inMemoryHubs[h.hubId].y = h.y;
              if (h.lat) inMemoryHubs[h.hubId].lat = h.lat;
              if (h.lng) inMemoryHubs[h.hubId].lng = h.lng;
            } else {
              inMemoryHubs[h.hubId] = h.toObject();
            }
          });
        }
        console.log(`[MongoDB Atlas] Đã nạp ${mongoHubs.length} thiết bị Hubs từ MongoDB Atlas.`);
      }
    } catch (e) {
      console.error('[MongoDB Atlas] Lỗi đồng bộ Hubs:', e.message);
    }
  }

  async syncGroups(inMemoryGroups, inMemoryTokens) {
    if (!this.isMongoConnected) return;
    try {
      const mongoGroups = await this.TourGroupModel.find({ status: 'ACTIVE' });
      if (mongoGroups && mongoGroups.length > 0) {
        mongoGroups.forEach(g => {
          if (inMemoryGroups) {
            inMemoryGroups[g.groupId] = {
              groupId: g.groupId,
              token: g.token,
              groupName: g.groupName,
              leaderName: g.leaderName,
              memberCount: g.memberCount,
              hubIds: g.hubIds,
              userAccessUrl: g.userAccessUrl,
              qrCodeDataUrl: g.qrCodeDataUrl,
              createdAt: g.createdAt,
              endedAt: g.endedAt,
              status: g.status,
              trajectories: g.trajectories || {}
            };
          }
          if (inMemoryTokens && g.token) {
            inMemoryTokens[g.token] = g.groupId;
          }
        });
        console.log(`[MongoDB Atlas] Đã nạp ${mongoGroups.length} đoàn khách đang hoạt động từ MongoDB Atlas.`);
      }
    } catch (e) {
      console.error('[MongoDB Atlas] Lỗi đồng bộ Groups:', e.message);
    }
  }

  // --- CÁC PHƯƠNG THỨC TRUY VẤN TÀI CHÍNH & THIẾT BỊ TỪ MONGODB ---

  async getFinancialOverview() {
    if (this.isMongoConnected) {
      try {
        const report = await this.FinanceModel.findOne({ reportCode: 'FIN_TODAY' });
        if (report) return report.toObject();
      } catch (err) {
        console.warn('[MongoDB] Lỗi đọc báo cáo tài chính:', err.message);
      }
    }
    // Fallback data
    return {
      reportCode: 'FIN_TODAY',
      rentalsToday: 48,
      rentalsActive: 24,
      devicesTotal: 50,
      devicesReady: 22,
      devicesCharging: 4,
      revenueToday: 2400000,
      rentalPrice: 50000,
      serviceRevenue: 68500000,
      depositHeld: 12500000,
      depositRefunded: 45000000,
      feesPenalty: 1250000
    };
  }

  async getTransactions(limit = 50) {
    if (this.isMongoConnected) {
      try {
        const list = await this.TransactionModel.find({}).sort({ timestamp: -1 }).limit(limit);
        return list.map(d => d.toObject());
      } catch (err) {
        console.warn('[MongoDB] Lỗi đọc sổ cái giao dịch:', err.message);
      }
    }
    return [];
  }

  gpsToSvgRoom(lat, lng) {
    const centerLat = 20.997715;
    const centerLng = 105.844730;
    const widthMeters = 18.9;
    const heightMeters = 13.9;
    const rotationAngle = 75.0;
    const mLat = 111320;
    const mLng = 111320 * Math.cos(centerLat * Math.PI / 180);
    const rad = -rotationAngle * Math.PI / 180;

    const dxRot = (Number(lng) - centerLng) * mLng;
    const dyRot = (Number(lat) - centerLat) * mLat;
    const dx = dxRot * Math.cos(rad) - dyRot * Math.sin(rad);
    const dy = dxRot * Math.sin(rad) + dyRot * Math.cos(rad);
    const x = Math.round(Math.max(10, Math.min(790, (dx / widthMeters + 0.5) * 800)));
    const y = Math.round(Math.max(10, Math.min(490, (0.5 - dy / heightMeters) * 500)));
    return { x, y };
  }

  async getAllDevices(inMemoryHubs = null) {
    if (this.isMongoConnected) {
      try {
        const devices = await this.HubModel.find({}).sort({ hubId: 1 });
        if (devices && devices.length > 0) {
          return devices.map(d => {
            const obj = d.toObject();
            if (inMemoryHubs && inMemoryHubs[obj.hubId]) {
              const mem = inMemoryHubs[obj.hubId];
              if (mem.lat !== undefined) obj.lat = mem.lat;
              if (mem.lng !== undefined) obj.lng = mem.lng;
              if (mem.x !== undefined) obj.x = mem.x;
              if (mem.y !== undefined) obj.y = mem.y;
              if (mem.yaw !== undefined) obj.yaw = mem.yaw;
              if (mem.battery !== undefined) obj.battery = mem.battery;
              if (mem.isOnline !== undefined) obj.isOnline = mem.isOnline;
            } else if (obj.x === undefined || obj.y === undefined || obj.x === null || obj.y === null) {
              const { x, y } = this.gpsToSvgRoom(obj.lat, obj.lng);
              obj.x = x;
              obj.y = y;
            }
            return obj;
          });
        }
      } catch (err) {
        console.warn('[MongoDB] Lỗi đọc danh sách thiết bị:', err.message);
      }
    }
    return [];
  }

  async createRental({ hubId, renterName, phoneNumber, rentalFee = 50000, depositAmount = 200000, paymentMethod = 'VietQR', notes }) {
    const cleanHubId = hubId ? String(hubId).trim().toUpperCase() : 'HL-01';
    const rentalId = `RNT-${Date.now().toString().slice(-6)}-${cleanHubId.replace('-', '')}`;
    const txId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} Hôm nay`;

    let savedRental = null;
    let savedTx = null;

    if (this.isMongoConnected) {
      try {
        // 1. Lưu bản ghi thuê máy
        savedRental = await this.RentalModel.create({
          rentalId,
          hubId: cleanHubId,
          renterName: renterName || 'Khách lẻ',
          phoneNumber: phoneNumber || '',
          rentalFee,
          depositAmount,
          paymentMethod,
          status: 'ACTIVE',
          notes: notes || 'Thuê máy vi định vị Nhà Tổng Thống'
        });

        // 2. Tạo giao dịch tài chính trong sổ cái
        savedTx = await this.TransactionModel.create({
          txId,
          timeStr,
          customerName: `${renterName || 'Khách lẻ'} (${cleanHubId})`,
          hubId: cleanHubId,
          deviceCount: 1,
          paymentMethod,
          amount: rentalFee,
          depositAmount,
          cashier: 'Hệ thống Trực tuyến BQL',
          status: 'COMPLETED',
          notes: notes || 'Thuê máy tham quan di tích'
        });

        // 3. Cập nhật thiết bị trong kho
        await this.HubModel.findOneAndUpdate(
          { hubId: cleanHubId },
          {
            $set: {
              status: 'Đang thuê',
              user: renterName || 'Khách lẻ',
              group: 'Khách lẻ',
              location: 'Khu vực Cung Đông',
              lastSeen: Date.now()
            }
          },
          { upsert: true }
        );

        // 4. Cập nhật tổng quan tài chính
        await this.FinanceModel.findOneAndUpdate(
          { reportCode: 'FIN_TODAY' },
          {
            $inc: {
              rentalsToday: 1,
              rentalsActive: 1,
              revenueToday: rentalFee,
              serviceRevenue: rentalFee,
              depositHeld: depositAmount
            }
          },
          { upsert: true }
        );

        console.log(`[MongoDB Rental] Đã lưu thành công giao dịch thuê máy ${cleanHubId} cho khách ${renterName}!`);
      } catch (err) {
        console.error('[MongoDB Rental] Lỗi tạo đơn thuê:', err);
      }
    }

    return {
      rentalId,
      txId,
      hubId: cleanHubId,
      renterName: renterName || 'Khách lẻ',
      rentalFee,
      depositAmount,
      timeStr,
      savedRental,
      savedTx
    };
  }

  async returnRental(hubId) {
    const cleanHubId = hubId ? String(hubId).trim().toUpperCase() : 'HL-01';
    let updatedRental = null;
    let updatedHub = null;

    if (this.isMongoConnected) {
      try {
        // 1. Cập nhật bản ghi thuê thành RETURNED
        updatedRental = await this.RentalModel.findOneAndUpdate(
          { hubId: cleanHubId, status: 'ACTIVE' },
          { $set: { status: 'RETURNED', endTime: new Date() } },
          { sort: { startTime: -1 }, new: true }
        );

        // 2. Cập nhật thiết bị trong kho thành Sẵn sàng
        updatedHub = await this.HubModel.findOneAndUpdate(
          { hubId: cleanHubId },
          {
            $set: {
              status: 'Sẵn sàng',
              user: '-',
              group: '-',
              location: 'Dock Sạc A',
              lastSeen: Date.now()
            }
          },
          { new: true, upsert: true }
        );

        // 3. Cập nhật báo cáo tài chính
        await this.FinanceModel.findOneAndUpdate(
          { reportCode: 'FIN_TODAY' },
          {
            $inc: {
              rentalsActive: -1,
              depositHeld: -200000,
              depositRefunded: 200000
            }
          },
          { upsert: true }
        );

        console.log(`[MongoDB Rental] Đã thu hồi máy ${cleanHubId} về Dock Sạc A thành công!`);
      } catch (err) {
        console.error('[MongoDB Rental] Lỗi thu hồi máy:', err);
      }
    }
    return { hubId: cleanHubId, status: 'Sẵn sàng', hub: updatedHub };
  }

  loadInitialData() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Database] Lỗi đọc db_store.json ban đầu:', e.message);
    }
    return { hubs: {}, groups: {}, groupTokens: {} };
  }

  queuePersist(state) {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persistToFile(state);
    }, 1000);
  }

  async updateHub(hub) {
    if (!hub || !hub.hubId) return;
    if (this.isMongoConnected) {
      try {
        await this.HubModel.updateOne(
          { hubId: hub.hubId },
          {
            $set: {
              name: hub.name,
              serial: hub.serial,
              status: hub.status,
              battery: hub.battery,
              location: hub.location,
              lat: hub.lat,
              lng: hub.lng,
              x: hub.x,
              y: hub.y,
              alt: hub.alt,
              yaw: hub.yaw,
              pitch: hub.pitch,
              roll: hub.roll,
              lastSeen: hub.lastSeen || Date.now(),
              isOnline: hub.isOnline
            }
          },
          { upsert: true }
        );
      } catch (e) {
        console.warn('[MongoDB] Lỗi lưu cập nhật Hub:', e.message);
      }
    }
  }

  scheduleSave(state) {
    if (this.isMongoConnected && state && state.hubs) {
      Object.values(state.hubs).forEach(h => {
        this.updateHub(h).catch(() => {});
      });
    }
    return this.queuePersist(state);
  }

  persistToFile(state) {
    try {
      const dataToSave = {
        updatedAt: new Date().toISOString(),
        hubs: state.hubs || {},
        groups: state.groups || {},
        groupTokens: state.groupTokens || {}
      };
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (err) {
      console.error('[Storage] Lỗi lưu db_store.json:', err.message);
    }
  }
}

module.exports = new DatabaseService();
