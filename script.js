// script.js

// Firebase Configuration - Replace with your config
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

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
const googleSignInBtn = document.getElementById('googleSignInBtn');
const googleSignInBtn2 = document.getElementById('googleSignInBtn2');
const weeklyNotificationsSwitch = document.getElementById('weeklyNotificationsSwitch');

// Utility Functions
function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
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
        element.disabled = true;
    } else {
        element.classList.remove('loading');
        element.disabled = false;
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

async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const idToken = await user.getIdToken();
        
        // Send the ID token to your backend
        const response = await makeAPICall('/auth/google', 'POST', { idToken });
        displayResponse(response, 'Google Sign-in Response');
        
        if (response.success) {
            currentUser = response.data.user;
            accessToken = response.data.accessToken;
            
            showStatus(`Google sign-in successful! Welcome ${currentUser.displayName || currentUser.email}`, 'success');
            showProfileSection();
            return response.data;
        } else {
            throw new Error(response.error || 'Google sign-in failed');
        }
    } catch (error) {
        console.error('Google sign-in error:', error);
        throw error;
    }
}

async function getUserProfile() {
    const response = await makeAPICall('/auth/profile', 'GET', null, true);
    displayResponse(response, 'Profile Response');
    
    if (response.success) {
        displayProfile(response.data);
        // Update current user with fresh data
        currentUser = response.data;
        // Update the notifications switch
        weeklyNotificationsSwitch.checked = currentUser.weeklyNotifications || false;
        return response.data;
    } else {
        throw new Error(response.error || 'Failed to get profile');
    }
}

async function updateWeeklyNotifications(enabled) {
    const response = await makeAPICall('/auth/notifications', 'PATCH', { weeklyNotifications: enabled }, true);
    displayResponse(response, 'Update Notifications Response');
    
    if (response.success) {
        showStatus(`Weekly notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
        return response.data;
    } else {
        throw new Error(response.error || 'Failed to update notifications');
    }
}

async function logoutUser() {
    try {
        // Sign out from Firebase
        await auth.signOut();
        
        // Call backend logout
        const response = await makeAPICall('/auth/logout', 'POST', null, true);
        displayResponse(response, 'Logout Response');
        
        currentUser = null;
        accessToken = null;
        hideProfileSection();
        showStatus('Logout successful!', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        // Still clear local state even if backend call fails
        currentUser = null;
        accessToken = null;
        hideProfileSection();
        showStatus('Logged out locally', 'success');
    }
}

// UI Functions
function showProfileSection() {
    profileSection.style.display = 'block';
    if (currentUser) {
        displayProfile(currentUser);
        // Set the weekly notifications switch based on user data
        weeklyNotificationsSwitch.checked = currentUser.weeklyNotifications || false;
    }
}

function hideProfileSection() {
    profileSection.style.display = 'none';
    profileData.textContent = '';
    weeklyNotificationsSwitch.checked = false;
}

function displayProfile(user) {
    profileData.textContent = JSON.stringify(user, null, 2);
}

// Event Listeners
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(registerForm.querySelector('button'), true);
    
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
        setLoading(registerForm.querySelector('button'), false);
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(loginForm.querySelector('button'), true);
    
    try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        await loginUser(email, password);
        loginForm.reset();
    } catch (error) {
        showStatus(`Login failed: ${error.message}`, 'error');
        displayResponse({ error: error.message }, 'Login Error');
    } finally {
        setLoading(loginForm.querySelector('button'), false);
    }
});

// Google Sign-in event listeners for both buttons
[googleSignInBtn, googleSignInBtn2].forEach(btn => {
    if (btn) {
        btn.addEventListener('click', async () => {
            setLoading(btn, true);
            
            try {
                await signInWithGoogle();
            } catch (error) {
                showStatus(`Google sign-in failed: ${error.message}`, 'error');
                displayResponse({ error: error.message }, 'Google Sign-in Error');
            } finally {
                setLoading(btn, false);
            }
        });
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

// Weekly notifications switch
weeklyNotificationsSwitch.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    const originalState = !enabled; // Store the opposite of current state
    
    try {
        await updateWeeklyNotifications(enabled);
        // Update the current user object
        if (currentUser) {
            currentUser.weeklyNotifications = enabled;
            displayProfile(currentUser);
        }
    } catch (error) {
        // Revert the switch if the API call failed
        e.target.checked = originalState;
        showStatus(`Failed to update notifications: ${error.message}`, 'error');
        displayResponse({ error: error.message }, 'Notification Update Error');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showStatus('🚀 Frontend loaded! Make sure your backend is running on http://localhost:3001', 'success');
    
    // Listen for Firebase auth state changes
    auth.onAuthStateChanged((user) => {
        if (user && !currentUser) {
            // User is signed in via Firebase but not logged into our backend
            console.log('Firebase user detected:', user.email);
        }
    });
});