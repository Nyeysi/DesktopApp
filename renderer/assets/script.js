// script.js
let loginData = null;
let rfidBuffer = '';
let lastKeyTime = 0;
const RFID_TIMEOUT = 100;
const MIN_RFID_LENGTH = 8;  // Adjust based on your RFID card format
const MAX_RFID_LENGTH = 16; // Adjust based on your RFID card format

document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const loginResponse = await window.electronAPI.login(email, password);
        
        if (loginResponse.success) {
            loginData = loginResponse;
            showRfidModal();
        } else {
            showError('Login failed: ' + (loginResponse.error || 'Invalid credentials'));
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showError('Authentication failed. Please try again.');
    }
});

function showRfidModal() {
    const modal = document.getElementById('rfidModal');
    if (!modal) {
        console.error('RFID modal element not found');
        return;
    }
    
    modal.style.display = 'flex';
    setupRfidListener();
    
    // Optional: Add a timeout to auto-hide the modal if no RFID is scanned
    setTimeout(() => {
        if (modal.style.display === 'flex') {
            hideRfidModal();
            showError('RFID scan timeout. Please try again.');
        }
    }, 10000); // 10 second timeout
}


function hideRfidModal() {
    const modal = document.getElementById('rfidModal');
    if (modal) {
        modal.style.display = 'none';
        document.removeEventListener('keypress', handleRfidKeypress);
        rfidBuffer = '';
    }
}

function showError(message) {
    // You can customize this to show errors in a more user-friendly way
    alert(message);
}

function setupRfidListener() {
    document.removeEventListener('keypress', handleRfidKeypress);
    document.addEventListener('keypress', handleRfidKeypress);
    console.log('RFID listener setup complete');
}

async function handleRfidKeypress(event) {
    const currentTime = new Date().getTime();
    
    // Reset buffer if too much time has passed
    if (currentTime - lastKeyTime > RFID_TIMEOUT) {
        console.log('RFID buffer reset due to timeout');
        rfidBuffer = '';
    }
    
    lastKeyTime = currentTime;
    
    // Ignore non-printable characters except Enter
    if (event.key === 'Enter') {
        await processRfidBuffer();
    } else if (event.key.length === 1) { // Only accept single characters
        rfidBuffer += event.key;
        console.log('RFID buffer length:', rfidBuffer.length);
        
        // Auto-process if we've reached maximum length
        if (rfidBuffer.length >= MAX_RFID_LENGTH) {
            await processRfidBuffer();
        }
    }
}

async function processRfidBuffer() {
    console.log('Processing RFID buffer of length:', rfidBuffer.length);
    
    if (rfidBuffer.length < MIN_RFID_LENGTH) {
        console.log('RFID too short, ignoring');
        rfidBuffer = '';
        return;
    }
    
    try {
        const cleanRfid = rfidBuffer.trim().replace(/[^a-zA-Z0-9]/g, '');
        console.log('Sending RFID for processing:', cleanRfid);
        
        const result = await window.electronAPI.processRfid(cleanRfid);
        console.log('RFID process result:', result);
        
        if (result.success) {
            hideRfidModal();
            // Verify we have both RFID and login data before proceeding
            if (loginData?.success) {
                console.log('Authentication complete, redirecting...');
                window.location.href = 'dashboard.html';
            } else {
                showError('Login data not found. Please try again.');
            }
        } else {
            showError('RFID verification failed: ' + (result.error || 'Unknown error'));
            hideRfidModal();
        }
    } catch (error) {
        console.error('RFID processing error:', error);
        showError('RFID verification failed. Please try again.');
        hideRfidModal();
    } finally {
        rfidBuffer = '';
    }
}

// Close button handler
document.getElementById('closeRfidModal')?.addEventListener('click', hideRfidModal);