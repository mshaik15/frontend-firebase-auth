// script.js

// Configuration
const API_BASE_URL = 'http://localhost:3001'; // Your NestJS backend URL
let currentUser = null;
let accessToken = null;

// DOM Elements
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const profileSection = document.getElementById('profileSection');
const profileData = document.getElementById('profileData');
const responseDisplay = document.getElementById('responseDisplay');
const statusDiv = document.getElementById('status');
const logoutBtn = document.getElementById('logoutBtn');
const getProfileBtn = document.getElementById('getProfileBtn');

// Utility Functions
function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

function displayResponse(data, title = 'API Response') {
    const timestamp = new Date().toLocaleTimeString();
    const response = `=== ${title} (${timestamp}) ===\n${JSON.stringify(data, null, 2)}\n\n`;
    responseDisplay.textContent = response + responseDisplay.textContent;
}

function setLoading(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
    } else {
        element.classList.remove('loading');
    }
}

// API Functions
async function makeAPICall(endpoint, method = 'GET', body = null, useAuth = false) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (useAuth && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const config = {
        method,
        headers,
        mode: 'cors',
        credentials: 'include'
    };
    
    if (body) {
        config.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'API call failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication Functions
async function registerUser(email, password, displayName) {
    const body = { email, password };
    if (displayName) body.displayName = displayName;
    
    const response = await makeAPICall('/auth/register', 'POST', body);
    displayResponse(response, 'Registration Response');
    
    if (response.success) {
        showStatus(`Registration successful! User: ${response.data.user.email}`, 'success');
        return response.data;
    } else {
        throw new Error(response.error || 'Registration failed');
    }
}

async function loginUser(email, password) {
    const response = await makeAPICall('/auth/login', 'POST', { email, password });
    displayResponse(response, 'Login Response');
    
    if (response.success) {
        currentUser = response.data.user;
        accessToken = response.data.accessToken;
        
        showStatus(`Login successful! Welcome ${currentUser.displayName || currentUser.email}`, 'success');
        showProfileSection();
        return response.data;
    } else {
        throw new Error(response.error || 'Login failed');
    }
}

async function getUserProfile() {
    const response = await makeAPICall('/auth/profile', 'GET', null, true);
    displayResponse(response, 'Profile Response');
    
    if (response.success) {
        displayProfile(response.data);
        return response.data;
    } else {
        throw new Error(response.error || 'Failed to get profile');
    }
}

async function logoutUser() {
    const response = await makeAPICall('/auth/logout', 'POST', null, true);
    displayResponse(response, 'Logout Response');
    
    if (response.success) {
        currentUser = null;
        accessToken = null;
        hideProfileSection();
        showStatus('Logout successful!', 'success');
    } else {
        throw new Error(response.error || 'Logout failed');
    }
}

// UI Functions
function showProfileSection() {
    profileSection.style.display = 'block';
    if (currentUser) {
        displayProfile(currentUser);
    }
}

function hideProfileSection() {
    profileSection.style.display = 'none';
    profileData.textContent = '';
}

function displayProfile(user) {
    profileData.textContent = JSON.stringify(user, null, 2);
}

// Event Listeners
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(registerForm, true);
    
    try {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const displayName = document.getElementById('registerDisplayName').value;
        
        await registerUser(email, password, displayName);
        registerForm.reset();
    } catch (error) {
        showStatus(`Registration failed: ${error.message}`, 'error');
        displayResponse({ error: error.message }, 'Registration Error');
    } finally {
        setLoading(registerForm, false);
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(loginForm, true);
    
    try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        await loginUser(email, password);
        loginForm.reset();
    } catch (error) {
        showStatus(`Login failed: ${error.message}`, 'error');
        displayResponse({ error: error.message }, 'Login Error');
    } finally {
        setLoading(loginForm, false);
    }
});

logoutBtn.addEventListener('click', async () => {
    setLoading(logoutBtn, true);
    
    try {
        await logoutUser();
    } catch (error) {
        showStatus(`Logout failed: ${error.message}`, 'error');
        displayResponse({ error: error.message }, 'Logout Error');
    } finally {
        setLoading(logoutBtn, false);
    }
});

getProfileBtn.addEventListener('click', async () => {
    setLoading(getProfileBtn, true);
    
    try {
        await getUserProfile();
    } catch (error) {
        showStatus(`Failed to get profile: ${error.message}`, 'error');
        displayResponse({ error: error.message }, 'Profile Error');
    } finally {
        setLoading(getProfileBtn, false);
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showStatus('🚀 Frontend loaded! Make sure your backend is running on http://localhost:3001', 'success');
});