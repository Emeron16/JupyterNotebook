#!/usr/bin/env python
# coding: utf-8

"""
FlaskDeploymentHandGesture.py
A Flask application that integrates ngrok for public URL access and performs hand gesture recognition using a pre-trained TensorFlow model. 
This script includes image preprocessing, model prediction, and routes for image capture via webcam or file upload.
"""

from flask import Flask, render_template, request
import numpy as np
import matplotlib.pyplot as plt
import cv2
import tensorflow as tf
import os
import io
import base64
from tensorflow.keras.models import load_model
from pyngrok import ngrok, conf
import threading
from flasgger import Swagger
from flask_cors import CORS
from datetime import datetime
import getpass

# Set your ngrok authentication token
conf.get_default().auth_token = getpass.getpass()

# Load the pre-trained model
model = load_model('HagridModel1.keras')

# Enable Flask debug mode
os.environ["FLASK_DEBUG"] = "1"

app = Flask(__name__)
swagger = Swagger(app)
CORS(app)
port = 5001

# Open a ngrok tunnel to the HTTP server
public_url = ngrok.connect(port, bind_tls=True).public_url
print(f" * ngrok tunnel \"{public_url}\" -> \"http://127.0.0.1:{port}\"")

# Update any base URLs to use the public ngrok URL
app.config["BASE_URL"] = public_url

def preprocess_image(img):
    """
    Preprocesses an input image for model prediction.

    Args:
        img (numpy.ndarray): The image to preprocess.

    Returns:
        tuple: A tuple containing:
            - img_batch (tensorflow.Tensor): The preprocessed image ready for prediction.
            - img_resized (tensorflow.Tensor): The resized image for display.
    """
    # Decode the image into a tensor
    img = tf.convert_to_tensor(img, dtype=tf.float32)
    img_resized = tf.image.resize(img, [224, 224])
    # Preprocess the image using MobileNet's preprocessing function
    img_preprocessed = tf.keras.applications.mobilenet.preprocess_input(img_resized)
    # Add a batch dimension
    img_batch = tf.expand_dims(img_preprocessed, axis=0)

    return img_batch, img_resized

def predict_model(img_batch, img_resized):
    """
    Performs prediction on the preprocessed image and generates a labeled image.

    Args:
        img_batch (tensorflow.Tensor): The preprocessed image batch.
        img_resized (tensorflow.Tensor): The resized image for display.

    Returns:
        tuple: A tuple containing:
            - prediction_label (str): The predicted label.
            - image_string (str): The base64-encoded image with the prediction label.
    """
    # Perform the prediction
    prediction = model.predict(img_batch)

    buffer = io.BytesIO()
    plt.imshow(tf.cast(img_resized, tf.uint8))

    labels = ['Dislike', 'Like', 'Mute', 'OK', 'Stop']
    prediction_label = labels[prediction.argmax()]
    plt.title(prediction_label)
    plt.axis('off')
    plt.savefig(buffer, format='png')
    plt.close()
    # Encode the image to base64 string
    buffer.seek(0)
    image_string = base64.b64encode(buffer.read()).decode('utf-8')

    return prediction_label, image_string

# Define the prediction route
@app.route('/', methods=['GET', 'POST'])
def predict():
    """
    Handles image uploads for prediction and renders the result.

    Returns:
        Response: The rendered HTML template with the prediction result.
    """
    chart_url = None
    if request.method == 'POST':
        # Get the image from the request
        file = request.files['file']
        # Read the image for processing without saving it first
        img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)

        # Preprocess the image
        img_batch, img_resized = preprocess_image(img)

        # Get the prediction name and the prediction image
        prediction_name, img_prediction = predict_model(img_batch, img_resized)

        # Construct the filename using the prediction name
        filename = f"Upload_{prediction_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        path = '/Volumes/Datasets/SavedImages'
        save_path = os.path.join(path, filename)

        # Save the image with the prediction name
        cv2.imwrite(save_path, img)

        # Prepare the data for displaying in HTML
        chart_url = f"{img_prediction}"

    return render_template('handgestureIndex.html', chart_url=chart_url)

# Define the capture route for webcam images
@app.route('/capture', methods=['POST'])
def capture():
    """
    Route for capturing webcam images and performing hand gesture predictions.
    Accepts a base64-encoded image from the client, preprocesses it, and returns
    the prediction result.

    Returns:
        dict: A JSON response containing the base64-encoded annotated image.
    """
    data = request.form['image_base64']

    # Decode the base64 image
    image_data = data.split(',')[1]  # Strip the data:image/jpeg;base64, header
    decoded_image = base64.b64decode(image_data)

    # Convert to NumPy array and decode
    npimg = np.frombuffer(decoded_image, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    # Preprocess the image
    img_batch, img_resized = preprocess_image(img)
    prediction_name, img_prediction = predict_model(img_batch, img_resized)

    # Construct the filename using the prediction name
    filename = f"webcam_{prediction_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    path = '/Volumes/Datasets/SavedImages/'
    save_path = os.path.join(path, filename)
    cv2.imwrite(save_path, img)

    # Prepare the data for returning as JSON
    chart_url = f"{img_prediction}"

    return {'chart_url': chart_url}


# Run the Flask app
if __name__ == '__main__':
    """
    Starts the Flask application on a separate thread, running on port 5001.
    """
    threading.Thread(target=app.run, kwargs={
        "host": "0.0.0.0",
        "port": port,
        "use_reloader": False
    }).start()
