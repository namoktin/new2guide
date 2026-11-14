/**
 * 2Guide - Dữ liệu thực địa: Nhà Tổng Thống
 * Cập nhật đồng bộ Hiện Vật Nhà Tổng Thống lúc 23:18:24 14/11/2026
 */

module.exports = {
  "siteCode": "NEU",
  "siteName": "Nhà Tổng Thống",
  "englishName": "University Campus",
  "locationName": "Khu Di Tích Nhà Tổng Thống",
  "center": {
    "lat": 21.0001,
    "lng": 105.84245
  },
  "zoom": 20,
  "minZoom": 16,
  "maxZoom": 22,
  "zones": [
    {
      "id": "ZONE_NHA_TONG_THONG",
      "name": "Nhà Tổng Thống (Mặt Bằng Kiến Trúc)",
      "shortName": "Nhà Tổng Thống",
      "color": "#d97706",
      "floor": 1,
      "blueprintUrl": "/maps/Nha_tong_thong_blueprint.svg",
      "bounds": [
        [
          20.99992,
          105.84215
        ],
        [
          21.00028,
          105.84275
        ]
      ],
      "polygon": [
        [
          21.00028,
          105.84215
        ],
        [
          21.00028,
          105.84275
        ],
        [
          20.99992,
          105.84275
        ],
        [
          20.99992,
          105.84215
        ]
      ]
    }
  ],
  "pois": [
    {
      "id": "NTT_BEACON_01",
      "number": 1,
      "name": "Trạm Beacon 1: Cung Điện Phía Đông (BEACONTAG-1)",
      "englishName": "BLE Beacon 1 - East Wing",
      "zoneId": "ZONE_NHA_TONG_THONG",
      "zoneName": "Nhà Tổng Thống",
      "floor": 1,
      "lat": 21.000094,
      "lng": 105.842709,
      "beaconId": "BEACONTAG-1",
      "uuid": "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
      "major": 1,
      "minor": 977,
      "rssiThreshold": -65,
      "description": "Trạm thu phát sóng BLE iBeacon BEACONTAG-1 tại cung điện phía Đông (745, 258). Tự động nhận diện du khách và kích hoạt thuyết minh khi bước tới gần dưới 2 mét.",
      "audioGuide": "Chào mừng bạn đến với Cung điện phía Đông của Nhà Tổng Thống. Thiết bị iBeacon BEACONTAG-1 đang theo dõi và hướng dẫn lộ trình của bạn."
    },
    {
      "id": "NTT_BEACON_02",
      "number": 2,
      "name": "Trạm Beacon 2: Cổng Bắc & Hành Lang Vòm (BEACONTAG-2)",
      "englishName": "BLE Beacon 2 - North Gate",
      "zoneId": "ZONE_NHA_TONG_THONG",
      "zoneName": "Nhà Tổng Thống",
      "floor": 1,
      "lat": 21.000262,
      "lng": 105.842563,
      "beaconId": "BEACONTAG-2",
      "uuid": "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
      "major": 1,
      "minor": 977,
      "rssiThreshold": -65,
      "description": "Trạm vi định vị BLE Beacon BEACONTAG-2 gắn tại vòm cửa phía Bắc (550, 25). Phát hiện du khách bước vào khu vực hành lang chuyển tiếp với độ chính xác cao.",
      "audioGuide": "Bạn đang đứng trước Cổng Bắc và Hành lang vòm kiến trúc cổ Nhà Tổng Thống. Trạm Beacon số 2 đang phát sóng dẫn đường."
    },
    {
      "id": "NTT_BEACON_03",
      "number": 3,
      "name": "Trạm Beacon 3: Tiền Sảnh Trung Tâm (BEACONTAG-3)",
      "englishName": "BLE Beacon 3 - Central Lobby",
      "zoneId": "ZONE_NHA_TONG_THONG",
      "zoneName": "Nhà Tổng Thống",
      "floor": 1,
      "lat": 21.000035,
      "lng": 105.842383,
      "beaconId": "BEACONTAG-3",
      "uuid": "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
      "major": 1,
      "minor": 977,
      "rssiThreshold": -65,
      "description": "Trạm vi định vị BLE Beacon BEACONTAG-3 tại trung tâm tiền sảnh đón tiếp (310, 340). Tự động kích hoạt hướng dẫn lộ trình tham quan tổng thể cho du khách.",
      "audioGuide": "Chào mừng bạn đến với Tiền sảnh trung tâm Nhà Tổng Thống. Vui lòng tham quan theo các biển chỉ dẫn vi mô BLE."
    }
  ],
  "artifacts": [
    {
      "id": "ART_BAN_LAM_VIEC",
      "name": "Bàn Làm Việc Tổng Thống",
      "englishName": "Presidential Desk",
      "category": "HIỆN VẬT LỊCH SỬ • GỖ GÕ ĐỎ",
      "zoneId": "ZONE_NHA_TONG_THONG",
      "zoneName": "Nhà Tổng Thống",
      "floor": 1,
      "svgId": "elem-1794647947024",
      "x": 97.5,
      "y": 80,
      "lat": 21.00015,
      "lng": 105.8423,
      "icon": "🪑",
      "description": "Bàn làm việc chạm khắc vân gỗ gõ đỏ nguyên khối theo phong cách cổ điển thập niên 1960. Nơi ký kết các sắc lệnh bang giao và chỉ đạo các cuộc họp tối mật của Tổng Thống.",
      "audioGuide": "Đây là Bàn làm việc Tổng Thống, được chế tác thủ công bằng gỗ gõ đỏ nguyên khối quý hiếm thập niên 1960. Nơi đây từng diễn ra nhiều cuộc họp kín và ký kết các sắc lệnh lịch sử quan trọng.",
      "tags": [
        "Gỗ gõ đỏ quý hiếm",
        "Thập niên 1960",
        "Kích thước: 2.2m x 1.4m"
      ]
    },
    {
      "id": "ART_BAN_HOP_DA_CO",
      "name": "Bàn Họp Hội Nghị Bầu Dục (Mặt Đá Cổ)",
      "englishName": "Oval Conference Marble Table",
      "category": "NỘI THẤT HỘI NGHỊ • ĐÁ CẨM THẠCH",
      "zoneId": "ZONE_NHA_TONG_THONG",
      "zoneName": "Nhà Tổng Thống",
      "floor": 1,
      "svgId": "elem-1794647957226",
      "x": 715,
      "y": 427.5,
      "lat": 21.00008,
      "lng": 105.8427,
      "icon": "🏛️",
      "description": "Bàn hội nghị hình bầu dục mặt đá cẩm thạch cổ vân rêu kết hợp khung gỗ gụ. Nơi tổ chức các phiên họp nội các cấp cao và đón tiếp các phái đoàn ngoại giao quốc tế.",
      "audioGuide": "Bàn họp hội nghị bầu dục mặt đá cẩm thạch cổ vân rêu quý hiếm, quy cách 12 ghế đại biểu ngoại giao. Mặt đá nguyên khối được gia công tỉ mỉ chống đạn và cách âm.",
      "tags": [
        "Đá cẩm thạch vân rêu",
        "Bầu dục 12 ghế",
        "Trọng lượng: ~1.5 tấn"
      ]
    },
    {
      "id": "ART_COT_TRU_BAC",
      "name": "Cột Trụ Chịu Lực Trung Tâm (Bắc)",
      "englishName": "North Central Load-Bearing Pillar",
      "category": "KIẾN TRÚC KẾT CẤU • ĐÁ GRANITE",
      "zoneId": "ZONE_NHA_TONG_THONG",
      "zoneName": "Nhà Tổng Thống",
      "floor": 1,
      "svgId": "elem-1794647921492",
      "x": 250,
      "y": 230,
      "lat": 21.00012,
      "lng": 105.84242,
      "icon": "🏛️",
      "description": "Cột trụ chịu lực kiến trúc kiên cố bằng đá granite nguyên khối, kết hợp kết cấu bê tông dự ứng lực chống rung chấn và bom đạn của dinh thự.",
      "audioGuide": "Cột trụ chịu lực trung tâm phía Bắc bằng đá hoa cương Granite nguyên khối kiên cố, một trong hai trụ cột cốt lõi giữ vững gian phòng.",
      "tags": [
        "Đá Granite hoa cương",
        "Chiều cao: 4.2m",
        "Đường kính: 0.8m"
      ]
    },
    {
      "id": "ART_COT_TRU_NAM",
      "name": "Cột Trụ Chịu Lực Tiền Sảnh (Nam)",
      "englishName": "South Lobby Load-Bearing Pillar",
      "category": "KIẾN TRÚC KẾT CẤU • ĐÁ GRANITE",
      "zoneId": "ZONE_NHA_TONG_THONG",
      "zoneName": "Nhà Tổng Thống",
      "floor": 1,
      "svgId": "elem-1794647978990-0",
      "x": 250,
      "y": 115,
      "lat": 21.00018,
      "lng": 105.84242,
      "icon": "🏛️",
      "description": "Cột trụ đối xứng trục đông - tây, nối liền kết cấu đại sảnh tiếp đón khách ngoại giao với không gian làm việc chính.",
      "audioGuide": "Cột trụ chịu lực phía Nam đối xứng, tạo điểm nhấn kết cấu không gian vòm giữa tiền sảnh và phòng làm việc chính.",
      "tags": [
        "Đá Granite hoa cương",
        "Chiều cao: 4.2m",
        "Đường kính: 0.8m"
      ]
    }
  ],
  "tourRoute": []
};
