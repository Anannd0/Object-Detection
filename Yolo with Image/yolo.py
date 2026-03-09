from ultralytics import YOLO
import cv2

model = YOLO('yolov8n.pt')

results = model('image/img3.jpg')

for r in results:
    annotated_img = r.plot()
    cv2.imshow("YOLO Result", annotated_img)

cv2.waitKey(0)
cv2.destroyAllWindows()