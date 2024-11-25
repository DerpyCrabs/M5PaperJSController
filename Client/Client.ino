#include <M5EPD.h>
#include <WiFi.h>
#include <HTTPClient.h>

M5EPD_Canvas canvas(&M5.EPD);
HTTPClient httpClient;
uint8_t *widgetData = nullptr;
int touchPoints[2][2];
uint32_t updateTimer = 0;
uint32_t lastUpdateTickCount = 0;

const char *ssid = "MGTS_GPON_0B4F";
const char *password = "UG9GNRTT";
const char *serverUrl = "http://192.168.1.65:3377";
bool sht30Initialized = false;

void setup() {
  setCpuFrequencyMhz(80);
  initializeM5EPD();
  connectToWiFi();
  fetchAndDisplayWidgets();
}

void loop() {
  handleInput();
  if (updateTimer != 0 && (xTaskGetTickCount() - lastUpdateTickCount >= updateTimer * 1000)) {
    fetchAndDisplayWidgets();
  }
  delay(100);
}

void initializeM5EPD() {
  M5.begin(true, false, true, true, false);
  M5.EPD.SetRotation(90);
  M5.TP.SetRotation(90);
  M5.EPD.Clear(true);
  canvas.createCanvas(540, 960);
  canvas.setTextSize(3);
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print("\n");
}

void fetchAndDisplayWidgets() {
  if (!fetchWidgetData()) {
    return;
  }
  displayWidgets();
}

bool fetchWidgetData() {
  httpClient.begin(serverUrl);
  int httpCode = httpClient.GET();
  if (httpCode != HTTP_CODE_OK) {
    log_e("HTTP ERROR: %d\n", httpCode);
    httpClient.end();
    return false;
  }

  size_t size = httpClient.getSize();
  WiFiClient *stream = httpClient.getStreamPtr();
  widgetData = (uint8_t *)ps_malloc(size + 1);
  if (widgetData == nullptr) {
    log_e("Memory overflow.");
    httpClient.end();
    return false;
  }
  widgetData[size] = 0;

  log_d("downloading...");
  size_t payloadOffset = 0;
  while (httpClient.connected()) {
    size_t len = stream->available();
    if (!len) {
      delay(1);
      continue;
    }
    stream->readBytes(widgetData + payloadOffset, len);
    payloadOffset += len;
    log_d("%d / %d", payloadOffset, size);
    if (payloadOffset == size) {
      break;
    }
  }
  httpClient.end();
  lastUpdateTickCount = xTaskGetTickCount();
  return true;
}

void displayWidgets() {
  size_t offset = 0;
  updateTimer = readUint32(offset);
  if (updateTimer != 0) {
    Serial.printf("Will update in %d seconds", updateTimer);
  }
  uint8_t updateMode = readUint8(offset);
  uint16_t widgetCount = readUint16(offset);
  Serial.printf("Widget count: %d\n", (size_t)widgetCount);
  canvas.fillCanvas(0);
  for (int i = 0; i < widgetCount; i++) {
    uint8_t widgetType = readUint8(offset);
    drawWidget(widgetType, offset);
  }
  canvas.pushCanvas(0, 0, (m5epd_update_mode_t)updateMode);
}

void drawWidget(uint8_t widgetType, size_t &offset) {
  if (widgetType == 1) {
    drawRect(offset);
  } else if (widgetType == 2) {
    drawLabel(offset);
  } else if (widgetType == 3) {
    drawLine(offset);
  } else if (widgetType == 4) {
    drawImage(offset);
  } else if (widgetType == 5) {
    drawBatteryStatus(offset);
  } else if (widgetType == 6) {
    drawTemperature(offset);
  } else if (widgetType == 7) {
    drawHumidity(offset);
  } else {
    Serial.printf("  Widget type: Unknown\n");
  }
}

void drawRect(size_t &offset) {
  Serial.printf("  Widget type: Rect\n");
  uint32_t x = readUint16(offset);
  uint32_t y = readUint16(offset);
  uint32_t w = readUint16(offset);
  uint32_t h = readUint16(offset);
  uint32_t color = readUint8(offset);
  uint32_t roundRadius = readUint8(offset);
  bool fill = readUint8(offset);
  Serial.printf("    x: %d, y: %d, w: %d, h: %d, color: %d, roundRadius: %d, fill: %d\n", x, y, w, h, color, roundRadius, fill);
  if (fill) {
    if (roundRadius > 0) {
      canvas.fillRoundRect(x, y, w, h, roundRadius, color);
    } else {
      canvas.fillRect(x, y, w, h, color);
    }
  } else {
    if (roundRadius > 0) {
      canvas.drawRoundRect(x, y, w, h, roundRadius, color);
    } else {
      canvas.drawRect(x, y, w, h, color);
    }
  }
}

void drawLabel(size_t &offset) {
  Serial.printf("  Widget type: Label\n");
  uint32_t x = readUint16(offset);
  uint32_t y = readUint16(offset);
  uint32_t textDatum = readUint8(offset);
  uint32_t fontSize = readUint8(offset);
  uint32_t color = readUint8(offset);
  uint32_t textLength = readUint8(offset);
  char *text = (char *)&widgetData[offset];
  offset += textLength;
  Serial.printf("    x: %d, y: %d\n", x, y);
  Serial.printf("    font: %d, datum: %d, color: %d, length: %d, text: %s\n", fontSize, textDatum, color, textLength, text);
  canvas.setTextColor(color);
  canvas.setTextSize(fontSize);
  canvas.setTextDatum(textDatum);
  canvas.drawString(text, x, y);
}

void drawLine(size_t &offset) {
  Serial.printf("  Widget type: Line\n");
  uint32_t x1 = readUint16(offset);
  uint32_t y1 = readUint16(offset);
  uint32_t x2 = readUint16(offset);
  uint32_t y2 = readUint16(offset);
  uint32_t color = readUint8(offset);
  Serial.printf("    %d,%d -> %d,%d, color: %d\n", x1, y1, x2, y2, color);
  if (x1 == x2) {
    canvas.drawFastVLine(x1, y1, y2 - y1, color);
  } else if (y1 == y2) {
    canvas.drawFastHLine(x1, y1, x2 - x1, color);
  } else {
    canvas.drawLine(x1, y1, x2, y2, color);
  }
}

void drawImage(size_t &offset) {
  Serial.printf("  Widget type: Image\n");
  uint32_t x = readUint16(offset);
  uint32_t y = readUint16(offset);
  uint32_t w = readUint16(offset);
  uint32_t h = readUint16(offset);
  uint32_t color = readUint8(offset);
  Serial.printf("    x: %d, y: %d, w: %d, h: %d, color: %d\n", x, y, w, h, color);

  for (uint32_t i = 0; i < h; i++) {
    for (uint32_t j = 0; j < w; j++) {
      uint32_t color = readUint8(offset);
      canvas.drawPixel(x + j, y + i, color == 1 ? 15 : 0);
    }
  }
}

void drawBatteryStatus(size_t &offset) {
  Serial.printf("  Widget type: BatteryStatus\n");
  uint32_t x = readUint16(offset);
  uint32_t y = readUint16(offset);
  uint32_t fontSize = readUint8(offset);
  uint32_t color = readUint8(offset);
  Serial.printf("    x: %d, y: %d, fontSize: %d, color: %d\n", x, y, fontSize, color);

  int batteryLevel = readBatteryStatus();
  uint32_t displayedLevel =
    batteryLevel < 20
      ? 20
    : batteryLevel < 40
      ? 40
    : batteryLevel < 60
      ? 60
    : batteryLevel < 80
      ? 80
      : 100;

  canvas.setTextColor(color);
  canvas.setTextSize(fontSize);
  canvas.setTextDatum(MC_DATUM);
  canvas.drawString(String(displayedLevel) + "%", x, y);
}

void drawTemperature(size_t &offset) {
  Serial.printf("  Widget type: Temperature\n");
  uint32_t x = readUint16(offset);
  uint32_t y = readUint16(offset);
  uint32_t fontSize = readUint8(offset);
  uint32_t color = readUint8(offset);
  Serial.printf("    x: %d, y: %d, fontSize: %d, color: %d\n", x, y, fontSize, color);

  if (!sht30Initialized) {
    M5.SHT30.Begin();
    sht30Initialized = true;
  }
  M5.SHT30.UpdateData();
  float temperature = M5.SHT30.GetTemperature();
  char temperatureString[10];
  sprintf(temperatureString, "%+.1fC", temperature);

  canvas.setTextColor(color);
  canvas.setTextSize(fontSize);
  canvas.setTextDatum(MC_DATUM);
  canvas.drawString(temperatureString, x, y);
}

void drawHumidity(size_t &offset) {
  Serial.printf("  Widget type: Humidity\n");
  uint32_t x = readUint16(offset);
  uint32_t y = readUint16(offset);
  uint32_t fontSize = readUint8(offset);
  uint32_t color = readUint8(offset);
  Serial.printf("    x: %d, y: %d, fontSize: %d, color: %d\n", x, y, fontSize, color);

  if (!sht30Initialized) {
    M5.SHT30.Begin();
    sht30Initialized = true;
  }
  M5.SHT30.UpdateData();
  float humidity = M5.SHT30.GetRelHumidity();
  char humidityString[10];
  sprintf(humidityString, "%0.0f%%", humidity);

  canvas.setTextColor(color);
  canvas.setTextSize(fontSize);
  canvas.setTextDatum(MC_DATUM);
  canvas.drawString(humidityString, x, y);
}

int readBatteryStatus() {
  uint32_t voltage = M5.getBatteryVoltage();
  float voltageF = voltage / 1000.0f;
  float percentage = ((voltageF - 3.2f) / 1.05f) * 100;
  return percentage;
}

void handleInput() {
  bool isUpdate = false;
  if (M5.TP.available()) {
    if (!M5.TP.isFingerUp()) {
      M5.TP.update();
      for (int i = 0; i < 2; i++) {
        tp_finger_t fingerItem = M5.TP.readFinger(i);
        if ((touchPoints[i][0] != fingerItem.x) || (touchPoints[i][1] != fingerItem.y)) {
          touchPoints[i][0] = fingerItem.x;
          touchPoints[i][1] = fingerItem.y;
          Serial.printf("Finger ID:%d-->X: %d*C  Y: %d  Size: %d\r\n",
                        fingerItem.id, fingerItem.x, fingerItem.y);
          sendTouchData(fingerItem.x, fingerItem.y);
          isUpdate = true;
        }
      }
    }
  }

  if (M5.BtnL.wasPressed()) {
    sendButtonData(0);
    isUpdate = true;
  } else if (M5.BtnP.wasPressed()) {
    sendButtonData(1);
    isUpdate = true;
  } else if (M5.BtnR.wasPressed()) {
    sendButtonData(2);
    isUpdate = true;
  }
  M5.update();

  if (isUpdate) {
    displayWidgets();
  }
}

void sendTouchData(int x, int y) {
  httpClient.begin(serverUrl);
  int payloadSize = 5;  // 1 uint8_t for EventType and 2 uint16_t integers for x and y
  uint8_t *payload = (uint8_t *)ps_malloc(payloadSize);
  payload[0] = 1;  // EventType.Touch
  payload[1] = (x >> 8) & 0xFF;
  payload[2] = x & 0xFF;
  payload[3] = (y >> 8) & 0xFF;
  payload[4] = y & 0xFF;
  int httpCode = httpClient.POST(payload, payloadSize);
  if (httpCode != HTTP_CODE_OK) {
    log_e("HTTP ERROR: %d\n", httpCode);
    httpClient.end();
    return;
  }

  size_t size = httpClient.getSize();
  WiFiClient *stream = httpClient.getStreamPtr();
  uint8_t *newWidgetData = (uint8_t *)ps_malloc(size + 1);
  if (newWidgetData == nullptr) {
    log_e("Memory overflow.");
    httpClient.end();
    return;
  }
  newWidgetData[size] = 0;

  log_d("downloading...");
  size_t payloadOffset = 0;
  while (httpClient.connected()) {
    size_t len = stream->available();
    if (!len) {
      delay(1);
      continue;
    }
    stream->readBytes(newWidgetData + payloadOffset, len);
    payloadOffset += len;
    log_d("%d / %d", payloadOffset, size);
    if (payloadOffset == size) {
      break;
    }
  }
  httpClient.end();
  if (widgetData != nullptr) {
    free(widgetData);
  }
  widgetData = newWidgetData;
  lastUpdateTickCount = xTaskGetTickCount();
}

void sendButtonData(int buttonId) {
  httpClient.begin(serverUrl);
  int payloadSize = 2;  // 1 uint8_t for EventType and 1 uint8_t for buttonId
  uint8_t *payload = (uint8_t *)ps_malloc(payloadSize);
  payload[0] = 2;  // EventType.Button
  payload[1] = buttonId;
  int httpCode = httpClient.POST(payload, payloadSize);
  if (httpCode != HTTP_CODE_OK) {
    log_e("HTTP ERROR: %d\n", httpCode);
    httpClient.end();
    return;
  }

  size_t size = httpClient.getSize();
  WiFiClient *stream = httpClient.getStreamPtr();
  uint8_t *newWidgetData = (uint8_t *)ps_malloc(size + 1);
  if (newWidgetData == nullptr) {
    log_e("Memory overflow.");
    httpClient.end();
    return;
  }
  newWidgetData[size] = 0;

  log_d("downloading...");
  size_t payloadOffset = 0;
  while (httpClient.connected()) {
    size_t len = stream->available();
    if (!len) {
      delay(1);
      continue;
    }
    stream->readBytes(newWidgetData + payloadOffset, len);
    payloadOffset += len;
    log_d("%d / %d", payloadOffset, size);
    if (payloadOffset == size) {
      break;
    }
  }
  httpClient.end();
  if (widgetData != nullptr) {
    free(widgetData);
  }
  widgetData = newWidgetData;
  lastUpdateTickCount = xTaskGetTickCount();
}

uint32_t readUint32(size_t &offset) {
  uint32_t value = (widgetData[offset] << 24) | (widgetData[offset + 1] << 16) | (widgetData[offset + 2] << 8) | widgetData[offset + 3];
  offset += 4;
  return value;
}

uint16_t readUint16(size_t &offset) {
  uint16_t value = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  return value;
}

uint8_t readUint8(size_t &offset) {
  uint8_t value = widgetData[offset];
  offset += 1;
  return value;
}
