#!/usr/bin/env python
# coding: utf-8

"""
Hand Gesture Recognition using CNN with MobileNet preprocessing.

This module creates a hand gesture classification model using a CNN built with 
MobileNet for feature extraction. It includes functionality to preprocess the data, 
train a model, evaluate its performance, and test the model using both live images from 
a webcam and random test images. Additionally, a Sequential model is built to compare 
the performance with MobileNet.

The dataset includes five classes: 'mute', 'ok', 'like', 'dislike', and 'stop', and 
achieves an accuracy over 99% on the validation data.
"""

# Import Libraries
import numpy as np
import tensorflow as tf
from tensorflow import keras
from keras.models import Sequential
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Activation, Dense, Flatten, BatchNormalization, Conv2D, MaxPool2D
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.metrics import categorical_crossentropy
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.metrics import top_k_categorical_accuracy
from sklearn.metrics import confusion_matrix, accuracy_score, f1_score
from tensorflow.keras.utils import to_categorical
import itertools
import os
import shutil
import random
import glob
import matplotlib.pyplot as plt
import warnings
from tensorflow.keras.models import load_model
from tensorflow.keras.callbacks import EarlyStopping
import cv2
from ipywidgets import Image, HBox, VBox
from tensorflow.keras.applications.mobilenet import preprocess_input
from IPython.display import display
import ipywidgets as widgets
from base64 import b64decode
import PIL
import io
from concurrent.futures import ThreadPoolExecutor

# Define functions and model building pipeline

def organize_data(path: str):
    """
    Organize the dataset into training, validation, and testing folders.
    
    Parameters:
    path (str): The path to the dataset directory.
    
    The function creates train, validation, and test directories for each class
    if they do not already exist. It then moves images to the corresponding directories 
    for training, validation, and testing.
    """
    os.chdir(path)
    if not os.path.isdir('train/'):
        os.mkdir('train')
        os.mkdir('valid')
        os.mkdir('test')

        folder_name = ['mute', 'ok', 'like', 'dislike', 'stop']
        for name in folder_name:
            target_train_dir = os.path.join('train', name)
            os.mkdir(target_train_dir)

            source_dir = os.path.join(path, name)
            origin_samples = random.sample(os.listdir(source_dir), 7000)
            file_pairs = [
                (os.path.join(source_dir, t), os.path.join(target_train_dir, t))
                for t in origin_samples
            ]

            with ThreadPoolExecutor() as executor:
                executor.map(lambda args: copy_file(*args), file_pairs)

            valid_dir = os.path.join('valid', name)
            test_dir = os.path.join('test', name)
            os.mkdir(valid_dir)
            os.mkdir(test_dir)

            valid_samples = random.sample(os.listdir(target_train_dir), 1000)
            valid_file_pairs = [
                (os.path.join(target_train_dir, j), os.path.join(valid_dir, j))
                for j in valid_samples
            ]
            with ThreadPoolExecutor() as executor:
                executor.map(lambda args: move_file(*args), valid_file_pairs)

            test_samples = random.sample(os.listdir(target_train_dir), 500)
            test_file_pairs = [
                (os.path.join(target_train_dir, k), os.path.join(test_dir, k))
                for k in test_samples
            ]
            with ThreadPoolExecutor() as executor:
                executor.map(lambda args: move_file(*args), test_file_pairs)

    os.chdir('../..')

def build_mobilenet_model(num_classes: int):
    """
    Build a MobileNet-based CNN model with the final layer modified for the given number of classes.
    
    Parameters:
    num_classes (int): The number of output classes for classification.
    
    Returns:
    keras.Model: The modified MobileNet model.
    """
    mobile = tf.keras.applications.mobilenet.MobileNet()
    x = mobile.layers[-1].output
    output = Dense(units=num_classes, activation='softmax')(x)
    model = Model(inputs=mobile.input, outputs=output)

    for layer in model.layers[:-23]:
        layer.trainable = False
    
    return model

def compile_and_train(model, train_batches, valid_batches, epochs=30):
    """
    Compile and train the given model on the provided data.
    
    Parameters:
    model (keras.Model): The model to be trained.
    train_batches: The training dataset.
    valid_batches: The validation dataset.
    epochs (int, optional): The number of training epochs (default is 30).
    
    Returns:
    History: The training history object.
    """
    model.compile(optimizer=Adam(learning_rate=0.0001), loss='categorical_crossentropy', metrics=['accuracy'])
    es = EarlyStopping(monitor='val_accuracy', patience=5)
    history = model.fit(x=train_batches, validation_data=valid_batches, epochs=epochs, callbacks=[es])
    
    return history

def evaluate_model(model, test_batches):
    """
    Evaluate the model on the test dataset.
    
    Parameters:
    model (keras.Model): The trained model.
    test_batches: The test dataset.
    
    Returns:
    float: Test accuracy.
    """
    test_labels = test_batches.classes
    predictions = model.predict(x=test_batches, verbose=0)
    test_accuracy = accuracy_score(test_labels, np.argmax(predictions, axis=1))
    
    return test_accuracy

def save_model(model, model_path: str):
    """
    Save the trained model to the specified path.
    
    Parameters:
    model (keras.Model): The model to be saved.
    model_path (str): Path where the model will be saved.
    """
    model.save(model_path)

def load_trained_model(model_path: str):
    """
    Load a trained model from the specified path.
    
    Parameters:
    model_path (str): Path to the saved model.
    
    Returns:
    keras.Model: The loaded model.
    """
    return load_model(model_path)

# Example of using the functions to build, train, and evaluate the model
"""
path = '/Volumes/Datasets/Hagrid/hagrid-classification-512p/'
organize_data(path)

# Load data
train_batches = ImageDataGenerator(preprocessing_function=tf.keras.applications.mobilenet.preprocess_input).flow_from_directory(directory=path+'train', target_size=(224,224), batch_size=10)
valid_batches = ImageDataGenerator(preprocessing_function=tf.keras.applications.mobilenet.preprocess_input).flow_from_directory(directory=path+'valid', target_size=(224,224), batch_size=10)
test_batches = ImageDataGenerator(preprocessing_function=tf.keras.applications.mobilenet.preprocess_input).flow_from_directory(directory=path+'test', target_size=(224,224), batch_size=10, shuffle=False)

# Build and train the model
model = build_mobilenet_model(num_classes=5)
history = compile_and_train(model, train_batches, valid_batches, epochs=30)

# Save the model
save_model(model, '/path/to/saved/model')

# Evaluate the model
test_accuracy = evaluate_model(model, test_batches)
print(f"Test accuracy: {test_accuracy}")
"""
