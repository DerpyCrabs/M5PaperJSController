#include <M5EPD.h>
#include <WiFi.h>
#include <HTTPClient.h>

M5EPD_Canvas canvas(&M5.EPD);
HTTPClient httpClient;
uint8_t *widgetData = nullptr;
int touchPoints[2][2];

const char *ssid = "MGTS_GPON_0B4F";
const char *password = "UG9GNRTT";
const char *serverUrl = "http://192.168.1.65:3377";

void setup() {
  initializeM5EPD();
  connectToWiFi();
  fetchAndDisplayWidgets();
}

void loop() {
  handleTouchInput();
}

void initializeM5EPD() {
  M5.begin();
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
  return true;
}

void displayWidgets() {
  uint16_t widgetCount = (widgetData[0] << 8) | widgetData[1];
  Serial.printf("Widget count: %d\n", (size_t)widgetCount);
  size_t offset = 2;
  canvas.fillCanvas(0);
  for (int i = 0; i < widgetCount; i++) {
    uint8_t widgetType = widgetData[offset];
    offset += 1;
    drawWidget(widgetType, offset);
  }
  canvas.pushCanvas(0, 0, UPDATE_MODE_DU4);
}

void drawWidget(uint8_t widgetType, size_t &offset) {
  if (widgetType == 1) {
    drawRect(offset);
  } else if (widgetType == 2) {
    drawLabel(offset);
  } else if (widgetType == 3) {
    drawLine(offset);
  } else {
    Serial.printf("  Widget type: Unknown\n");
  }
}

void drawRect(size_t &offset) {
  Serial.printf("  Widget type: Rect\n");
  uint32_t x = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t y = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t w = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t h = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t color = widgetData[offset];
  offset += 1;
  Serial.printf("    x: %d, y: %d, w: %d, h: %d, color: %d\n", x, y, w, h, color);
  canvas.drawRect(x, y, w, h, color);
}

void drawLabel(size_t &offset) {
  Serial.printf("  Widget type: Label\n");
  uint32_t x = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t y = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t textDatum = widgetData[offset];
  offset += 1;
  uint32_t fontSize = widgetData[offset];
  offset += 1;
  uint32_t color = widgetData[offset];
  offset += 1;
  uint32_t textLength = widgetData[offset];
  offset += 1;
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
  uint32_t x1 = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t y1 = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t x2 = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t y2 = (widgetData[offset] << 8) | widgetData[offset + 1];
  offset += 2;
  uint32_t color = widgetData[offset];
  offset += 1;
  Serial.printf("    %d,%d -> %d,%d, color: %d\n", x1, y1, x2, y2, color);
  if (x1 == x2) {
    canvas.drawFastVLine(x1, y1, y2 - y1, color);
  } else if (y1 == y2) {
    canvas.drawFastHLine(x1, y1, x2 - x1, color);
  } else {
    canvas.drawLine(x1, y1, x2, y2, color);
  }
}

void handleTouchInput() {
  if (M5.TP.available()) {
    if (!M5.TP.isFingerUp()) {
      M5.TP.update();
      bool isUpdate = false;
      for (int i = 0; i < 2; i++) {
        tp_finger_t fingerItem = M5.TP.readFinger(i);
        if ((touchPoints[i][0] != fingerItem.x) || (touchPoints[i][1] != fingerItem.y)) {
          isUpdate = true;
          touchPoints[i][0] = fingerItem.x;
          touchPoints[i][1] = fingerItem.y;
          Serial.printf("Finger ID:%d-->X: %d*C  Y: %d  Size: %d\r\n",
                        fingerItem.id, fingerItem.x, fingerItem.y);
          sendTouchData(fingerItem.x, fingerItem.y);
        }
      }
      if (isUpdate) {
        displayWidgets();
      }
    }
  }
}

void sendTouchData(int x, int y) {
  httpClient.begin(serverUrl);
  int payloadSize = 3 + 1 + 3 + 1;
  uint8_t *payload = (uint8_t *)ps_malloc(payloadSize);
  sprintf((char *)payload, "%d,%d", x, y);
  payload[payloadSize - 1] = 0;
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
}