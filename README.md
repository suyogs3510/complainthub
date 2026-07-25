# Complaint Management System

This project is a Complaint Management System built with React (Vite) and Node.js (Socket.IO).

## Prerequisites

Before running this project, you need to have **Node.js** installed on your system.

1.  Download and install Node.js from [nodejs.org](https://nodejs.org/).
2.  Verify the installation by running `node -v` and `npm -v` in your terminal.

## Setup

1.  Open a terminal in the project root directory.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Running the Project

You need to run both the backend server and the frontend development server.

### 1. Backend Server
Open a terminal and run:
```bash
node server/index.js
```
The server will start on port 3001.

### 2. Frontend Development Server
Open a **new** terminal (keep the backend terminal running) and run:
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Environment Variables

Ensure you have a `.env` file or valid configuration for Supabase if required (check `src/supabaseClient.js`).
