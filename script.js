document.addEventListener('DOMContentLoaded', () => {
    // The API_URL is now relative, so it works on any domain.
    const API_URL = '/api';

    // --- DATA ---
    const fixedMenuItems = [
        { name: '原味', price: 50 },
        { name: '卡士達', price: 60 },
        { name: 'Oreo', price: 60 },
        { name: '起司', price: 65 },
        { name: 'Oreo卡士達', price: 65 },
        { name: '玉米起司', price: 70 },
        { name: '黑糖QQ', price: 65 },
        { name: '巧克力', price: 60 },
    ];

    const customFlavors = [
        { name: '原味', price: 10 },
        { name: '卡士達', price: 12 },
        { name: 'Oreo', price: 12 },
        { name: '起司', price: 13 },
        { name: 'Oreo卡士達', price: 13 },
        { name: '玉米起司', price: 14 },
        { name: '黑糖QQ', price: 13 },
        { name: '巧克力', price: 12 },
    ];

    let cart = [];
    let currentUser = null; // Can be user object or { mode: 'guest' }

    // --- DOM ELEMENTS ---
    const authForms = document.getElementById('auth-forms');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const userInfo = document.getElementById('user-info');
    const mainContent = document.getElementById('main-content');

    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const guestModeBtn = document.getElementById('guest-mode-btn');
    const userDisplayName = document.getElementById('user-display-name');

    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    const historyModal = document.getElementById('history-modal');
    const showHistoryBtn = document.getElementById('show-history-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const orderHistoryList = document.getElementById('order-history-list');
    
    const checkoutBtn = document.getElementById('checkout-btn');
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    const fixedMenuContainer = document.getElementById('fixed-menu');
    const flavorOptionsContainer = document.getElementById('flavor-options');

    // --- STATE MANAGEMENT ---
    function checkLoginState() {
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        if (user && user.userId) {
            currentUser = user;
            showLoggedInView();
        } else {
            showLoggedOutView();
        }
    }

    function showLoggedInView() {
        authForms.classList.add('hidden');
        userInfo.classList.remove('hidden');
        mainContent.classList.remove('hidden');
        userDisplayName.textContent = currentUser.username;
        showHistoryBtn.classList.remove('hidden');
        logoutBtn.textContent = '登出';
    }

    function showGuestView() {
        currentUser = { mode: 'guest' };
        authForms.classList.add('hidden');
        userInfo.classList.remove('hidden');
        mainContent.classList.remove('hidden');
        userDisplayName.textContent = '訪客';
        showHistoryBtn.classList.add('hidden');
        logoutBtn.textContent = '返回登入';
    }

    function showLoggedOutView() {
        authForms.classList.remove('hidden');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        userInfo.classList.add('hidden');
        mainContent.classList.add('hidden');
        currentUser = null;
        sessionStorage.removeItem('currentUser');
        cart = [];
        renderCart();
        logoutBtn.textContent = '登出';
    }

    // --- API CALLS ---
    async function apiCall(endpoint, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(`${API_URL}${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            alert(`操作失敗: ${error.message}`);
            throw error;
        }
    }

    // --- EVENT HANDLERS ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    guestModeBtn.addEventListener('click', showGuestView);

    registerBtn.addEventListener('click', async () => {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        await apiCall('/register', 'POST', { username, password });
        alert('註冊成功！請登入。');
        showLoginLink.click();
    });

    loginBtn.addEventListener('click', async () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const data = await apiCall('/login', 'POST', { username, password });
        sessionStorage.setItem('currentUser', JSON.stringify(data));
        checkLoginState();
    });

    logoutBtn.addEventListener('click', () => {
        showLoggedOutView();
    });

    checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) {
            alert('購物車是空的！');
            return;
        }
        
        if (currentUser && currentUser.userId) {
            const orderData = {
                userId: currentUser.userId,
                cart: cart,
                totalPrice: parseFloat(totalPriceElement.textContent)
            };
            await apiCall('/orders', 'POST', orderData);
            alert('訂單已成功送出並儲存！');
        } else {
            alert(`總金額: ${totalPriceElement.textContent} 元，訂單已送出！(訪客模式，訂單不會被儲存)`);
        }

        cart = [];
        renderCart();
    });

    showHistoryBtn.addEventListener('click', async () => {
        if (!currentUser || !currentUser.userId) return;
        const orders = await apiCall(`/orders/${currentUser.userId}`);
        renderOrderHistory(orders);
        historyModal.classList.remove('hidden');
    });

    closeHistoryBtn.addEventListener('click', () => historyModal.classList.add('hidden'));

    // --- RENDER FUNCTIONS ---
    function renderFixedMenu() {
        fixedMenuContainer.innerHTML = fixedMenuItems.map(item => `
            <div class="menu-item" data-name="${item.name}" data-price="${item.price}">
                <div class="menu-item-info">
                    <h3>${item.name}</h3>
                    <span class="price">${item.price} 元/份</span>
                </div>
                <div class="quantity-control">
                    <button class="quantity-btn" data-action="decrement">-</button>
                    <input type="number" value="0" min="0" readonly>
                    <button class="quantity-btn" data-action="increment">+</button>
                </div>
            </div>
        `).join('');
    }

    function renderCustomFlavors() {
        flavorOptionsContainer.innerHTML = customFlavors.map(flavor => `
            <div class="flavor-item">
                <div>
                    <label>${flavor.name}</label>
                    <span class="price">(${flavor.price}元/顆)</span>
                </div>
                <div class="quantity-control">
                    <button class="quantity-btn" data-action="decrement">-</button>
                    <input type="number" value="0" min="0" data-name="${flavor.name}" data-price="${flavor.price}" readonly>
                    <button class="quantity-btn" data-action="increment">+</button>
                </div>
            </div>
        `).join('');
    }

    function renderCart() {
        cartItemsContainer.innerHTML = '';
        let totalCartPrice = 0;
        cart.forEach(item => {
            const itemTotalPrice = item.price * item.quantity;
            totalCartPrice += itemTotalPrice;
            const cartItem = document.createElement('li');
            cartItem.innerHTML = `
                <span class="item-details">${item.name} (x${item.quantity})</span>
                <span class="item-price">${itemTotalPrice} 元</span>
            `;
            cartItemsContainer.appendChild(cartItem);
        });
        totalPriceElement.textContent = totalCartPrice;
    }

    function renderOrderHistory(orders) {
        if (orders.length === 0) {
            orderHistoryList.innerHTML = '<p>您沒有任何歷史訂單。</p>';
            return;
        }
        orderHistoryList.innerHTML = orders.map(order => `
            <div class="order-record">
                <div class="order-header">
                    <span>訂單日期: ${new Date(order.timestamp).toLocaleString()}</span>
                    <span>總金額: ${order.total_price} 元</span>
                </div>
                <ul>
                    ${JSON.parse(order.order_details).map(item => `<li>${item.name} (x${item.quantity}) - ${item.price * item.quantity} 元</li>`).join('')}
                </ul>
            </div>
        `).join('');
    }

    // --- INITIALIZATION ---
    renderFixedMenu();
    renderCustomFlavors();
    checkLoginState();
});