import cv2
import torch
import torch.nn as nn
import numpy as np

# 1. Định nghĩa lại kiến trúc mạng (phải giống hệt lúc train)
class EmotionCNN(nn.Module):
    def __init__(self, num_classes=7):
        super(EmotionCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2, 2)
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(128 * 6 * 6, 256),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        return self.classifier(x)

# 2. Danh sách nhãn cảm xúc
EMOTIONS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

# 3. Nạp mô hình đã train
device = torch.device('cpu') # Chạy webcam trên máy cá nhân dùng CPU là đủ
model = EmotionCNN(num_classes=7)
model.load_state_dict(torch.load('fer2013_model.pth', map_location=device))
model.eval()

# 4. Sử dụng bộ phát hiện khuôn mặt của OpenCV
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# 5. Mở Webcam
cap = cv2.VideoCapture(0)
print("Nhấn phím 'q' để thoát.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Chuyển sang ảnh xám để tìm mặt
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

    for (x, y, w, h) in faces:
        # Cắt vùng mặt
        face_roi = gray[y:y+h, x:x+w]
        face_roi = cv2.resize(face_roi, (48, 48))
        
        # Tiền xử lý chuẩn hóa giống lúc train
        face_tensor = face_roi.astype(np.float32) / 255.0
        face_tensor = (face_tensor - 0.5) / 0.5
        face_tensor = torch.tensor(face_tensor).unsqueeze(0).unsqueeze(0).to(device)

        # Dự đoán cảm xúc
        with torch.no_grad():
            output = model(face_tensor)
            probs = torch.softmax(output, dim=1)
            pred_idx = torch.argmax(probs, dim=1).item()
            confidence = probs[0][pred_idx].item()

        label = f"{EMOTIONS[pred_idx]}: {confidence*100:.1f}%"

        # Vẽ khung và nhãn lên màn hình
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

    cv2.imshow('Emotion Recognition Test', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
