// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getDataFromFirestore, getProfFromFirestore, auth, 
    signInWithEmailAndPassword, getRfidFromFirestore, addEventToDatabase } = require('./main/firebase');
const fs = require('fs');

// Global references
let mainWindow = null;

try {
    require('electron-reloader')(module);
} catch {}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false
        },
        autoHideMenuBar: true
    });

    mainWindow.loadFile('renderer/assets/index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle handlers
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('get-data', async () => {
    try {
        const data = await getDataFromFirestore();
        console.log('Data sent to renderer:', data);
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching Firestore data:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-prof', async () => {
    try {
        const data = await getProfFromFirestore();
        console.log('Prof data sent to renderer:', data);
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching prof data:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('login', async (event, email, password) => {
    console.log('Login attempt for:', email);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { 
            success: true, 
            user: { 
                uid: userCredential.user.uid, 
                email: userCredential.user.email 
            }
        };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
});

// Enhanced RFID handler with validation
ipcMain.handle('process-rfid', async (event, rfidCode) => {
    if (!mainWindow) {
        throw new Error('Main window not available');
    }
    
    // Basic RFID validation
    if (!rfidCode || typeof rfidCode !== 'string') {
        return {
            success: false,
            error: 'Invalid RFID input'
        };
    }

    // Clean the RFID code (remove whitespace and non-alphanumeric characters)
    const cleanRfidCode = rfidCode.trim().replace(/[^a-zA-Z0-9]/g, '');

    // Validate RFID format (adjust these rules based on your RFID format)
    if (cleanRfidCode.length < 8 || cleanRfidCode.length > 16) {
        return {
            success: false,
            error: 'Invalid RFID format: Should be between 8 and 16 characters'
        };
    }
    
    try {
        const result = await getRfidFromFirestore(cleanRfidCode);
        if (!result) {
            return {
                success: false,
                error: 'RFID not found in database'
            };
        }
        
        // Log successful RFID read
        console.log('Valid RFID detected:', cleanRfidCode);
        
        return {
            success: true,
            rfidCode: cleanRfidCode,
            userData: result,
            message: 'RFID successfully validated'
        };
    } catch (error) {
        console.error('RFID verification error:', error);
        return {
            success: false,
            error: error.message || 'Error verifying RFID'
        };
    }
});

ipcMain.handle('addEvent', async (event, data) => {
    console.log("Received Event Data:", data);
    try {
        const { name, date, image } = data;
        
        if (!name || !date || !image) {
            throw new Error('Missing required fields');
        }

        const imagesDir = path.join(__dirname, 'images');
        if (!fs.existsSync(imagesDir)) {
            await fs.promises.mkdir(imagesDir, { recursive: true });
        }

        const imagePath = path.join(imagesDir, image.name);
        await fs.promises.writeFile(imagePath, image.data);
        
        await addEventToDatabase({ name, date, imagePath });

        return { success: true, message: 'Event added successfully' };
    } catch (error) {
        console.error('Error adding event:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('send-command', async (event, command) => {
    console.log('Received command', command);
    // Implement your serial port logic here
    return { success: true, message: 'Command received' };
});

ipcMain.handle('get-availability-list', async () => {
    try {
        const data = await getAvailabilityListFromFirestore();
        console.log('Availability list sent to renderer:', data);
        return { success: true, data };
    } catch (error) {    
        console.error('Error fetching availability list:', error);
        return { success: false, error: error.message };
    }
});