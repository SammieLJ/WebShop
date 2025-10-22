const { createApp } = Vue;

const API_BASE = '/api';

createApp({
    data() {
        return {
            isLoading: true,
            currentView: 'articles',
            articles: [], // Initialize as empty array to prevent undefined errors
            subscriptions: [],
            orders: [],
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
            selectedOrder: null,
            articleModal: null,
            subscriptionModal: null,
            orderDetailsModal: null
        };
    },
    mounted() {
        // Initialize Bootstrap modals
        this.articleModal = new bootstrap.Modal(document.getElementById('articleModal'));
        this.subscriptionModal = new bootstrap.Modal(document.getElementById('subscriptionModal'));
        this.orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));

        // Load initial data
        Promise.all([
            this.loadArticles(),
            this.loadSubscriptions(),
            this.loadOrders()
        ]).finally(() => {
            this.isLoading = false;
        });
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
            this.articleModal.show();
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
                this.articleModal.hide();
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
            this.subscriptionModal.show();
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
                this.subscriptionModal.hide();
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
            this.orderDetailsModal.show();
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
    }
}).mount('#app');
