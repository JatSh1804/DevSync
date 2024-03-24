#!/bin/bash

# Move to the backend directory

# Install backend dependencies
npm install

# Build the frontend (assuming npm run build is the build command)
npm run build

# Move back to the root directory
cd server

# Install backend dependencies (again, in case there were changes)
npm install 

