// Session Helper - Quản lý session trên client side
class SessionHelper {
    constructor() {
        this.sessionId = null;
        this.isAuthenticated = false;
        this.username = null;
        this.init();
    }

    init() {
        // Lấy session ID từ server response header
        this.getSessionFromServer();
        
        // Kiểm tra session mỗi 30 giây
        setInterval(() => {
            this.validateSession();
        }, 30000);
        
        // Lưu session vào localStorage để persist
        this.loadSessionFromStorage();
    }

    getSessionFromServer() {
        // Lấy session ID từ response header
        fetch('/api/session/info')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.sessionId = data.sessionId;
                    this.isAuthenticated = data.isAuthenticated;
                    this.username = data.username;
                    this.saveSessionToStorage();
                }
            })
            .catch(error => {
                console.log('Session info not available:', error);
            });
    }

    validateSession() {
        fetch('/api/session/validate')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.valid) {
                    this.sessionId = data.sessionId;
                    this.isAuthenticated = data.isAuthenticated;
                } else {
                    this.clearSession();
                    // Redirect to login if session is invalid
                    if (window.location.pathname !== '/auth/login') {
                        window.location.href = '/auth/login?expired=true';
                    }
                }
            })
            .catch(error => {
                console.log('Session validation failed:', error);
            });
    }

    extendSession() {
        fetch('/api/session/extend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.sessionId = data.sessionId;
                console.log('Session extended successfully');
            }
        })
        .catch(error => {
            console.log('Session extension failed:', error);
        });
    }

    saveSessionToStorage() {
        const sessionData = {
            sessionId: this.sessionId,
            isAuthenticated: this.isAuthenticated,
            username: this.username,
            timestamp: Date.now()
        };
        localStorage.setItem('hometech_session', JSON.stringify(sessionData));
    }

    loadSessionFromStorage() {
        const sessionData = localStorage.getItem('hometech_session');
        if (sessionData) {
            try {
                const data = JSON.parse(sessionData);
                // Kiểm tra nếu session cũ hơn 24 giờ thì xóa
                if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    this.sessionId = data.sessionId;
                    this.isAuthenticated = data.isAuthenticated;
                    this.username = data.username;
                } else {
                    this.clearSession();
                }
            } catch (error) {
                console.log('Invalid session data in storage:', error);
                this.clearSession();
            }
        }
    }

    clearSession() {
        this.sessionId = null;
        this.isAuthenticated = false;
        this.username = null;
        localStorage.removeItem('hometech_session');
    }

    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            isAuthenticated: this.isAuthenticated,
            username: this.username
        };
    }

    // Hiển thị thông tin session trong console (for debugging)
    debugSession() {
        console.log('Session Info:', this.getSessionInfo());
    }
}

// Khởi tạo session helper khi trang load
document.addEventListener('DOMContentLoaded', function() {
    window.sessionHelper = new SessionHelper();
    
    // Hiển thị thông tin session nếu có
    const sessionInfo = window.sessionHelper.getSessionInfo();
    if (sessionInfo.isAuthenticated && sessionInfo.username) {
        console.log('User authenticated:', sessionInfo.username);
        console.log('Session ID:', sessionInfo.sessionId);
    }
});

// Export cho sử dụng trong các module khác
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionHelper;
}

