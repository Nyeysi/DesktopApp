// This is the preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Authentication
    login: (email, password) => ipcRenderer.invoke('login', email, password),
    processRfid: (rfidCode) => ipcRenderer.invoke('process-rfid', rfidCode),
    
    // RFID handling
    onRfidScanned: (callback) => {
        console.log('onRfidScanned');
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('rfid-scanned', subscription);
        return () => {
            console.log('removeListener');
            ipcRenderer.removeListener('rfid-scanned', subscription);
        };
    },
    // Data fetching
    getData: () => ipcRenderer.invoke('get-data'),
    getProf: () => ipcRenderer.invoke('get-prof'),
    
    // Event handling
    addEvent: (eventData) => ipcRenderer.invoke('addEvent', eventData),
    
    // Serial port commands
    
    sendCommand: (command) => ipcRenderer.invoke('send-command', command),
    
    // Fingerprint data handling
    onFingerprintData: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('fingerprint-data', subscription);
        return () => {
            ipcRenderer.removeListener('fingerprint-data', subscription);
        };
    },
    getAvailabilityList: () => ipcRenderer.invoke('get-availability-list'),
});