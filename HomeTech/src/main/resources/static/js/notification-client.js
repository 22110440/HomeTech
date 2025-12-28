// ========================================
// WebSocket Notification Client with Database Persistence
// ========================================

console.log('📦 notification-client.js loaded');

// Track current user ID
let currentUserId = null;

// Make functions global
window.toggleNotifications = function(event) {
    event && event.stopPropagation && event.stopPropagation();
    const dd = document.getElementById('notificationsDropdown');
    if (!dd) return;
    
    // Load notifications from database when opening
    if (dd.style.display === 'none' || dd.style.display === '') {
        loadNotificationsFromDB();
        dd.style.display = 'block';
    } else {
        dd.style.display = 'none';
    }
};

window.setNotificationCount = function(n) {
    const badge = document.getElementById('notifyBadge');
    if (!badge) return;
    if (n > 0) {
        badge.textContent = n;
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }
};

window.addNotification = function(message) {
    console.log('🔔 addNotification called with:', message);
    const list = document.getElementById('notificationsList');
    if (!list) {
        console.warn('notificationsList not found');
        return;
    }
    // Remove placeholder if exists
    if (list.children.length === 1 && list.children[0].textContent.includes('không có thông báo')) {
        list.innerHTML = '';
    }
    const item = document.createElement('div');
    item.style.padding = '0.6rem 0.4rem';
    item.style.borderRadius = '6px';
    item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    item.style.background = 'rgba(0,191,255,0.08)';
    item.textContent = message;
    list.prepend(item);
    // increase badge
    let current = 0;
    const badge = document.getElementById('notifyBadge');
    if (badge && !badge.classList.contains('d-none')) {
        current = parseInt(badge.textContent || '0') || 0;
    }
    window.setNotificationCount(current + 1);
    console.log('🔔 Notification added. New count:', current + 1);
};

// Close notifications when clicking outside
document.addEventListener('click', function(e) {
    const dd = document.getElementById('notificationsDropdown');
    const bell = document.getElementById('notifyBell');
    if (!dd || !bell) return;
    if (dd.style.display === 'block') {
        if (!dd.contains(e.target) && !bell.contains(e.target)) {
            dd.style.display = 'none';
        }
    }
});

// ========================================
// Database Notification Functions
// ========================================

/**
 * Load notifications from database
 */
async function loadNotificationsFromDB() {
    console.log('📥 Loading notifications from database...');
    try {
        const response = await fetch('/api/notifications');
        console.log('📡 Response status:', response.status);
        if (!response.ok) {
            console.warn('⚠️ Failed to load notifications from DB, status:', response.status);
            return;
        }
        
        const notifications = await response.json();
        console.log('📦 Loaded notifications from DB:', notifications.length, notifications);
        
        const list = document.getElementById('notificationsList');
        if (!list) return;
        
        // Clear placeholder
        list.innerHTML = '';
        
        if (notifications.length === 0) {
            list.innerHTML = '<div style="padding:0.6rem 0.4rem; border-radius:6px; color:#9fb3c8;">Bạn hiện không có thông báo mới.</div>';
            return;
        }
        
        // Display each notification
        notifications.forEach(notif => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:0.6rem 0.4rem; border-radius:6px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; transition:background 0.2s;';
            // Check both 'read' and 'isRead' for compatibility
            const isUnread = !(notif.read || notif.isRead);
            if (isUnread) {
                item.style.background = 'rgba(0,191,255,0.08)'; // Highlight unread
                item.style.fontWeight = '600';
            }
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start; gap:8px;">
                    <div style="flex:1;">
                        <div style="color:#e0e6ed; font-size:0.9rem;">${escapeHtml(notif.message)}</div>
                        <div style="color:#6c757d; font-size:0.75rem; margin-top:4px;">${formatDate(notif.createdAt)}</div>
                    </div>
                    <button class="notif-delete-btn" data-id="${notif.id}" style="background:transparent; border:none; color:#ff6b6b; cursor:pointer; padding:4px;" title="Delete">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Click to mark as read
            item.addEventListener('click', function(e) {
                if (!e.target.closest('.notif-delete-btn')) {
                    markNotificationAsRead(notif.id);
                    item.style.background = 'transparent';
                    item.style.fontWeight = 'normal';
                    updateUnreadCount();
                }
            });
            
            list.appendChild(item);
        });
        
        // Add delete button listeners
        list.querySelectorAll('.notif-delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.getAttribute('data-id');
                deleteNotification(id);
            });
        });
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(id) {
    try {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
        console.log('✅ Marked notification as read:', id);
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

/**
 * Delete notification
 */
async function deleteNotification(id) {
    try {
        const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
        if (response.ok) {
            console.log('✅ Deleted notification:', id);
            loadNotificationsFromDB(); // Reload list
            updateUnreadCount();
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

/**
 * Update unread notification count
 */
async function updateUnreadCount() {
    console.log('🔢 Updating unread count...');
    try {
        const response = await fetch('/api/notifications/unread/count');
        console.log('📊 Unread count response status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('📊 Unread count data:', data);
            window.setNotificationCount(data.count);
        } else {
            console.warn('⚠️ Failed to get unread count, status:', response.status);
        }
    } catch (error) {
        console.error('❌ Error getting unread count:', error);
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date to relative time
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
}

// ========================================
// WebSocket Connection
// ========================================
function initWebSocket() {
    console.log('🔧 Initializing WebSocket...');
    console.log('🔧 SockJS available:', typeof SockJS !== 'undefined');
    console.log('🔧 Stomp available:', typeof Stomp !== 'undefined');
    
    if (typeof SockJS === 'undefined') {
        console.error('❌ SockJS not loaded!');
        return;
    }
    if (typeof Stomp === 'undefined') {
        console.error('❌ Stomp not loaded!');
        return;
    }
    
    try {
        console.log('🔌 Connecting to WebSocket...');
        const socket = new SockJS('http://localhost:8080/ws');

        const stompClient = Stomp.over(socket);
        
        stompClient.connect({}, function() {
            console.log('✅ WebSocket connected!');
            
            stompClient.subscribe('/topic/notifications', function(message) {
                console.log('📨 Received notification:', message.body);
                try {
                    const notification = JSON.parse(message.body);
                    const msg = (notification && notification.message) ? notification.message : 'Bạn có thông báo mới!';
                    console.log('📢 Showing notification:', msg);
                    
                    // Show toast popup
                    showToastNotification(msg);
                    
                    // Update unread count from database
                    if (typeof updateUnreadCount === 'function') {
                        updateUnreadCount();
                    }
                } catch (e) {
                    console.error('Error processing notification:', e);
                }
            });
        }, function(error) {
            console.error('❌ WebSocket connection error:', error);
        });
        
    } catch (e) {
        console.error('❌ WebSocket initialization failed:', e);
    }
}

// Toast notification function
function showToastNotification(msg) {
    const toast = document.createElement('div');
    toast.className = 'ws-toast-notification';
    toast.innerHTML = '<i class="fas fa-bell"></i> ' + msg;
    toast.style.cssText = 'position:fixed; top:100px; right:20px; background:rgba(0,191,255,0.95); color:#0a0e27; padding:1rem 1.5rem; border-radius:10px; box-shadow:0 10px 40px rgba(0,191,255,0.5); z-index:9999; animation:slideIn 0.3s ease-out; font-weight:600;';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initWebSocket();
        updateUnreadCount(); // Load initial count
    });
} else {
    // DOM already loaded
    initWebSocket();
    updateUnreadCount(); // Load initial count
}

