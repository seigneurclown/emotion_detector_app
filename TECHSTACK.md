# Real-Time Facial Expression Recognition System
### Hệ Thống Nhận Diện Cảm Xúc Khuôn Mặt Theo Thời Gian Thực

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.x-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 1. Giới thiệu Tổng quan (Project Overview)

**Real-Time Facial Expression Recognition System** là giải pháp phần mềm toàn diện kết hợp giữa **Deep Learning**, **Computer Vision** và **Kiến trúc Web Full-Stack hiện đại** nhằm giải quyết bài toán phát hiện khuôn mặt và nhận diện 7 biểu cảm cảm xúc của người dùng trong thời gian thực qua camera máy tính.

Hệ thống được thiết kế theo kiến trúc module hóa phân tầng (Layered Architecture), tối ưu hóa độ trễ suy luận (Low Latency Inference), bảo mật phiên làm việc và hỗ trợ lưu trữ, phân tích lịch sử cảm xúc chuyên sâu qua biểu đồ trực quan.

### 7 Nhóm Cảm xúc Mục tiêu:
* 😡 **Angry** (Tức giận)
* 🤢 **Disgust** (Ghê tởm)
* 😨 **Fear** (Sợ hãi)
* 😄 **Happy** (Vui vẻ)
* 😢 **Sad** (Buồn bã)
* 😲 **Surprise** (Ngạc nhiên)
* 😐 **Neutral** (Bình thản / Trung tính)

---

## 2. Chi tiết Ngăn xếp Công nghệ (Tech Stack Breakdown)

### 2.1. Tầng Giao diện Người dùng (Frontend Layer)
* **Ngôn ngữ & Nền tảng:** JavaScript (ES6+), HTML5, CSS3 hiện đại với thiết kế Dark Theme (`#0f172a`, `#1e293b`).
* **Framework & Build Tool:** 
  * **React 18:** Xây dựng ứng dụng Single Page Application (SPA), quản lý vòng đời component và trạng thái luồng webcam.
  * **Vite 5:** Công cụ bundler thế hệ mới với Hot Module Replacement (HMR) cực nhanh, tích hợp Reverse Proxy kết nối an toàn tới các dịch vụ backend.
* **Routing & Điều hướng:** `react-router-dom` v6 phân chia các view:
  * Tab `Live Detector`: Khung hình webcam nhận diện AI trực tiếp và telemetry thời gian thực.
  * Tab `History & Analytics`: Phân tích thống kê, biểu đồ phân bổ và lịch sử các phiên nhận diện.
* **Truy xuất Phần cứng (Camera):** `navigator.mediaDevices.getUserMedia` trích xuất luồng video webcam thời gian thực với độ phân giải chuẩn $640 \times 480$.
* **Rendering & Visualization:**
  * **HTML5 Canvas API:** Vẽ bounding box mượt mà, dynamic tags, badge cảm xúc và chỉ số confidence score đè trực tiếp lên luồng video.
  * **Chart.js & react-chartjs-2:** Trực quan hóa dữ liệu thống kê với **Doughnut Chart** (tỷ lệ 7 nhóm cảm xúc) và **Line Chart** (diễn biến độ tin cậy theo dòng thời gian).

---

### 2.2. Tầng Máy chủ Ứng dụng & API (Backend Layer)
* **Ngôn ngữ:** Python 3.10+ (Đảm bảo tương thích hoàn hảo với PyTorch và OpenCV trên đa nền tảng).
* **Web Framework:** **Flask 3.x** đóng vai trò Gateway phục vụ API và quản lý pipeline suy luận AI.
* **Cross-Origin Handling:** **Flask-CORS** xử lý CORS đa nguồn và preflight requests (`OPTIONS`) giữa frontend (Port `3000`) và Flask API (Port `5000`).
* **Giao tiếp Dữ liệu:** 
  * Gửi nhận frame liên tục qua HTTP POST payload JSON (Base64 JPEG image buffer) với chu kỳ tối ưu ~160ms/frame (~6 FPS AI inference).
  * Hỗ trợ cơ chế batch payload ghi nhật ký cảm xúc định kỳ 2 giây (Auto-Log).

---

### 2.3. Tầng Trí tuệ Nhân tạo & Thị giác Máy tính (AI & Computer Vision)
* **Deep Learning Framework:** **PyTorch 2.x** (Huấn luyện offline và suy luận CPU/GPU online).
* **Kiến trúc Mạng nơ-ron (Custom EmotionCNN):**
  * **Feature Extractor:** 3 khối Convolution tuần tự:
    * *Block 1:* `Conv2D(1 -> 32, k=3, p=1)` $\rightarrow$ `BatchNorm2d` $\rightarrow$ `ReLU` $\rightarrow$ `MaxPool2d(2, 2)`
    * *Block 2:* `Conv2D(32 -> 64, k=3, p=1)` $\rightarrow$ `BatchNorm2d` $\rightarrow$ `ReLU` $\rightarrow$ `MaxPool2d(2, 2)`
    * *Block 3:* `Conv2D(64 -> 128, k=3, p=1)` $\rightarrow$ `BatchNorm2d` $\rightarrow$ `ReLU` $\rightarrow$ `MaxPool2d(2, 2)`
  * **Classifier:**
    * `Dropout(0.3)` $\rightarrow$ `Linear(128 * 6 * 6, 256)` $\rightarrow$ `ReLU` $\rightarrow$ `Dropout(0.4)` $\rightarrow$ `Linear(256, 7)`
* **Thị giác Máy tính (OpenCV):**
  * Nạp bộ phân loại tầng **Haar Cascade** (`haarcascade_frontalface_default.xml`) để định vị đa khuôn mặt trong khung hình với độ trễ tính toán thấp.
  * Trích xuất vùng khuôn mặt (Region of Interest - ROI), chuyển đổi về ảnh xám (Grayscale), co dãn kích thước chuẩn $48 \times 48$.
  * Chuẩn hóa Tensor đầu vào về khoảng $[-1, 1]$ trước khi nạp vào mạng CNN:
    $$\text{Tensor} = \frac{\frac{\text{ROI}}{255.0} - 0.5}{0.5}$$
* **Dataset Huấn luyện:** **FER-2013** gồm 35,887 ảnh xám chuẩn kích thước $48 \times 48$ pixel.

---

### 2.4. Tầng Cơ sở Dữ liệu & Lưu trữ (Database & Storage)
* **Cơ sở dữ liệu chính:** **MongoDB 7.x** (NoSQL Document Database).
* **Python Driver:** **PyMongo 4.x** hỗ trợ connection pooling và Aggregation Pipelines.
* **Cấu trúc Collections:**
  * `detection_sessions`: Quản lý siêu dữ liệu từng phiên học/làm việc.
    ```json
    {
      "session_id": "sess_1727763791000_a1b2",
      "user_email": "student@example.com",
      "created_at": "ISODate(...)",
      "last_active": "ISODate(...)",
      "total_logs": 42
    }
    ```
  * `prediction_logs`: Lưu vết từng frame nhận diện chi tiết.
    ```json
    {
      "session_id": "sess_1727763791000_a1b2",
      "user_email": "student@example.com",
      "timestamp": "ISODate(...)",
      "emotion": "Happy",
      "confidence": 94.6,
      "box": { "x": 120, "y": 80, "w": 150, "h": 150 }
    }
    ```
* **Quản trị Cơ sở dữ liệu:** **Mongo Express** cung cấp giao diện trực quan trên nền web (Port `8081`).

---

### 2.5. Tầng Bảo mật & Xác thực (Security & Auth Module)
* **Backend phụ trợ:** Express.js (Node.js runtime, Port `5001`).
* **Mã hóa:** `bcryptjs` băm mật khẩu một chiều (Salt Rounds = 10).
* **Cơ chế Token:**
  * **Access Token:** JSON Web Token (JWT Bearer) thời hạn ngắn (15 phút).
  * **Refresh Token:** Lưu trữ trong cookie **`HttpOnly`** an toàn (chống tấn công XSS) với cơ chế Silent Token Rotation.

---

### 2.6. Hạ tầng & Triển khai (DevOps & Environment)
* **Containerization:** **Docker Engine** & **Docker Compose v3.8**.
  * Chạy cô lập dịch vụ MongoDB và Mongo Express độc lập với hệ điều hành máy chủ.
  * Quản lý persistent data volumes (`mongo_data:/data/db`).
* **Quản lý quy trình:** `concurrently` khởi chạy đồng thời các service frontend và backend trong môi trường phát triển.

---

## 3. Sơ đồ Kiến trúc & Luồng Dữ liệu (System Architecture)

```mermaid
flowchart TD
    subgraph Client["Trình duyệt Người dùng (Client Browser)"]
        Cam["Webcam Video Stream\n(640x480)"]
        Canvas["HTML5 Canvas Overlay\n(Render Bounding Box & Label)"]
        UI_Dash["Dashboard & Biểu đồ\n(Chart.js Doughnut & Line)"]
    end

    subgraph Gateway["Reverse Proxy (Vite Dev Server :3000)"]
        Proxy["/predict ➔ Flask:5000\n/api ➔ Flask:5000\n/api/auth ➔ Express:5001"]
    end

    subgraph AIService["AI & Core Backend (Flask :5000)"]
        API_Predict["/predict Handler"]
        Haar["Haar Cascade Classifier\n(Face Detection)"]
        Preprocess["Crop Face ROI\nGrayscale -> Resize 48x48\nTensor Normalization"]
        Model["PyTorch EmotionCNN\n(fer2013_model.pth)"]
        Softmax["Softmax Probability\nArgmax Emotion & Confidence"]
        API_Logs["/api/logs & /api/analytics"]
    end

    subgraph Database["Storage Layer (Docker Compose :27017)"]
        MongoDB[("MongoDB Database\n(emotion_db)")]
        CollSessions["Collection: detection_sessions"]
        CollLogs["Collection: prediction_logs"]
    end

    Cam -->|1. Capture Frame| Gateway
    Gateway -->|2. Base64 JPEG| API_Predict
    API_Predict -->|3. Frame Matrix| Haar
    Haar -->|4. Face Coordinates| Preprocess
    Preprocess -->|5. (1, 1, 48, 48) Tensor| Model
    Model -->|6. Raw Logits| Softmax
    Softmax -->|7. JSON {faces: [box, emotion, confidence]}| Gateway
    Gateway -->|8. Draw Boxes & Tags| Canvas

    Canvas -.->|9. Auto-Log mỗi 2s| API_Logs
    API_Logs -->|10. Batch Insert| CollLogs
    API_Logs -->|11. Upsert Session Count| CollSessions
    MongoDB -->|12. Aggregation Pipeline ($group)| API_Logs
    API_Logs -->|13. Stats & Timeline Data| UI_Dash
```

---

## 4. Bảng Tổng hợp Môi trường & Phiên bản Khuyến nghị (Environment Requirements)

| Thành phần / Gói | Phiên bản khuyến nghị | Vai trò trong hệ thống |
| :--- | :--- | :--- |
| **Python** | `>= 3.10.x` | Runtime chính cho xử lý AI và máy chủ Flask |
| **PyTorch (`torch`)** | `^2.2.0` | Thư viện Deep Learning xây dựng mô hình CNN |
| **OpenCV (`opencv-python`)** | `^4.9.0` | Thư viện Computer Vision phát hiện và xử lý frame khuôn mặt |
| **Flask** | `^3.0.0` | Web framework định tuyến API RESTful |
| **Flask-CORS** | `^5.0.0` | Cấu hình bảo mật Cross-Origin Resource Sharing |
| **PyMongo** | `^4.18.0` | Driver kết nối MongoDB và thực thi Aggregation Pipelines |
| **NumPy** | `^1.26.0` | Xử lý mảng đa chiều cho hình ảnh và tensor |
| **Node.js** | `>= 18.x (khuyên dùng v20/v22 LTS)` | Runtime môi trường cho công cụ frontend React/Vite |
| **React** | `^18.3.1` | Thư viện xây dựng giao diện người dùng thời gian thực |
| **Vite** | `^5.4.0` | Công cụ đóng gói ứng dụng frontend & reverse proxy |
| **Chart.js** | `^4.4.0` | Thư viện vẽ biểu đồ phân tích thống kê |
| **react-chartjs-2** | `^5.2.0` | React wrapper cho Chart.js |
| **Docker Engine & Compose** | `Compose v3.8+` | Ảo hóa và chạy dịch vụ MongoDB container |

---

## 5. Cấu trúc Thư mục Dự án (Project Directory Structure)

```text
emotion_detector_app/
├── app.py                             # Máy chủ AI Flask, routes nhận diện & MongoDB APIs
├── fer2013_model.pth                  # Trọng số mô hình CNN đã huấn luyện (FER-2013)
├── haarcascade_frontalface_default.xml# Trọng số thuật toán Haar Cascade phát hiện khuôn mặt
├── docker-compose.yml                 # Cấu hình container hóa MongoDB & Mongo Express
├── run_all.bat                        # Script khởi chạy 1-click toàn bộ hệ thống
├── TECHSTACK.md                       # Tài liệu kỹ thuật chi tiết của dự án
├── .gitignore                         # Danh mục loại trừ Git tiêu chuẩn
├── react-emotion-auth-app/            # Ứng dụng Web Frontend & Auth Backend
│   ├── package.json                   # Dependencies frontend (React, Chart.js, Vite)
│   ├── vite.config.js                 # Cấu hình Vite & Reverse Proxy (/predict, /api)
│   ├── server/                        # Dịch vụ xác thực bổ trợ (Express, JWT)
│   └── src/
│       ├── App.jsx                    # Root Router (Live Detector, History Analytics)
│       ├── components/
│       │   ├── EmotionDetector.jsx    # Webcam canvas & Real-time AI inference view
│       │   ├── HistoryAnalytics.jsx   # Phân tích thống kê, Doughnut & Line chart
│       │   ├── LoginForm.jsx          # Giao diện đăng nhập / đăng ký
│       │   └── Navbar.jsx             # Thanh điều hướng hệ thống
│       └── context/
│           └── AuthContext.jsx        # Quản lý phiên đăng nhập & JWT tokens
└── templates/
    └── index.html                     # Giao diện web demo cơ bản (HTML/JS thuần)
```

---

*Tài liệu được cập nhật tự động và đồng bộ với phiên bản mã nguồn mới nhất của dự án.*
