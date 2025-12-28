// Home Page Notification System
// This file handles notification bell functionality on the home page

console.log('🔧 home-notifications.js loading...');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications);
} else {
    initNotifications();
}

function initNotifications() {
    console.log('🚀 Initializing notification system...');
    
    // Helper to update unread count from database
    window.updateUnreadCount = async function() {
        console.log('🔢 Updating unread count from DB...');
        try {
            const response = await fetch('/api/notifications/unread/count');
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Unread count:', data.count);
                window.setNotificationCount(data.count);
            }
        } catch (error) {
            console.error('❌ Error getting unread count:', error);
        }
    };
    
    // Helper to load notifications from database
    window.loadNotificationsFromDB = async function() {
        console.log('📥 Loading notifications from DB...');
        try {
            const response = await fetch('/api/notifications');
            console.log('📡 Response status:', response.status);
            if (!response.ok) {
                console.warn('⚠️ Failed to load notifications');
                return;
            }
            const notifications = await response.json();
            console.log('📦 Loaded notifications:', notifications.length);
            
            const list = document.getElementById('notificationsList');
            if (!list) return;
            list.innerHTML = '';
            
            if (notifications.length === 0) {
                list.innerHTML = '<div style="padding:0.6rem 0.4rem; color:#9fb3c8;">Bạn hiện không có thông báo mới.</div>';
                return;
            }
            
            notifications.forEach(notif => {
                const item = document.createElement('div');
                const isUnread = !(notif.read || notif.isRead);
                item.style.cssText = 'padding:0.6rem 0.4rem; border-radius:6px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;' + 
                    (isUnread ? ' background:rgba(0,191,255,0.08); font-weight:600;' : '');
                item.innerHTML = '<div style="color:#e0e6ed; font-size:0.9rem;">' + escapeHtml(notif.message) + '</div>' +
                    '<div style="color:#6c757d; font-size:0.75rem; margin-top:4px;">' + formatDate(notif.createdAt) + '</div>';
                list.appendChild(item);
            });
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
        }
    };
    
    // Toggle notifications dropdown
    window.toggleNotifications = function(event) {
        console.log('🔔 Toggle notifications called');
        if (event && event.stopPropagation) {
            event.stopPropagation();
        }
        const dd = document.getElementById('notificationsDropdown');
        if (!dd) {
            console.error('❌ Dropdown not found');
            return;
        }
        
        if (dd.style.display === 'none' || dd.style.display === '') {
            console.log('📂 Opening dropdown...');
            window.loadNotificationsFromDB();
            dd.style.display = 'block';
        } else {
            console.log('📁 Closing dropdown...');
            dd.style.display = 'none';
        }
    };
    
    // Set notification count badge
    window.setNotificationCount = function(n) {
        console.log('🔢 Setting notification count:', n);
        const badge = document.getElementById('notifyBadge');
        if (!badge) {
            console.warn('⚠️ Badge not found');
            return;
        }
        if (n > 0) {
            badge.textContent = n;
            badge.classList.remove('d-none');
            console.log('✅ Badge visible with count:', n);
        } else {
            badge.classList.add('d-none');
        }
    };
    
    // Add new notification (for WebSocket)
    window.addNotification = function(message) {
        console.log('🔔 Adding notification:', message);
        window.updateUnreadCount();
    };
    
    // Helper functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleString('vi-VN');
        } catch (e) {
            return dateString;
        }
    }
    
    // Initialize WebSocket
    if (typeof SockJS !== 'undefined' && typeof Stomp !== 'undefined') {
        console.log('🔌 Connecting to WebSocket...');
        try {
            const socket = new SockJS('http://localhost:8080/ws');

            const stompClient = Stomp.over(socket);
            stompClient.connect({}, function() {
                console.log('✅ WebSocket connected!');
                stompClient.subscribe('/topic/notifications', function(message) {
                    console.log('📨 Received notification:', message.body);
                    const notification = JSON.parse(message.body);
                    const msg = (notification && notification.message) ? notification.message : 'Bạn có thông báo mới!';
                    
                    // Show toast
                    const toast = document.createElement('div');
                    toast.style.cssText = 'position:fixed; top:100px; right:20px; background:rgba(0,191,255,0.95); color:#0a0e27; padding:1rem 1.5rem; border-radius:10px; box-shadow:0 10px 40px rgba(0,191,255,0.5); z-index:9999; font-weight:600;';
                    toast.innerHTML = '<i class="fas fa-bell"></i> ' + msg;
                    document.body.appendChild(toast);
                    setTimeout(() => document.body.removeChild(toast), 4000);
                    
                    // Update count
                    window.addNotification(msg);
                });
            }, function(error) {
                console.error('❌ WebSocket error:', error);
            });
        } catch (e) {
            console.error('❌ WebSocket init failed:', e);
        }
    } else {
        console.error('❌ SockJS or Stomp not loaded!');
    }
    
    // Attach click handler to bell button
    const bellButton = document.getElementById('notifyBell');
    console.log('🔍 Looking for bell button...', bellButton);
    
    if (bellButton) {
        console.log('✅ Bell button found!');
        
        bellButton.addEventListener('click', function(event) {
            console.log('🔔 BELL CLICKED!');
            event.stopPropagation();
            window.toggleNotifications(event);
        });
        
        console.log('✅ Bell button click handler attached');
    } else {
        console.error('❌ Bell button not found!');
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dd = document.getElementById('notificationsDropdown');
        const bell = document.getElementById('notifyBell');
        if (!dd || !bell) return;
        if (dd.style.display === 'block' && !dd.contains(e.target) && !bell.contains(e.target)) {
            dd.style.display = 'none';
        }
    });
    
    // Load initial unread count
    console.log('📊 Loading initial unread count...');
    setTimeout(() => {
        window.updateUnreadCount();
    }, 100);
    
    // Add manual test function
    window.testBellClick = function() {
        console.log('🧪 Manual test: Simulating bell click...');
        const btn = document.getElementById('notifyBell');
        if (btn) {
            btn.click();
            console.log('✅ Click event triggered');
        } else {
            console.error('❌ Bell button not found');
        }
    };
    console.log('💡 TIP: Type window.testBellClick() in console to test the bell');
}

console.log('✅ home-notifications.js loaded');

