import cv2
import os

path = '../videos/animal.mp4'
print("Exists:", os.path.exists(path))

cap = cv2.VideoCapture(path)
print("Opened:", cap.isOpened())

