/**
 * Клиентский модуль управления корзиной MotoPuzzle.
 * Взаимодействует с /api/cart и обновляет интерфейс (бейдж, мини-корзину, страницу корзины).
 */

/**
 * Очистка форматирования цены (удаление &nbsp;, неразрывных пробелов, нормализация валюты)
 */
export function cleanPrice(price) {
	if (!price) return '';
	return String(price)
		.replace(/&nbsp;/gi, ' ')
		.replace(/\u00a0/g, ' ')
		.replace(/&#8381;/gi, '₽')
		.replace(/&times;/gi, '×')
		.replace(/\s+/g, ' ')
		.trim();
}

export const cart = {
	state: null,
	isLoading: false,

	/**
	 * Получить текущую корзину
	 */
	async fetchCart() {
		try {
			const res = await fetch('/api/cart');
			const data = await res.json();
			if (data.success && data.cart) {
				this.state = data.cart;
				this.updateUI();
				return data.cart;
			}
		} catch (e) {
			console.error('[Cart] Ошибка загрузки корзины:', e);
		}
		return null;
	},

	/**
	 * Проверить, находится ли товар уже в корзине
	 */
	isItemInCart(productId) {
		const items = this.state?.contents?.nodes || [];
		const targetId = parseInt(productId, 10);
		return items.some((item) => {
			const id = item.product?.node?.databaseId;
			return id === targetId;
		});
	},

	/**
	 * Добавить товар в корзину
	 */
	async add(productId, quantity = 1) {
		const targetId = parseInt(productId, 10);
		// Если товар уже в корзине, открываем корзину без повторного запроса
		if (this.isItemInCart(targetId)) {
			this.openOffcanvasCart();
			return this.state;
		}

		this.isLoading = true;
		try {
			const res = await fetch('/api/cart', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ productId: targetId, quantity }),
			});
			const data = await res.json();
			if (data.success && data.cart) {
				this.state = data.cart;
				this.updateUI();
				this.openOffcanvasCart();
				window.dispatchEvent(new CustomEvent('cart:updated', { detail: data.cart }));
				return data.cart;
			} else {
				console.warn('[Cart] Ошибка добавления:', data.error);
				this.openOffcanvasCart();
			}
		} catch (e) {
			console.error('[Cart] Ошибка добавления:', e);
		} finally {
			this.isLoading = false;
			this.updateButtonStates();
		}
		return null;
	},

	/**
	 * Изменить количество товара
	 */
	async updateQuantity(key, quantity) {
		if (quantity <= 0) {
			return this.remove(key);
		}
		this.isLoading = true;
		try {
			const res = await fetch('/api/cart', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key, quantity }),
			});
			const data = await res.json();
			if (data.success && data.cart) {
				this.state = data.cart;
				this.updateUI();
				window.dispatchEvent(new CustomEvent('cart:updated', { detail: data.cart }));
				return data.cart;
			}
		} catch (e) {
			console.error('[Cart] Ошибка обновления количества:', e);
		} finally {
			this.isLoading = false;
		}
		return null;
	},

	/**
	 * Удалить товар из корзины
	 */
	async remove(key) {
		this.isLoading = true;
		try {
			const res = await fetch(`/api/cart?key=${encodeURIComponent(key)}`, {
				method: 'DELETE',
			});
			const data = await res.json();
			if (data.success && data.cart) {
				this.state = data.cart;
				this.updateUI();
				window.dispatchEvent(new CustomEvent('cart:updated', { detail: data.cart }));
				return data.cart;
			}
		} catch (e) {
			console.error('[Cart] Ошибка удаления:', e);
		} finally {
			this.isLoading = false;
		}
		return null;
	},

	/**
	 * Открыть выезжающую панель корзины
	 */
	openOffcanvasCart() {
		const toggle = document.querySelector('[data-offcanvas-toggle="cart-panel"]');
		if (toggle) {
			toggle.click();
		}
	},

	/**
	 * Обновить все бейджи и мини-корзину
	 */
	updateUI() {
		const cart = this.state;
		const count = cart?.contents?.itemCount || 0;
		const total = cleanPrice(cart?.total || '0 ₽');

		// Обновляем бейджи количества
		document.querySelectorAll('.cart-total .badge, [data-cart-badge]').forEach((badge) => {
			badge.textContent = String(count);
			badge.style.display = count > 0 ? 'flex' : 'none';
		});

		// Обновляем сумму
		document.querySelectorAll('.cart-total .price, [data-cart-price]').forEach((priceEl) => {
			priceEl.textContent = count > 0 ? total : '0 ₽';
		});

		// Обновляем состояние кнопок добавления в корзину
		this.updateButtonStates();

		// Рендерим мини-корзину в offcanvas
		this.renderMiniCart();
	},

	/**
	 * Обновить состояние кнопок [data-add-to-cart] на странице
	 */
	updateButtonStates() {
		const items = this.state?.contents?.nodes || [];
		const cartProductIds = new Set(
			items.map((item) => item.product?.node?.databaseId).filter(Boolean)
		);

		document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
			const rawId = btn.getAttribute('data-add-to-cart');
			const productId = parseInt(rawId, 10);

			if (cartProductIds.has(productId)) {
				btn.classList.add('is-in-cart');
				const textEl = btn.querySelector('.btn-text');
				if (textEl) {
					textEl.textContent = 'В КОРЗИНЕ';
				} else {
					btn.textContent = 'В КОРЗИНЕ';
				}
			} else {
				btn.classList.remove('is-in-cart');
				const textEl = btn.querySelector('.btn-text');
				if (textEl) {
					textEl.textContent = 'В КОРЗИНУ';
				} else {
					btn.textContent = 'В КОРЗИНУ';
				}
			}
		});
	},

	/**
	 * Отрендерить содержимое выезжающей панели корзины
	 */
	renderMiniCart() {
		const panel = document.getElementById('cart-panel');
		if (!panel) return;

		const body = panel.querySelector('.offcanvas-body') || panel;
		const cart = this.state;
		const items = cart?.contents?.nodes || [];

		if (!items || items.length === 0) {
			body.innerHTML = `
				<div class="mini-cart-empty">
					<div class="empty-icon">
						<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
							<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
							<line x1="3" y1="6" x2="21" y2="6"></line>
							<path d="M16 10a4 4 0 0 1-8 0"></path>
						</svg>
					</div>
					<p class="empty-text">Ваша корзина пока пуста</p>
					<a href="/shop" class="btn-continue-shopping" data-close-offcanvas>Перейти в каталог</a>
				</div>
			`;
			return;
		}

		let itemsHtml = items.map((item) => {
			const prod = item.product?.node;
			const rawImg = prod?.image?.sourceUrl || '/placeholder.svg';
			const imageSrc = (rawImg.startsWith('http://') || rawImg.startsWith('https://'))
				? `/_image?href=${encodeURIComponent(rawImg)}&w=120&h=120&f=webp&q=80`
				: rawImg;
			const price = cleanPrice(item.total || prod?.price || '');

			return `
				<div class="mini-cart-item" data-cart-key="${item.key}">
					<a href="${prod?.uri || '#'}" class="mini-cart-item-img">
						<img src="${imageSrc}" alt="${prod?.name || ''}" width="60" height="60" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/placeholder.svg';" />
					</a>
					<div class="mini-cart-item-info">
						<a href="${prod?.uri || '#'}" class="mini-cart-item-title">${prod?.name || 'Товар'}</a>
						<div class="mini-cart-item-price">${price}</div>
					</div>
					<button type="button" class="mini-cart-remove" data-cart-remove="${item.key}" title="Удалить из корзины" aria-label="Удалить из корзины">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
			`;
		}).join('');

		body.innerHTML = `
			<div class="mini-cart-wrapper">
				<div class="mini-cart-items-list">
					${itemsHtml}
				</div>
				<div class="mini-cart-footer">
					<div class="mini-cart-subtotal">
						<span>Подытог:</span>
						<span class="subtotal-amount">${cleanPrice(cart.total)}</span>
					</div>
					<div class="mini-cart-buttons">
						<a href="/checkout" class="btn-checkout">Оформить заказ</a>
						<a href="/cart" class="btn-view-cart">В КОРЗИНУ</a>
					</div>
				</div>
			</div>
		`;
	},
};

/**
 * Инициализация обработчиков событий корзины
 */
export function initCart() {
	// 1. Загружаем текущее состояние корзины и обновляем кнопки
	cart.fetchCart().then(() => {
		cart.updateButtonStates();
	});

	// 2. Делегирование кликов по кнопкам добавления в корзину (все товары уникальны, добавляются по 1 шт.)
	document.addEventListener('click', (e) => {
		const target = e.target.closest('[data-add-to-cart]');
		if (target) {
			e.preventDefault();
			const productId = parseInt(target.getAttribute('data-add-to-cart'), 10);

			if (productId) {
				// Если товар уже в корзине - просто открываем выезжающую панель
				if (target.classList.contains('is-in-cart') || cart.isItemInCart(productId)) {
					cart.openOffcanvasCart();
					return;
				}

				target.disabled = true;
				target.classList.add('loading');

				cart.add(productId, 1).finally(() => {
					target.disabled = false;
					target.classList.remove('loading');
					cart.updateButtonStates();
				});
			}
			return;
		}

		// 3. Удаление товара из корзины и выезжающей мини-корзины с подтверждением alert/confirm
		const removeBtn = e.target.closest('[data-cart-remove]');
		if (removeBtn) {
			e.preventDefault();
			const key = removeBtn.getAttribute('data-cart-remove');
			if (key) {
				const confirmed = window.confirm('Вы уверены, что хотите удалить товар из корзины?');
				if (!confirmed) return;

				const itemEl = removeBtn.closest('[data-cart-row], .mini-cart-item');
				if (itemEl) {
					itemEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
					itemEl.style.opacity = '0.4';
					itemEl.style.pointerEvents = 'none';
				}

				cart.remove(key);
			}
			return;
		}
	});
}

// Делаем доступным глобально
if (typeof window !== 'undefined') {
	window.MotoCart = cart;
}
