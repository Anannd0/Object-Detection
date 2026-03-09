

from google.cloud import vision
import io
import os
import cv2
import numpy as np
from PIL import Image

class VisionAPIDetector:

    
    def __init__(self, credentials_path=None):

        self.client = None
        self.enabled = False
        

        credentials_available = False
        
        if credentials_path:
            if os.path.exists(credentials_path):
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
                credentials_available = True
        elif os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
                                                 
            env_cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
            if os.path.exists(env_cred_path):
                credentials_available = True

        if credentials_available or not credentials_path:
            try:
                self.client = vision.ImageAnnotatorClient()
                self.enabled = True
            except Exception:

                self.client = None
                self.enabled = False
    
    def detect_objects(self, image_path_or_array):

        if not self.enabled:
            raise Exception(
                "Vision API is not enabled. " + self.get_setup_instructions()
            )
        
                                               
        if isinstance(image_path_or_array, str):
                            
            with io.open(image_path_or_array, 'rb') as image_file:
                content = image_file.read()
            image = vision.Image(content=content)
                                      
            img_cv = cv2.imread(image_path_or_array)
        else:

            img_cv = image_path_or_array

            img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
            img_pil = Image.fromarray(img_rgb)
            buffered = io.BytesIO()
            img_pil.save(buffered, format="JPEG")
            content = buffered.getvalue()
            image = vision.Image(content=content)
        

        response = self.client.object_localization(image=image)
        objects = response.localized_object_annotations
        

        detections = []
        annotated_img = img_cv.copy()
        height, width = annotated_img.shape[:2]
        
        for obj in objects:

            vertices = obj.bounding_poly.normalized_vertices
            if len(vertices) >= 2:

                x1 = int(vertices[0].x * width)
                y1 = int(vertices[0].y * height)
                x2 = int(vertices[2].x * width) if len(vertices) > 2 else int(vertices[1].x * width)
                y2 = int(vertices[2].y * height) if len(vertices) > 2 else int(vertices[1].y * height)
                
                                   
                cv2.rectangle(annotated_img, (x1, y1), (x2, y2), (0, 255, 0), 2)

                label_text = f"{obj.name} {obj.score:.2f}"
                (text_width, text_height), baseline = cv2.getTextSize(
                    label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
                )
                cv2.rectangle(annotated_img, (x1, y1 - text_height - 10), 
                             (x1 + text_width, y1), (0, 255, 0), -1)
                cv2.putText(annotated_img, label_text, (x1, y1 - 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
                
                detections.append({
                    'label': obj.name,
                    'confidence': round(obj.score * 100, 2),
                    'bbox': [float(x1), float(y1), float(x2), float(y2)]
                })
        
        return {
            'detections': detections,
            'annotated_image': annotated_img
        }
    
    def detect_labels(self, image_path_or_array):

        if not self.enabled:
            raise Exception(
                "Vision API is not enabled. " + self.get_setup_instructions()
            )
        
                                               
        if isinstance(image_path_or_array, str):
            with io.open(image_path_or_array, 'rb') as image_file:
                content = image_file.read()
        else:
            img_rgb = cv2.cvtColor(image_path_or_array, cv2.COLOR_BGR2RGB)
            img_pil = Image.fromarray(img_rgb)
            buffered = io.BytesIO()
            img_pil.save(buffered, format="JPEG")
            content = buffered.getvalue()
        
        image = vision.Image(content=content)
        response = self.client.label_detection(image=image)
        labels = response.label_annotations
        
        return [
            {
                'label': label.description,
                'confidence': round(label.score * 100, 2)
            }
            for label in labels
        ]
    
    def is_enabled(self):
        return self.enabled
    
    def get_setup_instructions(self):
        return (
            "To enable Google Vision API:\n"
            "1. Create a service account in Google Cloud Console\n"
            "2. Download the JSON key file\n"
            "3. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable:\n"
            "   - Windows (PowerShell): $env:GOOGLE_APPLICATION_CREDENTIALS='path\\to\\key.json'\n"
            "   - Windows (CMD): set GOOGLE_APPLICATION_CREDENTIALS=path\\to\\key.json\n"
            "   - Linux/Mac: export GOOGLE_APPLICATION_CREDENTIALS='path/to/key.json'\n"
            "4. Or place the key file as 'google-credentials.json' in the project root\n"
            "5. Or use: gcloud auth application-default login"
        )


