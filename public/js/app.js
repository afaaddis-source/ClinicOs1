// ClinicOS - Main Application JavaScript

// Global Variables
let currentLanguage = 'ar';
let isRTL = true;

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    initializeTooltips();
    setupFormValidation();
});

// Initialize Application
function initializeApp() {
    // Get current language from HTML attribute
    currentLanguage = document.documentElement.getAttribute('lang') || 'ar';
    isRTL = document.documentElement.getAttribute('dir') === 'rtl';
    
    // Initialize responsive behavior
    handleResponsive();
    
    // Setup CSRF token for all AJAX requests
    setupCSRFToken();
    
    // Auto-hide alerts
    autoHideAlerts();
    
    console.log('ClinicOS initialized successfully');
}

// Setup Event Listeners
function setupEventListeners() {
    // Mobile sidebar toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleSidebar);
    }
    
    // Language toggle
    const langButtons = document.querySelectorAll('[onclick*="toggleLanguage"]');
    langButtons.forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', toggleLanguage);
    });
    
    // Search functionality
    setupSearchHandlers();
    
    // Form enhancements
    setupFormEnhancements();
    
    // Window resize handler
    window.addEventListener('resize', handleResponsive);
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
}

// Language Toggle Functionality
function toggleLanguage() {
    const currentLang = document.documentElement.getAttribute('lang');
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    const url = new URL(window.location);
    url.searchParams.set('lng', newLang);
    
    // Show loading state
    showLoader();
    
    // Redirect to new language
    window.location.href = url.toString();
}

// Mobile Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebar) {
        sidebar.classList.toggle('show');
        if (window.innerWidth <= 768) {
            mainContent?.classList.toggle('expanded');
        }
    }
}

// Handle Responsive Behavior
function handleResponsive() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (window.innerWidth > 768) {
        sidebar?.classList.remove('show');
        mainContent?.classList.remove('expanded');
    }
}

// Setup CSRF Token for AJAX Requests
function setupCSRFToken() {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    if (csrfToken) {
        // Set default headers for fetch requests
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            if (options.method && options.method.toUpperCase() !== 'GET') {
                options.headers = {
                    ...options.headers,
                    'X-CSRF-Token': csrfToken
                };
            }
            return originalFetch(url, options);
        };
    }
}

// Initialize Bootstrap Tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Setup Form Validation
function setupFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
                
                // Focus on first invalid field
                const firstInvalid = form.querySelector(':invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            
            form.classList.add('was-validated');
        }, false);
    });
}

// Setup Search Handlers
function setupSearchHandlers() {
    const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="بحث"], input[placeholder*="Search"]');
    
    searchInputs.forEach(input => {
        let searchTimeout;
        
        input.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearch(this);
            }, 300);
        });
        
        // Clear search on escape
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                handleSearch(this);
            }
        });
    });
}

// Handle Search Functionality
function handleSearch(input) {
    const searchTerm = input.value.trim();
    const form = input.closest('form');
    
    if (form && searchTerm.length >= 2) {
        // Auto-submit search form for real-time search
        if (form.dataset.autoSubmit === 'true') {
            form.submit();
        }
    }
}

// Setup Form Enhancements
function setupFormEnhancements() {
    // Auto-format phone numbers
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', formatPhoneNumber);
    });
    
    // Auto-format civil ID
    const civilIdInputs = document.querySelectorAll('input[name*="civilId"]');
    civilIdInputs.forEach(input => {
        input.addEventListener('input', formatCivilId);
    });
    
    // Auto-calculate totals in forms
    const priceInputs = document.querySelectorAll('input[name*="price"], input[name*="amount"]');
    priceInputs.forEach(input => {
        input.addEventListener('input', calculateFormTotals);
    });
}

// Format Phone Number
function formatPhoneNumber(event) {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.startsWith('965')) {
        value = '+' + value;
    } else if (value.length === 8 && !value.startsWith('+')) {
        value = '+965 ' + value;
    }
    
    event.target.value = value;
}

// Format Civil ID
function formatCivilId(event) {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length > 12) {
        value = value.substring(0, 12);
    }
    
    event.target.value = value;
}

// Calculate Form Totals
function calculateFormTotals() {
    const form = this.closest('form');
    if (!form) return;
    
    const priceInputs = form.querySelectorAll('input[name*="price"]');
    const qtyInputs = form.querySelectorAll('input[name*="qty"]');
    const totalElement = form.querySelector('.total-amount, .grand-total');
    
    if (priceInputs.length > 0 && totalElement) {
        let total = 0;
        
        priceInputs.forEach((priceInput, index) => {
            const price = parseFloat(priceInput.value) || 0;
            const qty = qtyInputs[index] ? parseFloat(qtyInputs[index].value) || 1 : 1;
            total += price * qty;
        });
        
        totalElement.textContent = total.toFixed(2);
    }
}

// Setup Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K for global search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="بحث"], input[placeholder*="Search"]');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                const modal = bootstrap.Modal.getInstance(openModal);
                if (modal) {
                    modal.hide();
                }
            }
        }
        
        // Alt + L for language toggle
        if (e.altKey && e.key === 'l') {
            e.preventDefault();
            toggleLanguage();
        }
    });
}

// Auto-hide Alerts
function autoHideAlerts() {
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    
    alerts.forEach(alert => {
        if (!alert.querySelector('.btn-close')) {
            setTimeout(() => {
                alert.style.transition = 'opacity 0.5s ease';
                alert.style.opacity = '0';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 500);
            }, 5000);
        }
    });
}

// Show Loader
function showLoader(message = 'جاري التحميل...') {
    const loader = document.createElement('div');
    loader.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    loader.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    loader.style.zIndex = '9999';
    loader.id = 'global-loader';
    
    loader.innerHTML = `
        <div class="bg-white rounded p-4 text-center">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(loader);
}

// Hide Loader
function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.remove();
    }
}

// Show Notification
function showNotification(message, type = 'success', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show notification`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-hide after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

// Confirm Dialog
function confirmDialog(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Format Currency
function formatCurrency(amount, currency = 'د.ك') {
    const formatted = parseFloat(amount).toFixed(2);
    return isRTL ? `${formatted} ${currency}` : `${currency} ${formatted}`;
}

// Format Date
function formatDate(date, locale = null) {
    const dateObj = new Date(date);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    locale = locale || (currentLanguage === 'ar' ? 'ar-KW' : 'en-US');
    return dateObj.toLocaleDateString(locale, options);
}

// Format Time
function formatTime(date, locale = null) {
    const dateObj = new Date(date);
    const options = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: currentLanguage === 'en'
    };
    
    locale = locale || (currentLanguage === 'ar' ? 'ar-KW' : 'en-US');
    return dateObj.toLocaleTimeString(locale, options);
}

// AJAX Helper Functions
const API = {
    get: (url) => fetch(url, { credentials: 'include' }),
    post: (url, data) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
    }),
    put: (url, data) => fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
    }),
    delete: (url) => fetch(url, {
        method: 'DELETE',
        credentials: 'include'
    })
};

// Local Storage Helper
const Storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(`clinicos_${key}`, JSON.stringify(value));
        } catch (e) {
            console.warn('Local storage not available');
        }
    },
    get: (key) => {
        try {
            const value = localStorage.getItem(`clinicos_${key}`);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.warn('Local storage not available');
            return null;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(`clinicos_${key}`);
        } catch (e) {
            console.warn('Local storage not available');
        }
    }
};

// Export functions for global use
window.ClinicOS = {
    toggleLanguage,
    toggleSidebar,
    showLoader,
    hideLoader,
    showNotification,
    confirmDialog,
    formatCurrency,
    formatDate,
    formatTime,
    API,
    Storage
};

// Service Worker Registration (for future PWA support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('SW registered: ', registration);
            })
            .catch(function(registrationError) {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Error Handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('حدث خطأ غير متوقع', 'danger');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('حدث خطأ في الشبكة', 'warning');
});

console.log('ClinicOS JavaScript loaded successfully');
