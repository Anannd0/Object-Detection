from ultralytics import YOLO
import cv2
import cvzone
import math

cap = cv2.VideoCapture('../videos/animal.mp4')
model = YOLO('../Yolo Weight Checking/yolov8n.pt')

while True:
    success, img = cap.read()
    if not success:
        print("Video has ended or failed to load.")
        break

    results = model(img, stream=True)

    for r in results:
        for box in r.boxes:

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            w, h = x2 - x1, y2 - y1
            bbox = (x1, y1, w, h)

            cvzone.cornerRect(img, bbox, l=30, t=3)

            conf = math.ceil((box.conf[0] * 100)) / 100
            Class = int(box.cls[0])
            label = model.names[Class]

            cvzone.putTextRect(img, f'{label} {conf}', (x1, y1 - 10), scale=1, thickness=1)

    cv2.imshow("Webcam", img)
    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()
