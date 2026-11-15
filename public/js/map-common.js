/**
 * 2Guide - map-common.js
 * Bản đồ Leaflet 2D, Lớp vệ tinh Google Maps, Phân khu di tích, Tuyến tham quan & Icon chỉ vị trí (Location Pointer Pin)
 */

// Đăng ký Plugin Leaflet.ImageOverlay.Rotated nếu chưa có
if (typeof L !== 'undefined' && !L.ImageOverlay.Rotated) {
  L.ImageOverlay.Rotated = L.ImageOverlay.extend({
    initialize: function (image, topleft, topright, bottomleft, options) {
      if (typeof(image) === 'string') {
        this._url = image;
      } else {
        this._rawImage = image;
      }
      this._topLeft = L.latLng(topleft);
      this._topRight = L.latLng(topright);
      this._bottomLeft = L.latLng(bottomleft);
      L.setOptions(this, options);
    },

    onAdd: function (map) {
      if (!this._image) {
        this._initImage();
        if (this.options.opacity < 1) {
          this._updateOpacity();
        }
      }
      if (this.options.interactive) {
        L.DomUtil.addClass(this._rawImage, 'leaflet-interactive');
        this.addInteractiveTarget(this._rawImage);
      }
      map.on('zoomend resetview move', this._reset, this);
      this.getPane().appendChild(this._image);
      this._reset();
    },

    onRemove: function(map) {
      map.off('zoomend resetview move', this._reset, this);
      L.ImageOverlay.prototype.onRemove.call(this, map);
    },

    _initImage: function () {
      var img = this._rawImage;
      if (this._url) {
        img = L.DomUtil.create('img');
        img.style.display = 'none';
        if (this.options.crossOrigin) {
          img.crossOrigin = '';
        }
        img.src = this._url;
        this._rawImage = img;
      }
      L.DomUtil.addClass(img, 'leaflet-image-layer');

      var div = this._image = L.DomUtil.create('div',
        'leaflet-image-layer ' + (this._zoomAnimated ? 'leaflet-zoom-animated' : ''));

      this._updateZIndex();
      div.appendChild(img);

      div.onselectstart = L.Util.falseFn;
      div.onmousemove = L.Util.falseFn;

      var self = this;
      img.onload = function() {
        self._reset();
        img.style.display = 'block';
        self.fire('load');
      };

      if (img.complete) {
        setTimeout(function() {
          self._reset();
          img.style.display = 'block';
        }, 50);
      }

      img.alt = this.options.alt || '';
    },

    _reset: function () {
      var div = this._image;
      if (!this._map || !div || !this._rawImage) {
        return;
      }

      var pxTopLeft = this._map.latLngToLayerPoint(this._topLeft);
      var pxTopRight = this._map.latLngToLayerPoint(this._topRight);
      var pxBottomLeft = this._map.latLngToLayerPoint(this._bottomLeft);

      var pxBottomRight = pxTopRight.subtract(pxTopLeft).add(pxBottomLeft);
      var pxBounds = L.bounds([pxTopLeft, pxTopRight, pxBottomLeft, pxBottomRight]);
      var size = pxBounds.getSize();
      var pxTopLeftInDiv = pxTopLeft.subtract(pxBounds.min);

      this._bounds = L.latLngBounds(
        this._map.layerPointToLatLng(pxBounds.min),
        this._map.layerPointToLatLng(pxBounds.max)
      );

      L.DomUtil.setPosition(div, pxBounds.min);

      div.style.width = size.x + 'px';
      div.style.height = size.y + 'px';

      var imgW = this._rawImage.naturalWidth || this._rawImage.width || 800;
      var imgH = this._rawImage.naturalHeight || this._rawImage.height || 500;
      if (!imgW || !imgH) return;

      var vectorX = pxTopRight.subtract(pxTopLeft);
      var vectorY = pxBottomLeft.subtract(pxTopLeft);

      this._rawImage.style.transformOrigin = '0 0';
      this._rawImage.style.transform = "matrix(" +
        (vectorX.x / imgW) + ', ' + (vectorX.y / imgW) + ', ' +
        (vectorY.x / imgH) + ', ' + (vectorY.y / imgH) + ', ' +
        pxTopLeftInDiv.x + ', ' + pxTopLeftInDiv.y + ')';
    },

    reposition: function(topleft, topright, bottomleft) {
      this._topLeft = L.latLng(topleft);
      this._topRight = L.latLng(topright);
      this._bottomLeft = L.latLng(bottomleft);
      this._reset();
    },

    setUrl: function (url) {
      this._url = url;
      if (this._rawImage) {
        this._rawImage.src = url;
      }
      return this;
    }
  });

  L.imageOverlay.rotated = function(imgSrc, topleft, topright, bottomleft, options) {
    return new L.ImageOverlay.Rotated(imgSrc, topleft, topright, bottomleft, options);
  };
}

const MapCommon = {
  // 1. KHỞI TẠO BẢN ĐỒ CƠ SỞ (GÓI GỌN KHU VỰC NHÀ TỔNG THỐNG)
  initMap(containerId = 'map', center = [20.997715, 105.844730], zoom = 20) {
    const map = L.map(containerId, {
      center: center,
      zoom: zoom,
      minZoom: 17,
      maxZoom: 22,
      maxBounds: [
        [20.99600, 105.84300],
        [20.99950, 105.84650]
      ],
      maxBoundsViscosity: 0.85,
      zoomControl: true
    });

    // Google Maps Vệ Tinh (Hybrid)
    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 22,
      attribution: 'Google Maps Satellite'
    });

    // Google Maps Đường Phố (Roadmap)
    const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 22,
      attribution: 'Google Maps'
    });

    // CartoDB Voyager
    const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: 'CartoDB'
    });

    googleHybrid.addTo(map);

    const baseLayers = {
      "Google Vệ Tinh (Hybrid)": googleHybrid,
      "Google Đường Phố": googleRoadmap,
      "CartoDB Bản Đồ Sáng": cartoVoyager
    };

    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

    return map;
  },

  // 2. VẼ CÁC PHÂN KHU DI TÍCH (ZONES) & MẶT BẰNG BLUEPRINT KIẾN TRÚC
  renderZones(map, zones) {
    const zoneLayers = L.featureGroup().addTo(map);

    // Đảm bảo CSS cho hiệu ứng vi định vị BLE Beacon và Blueprint luôn có sẵn
    MapCommon.injectBeaconStyles();

    zones.forEach(zone => {
      // Tự động overlay mặt bằng Blueprint SVG (hỗ trợ xoay góc theo góc thực địa nếu có corners)
      if (zone.blueprintUrl && (zone.corners || zone.bounds)) {
        let blueprintOverlay;
        if (zone.corners && typeof L.imageOverlay.rotated === 'function') {
          blueprintOverlay = L.imageOverlay.rotated(zone.blueprintUrl, zone.corners.nw, zone.corners.ne, zone.corners.sw, {
            opacity: 0.98,
            interactive: true,
            zIndex: 420,
            className: 'zone-blueprint-overlay'
          });
        } else {
          blueprintOverlay = L.imageOverlay(zone.blueprintUrl, zone.bounds, {
            opacity: 0.98,
            interactive: true,
            zIndex: 420,
            className: 'zone-blueprint-overlay'
          });
        }

        blueprintOverlay.bindTooltip(`🏛️ ${zone.shortName || zone.name} (Blueprint)`, {
          permanent: false,
          direction: 'top',
          className: 'zone-label-tooltip'
        });

        blueprintOverlay.bindPopup(`
          <div style="padding: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="font-size: 10.5px; text-transform: uppercase; font-weight: 800; color: #d97706; letter-spacing: 0.5px; margin-bottom: 2px;">
              MẶT BẰNG BLUEPRINT KIẾN TRÚC
            </div>
            <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 4px;">🏛️ ${zone.name}</div>
            <div style="font-size: 12px; color: #475569; line-height: 1.45; margin-bottom: 6px;">
              Mặt bằng kiến trúc vector tích hợp 3 trạm phát sóng vi định vị BLE Beacon (Cung Đông, Cổng Bắc, Tiền Sảnh) và các hiện vật lịch sử.
            </div>
            <div style="font-size: 11px; color: #0284c7; font-weight: 600;">
              <i class="fa-solid fa-satellite-dish"></i> 3 Trạm BLE Beacon phát sóng thời gian thực
            </div>
          </div>
        `);

        zoneLayers.addLayer(blueprintOverlay);
      }

      const polygon = L.polygon(zone.polygon, {
        color: zone.color || '#3b82f6',
        weight: zone.blueprintUrl ? 1.5 : 2,
        fillColor: zone.color || '#3b82f6',
        fillOpacity: zone.blueprintUrl ? 0.05 : 0.16,
        dashArray: zone.blueprintUrl ? '4, 4' : '5, 5'
      });

      polygon.bindTooltip(zone.shortName || zone.name, {
        permanent: true,
        direction: 'center',
        className: 'zone-label-tooltip'
      });

      polygon.bindPopup(`
        <div style="padding: 4px;">
          <div style="font-weight: 700; color: ${zone.color}; margin-bottom: 4px;">${zone.name}</div>
          <div style="font-size: 0.76rem; color: #94a3b8;">${zone.floor ? `Mặt bằng: Tầng ${zone.floor}` : ''}</div>
          ${zone.blueprintUrl ? `<div style="font-size: 0.72rem; color: #d97706; font-weight: 600; margin-top: 2px;">🏛️ Tích hợp sơ đồ Blueprint</div>` : ''}
        </div>
      `);

      zoneLayers.addLayer(polygon);
    });

    return zoneLayers;
  },

  // 3. VẼ ĐƯỜNG TUYẾN THAM QUAN (ĐÃ VÔ HIỆU HÓA HOÀN TOÀN THEO YÊU CẦU)
  renderTourRoute(map, tourRoute) {
    return null;
  },

  // TỰ ĐỘNG CHÈN CSS STYLES CHO BLE BEACON VÀ BLUEPRINT NẾU CHƯA CÓ
  injectBeaconStyles() {
    if (document.getElementById('map-common-beacon-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'map-common-beacon-styles';
    styleEl.innerHTML = `
      .beacon-pin-wrapper {
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .beacon-pulse-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: rgba(6, 182, 212, 0.45);
        box-shadow: 0 0 16px rgba(6, 182, 212, 0.85);
        animation: beaconPulseAnim 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        pointer-events: none;
      }
      .beacon-pulse-ring-outer {
        position: absolute;
        width: 135%;
        height: 135%;
        border-radius: 50%;
        border: 1.5px solid rgba(14, 165, 233, 0.65);
        animation: beaconPulseOuterAnim 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        pointer-events: none;
      }
      @keyframes beaconPulseAnim {
        0% { transform: scale(0.65); opacity: 1; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      @keyframes beaconPulseOuterAnim {
        0% { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(2.7); opacity: 0; }
      }
      .beacon-pin-core {
        position: relative;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0284c7, #06b6d4);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
        color: #ffffff;
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      .beacon-pin-core:hover {
        transform: scale(1.15);
      }
      .beacon-pin-badge {
        position: absolute;
        top: -19px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.92);
        color: #38bdf8;
        font-size: 9.5px;
        font-weight: 800;
        padding: 1.5px 6px;
        border-radius: 4px;
        white-space: nowrap;
        border: 1px solid rgba(56, 189, 248, 0.5);
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        pointer-events: none;
        z-index: 4;
      }
      .zone-blueprint-overlay {
        filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.25));
        transition: opacity 0.3s ease;
      }
    `;
    document.head.appendChild(styleEl);
  },

  // 4. VẼ CÁC ĐIỂM DI TÍCH (POIs) - TỰ ĐỘNG PHÂN LOẠI TRẠM BLE BEACON HOẶC LOCATION PIN
  renderPOIs(map, pois, onPoiSelect = null) {
    const poiGroup = L.featureGroup().addTo(map);

    // Đảm bảo CSS luôn sẵn sàng
    MapCommon.injectBeaconStyles();

    pois.forEach(poi => {
      // 4A. NẾU LÀ TRẠM PHÁT SÓNG BLE BEACON (NHÀ TỔNG THỐNG HOẶC CÓ BEACONID)
      if (poi.beaconId) {
        const beaconPinHtml = `
          <div class="beacon-pin-wrapper" title="${poi.name}">
            <div class="beacon-pulse-ring"></div>
            <div class="beacon-pulse-ring-outer"></div>
            <div class="beacon-pin-badge">📡 ${poi.beaconId}</div>
            <div class="beacon-pin-core">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
                <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                <circle cx="12" cy="12" r="2" fill="#ffffff"/>
                <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
                <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
              </svg>
            </div>
          </div>
        `;

        const beaconIcon = L.divIcon({
          className: 'custom-beacon-marker',
          html: beaconPinHtml,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -19]
        });

        const marker = L.marker([poi.lat, poi.lng], { icon: beaconIcon });

        const popupHtml = `
          <div style="padding: 6px; max-width: 290px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="background: linear-gradient(135deg, #0284c7, #06b6d4); color: #fff; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px; letter-spacing: 0.5px;">
                TRẠM BLE BEACON
              </span>
              <span style="font-size: 11px; color: #0284c7; font-weight: 700;">RSSI: ${poi.rssiThreshold || -65} dBm</span>
            </div>
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${poi.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">ID: <strong>${poi.beaconId}</strong> | Major: ${poi.major || 1} | Minor: ${poi.minor || 977}</div>
            <div style="font-size: 12px; color: #334155; line-height: 1.45; margin-bottom: 8px;">${poi.description}</div>
            ${poi.audioGuide ? `
              <button class="btn btn-primary btn-sm btn-block btn-read-poi" style="background: linear-gradient(135deg, #0284c7, #0369a1); border: none; color: #fff; font-weight: 600; padding: 7px 10px; border-radius: 8px; width: 100%; cursor: pointer;" data-poi-id="${poi.id}">
                <i class="fa-solid fa-volume-high"></i> Nghe Thuyết Minh Trạm Beacon
              </button>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupHtml);
        if (onPoiSelect) marker.on('click', () => onPoiSelect(poi));
        poiGroup.addLayer(marker);
        return;
      }

      // 4B. ĐIỂM DI TÍCH POI TIÊU CHUẨN (GHIM GIỌT NƯỚC MÀU ĐỎ CẮM XUỐNG TỌA ĐỘ)
      const pinHtml = `
        <div class="poi-pin-wrapper" title="${poi.number}. ${poi.name}">
          <div class="poi-pin-badge">${poi.number}. ${poi.name}</div>
          <svg class="poi-pin-svg" width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="15" cy="36" rx="8" ry="2.5" fill="rgba(0,0,0,0.35)"/>
            <path d="M15 0C6.72 0 0 6.72 0 15C0 24.5 13.2 36.8 14.4 37.9C14.7 38.2 15.3 38.2 15.6 37.9C16.8 36.8 30 24.5 30 15C30 6.72 23.28 0 15 0Z" fill="#b91c1c" stroke="#ffffff" stroke-width="1.6"/>
            <circle cx="15" cy="15" r="9" fill="#7f1d1d"/>
            <text x="15" y="19" font-size="11" font-weight="900" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto" text-anchor="middle" fill="#fef08a">${poi.number}</text>
          </svg>
        </div>
      `;

      const poiIcon = L.divIcon({
        className: 'custom-poi-marker',
        html: pinHtml,
        iconSize: [30, 38],
        iconAnchor: [15, 38],   // Đỉnh kim cắm chính xác tại (15, 38)
        popupAnchor: [0, -36]
      });

      const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon });

      const popupHtml = `
        <div style="padding: 4px; max-width: 280px;">
          <div class="poi-popup-title">${poi.number}. ${poi.name}</div>
          ${poi.englishName ? `<div style="font-size: 0.72rem; color: #94a3b8; font-style: italic; margin-bottom: 4px;">${poi.englishName}</div>` : ''}
          <div class="poi-popup-zone">${poi.zoneName || 'Khu Di Tích'} ${poi.floor ? `(Tầng ${poi.floor})` : ''}</div>
          <div class="poi-popup-desc">${poi.description}</div>
          ${poi.audioGuide ? `
            <button class="btn btn-primary btn-sm btn-block btn-read-poi" style="margin-top: 8px;" data-poi-id="${poi.id}">
              Nghe Thuyết Minh POI
            </button>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onPoiSelect) onPoiSelect(poi);
      });

      poiGroup.addLayer(marker);
    });

    map.on('popupopen', () => {
      const btn = document.querySelector('.btn-read-poi');
      if (btn) {
        btn.onclick = () => {
          const poiId = btn.getAttribute('data-poi-id');
          const targetPoi = pois.find(p => p.id === poiId);
          if (targetPoi && targetPoi.audioGuide) {
            MapCommon.speakText(targetPoi.audioGuide);
          }
        };
      }
    });

    return poiGroup;
  },

  // 4.1 VẼ CÁC HIỆN VẬT LỊCH SỬ & VĂN HÓA (ARTIFACTS / EXHIBITS)
  renderArtifacts(map, artifacts, onArtifactSelect = null) {
    if (!artifacts || !Array.isArray(artifacts)) return null;
    const artGroup = L.featureGroup().addTo(map);

    artifacts.forEach(art => {
      // Ghim Hiện Vật màu Vàng Hổ Phách với huy hiệu biểu tượng kim cương
      const pinHtml = `
        <div class="artifact-pin-wrapper" title="[Hiện Vật] ${art.name}">
          <div class="artifact-pin-badge">[Hiện Vật] ${art.name}</div>
          <svg class="artifact-pin-svg" width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="14" cy="34" rx="7" ry="2" fill="rgba(0,0,0,0.4)"/>
            <path d="M14 0C6.27 0 0 6.27 0 14C0 23 12.3 34.8 13.4 35.9C13.7 36.2 14.3 36.2 14.6 35.9C15.7 34.8 28 23 28 14C28 6.27 21.73 0 14 0Z" fill="#d97706" stroke="#ffffff" stroke-width="1.5"/>
            <circle cx="14" cy="14" r="8" fill="#78350f"/>
            <polygon points="14,8 19,14 14,20 9,14" fill="#fbbf24"/>
          </svg>
        </div>
      `;

      const artIcon = L.divIcon({
        className: 'custom-artifact-marker',
        html: pinHtml,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -34]
      });

      const marker = L.marker([art.lat, art.lng], { icon: artIcon });

      const popupHtml = `
        <div style="padding: 4px; max-width: 290px;">
          <div style="font-size: 0.7rem; color: #fbbf24; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
            [HIỆN VẬT] ${art.category || 'Di Tích'}
          </div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #f59e0b; margin-bottom: 4px;">${art.name}</div>
          <div style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 4px;">
            ${art.location ? `Vị trí: <strong>${art.location}</strong>` : ''} 
            ${art.year ? ` | Niên đại: <strong>${art.year}</strong>` : ''}
          </div>
          ${art.material ? `<div style="font-size: 0.72rem; color: #cbd5e1; margin-bottom: 6px;">Chất liệu: <em>${art.material}</em></div>` : ''}
          <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">${art.description}</div>
          ${art.audioGuide ? `
            <button class="btn btn-secondary btn-sm btn-block btn-read-artifact" style="margin-top: 8px; border-color: #d97706; color: #fbbf24;" data-art-id="${art.id}">
              Nghe Thuyết Minh Hiện Vật
            </button>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onArtifactSelect) onArtifactSelect(art);
      });

      artGroup.addLayer(marker);
    });

    map.on('popupopen', () => {
      const btn = document.querySelector('.btn-read-artifact');
      if (btn) {
        btn.onclick = () => {
          const artId = btn.getAttribute('data-art-id');
          const targetArt = artifacts.find(a => a.id === artId);
          if (targetArt && targetArt.audioGuide) {
            MapCommon.speakText(targetArt.audioGuide);
          }
        };
      }
    });

    return artGroup;
  },

  // 5. CẬP NHẬT MARKER CỦA HUB - ICON CHỈ VỊ TRÍ CÓ MŨI KIM NHỌN (LOCATION PIN)
  // 5. THUẬT TOÁN TÁCH MẠNG LƯỚI KHI NHIỀU NGƯỜI ĐỨNG GẦN NHAU (GRID NETWORK DISPERSION)
  // Khi nhiều du khách đứng sát nhau hoặc cùng 1 chỗ (< 4m), tách bung ra theo ma trận mạng lưới kèm đường spider line
  gridLinesGroup: null,

  applyGridNetworkDispersion(map, hubsList, selfHubId = null) {
    if (!hubsList || hubsList.length === 0) return [];

    if (!this.gridLinesGroup && map) {
      this.gridLinesGroup = L.featureGroup().addTo(map);
    }
    if (this.gridLinesGroup) {
      this.gridLinesGroup.clearLayers();
    }

    const result = hubsList.map(h => ({
      ...h,
      realLat: h.lat,
      realLng: h.lng,
      displayLat: h.lat,
      displayLng: h.lng,
      isCollided: false,
      clusterCount: 1,
      clusterMembers: [h.hubId]
    }));

    const THRESHOLD_METERS = 4.0;
    const METERS_PER_DEG_LAT = 111000;

    // 1. Nhóm các điểm gần nhau thành từng cụm
    const visited = new Set();
    const clusters = [];

    for (let i = 0; i < result.length; i++) {
      if (visited.has(result[i].hubId)) continue;

      const cluster = [result[i]];
      visited.add(result[i].hubId);

      for (let j = i + 1; j < result.length; j++) {
        if (visited.has(result[j].hubId)) continue;

        const dLat = (result[i].lat - result[j].lat) * METERS_PER_DEG_LAT;
        const dLng = (result[i].lng - result[j].lng) * METERS_PER_DEG_LAT * Math.cos(result[i].lat * Math.PI / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist <= THRESHOLD_METERS) {
          cluster.push(result[j]);
          visited.add(result[j].hubId);
        }
      }

      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }

    // 2. Bố trí tách theo MẠNG LƯỚI (GRID MATRIX LAYOUT)
    clusters.forEach(cluster => {
      const N = cluster.length;
      const centerLat = cluster.reduce((sum, c) => sum + c.lat, 0) / N;
      const centerLng = cluster.reduce((sum, c) => sum + c.lng, 0) / N;
      const memberIds = cluster.map(c => c.hubId);

      // Xác định số cột của ma trận lưới
      const cols = N <= 2 ? 2 : (N <= 4 ? 2 : (N <= 6 ? 3 : (N <= 9 ? 3 : 4)));
      const rows = Math.ceil(N / cols);

      // Khoảng cách giữa các nút mạng lưới (~ 5.5 mét để các ghim tách bạch rõ ràng)
      const cellSpacingMeters = 5.5;
      const spacingLat = cellSpacingMeters / METERS_PER_DEG_LAT;
      const spacingLng = cellSpacingMeters / (METERS_PER_DEG_LAT * Math.cos(centerLat * Math.PI / 180));

      // Không vẽ bất kỳ điểm tâm hay đường nét nét đứt spider line nào theo yêu cầu người dùng
      cluster.forEach((hub, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;

        // Căn tâm ma trận lưới
        const offsetX = (col - (cols - 1) / 2) * spacingLng;
        const offsetY = ((rows - 1) / 2 - row) * spacingLat;

        hub.realLat = centerLat;
        hub.realLng = centerLng;
        hub.displayLat = centerLat + offsetY;
        hub.displayLng = centerLng + offsetX;
        hub.isCollided = true;
        hub.clusterCount = N;
        hub.clusterMembers = memberIds;
      });
    });

    return result;
  },

  // Giữ alias tương thích
  applyMicroOffsets(hubsList, selfHubId = null) {
    return this.applyGridNetworkDispersion(null, hubsList, selfHubId);
  },

  // 6. CẬP NHẬT MARKER CỦA HUB - GHIM VỊ TRÍ MŨI KIM NHỌN + CHỐNG ĐÈ CHỒNG
  updateHubMarker(map, markerMap, hub, isSelf = false, onMarkerClick = null) {
    const { hubId, lat, lng, displayLat, displayLng, yaw, battery, isCollided, clusterCount, clusterMembers } = hub;
    const finalLat = (displayLat !== undefined) ? displayLat : lat;
    const finalLng = (displayLng !== undefined) ? displayLng : lng;

    let iconHtml = '';
    let iconSize = [30, 38];
    let iconAnchor = [15, 38];

    if (isSelf) {
      // ICON CHỈ VỊ TRÍ CỦA "BẢN THÂN" - Ghim giọt nước vàng cam rực rỡ có gợn sóng radar
      iconSize = [38, 48];
      iconAnchor = [19, 48];
      iconHtml = `
        <div class="self-pin-wrapper" title="Vị trí của BẠN (${hubId})">
          <div class="self-ground-ripple"></div>
          <svg class="self-pin-svg" width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="19" cy="46" rx="10" ry="3" fill="rgba(0,0,0,0.4)"/>
            <path d="M19 0C8.5 0 0 8.5 0 19C0 31 16.6 46.5 18.2 47.9C18.6 48.2 19.4 48.2 19.8 47.9C21.4 46.5 38 31 38 19C38 8.5 29.5 0 19 0Z" fill="#f59e0b" stroke="#ffffff" stroke-width="2.2"/>
            <circle cx="19" cy="19" r="11" fill="#78350f"/>
            <text x="19" y="23" font-size="9" font-weight="900" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto" text-anchor="middle" fill="#ffffff">BẠN</text>
          </svg>
          ${isCollided ? `<div style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: #fff; font-size: 9px; font-weight: 800; border-radius: 10px; padding: 1px 5px; border: 1px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.5);">Mạng Lưới ${clusterCount}</div>` : ''}
        </div>
      `;
    } else {
      // Phân biệt màu sắc: Đã gom nhóm = Màu Xanh Nước | Chưa gom nhóm = Màu Xám
      iconSize = [32, 40];
      iconAnchor = [16, 40];
      const shortId = hubId.substring(hubId.length - 3);
      const isGrouped = !!hub.currentGroupId;

      // Màu xanh nước cho Hub đã gom nhóm, màu xám cho Hub chưa gom nhóm
      const pinColor = isGrouped ? '#0ea5e9' : '#64748b';
      const pinStroke = isGrouped ? '#ffffff' : '#cbd5e1';
      const circleColor = isGrouped ? '#0f172a' : '#334155';
      const textColor = isGrouped ? '#38bdf8' : '#f1f5f9';
      const groupTitle = isGrouped ? `Đoàn: ${hub.currentGroupId}` : 'Chưa gom nhóm (Tại quầy)';

      iconHtml = `
        <div class="member-pin-wrapper" title="${hubId} - ${groupTitle}">
          <svg class="member-pin-svg" width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="16" cy="38" rx="8" ry="2.5" fill="rgba(0,0,0,0.35)"/>
            <path d="M16 0C7.16 0 0 7.16 0 16C0 26 14.1 38.8 15.3 39.9C15.7 40.2 16.3 40.2 16.7 39.9C17.9 38.8 32 26 32 16C32 7.16 24.84 0 16 0Z" fill="${pinColor}" stroke="${pinStroke}" stroke-width="1.8"/>
            <circle cx="16" cy="16" r="9.5" fill="${circleColor}"/>
            <text x="16" y="20" font-size="8.5" font-weight="900" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto" text-anchor="middle" fill="${textColor}">${shortId}</text>
          </svg>
          ${isCollided ? `<div style="position: absolute; top: -5px; right: -5px; background: ${isGrouped ? '#0369a1' : '#475569'}; color: #fff; font-size: 8px; font-weight: 700; border-radius: 8px; padding: 1px 4px; border: 1px solid #fff;">${clusterCount}</div>` : ''}
        </div>
      `;
    }

    const customIcon = L.divIcon({
      className: 'custom-hub-marker-container',
      html: iconHtml,
      iconSize: iconSize,
      iconAnchor: iconAnchor,
      popupAnchor: [0, -iconSize[1] + 4]
    });

    if (markerMap[hubId]) {
      markerMap[hubId].setLatLng([finalLat, finalLng]);
      markerMap[hubId].setIcon(customIcon);
    } else {
      const marker = L.marker([finalLat, finalLng], {
        icon: customIcon,
        zIndexOffset: isSelf ? 1000 : 100
      }).addTo(map);
      markerMap[hubId] = marker;
    }

    if (isSelf && markerMap[hubId].setZIndexOffset) {
      markerMap[hubId].setZIndexOffset(1000);
    }

    let clusterNote = '';
    if (isCollided && clusterMembers && clusterMembers.length > 1) {
      clusterNote = `
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #334155; font-size: 0.72rem; color: #f59e0b;">
          <strong>Đã tách mạng lưới (${clusterCount} người cùng vị trí):</strong>
          <div style="color: #94a3b8; margin-top: 2px;">${clusterMembers.join(', ')}</div>
        </div>
      `;
    }

    // Popup không hiện thông số chữ yaw hay tọa độ x,y, chỉ hiện thông tin ID thiết bị và pin
    const popupContent = `
      <div style="font-size: 0.8rem; line-height: 1.4;">
        <div style="font-weight: 700; color: ${isSelf ? 'var(--accent-amber)' : 'var(--accent-cyan)'}; margin-bottom: 2px;">
          ${isSelf ? 'VỊ TRÍ CỦA BẠN' : 'THÀNH VIÊN TRONG ĐOÀN'}
        </div>
        <div>Mã Thiết Bị: <strong>${hubId}</strong></div>
        <div>Dung lượng pin: <strong>${battery !== undefined ? battery + '%' : '---'}</strong></div>
        <div style="margin-top: 2px;">Hướng nhìn: <strong style="color: #fbbf24;">${Math.round(((Number(yaw) || 0) % 360 + 360) % 360)}°</strong></div>
        <button type="button" class="btn btn-secondary btn-sm btn-block" style="margin-top: 8px; border-color: #fbbf24; color: #fbbf24; font-size: 0.74rem; width: 100%; cursor: pointer; padding: 4px;" onclick="if(window.panToHub) window.panToHub('${hubId}')">
          Bật Xem Tầm Nhìn (5m, 45°)
        </button>
        ${clusterNote}
      </div>
    `;

    markerMap[hubId].bindPopup(popupContent);

    // Gắn sự kiện khi click marker (dùng cho Admin để hiển thị nón góc nhìn)
    markerMap[hubId].off('click');
    markerMap[hubId].on('click', (e) => {
      try {
        markerMap[hubId].openPopup();
      } catch (err) {}
      if (onMarkerClick) {
        onMarkerClick(hub, e);
      }
    });

    return markerMap[hubId];
  },

  // 7. VẼ & XOAY NÓN TẦM NHÌN (FOV VISION CONE TRÊN BẢN ĐỒ 2D)
  // Chuẩn 5m, góc mở 45°, màu vàng hổ phách sáng (#fbbf24) viền và nền vàng ấm (#f59e0b)
  createVisionCone(map, lat, lng, yaw = 0, distanceMeters = 5, fovAngle = 45, options = {}) {
    let dist = distanceMeters;
    let fov = fovAngle;
    if (dist > fov && fov <= 20) {
      fov = distanceMeters;
      dist = fovAngle;
    }
    return this.renderVisionCone(map, null, lat, lng, yaw, fov, dist, options);
  },

  renderVisionCone(map, currentConeObj, lat, lng, yaw = 0, fovAngle = 45, distanceMeters = 5, options = {}) {
    const cLat = parseFloat(lat);
    const cLng = parseFloat(lng);
    const cYaw = parseFloat(yaw) || 0;
    const cFov = parseFloat(fovAngle) || 45;
    const cDist = parseFloat(distanceMeters) || 5;

    const METERS_PER_DEG_LAT = 111000;
    const radCenter = (cLat * Math.PI) / 180;
    const METERS_PER_DEG_LNG = METERS_PER_DEG_LAT * Math.cos(radCenter);

    const calcPoints = (targetLat, targetLng, targetYaw, targetFov, targetDist) => {
      const pLat = parseFloat(targetLat);
      const pLng = parseFloat(targetLng);
      const pYaw = parseFloat(targetYaw) || 0;
      const pFov = parseFloat(targetFov) || 45;
      const pDist = parseFloat(targetDist) || 5;

      const pRadCenter = (pLat * Math.PI) / 180;
      const degLng = METERS_PER_DEG_LAT * Math.cos(pRadCenter);

      const pts = [[pLat, pLng]];
      const halfFov = pFov / 2;
      const segments = 16;

      for (let i = 0; i <= segments; i++) {
        const currentAngleDeg = (pYaw - halfFov) + (pFov * i / segments);
        const rad = (currentAngleDeg * Math.PI) / 180;
        const dLat = (pDist * Math.cos(rad)) / METERS_PER_DEG_LAT;
        const dLng = (pDist * Math.sin(rad)) / degLng;
        pts.push([pLat + dLat, pLng + dLng]);
      }
      pts.push([pLat, pLng]);
      return pts;
    };

    const points = calcPoints(cLat, cLng, cYaw, cFov, cDist);

    if (currentConeObj && currentConeObj.conePolygon && map && map.hasLayer(currentConeObj.conePolygon)) {
      currentConeObj.conePolygon.setLatLngs(points);
      currentConeObj.lat = cLat;
      currentConeObj.lng = cLng;
      currentConeObj.yaw = cYaw;
      return currentConeObj;
    }

    const polyOptions = {
      color: (options && options.color) || '#fbbf24',
      weight: (options && options.weight) !== undefined ? options.weight : 1.5,
      opacity: (options && options.opacity) !== undefined ? options.opacity : 0.85,
      fillColor: (options && options.fillColor) || '#f59e0b',
      fillOpacity: (options && options.fillOpacity) !== undefined ? options.fillOpacity : 0.22,
      interactive: false
    };

    const conePolygon = L.polygon(points, polyOptions).addTo(map);

    try {
      if (conePolygon.bringToFront) conePolygon.bringToFront();
    } catch (e) {}

    const coneObj = {
      conePolygon,
      sightLine: null,
      lat: cLat,
      lng: cLng,
      yaw: cYaw,
      fovAngle: cFov,
      distanceMeters: cDist,
      setVision(newLat, newLng, newYaw, newFov, newDist) {
        const f = (newFov !== undefined) ? newFov : this.fovAngle;
        const d = (newDist !== undefined) ? newDist : this.distanceMeters;
        const newPts = calcPoints(newLat, newLng, newYaw, f, d);
        if (this.conePolygon && map && map.hasLayer(this.conePolygon)) {
          this.conePolygon.setLatLngs(newPts);
        }
        this.lat = newLat;
        this.lng = newLng;
        this.yaw = newYaw;
        return this;
      },
      remove() {
        if (this.conePolygon && map && map.hasLayer(this.conePolygon)) {
          map.removeLayer(this.conePolygon);
        }
        this.conePolygon = null;
      }
    };

    return coneObj;
  },

  // 7.1 KIỂM TRA ĐIỂM CÓ NẰM TRONG NÓN TẦM NHÌN (VISION CONE FOV) HAY KHÔNG
  // Dùng để kích hoạt tự động gửi số thứ tự hiện vật khi nhìn vào POI trong 3s (Tầm nhìn chuẩn 5m)
  isPointInVisionCone(userLat, userLng, userYaw = 0, targetLat, targetLng, fovAngle = 45, maxDistanceMeters = 5) {
    if (!userLat || !userLng || !targetLat || !targetLng) return false;

    const METERS_PER_DEG_LAT = 111000;
    const radCenter = (userLat * Math.PI) / 180;
    const METERS_PER_DEG_LNG = METERS_PER_DEG_LAT * Math.cos(radCenter);

    const dLatMeters = (targetLat - userLat) * METERS_PER_DEG_LAT;
    const dLngMeters = (targetLng - userLng) * METERS_PER_DEG_LNG;
    const dist = Math.sqrt(dLatMeters * dLatMeters + dLngMeters * dLngMeters);

    // Nếu khoảng cách vượt quá tầm nhìn tối đa (mặc định 5m)
    if (dist > maxDistanceMeters) return false;

    // Góc từ vị trí người dùng đến điểm mục tiêu (0 = Bắc, 90 = Đông, 180 = Nam, 270 = Tây)
    let bearing = Math.atan2(dLngMeters, dLatMeters) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;

    // Chênh lệch góc giữa hướng nhìn (Yaw) và góc mục tiêu
    const cleanYaw = (Number(userYaw) || 0) % 360;
    let diff = Math.abs(bearing - cleanYaw);
    if (diff > 180) diff = 360 - diff;

    // Nằm trong nón tầm nhìn nếu góc chênh lệch <= một nửa góc mở FOV (45° / 2 = 22.5°)
    return diff <= (fovAngle / 2);
  },

  // 7.2 TÍNH TOÁN THÔNG SỐ KHÔNG GIAN 3D (KHOẢNG CÁCH, GÓC LỆCH VÀ TỌA ĐỘ TƯƠNG ĐỐI REL_X, REL_Z)
  calculateSpatialParams(userLat, userLng, userYaw = 0, targetLat, targetLng) {
    if (!userLat || !userLng || !targetLat || !targetLng) {
      return { distance: 0, bearing: 0, relativeAngle: 0, relX: 0, relZ: 0 };
    }

    const METERS_PER_DEG_LAT = 111000;
    const radCenter = (userLat * Math.PI) / 180;
    const METERS_PER_DEG_LNG = METERS_PER_DEG_LAT * Math.cos(radCenter);

    const dLatMeters = (targetLat - userLat) * METERS_PER_DEG_LAT;
    const dLngMeters = (targetLng - userLng) * METERS_PER_DEG_LNG;
    const distance = Math.max(0.05, Math.sqrt(dLatMeters * dLatMeters + dLngMeters * dLngMeters));

    // Góc la bàn từ người dùng đến mục tiêu (0 = Bắc, 90 = Đông, 180 = Nam, 270 = Tây)
    let bearing = Math.atan2(dLngMeters, dLatMeters) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;

    // Góc lệch tương đối so với hướng mặt (Yaw): [-180° đến +180°]
    // > 0 là vật ở bên Phải, < 0 là vật ở bên Trái, ~0 là ở Chính Diện
    const cleanYaw = (Number(userYaw) || 0) % 360;
    let relAngle = bearing - cleanYaw;
    while (relAngle > 180) relAngle -= 360;
    while (relAngle < -180) relAngle += 360;

    // Tọa độ không gian 3D Web Audio (Quy chuẩn: +X = Phải, -X = Trái, -Z = Trước, +Z = Sau)
    const relRad = (relAngle * Math.PI) / 180;
    const relX = distance * Math.sin(relRad);
    const relZ = -distance * Math.cos(relRad);

    return {
      distance,
      bearing,
      relativeAngle: relAngle,
      relX,
      relZ
    };
  },

  // 7.3 TÍNH TOÁN ÂM LƯỢNG ĐỘNG THEO KHOẢNG CÁCH (DYNAMIC 3D DISTANCE VOLUME)
  // Rìa (5m): V_min = V_khách - 20% (tối thiểu 1%)
  // Sát vật (<= 0.3m = 30cm): V_max = V_khách + 50% (tối đa 100%)
  calculateDynamicVolume(baseVolumePercent, distanceMeters, maxDistance = 5, minDistance = 0.3) {
    const baseVol = Math.max(1, Math.min(100, Number(baseVolumePercent) || 50));
    const vMin = Math.max(1, baseVol - 20);
    const vMax = Math.min(100, baseVol + 50);

    const d = Math.max(minDistance, Math.min(maxDistance, distanceMeters));
    const progress = (maxDistance - d) / (maxDistance - minDistance); // 0 (ở rìa 10m) -> 1 (ở sát 0.3m)
    const currentVol = vMin + progress * (vMax - vMin);

    return {
      volumePercent: Math.round(currentVol),
      volumeGain: currentVol / 100,
      vMin,
      vMax,
      progress
    };
  },

  // 8. PHÁT ÂM THANH THUYẾT MINH
  speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
,

  // ============================================================
  // 9. ĐỊNH VỊ BLE ĐA ĐIỂM & DUNG HỢP CẢM BIẾN MPU (SENSOR FUSION)
  // ============================================================
  BleTrilateration: {
    center: {
      lat: 20.997715,
      lng: 105.844730
    },
    rotationAngle: 75.0,
    widthMeters: 18.9,
    heightMeters: 13.9,
    canvasWidth: 800,
    canvasHeight: 500,
    mLat: 111320,
    mLng: 111320 * Math.cos(20.997715 * Math.PI / 180),
    PIXELS_PER_METER: 800 / 18.9,

    rotatePoint(dx, dy, deg) {
      const rad = deg * Math.PI / 180;
      return {
        dxRot: dx * Math.cos(rad) - dy * Math.sin(rad),
        dyRot: dx * Math.sin(rad) + dy * Math.cos(rad)
      };
    },

    rssiToDistance(rssi, txPower = -59, n = 2.2) {
      const r = Number(rssi);
      if (isNaN(r) || r === 0) return 999;
      if (r >= txPower) return 0.2;
      const exponent = (txPower - r) / (10.0 * n);
      return Math.max(0.1, Math.min(100.0, Math.pow(10.0, exponent)));
    },

    gpsToSvg(lat, lng) {
      const dxRot = (Number(lng) - this.center.lng) * this.mLng;
      const dyRot = (Number(lat) - this.center.lat) * this.mLat;
      const p = this.rotatePoint(dxRot, dyRot, -this.rotationAngle);
      const x = Math.round(Math.max(10, Math.min(this.canvasWidth - 10, (p.dxRot / this.widthMeters + 0.5) * this.canvasWidth)));
      const y = Math.round(Math.max(10, Math.min(this.canvasHeight - 10, (0.5 - p.dyRot / this.heightMeters) * this.canvasHeight)));
      return { x, y };
    },

    svgToGps(x, y) {
      const localDx = (Number(x) / this.canvasWidth - 0.5) * this.widthMeters;
      const localDy = (0.5 - Number(y) / this.canvasHeight) * this.heightMeters;
      const p = this.rotatePoint(localDx, localDy, this.rotationAngle);
      const lat = Number((this.center.lat + p.dyRot / this.mLat).toFixed(6));
      const lng = Number((this.center.lng + p.dxRot / this.mLng).toFixed(6));
      return { lat, lng };
    },

    calculateLocation(beacons) {
      if (!Array.isArray(beacons) || beacons.length === 0) return null;

      const valid = beacons.filter(b => b.x !== undefined && b.y !== undefined && (b.distance !== undefined || b.rssi !== undefined));
      if (valid.length === 0) return null;

      valid.forEach(b => {
        if (b.distanceMeter === undefined) {
          b.distanceMeter = (b.distance !== undefined) ? Number(b.distance) : this.rssiToDistance(b.rssi, b.txPower || -59, b.n || 2.2);
        }
        b.distancePixels = b.distanceMeter * this.PIXELS_PER_METER;
      });

      valid.sort((a, b) => a.distanceMeter - b.distanceMeter);

      if (valid.length === 1) {
        return { x: valid[0].x, y: valid[0].y, accuracy: valid[0].distanceMeter, method: 'PROXIMITY_1_POINT' };
      }

      if (valid.length === 2) {
        const w1 = 1 / Math.max(0.1, valid[0].distanceMeter);
        const w2 = 1 / Math.max(0.1, valid[1].distanceMeter);
        const x = Math.round((w1 * valid[0].x + w2 * valid[1].x) / (w1 + w2));
        const y = Math.round((w1 * valid[0].y + w2 * valid[1].y) / (w1 + w2));
        return { x, y, accuracy: (valid[0].distanceMeter + valid[1].distanceMeter) / 2, method: 'WEIGHTED_2_POINTS' };
      }

      // Multilateration từ 3 điểm trở lên (Linear Least Squares)
      const N = valid.length;
      const p0 = valid[0];
      const x0 = p0.x, y0 = p0.y, r0 = p0.distancePixels;

      let AtA_00 = 0, AtA_01 = 0, AtA_10 = 0, AtA_11 = 0;
      let AtB_0 = 0, AtB_1 = 0;

      for (let i = 1; i < N; i++) {
        const pi = valid[i];
        const xi = pi.x, yi = pi.y, ri = pi.distancePixels;
        const row0 = 2 * (xi - x0);
        const row1 = 2 * (yi - y0);
        const bVal = (r0 * r0 - ri * ri) + (xi * xi - x0 * x0) + (yi * yi - y0 * y0);
        const w = 1 / Math.max(1.0, ri * ri);

        AtA_00 += row0 * row0 * w;
        AtA_01 += row0 * row1 * w;
        AtA_10 += row1 * row0 * w;
        AtA_11 += row1 * row1 * w;

        AtB_0 += row0 * bVal * w;
        AtB_1 += row1 * bVal * w;
      }

      const det = AtA_00 * AtA_11 - AtA_01 * AtA_10;

      // Trọng tâm WCL mốc an toàn
      let sumW = 0, sumWx = 0, sumWy = 0;
      for (let i = 0; i < N; i++) {
        const b = valid[i];
        const w = 1 / Math.max(0.1, b.distanceMeter * b.distanceMeter);
        sumW += w;
        sumWx += w * b.x;
        sumWy += w * b.y;
      }
      const wclX = sumWx / sumW;
      const wclY = sumWy / sumW;

      let finalX, finalY;
      if (Math.abs(det) < 1e-5) {
        finalX = wclX;
        finalY = wclY;
      } else {
        const rawX = (AtB_0 * AtA_11 - AtB_1 * AtA_01) / det;
        const rawY = (AtA_00 * AtB_1 - AtA_10 * AtB_0) / det;
        if (rawX < -20 || rawX > 820 || rawY < -20 || rawY > 520) {
          finalX = wclX;
          finalY = wclY;
        } else {
          finalX = 0.85 * rawX + 0.15 * wclX;
          finalY = 0.85 * rawY + 0.15 * wclY;
        }
      }

      finalX = Math.max(40, Math.min(760, Math.round(finalX)));
      finalY = Math.max(30, Math.min(470, Math.round(finalY)));

      return {
        x: finalX,
        y: finalY,
        method: N === 3 ? 'TRILATERATION_3_POINTS' : `MULTILATERATION_${N}_POINTS`,
        beaconCount: N
      };
    }
  },

  // 10. BỘ LỌC DUNG HỢP CẢM BIẾN BLE + MPU TRÊN TRÌNH DUYỆT
  createSensorFusionTracker(initialX = 380, initialY = 260, initialYaw = 0) {
    let curX = initialX;
    let curY = initialY;
    let curYaw = initialYaw;
    let pCov = 1.0;
    const PIXELS_PER_METER = 20.0;

    return {
      getPosition() {
        return { x: curX, y: curY, yaw: curYaw };
      },
      setPosition(x, y, yaw) {
        if (x !== undefined) curX = x;
        if (y !== undefined) curY = y;
        if (yaw !== undefined) curYaw = yaw;
        pCov = 0.1;
      },
      // Bước dự đoán từ MPU6050 (Yaw la bàn + bước chân)
      stepMpu(yaw, stepLengthMeter = 0.7) {
        if (yaw !== undefined && !isNaN(yaw)) curYaw = Number(yaw);
        const rad = (curYaw * Math.PI) / 180.0;
        const moveDist = stepLengthMeter * PIXELS_PER_METER;
        curX += moveDist * Math.sin(rad);
        curY += -moveDist * Math.cos(rad);
        curX = Math.max(40, Math.min(760, curX));
        curY = Math.max(30, Math.min(470, curY));
        pCov += 0.08;
        return { x: curX, y: curY, yaw: curYaw };
      },
      // Bước hiệu chỉnh từ BLE Trilateration (Giao thoa 3+ điểm)
      correctBle(bleX, bleY, accuracy = 1.5) {
        const rNoise = Math.max(0.1, accuracy * 0.2);
        const K = pCov / (pCov + rNoise);
        curX = curX + K * (bleX - curX);
        curY = curY + K * (bleY - curY);
        pCov = (1 - K) * pCov;
        curX = Math.max(40, Math.min(760, Math.round(curX * 10) / 10));
        curY = Math.max(30, Math.min(470, Math.round(curY * 10) / 10));
        return { x: curX, y: curY, yaw: curYaw, K };
      }
    };
  }

};
