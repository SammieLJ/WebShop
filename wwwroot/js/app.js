// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, initializing Vue app...');

    // Check if Vue is available
    if (typeof Vue === 'undefined') {
        console.error('Vue.js is not loaded!');
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('auth-error-screen').style.display = 'flex';
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);
        return;
    }

    console.log('Vue.js loaded successfully');

    const { createApp } = Vue;
    const API_BASE = '/api';

    const app = createApp({
        data() {
            return {
                isLoading: true,
                isReady: false,
                currentView: 'articles',
                currentUser: null,
                articles: [], // Initialize as empty array to prevent undefined errors
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
                    supplierEmail: ''
                },
                subscriptionForm: {
                    id: null,
                    name: '',
                    description: '',
                    price: 0,
                    includesPhysicalMagazine: false
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
            console.log('Vue app mounted, starting authentication check...');

            // Show loading screen
            document.getElementById('loading-screen').style.display = 'flex';
            document.getElementById('app').style.display = 'none';

            try {
                // Check authentication first
                console.log('Calling checkAuth...');
                await this.checkAuth();
                console.log('checkAuth completed, currentUser:', this.currentUser);

                if (!this.currentUser) {
                    console.log('User not authenticated, showing error screen');
                    // Not authenticated, show error screen
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('auth-error-screen').style.display = 'flex';

                    // Auto-redirect after 3 seconds
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 3000);
                    return;
                }

                // User is authenticated, show the app
                console.log('User authenticated, showing main app');
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('app').style.display = 'block';

                // Set ready state and wait for DOM to render
                this.isReady = true;

                // Initialize modals after a short delay to ensure DOM is ready
                setTimeout(() => {
                    this.initializeModals();
                }, 100);

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
                // Show error screen instead of redirecting immediately
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('auth-error-screen').style.display = 'flex';

                // Auto-redirect after 3 seconds
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 3000);
            }
        },
        methods: {
            // API Calls
            async apiCall(url, options = {}) {
                try {
                    const response = await fetch(url, {
                        ...options,
                        headers: {
                            'Content-Type': 'application/json',
                            ...options.headers
                        }
                    });

                    // Read response text safely (handles empty body and non-JSON)
                    const text = await response.text();

                    // If request failed, try to extract error details
                    if (!response.ok) {
                        let errorMessage = 'Request failed';
                        if (text) {
                            try {
                                const errorData = JSON.parse(text);
                                // ModelState validation errors from ASP.NET are in errorData.errors
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
                                // Not JSON
                                errorMessage = text;
                            }
                        } else {
                            errorMessage = `HTTP ${response.status} ${response.statusText}`;
                        }

                        throw new Error(errorMessage);
                    }

                    // Successful response: if empty body return null else parse JSON
                    if (!text) return null;

                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        // Not JSON - return raw text
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
                    this.articles = []; // Ensure articles is always an array
                    this.showAlert('Failed to load articles. Please try refreshing the page.', 'danger');
                }
            },

            openArticleModal(article = null) {
                if (article) {
                    this.articleForm = { ...article };
                } else {
                    this.articleForm = {
                        id: null,
                        name: '',
                        description: '',
                        price: 0,
                        supplierEmail: ''
                    };
                }

                // Lazy initialize modal if not already done
                if (!this.articleModal) {
                    const modalEl = document.getElementById('articleModal');
                    if (modalEl) {
                        this.articleModal = new bootstrap.Modal(modalEl);
                    }
                }

                if (this.articleModal) {
                    this.articleModal.show();
                }
            },

            async saveArticle() {
                try {
                    // Validate form data
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

                    // IMPORTANT: when creating (POST) don't send `id: null` — remove it to avoid JSON -> int binding errors
                    // Build explicit payload so we never include `id` for POST and ensure correct types
                    let payload;
                    if (method === 'POST') {
                        payload = {
                            name: articleData.name,
                            description: articleData.description,
                            price: Number(articleData.price),
                            supplierEmail: articleData.supplierEmail
                        };
                    } else {
                        // PUT: include id as number
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
                    await this.apiCall(`${API_BASE}/articles/${id}`, { method: 'DELETE' });
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
                    this.subscriptions = []; // Ensure subscriptions is always an array
                    this.showAlert('Failed to load subscription packages. Please try refreshing the page.', 'danger');
                }
            },

            openSubscriptionModal(subscription = null) {
                if (subscription) {
                    this.subscriptionForm = { ...subscription };
                } else {
                    this.subscriptionForm = {
                        id: null,
                        name: '',
                        description: '',
                        price: 0,
                        includesPhysicalMagazine: false
                    };
                }

                // Lazy initialize modal if not already done
                if (!this.subscriptionModal) {
                    const modalEl = document.getElementById('subscriptionModal');
                    if (modalEl) {
                        this.subscriptionModal = new bootstrap.Modal(modalEl);
                    }
                }

                if (this.subscriptionModal) {
                    this.subscriptionModal.show();
                }
            },

            async saveSubscription() {
                try {
                    // Validate form data
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

                    // Build explicit payload
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
                    await this.apiCall(`${API_BASE}/subscriptionpackages/${id}`, { method: 'DELETE' });
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
                    this.orders = []; // Ensure orders is always an array
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
                    await this.apiCall(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
                    this.showAlert('Order deleted successfully', 'success');
                    await this.loadOrders();
                } catch (error) {
                    console.error('Failed to delete order:', error);
                    this.showAlert(error.message || 'Failed to delete order', 'danger');
                }
            },

            viewOrderDetails(order) {
                this.selectedOrder = { ...order };

                // Lazy initialize modal if not already done
                if (!this.orderDetailsModal) {
                    const modalEl = document.getElementById('orderDetailsModal');
                    if (modalEl) {
                        this.orderDetailsModal = new bootstrap.Modal(modalEl);
                    }
                }

                if (this.orderDetailsModal) {
                    this.orderDetailsModal.show();
                }
            },

            async updateOrderStatus(orderId, newStatus) {
                try {
                    await this.apiCall(`${API_BASE}/orders/${orderId}/status`, {
                        method: 'PUT',
                        body: JSON.stringify({ status: newStatus })
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

                // Add selected articles
                this.orderForm.selectedArticles.forEach(articleId => {
                    const article = this.articles.find(a => a.id === articleId);
                    if (article) {
                        total += article.price;
                    }
                });

                // Add selected subscription
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
                try {
                    const articleModalEl = document.getElementById('articleModal');
                    const subscriptionModalEl = document.getElementById('subscriptionModal');
                    const orderDetailsModalEl = document.getElementById('orderDetailsModal');
                    const userModalEl = document.getElementById('userModal');

                    if (articleModalEl) {
                        this.articleModal = new bootstrap.Modal(articleModalEl);
                        console.log('Article modal initialized');
                    }
                    if (subscriptionModalEl) {
                        this.subscriptionModal = new bootstrap.Modal(subscriptionModalEl);
                        console.log('Subscription modal initialized');
                    }
                    if (orderDetailsModalEl) {
                        this.orderDetailsModal = new bootstrap.Modal(orderDetailsModalEl);
                        console.log('Order details modal initialized');
                    }
                    if (userModalEl) {
                        this.userModal = new bootstrap.Modal(userModalEl);
                        console.log('User modal initialized');
                    }

                    console.log('All modals initialized successfully');
                } catch (modalError) {
                    console.error('Failed to initialize modals:', modalError);
                    // Don't fail the app if modals can't be initialized
                }
            },

            // Authentication
            async checkAuth() {
                try {
                    console.log('Making API call to check authentication...');

                    // Simple fetch without using apiCall method to avoid potential issues
                    const response = await fetch(`${API_BASE}/auth/current`);
                    console.log('Auth API response status:', response.status);

                    if (response.ok) {
                        const data = await response.json();
                        console.log('Auth API response data:', data);
                        this.currentUser = data;
                    } else {
                        console.log('Auth API returned non-OK status');
                        this.currentUser = null;
                    }
                } catch (error) {
                    console.log('Auth check failed:', error);
                    this.currentUser = null;
                }
            },

            async logout() {
                try {
                    await this.apiCall(`${API_BASE}/auth/logout`, { method: 'POST' });
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

                // Lazy initialize modal if not already done
                if (!this.userModal) {
                    const modalEl = document.getElementById('userModal');
                    if (modalEl) {
                        this.userModal = new bootstrap.Modal(modalEl);
                    }
                }

                if (this.userModal) {
                    this.userModal.show();
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

                    let payload;
                    if (method === 'POST') {
                        payload = {
                            username: this.userForm.username.trim(),
                            password: this.userForm.password,
                            fullName: this.userForm.fullName.trim(),
                            email: this.userForm.email.trim(),
                            role: this.userForm.role
                        };
                    } else {
                        payload = {
                            fullName: this.userForm.fullName.trim(),
                            email: this.userForm.email.trim(),
                            role: this.userForm.role,
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
                    await this.apiCall(`${API_BASE}/users/${id}`, { method: 'DELETE' });
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

                // Auto-hide after 5 seconds
                setTimeout(() => {
                    this.alert.show = false;
                }, 5000);
            }
        });

    // Mount the Vue app
    console.log('Mounting Vue app...');
    try {
        app.mount('#app');
        console.log('Vue app mounted successfully');
    } catch (error) {
        console.error('Failed to mount Vue app:', error);
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('auth-error-screen').style.display = 'flex';
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);
    }

}); // End of DOMContentLoaded
