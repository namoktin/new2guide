/**
 * 2Guide - WebSocket Realtime Manager
 * Quản lý kết nối, phân quyền (Admin / Khách đoàn) và phát sóng dữ liệu thời gian thực
 */

const { WebSocketServer, WebSocket } = require('ws');
const { normalizeHubId, ADMIN_SECRET_KEY, ESP32_SECRET_KEY } = require('../config/appConfig');
const gazeService = require('../services/gazeService');

class SocketManager {
  constructor() {
    this.wss = null;
    this.hubModel = null;
    this.groupModel = null;
    this.siteModel = null;
  }

  init(server, { hubModel, groupModel, siteModel }) {
    this.hubModel = hubModel;
    this.groupModel = groupModel;
    this.siteModel = siteModel;

    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws) => {
      ws.role = 'guest';

      ws.on('message', (messageText) => {
        try {
          const data = JSON.parse(messageText);

          if (data.type === 'REGISTER_ADMIN') {
            ws.role = 'admin';
            console.log('[WS] Ban Quản Lý đã kết nối WebSocket [KẾT NỐI TRỰC TIẾP - ĐÃ BỎ MẬT KHẨU].');
            ws.send(JSON.stringify({
              type: 'INIT_ADMIN_STATE',
              authStatus: 'VERIFIED',
              hubs: this.hubModel.getAll(),
              groups: this.groupModel.getAll(),
              siteData: this.siteModel.getSiteData()
            }));
          }

          if (data.type === 'REGISTER_USER') {
            ws.role = 'user';
            ws.groupId = data.groupId;
            ws.myHubId = normalizeHubId(data.myHubId);
            console.log(`[WS] Khách tham quan Hub ${ws.myHubId} thuộc đoàn ${ws.groupId} đã kết nối.`);
            this.broadcastToAdmins({
              type: 'ADMIN_USER_CONNECT',
              hubId: ws.myHubId,
              groupId: ws.groupId,
              timestamp: Date.now()
            });
          }

          if (data.type === 'REGISTER_DEVICE') {
            const deviceSecret = (data.secretKey || data.deviceSecret || '').trim();
            if (deviceSecret !== ESP32_SECRET_KEY) {
              console.warn('[WS AN NINH] CẢNH BÁO: Thiết bị ESP32 đăng ký với mã không hợp lệ!');
              ws.send(JSON.stringify({
                type: 'DEVICE_AUTH_FAILED',
                error: 'Từ chối: Sai hoặc thiếu mã bí mật ESP32 (ESP32_SECRET_KEY)!'
              }));
              ws.close(4002, 'Unauthorized Device');
              return;
            }

            ws.role = 'device';
            ws.hubId = normalizeHubId(data.hubId || 'NEU001');
            console.log(`[WS] Thiết bị phần cứng ESP32 Hub ${ws.hubId} đã kết nối WebSocket [XÁC THỰC THÀNH CÔNG].`);
            const currentHub = this.hubModel.getById(ws.hubId);
            ws.send(JSON.stringify({
              type: 'DEVICE_REGISTERED',
              hubId: ws.hubId,
              secretKey: ESP32_SECRET_KEY,
              authStatus: 'VERIFIED',
              hub: currentHub
            }));
          }

          if (data.type === 'POI_GAZE_TRIGGER') {
            const incomingSecret = (data.secretKey || data.deviceSecret || '').trim();
            if (incomingSecret !== ESP32_SECRET_KEY) {
              console.warn('[WS AN NINH] CẢNH BÁO: Từ chối POI_GAZE_TRIGGER do sai hoặc thiếu mã bí mật ESP32!');
              ws.send(JSON.stringify({
                type: 'AUTH_FAILED',
                error: 'Từ chối: Sai hoặc thiếu mã bí mật ESP32 (ESP32_SECRET_KEY)!'
              }));
              return;
            }

            const targetHubId = normalizeHubId(data.hubId || ws.myHubId || 'NEU001');
            const num = Number(data.poiNumber) || 1;

            console.log(`[POI GAZE WS] Khách Hub ${targetHubId} nhìn hiện vật #${num} trong 3s! [XÁC THỰC THÀNH CÔNG] Gửi mã số #${num} tới ESP32...`);

            // Chỉ gửi đúng mã số xuống ESP32, kèm secretKey để ESP32 xác thực server chính chủ
            const sentCount = this.sendToDevice(targetHubId, {
              type: 'PLAY_SD_TRACK',
              hubId: targetHubId,
              poiNumber: num,
              secretKey: ESP32_SECRET_KEY,
              timestamp: Date.now()
            });

            this.broadcastToAdmins({
              type: 'ADMIN_POI_GAZE_EVENT',
              hubId: targetHubId,
              poiNumber: num,
              deviceNotified: sentCount > 0,
              timestamp: Date.now()
            });
          }

          if (data.type === 'SET_VOLUME') {
            const incomingSecret = (data.secretKey || data.deviceSecret || '').trim();
            if (incomingSecret !== ESP32_SECRET_KEY) {
              console.warn('[WS AN NINH] CẢNH BÁO: Từ chối SET_VOLUME do sai hoặc thiếu mã bí mật ESP32!');
              return;
            }

            const targetHubId = normalizeHubId(data.hubId || ws.myHubId || 'NEU001');
            const vol = Math.max(1, Math.min(100, Number(data.volume) || 50));

            console.log(`[WS VOLUME] Khách Hub ${targetHubId} điều chỉnh âm lượng: ${vol}% -> Đồng bộ tới phần cứng ESP32.`);

            this.sendToDevice(targetHubId, {
              type: 'SET_VOLUME',
              hubId: targetHubId,
              volume: vol,
              secretKey: ESP32_SECRET_KEY,
              timestamp: Date.now()
            });
          }

          if (data.type === 'DEVICE_IMU_STREAM') {
            const incomingSecret = (data.secretKey || data.deviceSecret || '').trim();
            if (incomingSecret !== ESP32_SECRET_KEY) {
              return;
            }

            const targetHubId = normalizeHubId(data.hubId || ws.hubId || 'NEU001');
            const yaw = Number(data.yaw) || 0;
            const pitch = Number(data.pitch) || 0;
            const roll = Number(data.roll) || 0;

            // Cảm biến IMU MPU6050 chỉ cập nhật góc xoay yaw/pitch/roll, TUYỆT ĐỐI không ghi đè tọa độ GPS lat/lng
            const updatedHub = this.hubModel.updateTelemetry(targetHubId, {
              yaw,
              pitch,
              roll
            });

            this.broadcastTelemetry(updatedHub);
            gazeService.checkAndTriggerAutoGaze(updatedHub, this);
          }

          if (data.type === 'BLE_BEACON_DETECTED' || data.type === 'BLE_BEACON_UPDATE') {
            const targetHubId = normalizeHubId(data.hubId || ws.myHubId || ws.hubId || 'NEU001');
            const bleInfo = data.ble || {
              beaconId: data.beaconId,
              beaconName: data.beaconName,
              rssi: data.rssi,
              distance: data.distance
            };

            console.log(`[BLE WS] Hub ${targetHubId} bắt sóng trạm ${bleInfo.beaconId || bleInfo.beaconName} (RSSI: ${bleInfo.rssi} dBm, cự ly: ~${bleInfo.distance}m)`);

            const updatedHub = this.hubModel.updateTelemetry(targetHubId, {
              ble: bleInfo,
              lat: data.lat !== undefined ? data.lat : undefined,
              lng: data.lng !== undefined ? data.lng : undefined
            });

            this.broadcastTelemetry(updatedHub);

            this.broadcastToAdmins({
              type: 'ADMIN_BLE_EVENT',
              hubId: targetHubId,
              ble: bleInfo,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          console.warn('[WS] Nhận tin nhắn không đúng định dạng JSON');
        }
      });
    });

    return this.wss;
  }

  broadcastToAdmins(payload) {
    if (!this.wss) return;
    const jsonStr = JSON.stringify(payload);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.role === 'admin') {
        client.send(jsonStr);
      }
    });
  }

  broadcastToGroup(groupId, payload) {
    if (!this.wss) return;
    const jsonStr = JSON.stringify(payload);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.groupId === groupId) {
        client.send(jsonStr);
      }
    });
  }

  broadcastTelemetry(updatedHub) {
    if (!this.wss) return;
    const normTargetHubId = normalizeHubId(updatedHub.hubId);

    const fullPayload = JSON.stringify({
      type: 'HUB_LOCATION_UPDATE',
      hubId: normTargetHubId,
      hub: updatedHub,
      lat: updatedHub.lat,
      lng: updatedHub.lng,
      x: updatedHub.x,
      y: updatedHub.y,
      yaw: updatedHub.yaw,
      battery: updatedHub.battery,
      ble: updatedHub.ble
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(fullPayload);
      }
    });
  }

  broadcastEmergency(payload, targetType, targetId) {
    if (!this.wss) return;
    const jsonStr = JSON.stringify(payload);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        if (targetType === 'ALL_HUBS' || !client.groupId || client.groupId === targetId || client.myHubId === targetId) {
          client.send(jsonStr);
        }
      }
    });
  }

  sendToDevice(hubId, payload) {
    if (!this.wss) return 0;
    const normTargetHubId = normalizeHubId(hubId);
    const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let count = 0;
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.role === 'device') {
        if (!normTargetHubId || normalizeHubId(client.hubId) === normTargetHubId) {
          client.send(jsonStr);
          count++;
        }
      }
    });
    return count;
  }

  // Phát sóng hội thoại AI realtime tới Web Khách Tham Quan (user.html) và Admin
  broadcastAiDialogue(dialogueData) {
    if (!this.wss) return;
    const normTargetHubId = normalizeHubId(dialogueData.hubId || 'NEU001');
    const jsonStr = JSON.stringify({
      type: 'AI_DIALOGUE_UPDATE',
      hubId: normTargetHubId,
      userQuestion: dialogueData.userQuestion || '',
      aiReply: dialogueData.aiReply || '',
      provider: dialogueData.provider || 'Groq AI Guide',
      nearestPoi: dialogueData.nearestPoi || null,
      timestamp: Date.now()
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        if (client.role === 'admin') {
          client.send(jsonStr);
        } else if (client.role === 'user') {
          const isSelf = client.myHubId && normalizeHubId(client.myHubId) === normTargetHubId;
          // Nếu câu hỏi đến từ web chat của chính người dùng này, không gửi lại để tránh trùng lặp 2 câu hỏi / 2 câu trả lời
          if (dialogueData.source === 'web' && isSelf) {
            return;
          }
          const isGroupMember = dialogueData.groupId && client.groupId && client.groupId === dialogueData.groupId;
          if (isSelf || isGroupMember || !client.myHubId) {
            client.send(jsonStr);
          }
        } else if (client.role === 'device') {
          // Gửi tới thiết bị phần cứng ESP32 / trạm test
          if (!normTargetHubId || normalizeHubId(client.hubId) === normTargetHubId) {
            client.send(jsonStr);
          }
        }
      }
    });
  }
}

module.exports = new SocketManager();
