#!/bin/bash

echo "Building Node.js dependencies for Raspberry Pi..."

# Build ARM dependencies using Docker
docker build -f Dockerfile.rpi -t signouts-rpi-deps .

# Create a temporary container to extract node_modules
docker create --name temp-container signouts-rpi-deps

# Extract the ARM-built node_modules
docker cp temp-container:/app/node_modules ./node_modules_rpi

# Clean up
docker rm temp-container

echo "ARM dependencies built in ./node_modules_rpi"
echo "Copy your project files and this node_modules_rpi folder to your flash drive"