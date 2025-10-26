// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOM loaded, initializing Vue app...');

    // Check if Bootstrap is available
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded!');
        alert('Bootstrap library is not loaded. Please refresh the page.');
        return;
    }

    console.log('Vue.js and Bootstrap loaded successfully');

    // Ensure Vue is available. If not present (script order / cache issue), dynamically load the production build.
    async function ensureVue() {
        if (window.Vue) return true;
        console.warn('Vue not found – attempting to load Vue dynamically');
        const src = '/js/vue.global.prod.min.js';
        return new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => {
                console.log('Dynamically loaded Vue from', src);
                resolve(!!window.Vue);
            };
            s.onerror = () => {
                console.error('Failed to dynamically load Vue from', src);
                resolve(false);
            };
            document.head.appendChild(s);
        });
    }

    // Use the global Vue object via window to avoid ReferenceError if the identifier 'Vue' is not present
    // Ensure Vue is actually available (might be loaded dynamically above)
    const vueOk = await ensureVue().catch(() => false);
    if (!vueOk) {
        console.error('Vue.js is not available after dynamic load attempt');
        const loadingScreen = document.getElementById('loading-screen');
        const authErrorScreen = document.getElementById('auth-error-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (authErrorScreen) authErrorScreen.style.display = 'flex';
        setTimeout(() => { window.location.href = '/login.html'; }, 3000);
        return;
    }

    // Now it's safe to access createApp from window.Vue
    const createApp = window.Vue?.createApp;
    if (!createApp) {
        console.error('Vue is present but createApp is not available on window.Vue');
        const loadingScreen = document.getElementById('loading-screen');
        const authErrorScreen = document.getElementById('auth-error-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (authErrorScreen) authErrorScreen.style.display = 'flex';
        return;
    }
    
    const API_BASE = '/api';

    const app = createApp({
        data() {
            return {
                isLoading: true,
                isReady: false,
                currentView: 'articles',
                currentUser: null,
                articles: [],
                subscriptions: [],
                orders: [],
                users: [],
                alert: {
                    show: false,
                    message: '',
                    type: 'info'
                },
                articleForm: {
                    id: null,
                    name: '',
                    description: '',
                    price: 0,
                    supplierEmail: '',
                    isActive: true
                },
                subscriptionForm: {
                    id: null,
                    name: '',
                    description: '',
                    price: 0,
                    includesPhysicalMagazine: false,
                    isActive: true
                },
                orderForm: {
                    phoneNumber: '',
                    selectedArticles: [],
                    selectedSubscription: null
                },
                userForm: {
                    id: null,
                    username: '',
                    fullName: '',
                    email: '',
                    role: 'RegularUser',
                    isActive: true,
                    password: ''
                },
                selectedOrder: null,
                articleModal: null,
                subscriptionModal: null,
                orderDetailsModal: null,
                userModal: null
            };
        },
        async mounted() {
            try {
                console.log('Vue app mounted, starting authentication check...');

                // Show loading screen
                const loadingScreen = document.getElementById('loading-screen');
                const appElement = document.getElementById('app');
                const authErrorScreen = document.getElementById('auth-error-screen');

                if (loadingScreen) loadingScreen.style.display = 'flex';
                if (appElement) appElement.style.display = 'none';

                try {
                    // Check authentication first
                    console.log('Calling checkAuth...');
                    await this.checkAuth();
                    console.log('checkAuth completed, currentUser:', this.currentUser);

                    if (!this.currentUser) {
                        console.log('User not authenticated, showing error screen');
                        if (loadingScreen) loadingScreen.style.display = 'none';
                        if (authErrorScreen) authErrorScreen.style.display = 'flex';
                        setTimeout(() => {
                            window.location.href = '/login.html';
                        }, 3000);
                        return;
                    }

                    // User is authenticated, show the app
                    console.log('User authenticated, showing main app');
                    if (loadingScreen) loadingScreen.style.display = 'none';
                    if (appElement) appElement.style.display = 'block';

                    // Set ready state
                    this.isReady = true;

                    // Wait for Bootstrap to be fully ready before initializing modals
                    await this.$nextTick();
                    setTimeout(() => {
                        try {
                            this.initializeModals();
                        } catch (err) {
                            console.error('initializeModals threw an error:', err);
                        }
                    }, 200);

                    // Set default view based on role
                    if (this.isAdmin()) {
                        this.currentView = 'users';
                    } else if (this.isEditor()) {
                        this.currentView = 'articles';
                    } else {
                        this.currentView = 'purchase';
                    }

                    // Load initial data
                    const promises = [];
                    if (this.canViewArticles()) promises.push(this.loadArticles());
                    if (this.canViewSubscriptions()) promises.push(this.loadSubscriptions());
                    if (this.canViewOrders()) promises.push(this.loadOrders());
                    if (this.isAdmin()) promises.push(this.loadUsers());

                    Promise.all(promises).finally(() => {
                        this.isLoading = false;
                    });

                } catch (error) {
                    console.error('Authentication check failed:', error);
                    if (loadingScreen) loadingScreen.style.display = 'none';
                    if (authErrorScreen) authErrorScreen.style.display = 'flex';
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 3000);
                }
            } catch (mountErr) {
                // Catch anything thrown during mounted so Vue doesn't treat it as an unhandled mounted error
                console.error('Error in mounted hook (caught):', mountErr);
            }
        },
        methods: {
            // API Calls
            async apiCall(url, options = {}) {
                try {
                    const response = await fetch(url, {
                        ...options,
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                            ...options.headers
                        }
                    });

                    const text = await response.text();

                    if (!response.ok) {
                        let errorMessage = 'Request failed';
                        if (text) {
                            try {
                                const errorData = JSON.parse(text);
                                if (response.status === 400 && errorData.errors) {
                                    const errorMessages = [];
                                    for (const field in errorData.errors) {
                                        errorMessages.push(...errorData.errors[field]);
                                    }
                                    errorMessage = errorMessages.join('\n');
                                } else {
                                    errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
                                }
                            } catch (e) {
                                errorMessage = text;
                            }
                        } else {
                            errorMessage = `HTTP ${response.status} ${response.statusText}`;
                        }
                        throw new Error(errorMessage);
                    }

                    if (!text) return null;

                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        return text;
                    }
                } catch (error) {
                    if (error instanceof TypeError && error.message === 'Failed to fetch') {
                        this.showAlert('Network error. Please check your connection.', 'danger');
                    } else {
                        this.showAlert(error.message || 'Unknown error', 'danger');
                    }
                    throw error;
                }
            },

            // Articles
            async loadArticles() {
                try {
                    const data = await this.apiCall(`${API_BASE}/articles`);
                    this.articles = Array.isArray(data) ? data : [];
                } catch (error) {
                    console.error('Failed to load articles:', error);
                    this.articles = [];
                    this.showAlert('Failed to load articles. Please try refreshing the page.', 'danger');
                }
            },

            openArticleModal(article = null) {
                if (article) {
                    this.articleForm = {...article};
                } else {
                    this.articleForm = {
                        id: null,
                        name: '',
                        description: '',
                        price: 0,
                        supplierEmail: '',
                        isActive: true
                    };
                }

                if (!this.articleModal) {
                    const modalEl = document.getElementById('articleModal');
                    if (modalEl && typeof bootstrap !== 'undefined' && bootstrap && bootstrap.Modal && typeof bootstrap.Modal === 'object' || typeof bootstrap.Modal === 'function') {
                        try {
                            // Prefer getOrCreateInstance which is safer across bootstrap versions
                            this.articleModal = (bootstrap.Modal.getOrCreateInstance
                                ? bootstrap.Modal.getOrCreateInstance(modalEl)
                                : new bootstrap.Modal(modalEl));
                        } catch (e) {
                            console.error('Failed to initialize article modal:', e);
                            this.articleModal = null;
                        }
                    }
                }

                if (this.articleModal) {
                    try { this.articleModal.show(); } catch (e) { console.error('Failed to show article modal:', e); }
                }
            },

            async saveArticle() {
                try {
                    if (!this.articleForm.name?.trim()) {
                        this.showAlert('Name is required', 'danger');
                        return;
                    }
                    if (!this.articleForm.price || this.articleForm.price <= 0 || this.articleForm.price > 1000000) {
                        this.showAlert('Price must be between 0.01 and 1,000,000', 'danger');
                        return;
                    }
                    if (!this.articleForm.supplierEmail?.trim() || !this.validateEmail(this.articleForm.supplierEmail)) {
                        this.showAlert('Valid supplier email is required', 'danger');
                        return;
                    }

                    const articleData = {
                        ...this.articleForm,
                        name: this.articleForm.name.trim(),
                        description: this.articleForm.description?.trim() || null,
                        supplierEmail: this.articleForm.supplierEmail.trim()
                    };

                    const method = this.articleForm.id ? 'PUT' : 'POST';
                    const url = this.articleForm.id
                        ? `${API_BASE}/articles/${this.articleForm.id}`
                        : `${API_BASE}/articles`;

                    let payload;
                    if (method === 'POST') {
                        payload = {
                            name: articleData.name,
                            description: articleData.description,
                            price: Number(articleData.price),
                            supplierEmail: articleData.supplierEmail
                        };
                    } else {
                        payload = {
                            id: Number(articleData.id),
                            name: articleData.name,
                            description: articleData.description,
                            price: Number(articleData.price),
                            supplierEmail: articleData.supplierEmail
                        };
                    }

                    await this.apiCall(url, {
                        method,
                        body: JSON.stringify(payload)
                    });

                    this.showAlert(`Article ${this.articleForm.id ? 'updated' : 'created'} successfully`, 'success');
                    if (this.articleModal) {
                        this.articleModal.hide();
                    }
                    await this.loadArticles();
                } catch (error) {
                    console.error('Failed to save article:', error);
                    this.showAlert(error.message || 'Failed to save article', 'danger');
                }
            },

            validateEmail(email) {
                const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return re.test(email);
            },

            async deleteArticle(id) {
                if (!confirm('Are you sure you want to delete this article?')) return;

                try {
                    await this.apiCall(`${API_BASE}/articles/${id}`, {method: 'DELETE'});
                    this.showAlert('Article deleted successfully', 'success');
                    await this.loadArticles();
                } catch (error) {
                    console.error('Failed to delete article:', error);
                }
            },

            // Subscriptions
            async loadSubscriptions() {
                try {
                    const data = await this.apiCall(`${API_BASE}/subscriptionpackages`);
                    this.subscriptions = Array.isArray(data) ? data : [];
                } catch (error) {
                    console.error('Failed to load subscriptions:', error);
                    this.subscriptions = [];
                    this.showAlert('Failed to load subscription packages. Please try refreshing the page.', 'danger');
                }
            },

            openSubscriptionModal(subscription = null) {
                if (subscription) {
                    this.subscriptionForm = {...subscription};
                } else {
                    this.subscriptionForm = {
                        id: null,
                        name: '',
                        description: '',
                        price: 0,
                        includesPhysicalMagazine: false,
                        isActive: true
                    };
                }

                if (!this.subscriptionModal) {
                    const modalEl = document.getElementById('subscriptionModal');
                    if (modalEl && typeof bootstrap !== 'undefined' && bootstrap && bootstrap.Modal && (typeof bootstrap.Modal === 'object' || typeof bootstrap.Modal === 'function')) {
                        try {
                            this.subscriptionModal = (bootstrap.Modal.getOrCreateInstance
                                ? bootstrap.Modal.getOrCreateInstance(modalEl)
                                : new bootstrap.Modal(modalEl));
                        } catch (e) {
                            console.error('Failed to initialize subscription modal:', e);
                            this.subscriptionModal = null;
                        }
                    }
                }

                if (this.subscriptionModal) {
                    try { this.subscriptionModal.show(); } catch (e) { console.error('Failed to show subscription modal:', e); }
                }
            },

            async saveSubscription() {
                try {
                    if (!this.subscriptionForm.name?.trim()) {
                        this.showAlert('Name is required', 'danger');
                        return;
                    }
                    if (!this.subscriptionForm.price || this.subscriptionForm.price <= 0 || this.subscriptionForm.price > 1000000) {
                        this.showAlert('Price must be between 0.01 and 1,000,000', 'danger');
                        return;
                    }

                    const subscriptionData = {
                        ...this.subscriptionForm,
                        name: this.subscriptionForm.name.trim(),
                        description: this.subscriptionForm.description?.trim() || null
                    };

                    const method = this.subscriptionForm.id ? 'PUT' : 'POST';
                    const url = this.subscriptionForm.id
                        ? `${API_BASE}/subscriptionpackages/${this.subscriptionForm.id}`
                        : `${API_BASE}/subscriptionpackages`;

                    let payload;
                    if (method === 'POST') {
                        payload = {
                            name: subscriptionData.name,
                            description: subscriptionData.description,
                            price: Number(subscriptionData.price),
                            includesPhysicalMagazine: Boolean(subscriptionData.includesPhysicalMagazine)
                        };
                    } else {
                        payload = {
                            id: Number(subscriptionData.id),
                            name: subscriptionData.name,
                            description: subscriptionData.description,
                            price: Number(subscriptionData.price),
                            includesPhysicalMagazine: Boolean(subscriptionData.includesPhysicalMagazine)
                        };
                    }

                    await this.apiCall(url, {
                        method,
                        body: JSON.stringify(payload)
                    });

                    this.showAlert(`Subscription ${this.subscriptionForm.id ? 'updated' : 'created'} successfully`, 'success');
                    if (this.subscriptionModal) {
                        this.subscriptionModal.hide();
                    }
                    await this.loadSubscriptions();
                } catch (error) {
                    console.error('Failed to save subscription:', error);
                    this.showAlert(error.message || 'Failed to save subscription', 'danger');
                }
            },

            async deleteSubscription(id) {
                if (!confirm('Are you sure you want to delete this subscription package?')) return;

                try {
                    await this.apiCall(`${API_BASE}/subscriptionpackages/${id}`, {method: 'DELETE'});
                    this.showAlert('Subscription package deleted successfully', 'success');
                    await this.loadSubscriptions();
                } catch (error) {
                    console.error('Failed to delete subscription:', error);
                    this.showAlert(error.message || 'Failed to delete subscription package', 'danger');
                }
            },

            // Orders
            async loadOrders() {
                try {
                    const data = await this.apiCall(`${API_BASE}/orders`);
                    this.orders = Array.isArray(data) ? data : [];
                } catch (error) {
                    console.error('Failed to load orders:', error);
                    this.orders = [];
                    this.showAlert('Failed to load orders. Please try refreshing the page.', 'danger');
                }
            },

            async submitOrder() {
                try {
                    const orderData = {
                        customerPhoneNumber: this.orderForm.phoneNumber,
                        articleIds: this.orderForm.selectedArticles.length > 0 ? this.orderForm.selectedArticles : null,
                        subscriptionPackageId: this.orderForm.selectedSubscription
                    };

                    await this.apiCall(`${API_BASE}/orders`, {
                        method: 'POST',
                        body: JSON.stringify(orderData)
                    });

                    this.showAlert('Order placed successfully! SMS confirmation sent.', 'success');
                    this.resetOrderForm();
                    await this.loadOrders();
                    this.currentView = 'orders';
                } catch (error) {
                    console.error('Failed to submit order:', error);
                }
            },

            async deleteOrder(id) {
                if (!confirm('Are you sure you want to delete this order?')) return;

                try {
                    await this.apiCall(`${API_BASE}/orders/${id}`, {method: 'DELETE'});
                    this.showAlert('Order deleted successfully', 'success');
                    await this.loadOrders();
                } catch (error) {
                    console.error('Failed to delete order:', error);
                    this.showAlert(error.message || 'Failed to delete order', 'danger');
                }
            },

            viewOrderDetails(order) {
                this.selectedOrder = {...order};

                if (!this.orderDetailsModal) {
                    const modalEl = document.getElementById('orderDetailsModal');
                    if (modalEl && typeof bootstrap !== 'undefined' && bootstrap && bootstrap.Modal && (typeof bootstrap.Modal === 'object' || typeof bootstrap.Modal === 'function')) {
                        try {
                            this.orderDetailsModal = (bootstrap.Modal.getOrCreateInstance
                                ? bootstrap.Modal.getOrCreateInstance(modalEl)
                                : new bootstrap.Modal(modalEl));
                        } catch (e) {
                            console.error('Failed to initialize order details modal:', e);
                            this.orderDetailsModal = null;
                        }
                    }
                }

                if (this.orderDetailsModal) {
                    try { this.orderDetailsModal.show(); } catch (e) { console.error('Failed to show order details modal:', e); }
                }
            },

            async updateOrderStatus(orderId, newStatus) {
                try {
                    await this.apiCall(`${API_BASE}/orders/${orderId}/status`, {
                        method: 'PUT',
                        body: JSON.stringify({status: newStatus})
                    });

                    this.showAlert('Order status updated successfully! SMS notification sent.', 'success');
                    await this.loadOrders();
                } catch (error) {
                    console.error('Failed to update order status:', error);
                    this.showAlert(error.message || 'Failed to update order status', 'danger');
                }
            },

            // Helper methods
            calculateTotal() {
                let total = 0;

                this.orderForm.selectedArticles.forEach(articleId => {
                    const article = this.articles.find(a => a.id === articleId);
                    if (article) {
                        total += article.price;
                    }
                });

                if (this.orderForm.selectedSubscription) {
                    const subscription = this.subscriptions.find(s => s.id === this.orderForm.selectedSubscription);
                    if (subscription) {
                        total += subscription.price;
                    }
                }

                return total;
            },

            isOrderValid() {
                return this.orderForm.phoneNumber &&
                    (this.orderForm.selectedArticles.length > 0 || this.orderForm.selectedSubscription);
            },

            resetOrderForm() {
                this.orderForm = {
                    phoneNumber: '',
                    selectedArticles: [],
                    selectedSubscription: null
                };
            },

            formatDate(dateString) {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            },

            getStatusColor(status) {
                switch (status) {
                    case 'Confirmed':
                        return 'success';
                    case 'Cancelled':
                        return 'danger';
                    case 'Pending':
                    default:
                        return 'warning';
                }
            },

            // Initialize Bootstrap modals
            initializeModals() {
                console.log('Initializing Bootstrap modals...');

                if (typeof bootstrap === 'undefined' || !bootstrap || !bootstrap.Modal || typeof bootstrap.Modal !== 'function') {
                    console.warn('Bootstrap Modal is not available for modal initialization');
                    return;
                }

                try {
                    const articleModalEl = document.getElementById('articleModal');
                    const subscriptionModalEl = document.getElementById('subscriptionModal');
                    const orderDetailsModalEl = document.getElementById('orderDetailsModal');
                    const userModalEl = document.getElementById('userModal');

                    if (articleModalEl) {
                        try { this.articleModal = (bootstrap.Modal.getOrCreateInstance ? bootstrap.Modal.getOrCreateInstance(articleModalEl) : new bootstrap.Modal(articleModalEl)); console.log('Article modal initialized'); } catch (e) { console.error('Article modal init error:', e); }
                    }
                    if (subscriptionModalEl) {
                        try { this.subscriptionModal = (bootstrap.Modal.getOrCreateInstance ? bootstrap.Modal.getOrCreateInstance(subscriptionModalEl) : new bootstrap.Modal(subscriptionModalEl)); console.log('Subscription modal initialized'); } catch (e) { console.error('Subscription modal init error:', e); }
                    }
                    if (orderDetailsModalEl) {
                        try { this.orderDetailsModal = (bootstrap.Modal.getOrCreateInstance ? bootstrap.Modal.getOrCreateInstance(orderDetailsModalEl) : new bootstrap.Modal(orderDetailsModalEl)); console.log('Order details modal initialized'); } catch (e) { console.error('Order details modal init error:', e); }
                    }
                    if (userModalEl) {
                        try { this.userModal = (bootstrap.Modal.getOrCreateInstance ? bootstrap.Modal.getOrCreateInstance(userModalEl) : new bootstrap.Modal(userModalEl)); console.log('User modal initialized'); } catch (e) { console.error('User modal init error:', e); }
                    }

                    console.log('All modals initialization attempted');
                } catch (modalError) {
                    console.error('Failed to initialize modals (outer):', modalError);
                }
            },

            // Authentication
            async checkAuth() {
                try {
                    console.log('Making API call to check authentication...');

                    const response = await fetch(`${API_BASE}/auth/current`, {
                        credentials: 'same-origin'
                    });
                    console.log('Auth API response status:', response.status);

                    if (response.ok) {
                        const data = await response.json();
                        console.log('Auth API response data:', data);
                        this.currentUser = data;
                    } else {
                        const errorText = await response.text();
                        console.log('Auth API returned non-OK status:', response.status, errorText);
                        this.currentUser = null;
                    }
                } catch (error) {
                    console.log('Auth check failed:', error);
                    this.currentUser = null;
                }
            },

            async logout() {
                try {
                    await this.apiCall(`${API_BASE}/auth/logout`, {method: 'POST'});
                    window.location.href = '/login.html';
                } catch (error) {
                    window.location.href = '/login.html';
                }
            },

            // Role-based access control
            isAdmin() {
                return this.currentUser?.roleLevel >= 3;
            },

            isEditor() {
                return this.currentUser?.roleLevel >= 2;
            },

            isRegularUser() {
                return this.currentUser?.roleLevel >= 1;
            },

            canViewArticles() {
                return this.isAuthenticated();
            },

            canViewSubscriptions() {
                return this.isAuthenticated();
            },

            canViewOrders() {
                return this.isAuthenticated();
            },

            canMakePurchase() {
                return this.isRegularUser();
            },

            isAuthenticated() {
                return this.currentUser != null;
            },

            // Users management
            async loadUsers() {
                try {
                    const data = await this.apiCall(`${API_BASE}/users`);
                    this.users = Array.isArray(data) ? data : [];
                } catch (error) {
                    console.error('Failed to load users:', error);
                    this.users = [];
                    this.showAlert('Failed to load users. Please try refreshing the page.', 'danger');
                }
            },

            openUserModal(user = null) {
                if (user) {
                    this.userForm = {
                        id: user.id,
                        username: user.username,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role,
                        isActive: user.isActive,
                        password: ''
                    };
                } else {
                    this.userForm = {
                        id: null,
                        username: '',
                        fullName: '',
                        email: '',
                        role: 'RegularUser',
                        isActive: true,
                        password: ''
                    };
                }

                if (!this.userModal) {
                    const modalEl = document.getElementById('userModal');
                    if (modalEl && typeof bootstrap !== 'undefined' && bootstrap && bootstrap.Modal && (typeof bootstrap.Modal === 'object' || typeof bootstrap.Modal === 'function')) {
                        try {
                            this.userModal = (bootstrap.Modal.getOrCreateInstance
                                ? bootstrap.Modal.getOrCreateInstance(modalEl)
                                : new bootstrap.Modal(modalEl));
                        } catch (e) {
                            console.error('Failed to initialize user modal:', e);
                            this.userModal = null;
                        }
                    }
                }

                if (this.userModal) {
                    try { this.userModal.show(); } catch (e) { console.error('Failed to show user modal:', e); }
                }
            },

            async saveUser() {
                try {
                    if (!this.userForm.username?.trim() || !this.userForm.fullName?.trim() || !this.userForm.email?.trim()) {
                        this.showAlert('Username, full name, and email are required', 'danger');
                        return;
                    }

                    if (!this.userForm.id && !this.userForm.password) {
                        this.showAlert('Password is required for new users', 'danger');
                        return;
                    }

                    if (this.userForm.password && this.userForm.password.length < 6) {
                        this.showAlert('Password must be at least 6 characters long', 'danger');
                        return;
                    }

                    const method = this.userForm.id ? 'PUT' : 'POST';
                    const url = this.userForm.id
                        ? `${API_BASE}/users/${this.userForm.id}`
                        : `${API_BASE}/users`;

                    // Convert role string to enum value
                    const getRoleValue = (roleString) => {
                        switch (roleString) {
                            case 'RegularUser': return 1;
                            case 'Editor': return 2;
                            case 'Admin': return 3;
                            default: return 1; // Default to RegularUser
                        }
                    };

                    let payload;
                    if (method === 'POST') {
                        payload = {
                            username: this.userForm.username.trim(),
                            password: this.userForm.password,
                            fullName: this.userForm.fullName.trim(),
                            email: this.userForm.email.trim(),
                            role: getRoleValue(this.userForm.role)
                        };
                    } else {
                        payload = {
                            fullName: this.userForm.fullName.trim(),
                            email: this.userForm.email.trim(),
                            role: getRoleValue(this.userForm.role),
                            isActive: this.userForm.isActive
                        };
                        if (this.userForm.password) {
                            payload.newPassword = this.userForm.password;
                        }
                    }

                    await this.apiCall(url, {
                        method,
                        body: JSON.stringify(payload)
                    });

                    this.showAlert(`User ${this.userForm.id ? 'updated' : 'created'} successfully`, 'success');
                    if (this.userModal) {
                        this.userModal.hide();
                    }
                    await this.loadUsers();
                } catch (error) {
                    console.error('Failed to save user:', error);
                    this.showAlert(error.message || 'Failed to save user', 'danger');
                }
            },

            async deleteUser(id) {
                if (!confirm('Are you sure you want to delete this user?')) return;

                try {
                    await this.apiCall(`${API_BASE}/users/${id}`, {method: 'DELETE'});
                    this.showAlert('User deleted successfully', 'success');
                    await this.loadUsers();
                } catch (error) {
                    console.error('Failed to delete user:', error);
                    this.showAlert(error.message || 'Failed to delete user', 'danger');
                }
            },

            getRoleColor(role) {
                switch (role) {
                    case 'Admin':
                        return 'danger';
                    case 'Editor':
                        return 'warning';
                    case 'RegularUser':
                    default:
                        return 'info';
                }
            },

            showAlert(message, type = 'info') {
                this.alert = {
                    show: true,
                    message,
                    type
                };

                setTimeout(() => {
                    this.alert.show = false;
                }, 5000);
            }
        }
    });

    // Mount the Vue app
    console.log('Mounting Vue app...');
    try {
        app.mount('#app');
        console.log('Vue app mounted successfully');
    } catch (error) {
        console.error('Failed to mount Vue app:', error);
        const loadingScreen = document.getElementById('loading-screen');
        const authErrorScreen = document.getElementById('auth-error-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (authErrorScreen) authErrorScreen.style.display = 'flex';
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);
    }

});
