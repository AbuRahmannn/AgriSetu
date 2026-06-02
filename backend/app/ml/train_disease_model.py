"""Skeleton for training a small Keras CNN for disease detection.
You must provide an images folder structured as:
  data/train/<class_name>/*.jpg
  data/val/<class_name>/*.jpg
After training, save to models/disease_model.h5 and the backend will use it.
"""
import argparse, os
try:
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras import layers, models
except Exception as e:
    print('TensorFlow not installed. Install tensorflow and re-run training.')
    raise

def build_model(input_shape=(128,128,3), num_classes=2):
    model = models.Sequential([
        layers.Conv2D(16,3,activation='relu', input_shape=input_shape),
        layers.MaxPool2D(),
        layers.Conv2D(32,3,activation='relu'),
        layers.MaxPool2D(),
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dense(num_classes, activation='softmax')
    ])
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    return model

def main(data_dir, outpath, epochs=10):
    train_gen = ImageDataGenerator(rescale=1./255).flow_from_directory(os.path.join(data_dir,'train'), target_size=(128,128), batch_size=16)
    val_gen = ImageDataGenerator(rescale=1./255).flow_from_directory(os.path.join(data_dir,'val'), target_size=(128,128), batch_size=16)
    num_classes = train_gen.num_classes
    model = build_model(num_classes=num_classes)
    model.fit(train_gen, validation_data=val_gen, epochs=epochs)
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    model.save(outpath)
    print('Saved disease model to', outpath)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_dir', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--epochs', type=int, default=10)
    args = parser.parse_args()
    main(args.data_dir, args.out, args.epochs)
