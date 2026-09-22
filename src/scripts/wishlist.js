/**
 * Модуль управления списком избранного (Wishlist)
 * - Для неавторизованных: хранит в localStorage ('motopuzzle_wishlist')
 * - Для авторизованных: синхронизирует с сервером WordPress через /api/wishlist
 */

const STORAGE_KEY_GUEST = 'motopuzzle_wishlist';
const STORAGE_KEY_AUTH = 'motopuzzle_wishlist_auth';

function cleanPrice(price) {
	if (!price) return '';
	return decodeURIComponent(price)
		.replace(/&nbsp;/gi, ' ')
		.replace(/\u00a0/g, ' ')
		.replace(/&#8381;/gi, '₽')
		.replace(/&times;/gi, '×')
		.replace(/\s+/g, ' ')
		.trim();
}

export const wishlist = {
	isAuth: false,
	items: [],
	isLoaded: false,

	getStorageKey() {
		return this.isAuth ? STORAGE_KEY_AUTH : STORAGE_KEY_GUEST;
	},

	/**
	 * Получить все товары из избранного (из памяти или localStorage)
	 */
	getItems() {
		if (this.isLoaded) {
			return this.items;
		}
		try {
			const key = this.getStorageKey();
			const data = localStorage.getItem(key);
			this.items = data ? JSON.parse(data) : [];
		} catch (e) {
			this.items = [];
		}
		return this.items;
	},

	/**
	 * Синхронизация с сервером для авторизованного пользователя
	 */
	async syncWithServer() {
		try {
			const res = await fetch('/api/wishlist');
			const data = await res.json();

			if (data.authenticated) {
				this.isAuth = true;
				let serverItems = Array.isArray(data.items) ? data.items : [];

				// Если у гостя были товары в localStorage до авторизации — объединяем их
				const guestData = localStorage.getItem(STORAGE_KEY_GUEST);
				if (guestData) {
					try {
						const guestItems = JSON.parse(guestData);
						if (Array.isArray(guestItems) && guestItems.length > 0) {
							const existingIds = new Set(serverItems.map((i) => i.databaseId));
							let hasNew = false;
							for (const g of guestItems) {
								if (!existingIds.has(g.databaseId)) {
									serverItems.push(g);
									hasNew = true;
								}
							}
							if (hasNew) {
								this.saveServerItems(serverItems);
							}
							localStorage.removeItem(STORAGE_KEY_GUEST);
						}
					} catch (err) {}
				}

				this.items = serverItems;
				this.isLoaded = true;
				try {
					localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(serverItems));
				} catch (e) {}

				this.updateBadges();
				this.updateButtonStates();
				window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { items: this.items } }));
			} else {
				this.isAuth = false;
				this.isLoaded = true;
				const guestData = localStorage.getItem(STORAGE_KEY_GUEST);
				this.items = guestData ? JSON.parse(guestData) : [];
				this.updateBadges();
				this.updateButtonStates();
				window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { items: this.items } }));
			}
		} catch (e) {
			console.warn('[Wishlist] Ошибка синхронизации с сервером:', e);
		}
	},

	/**
	 * Фоновая отправка изменений на сервер для авторизованного пользователя
	 */
	async saveServerItems(items) {
		try {
			await fetch('/api/wishlist', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items }),
			});
		} catch (e) {
			console.error('[Wishlist] Ошибка записи на сервер:', e);
		}
	},

	/**
	 * Сохранить товары в избранное
	 */
	saveItems(items) {
		this.items = items;
		this.isLoaded = true;

		try {
			const key = this.getStorageKey();
			localStorage.setItem(key, JSON.stringify(items));
		} catch (e) {
			console.error('[Wishlist] Ошибка записи в localStorage:', e);
		}

		if (this.isAuth) {
			this.saveServerItems(items);
		}

		this.updateBadges();
		this.updateButtonStates();
		window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { items } }));
	},

	/**
	 * Проверить, находится ли товар в избранном
	 */
	has(productId) {
		const id = parseInt(productId, 10);
		if (!id) return false;
		return this.getItems().some((item) => item.databaseId === id);
	},

	/**
	 * Добавить товар в избранное
	 */
	add(item) {
		const id = parseInt(item.databaseId, 10);
		if (!id) return;

		const items = [...this.getItems()];
		if (!items.some((i) => i.databaseId === id)) {
			items.push({
				databaseId: id,
				name: item.name || 'Товар',
				price: cleanPrice(item.price),
				image: item.image || '',
				uri: item.uri || '#',
			});
			this.saveItems(items);
		}
	},

	/**
	 * Удалить товар из избранного
	 */
	remove(productId) {
		const id = parseInt(productId, 10);
		if (!id) return;

		const items = this.getItems().filter((item) => item.databaseId !== id);
		this.saveItems(items);
	},

	/**
	 * Переключить наличие товара в избранном
	 */
	toggle(item) {
		const id = parseInt(item.databaseId, 10);
		if (this.has(id)) {
			this.remove(id);
			return false;
		} else {
			this.add(item);
			return true;
		}
	},

	/**
	 * Количество товаров в избранном
	 */
	getCount() {
		return this.getItems().length;
	},

	/**
	 * Обновить счетчики в шапке
	 */
	updateBadges() {
		const count = this.getCount();
		document.querySelectorAll('.wishlist-count-badge').forEach((badge) => {
			badge.textContent = count.toString();
			if (count > 0) {
				badge.style.display = '';
			} else {
				badge.style.display = 'none';
			}
		});
	},

	/**
	 * Обновить состояние кнопок [data-wishlist-add] на странице
	 */
	updateButtonStates() {
		const items = this.getItems();
		const ids = new Set(items.map((i) => i.databaseId));

		document.querySelectorAll('[data-wishlist-add]').forEach((btn) => {
			const id = parseInt(btn.getAttribute('data-wishlist-add'), 10);
			if (ids.has(id)) {
				btn.classList.add('is-active');
				btn.setAttribute('aria-label', 'Удалить из избранного');
			} else {
				btn.classList.remove('is-active');
				btn.setAttribute('aria-label', 'Добавить в избранное');
			}
		});
	},
};

/**
 * Инициализация обработчиков событий для избранного
 */
export function initWishlist() {
	// Первичное мгновенное обновление из локального кэша
	wishlist.getItems();
	wishlist.updateBadges();
	wishlist.updateButtonStates();

	// Проверяем авторизацию и синхронизируем с сервером
	wishlist.syncWithServer();

	// Слушаем клики по кнопкам добавления/удаления из избранного
	document.addEventListener('click', (e) => {
		const btn = e.target.closest('[data-wishlist-add]');
		if (!btn) return;

		e.preventDefault();
		e.stopPropagation();

		const id = parseInt(btn.getAttribute('data-wishlist-add'), 10);
		if (!id) return;

		// Если мы находимся на странице /wishlist — удаление с подтверждением
		const isWishlistPage = window.location.pathname.startsWith('/wishlist') || btn.hasAttribute('data-wishlist-remove-btn');
		if (isWishlistPage) {
			const confirmed = window.confirm('Вы уверены, что хотите удалить товар из избранного?');
			if (!confirmed) return;

			wishlist.remove(id);

			// Анимация плавного удаления карточки со страницы
			const card = btn.closest('.wishlist-card, .product-card');
			if (card) {
				card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
				card.style.opacity = '0';
				card.style.transform = 'scale(0.95)';
				setTimeout(() => {
					card.remove();

					// Если товаров не осталось — показываем блок пустой страницы
					const grid = document.getElementById('wishlist-grid');
					if (grid && grid.children.length === 0) {
						const emptyBox = document.getElementById('wishlist-empty-state');
						if (emptyBox) emptyBox.style.display = 'block';
						grid.style.display = 'none';
					}
				}, 260);
			}
			return;
		}

		// Обычная страница (каталог, карточка товара): toggle
		const itemData = {
			databaseId: id,
			name: btn.getAttribute('data-product-name') || '',
			price: btn.getAttribute('data-product-price') || '',
			image: btn.getAttribute('data-product-image') || '',
			uri: btn.getAttribute('data-product-uri') || '',
		};

		wishlist.toggle(itemData);
	});

	// Синхронизация между вкладками браузера
	window.addEventListener('storage', (e) => {
		if (e.key === STORAGE_KEY_GUEST || e.key === STORAGE_KEY_AUTH) {
			wishlist.isLoaded = false;
			wishlist.getItems();
			wishlist.updateBadges();
			wishlist.updateButtonStates();
		}
	});
}

if (typeof window !== 'undefined') {
	window.MotoWishlist = wishlist;
}
