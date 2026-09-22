/**
 * Модуль управления списком избранного (Wishlist)
 * Хранит избранные товары в localStorage браузера.
 */

const STORAGE_KEY = 'motopuzzle_wishlist';

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
	/**
	 * Получить все товары из избранного
	 * @returns {Array<{databaseId: number, name: string, price: string, image: string, uri: string}>}
	 */
	getItems() {
		try {
			const data = localStorage.getItem(STORAGE_KEY);
			return data ? JSON.parse(data) : [];
		} catch (e) {
			console.error('[Wishlist] Ошибка чтения localStorage:', e);
			return [];
		}
	},

	/**
	 * Сохранить товары в избранное
	 */
	saveItems(items) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
			this.updateBadges();
			this.updateButtonStates();
			window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { items } }));
		} catch (e) {
			console.error('[Wishlist] Ошибка записи в localStorage:', e);
		}
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

		const items = this.getItems();
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
	// Первичное обновление бейджей и состояния кнопок
	wishlist.updateBadges();
	wishlist.updateButtonStates();

	// Слушаем клики по кнопкам добавления/удаления из избранного
	document.addEventListener('click', (e) => {
		const btn = e.target.closest('[data-wishlist-add]');
		if (!btn) return;

		e.preventDefault();
		e.stopPropagation();

		const id = parseInt(btn.getAttribute('data-wishlist-add'), 10);
		if (!id) return;

		// Если мы находимся на странице /wishlist — удаление с предупреждением alert/confirm
		const isWishlistPage = window.location.pathname.startsWith('/wishlist') || btn.hasAttribute('data-wishlist-remove-btn');
		if (isWishlistPage) {
			const confirmed = window.confirm('Вы уверены, что хотите удалить товар из избранного?');
			if (!confirmed) return;

			wishlist.remove(id);

			// Анимация удаления карточки со страницы
			const card = btn.closest('.wishlist-card, .product-card');
			if (card) {
				card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
				card.style.opacity = '0';
				card.style.transform = 'scale(0.9)';
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
		if (e.key === STORAGE_KEY) {
			wishlist.updateBadges();
			wishlist.updateButtonStates();
		}
	});
}

if (typeof window !== 'undefined') {
	window.MotoWishlist = wishlist;
}
