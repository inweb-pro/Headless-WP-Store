/**
 * Клиентский модуль управления корзиной MotoPuzzle.
 * Взаимодействует с /api/cart и обновляет интерфейс (бейдж, мини-корзину, страницу корзины).
 */

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
	 * Добавить товар в корзину
	 */
	async add(productId, quantity = 1) {
		this.isLoading = true;
		try {
			const res = await fetch('/api/cart', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ productId, quantity }),
			});
			const data = await res.json();
			if (data.success && data.cart) {
				this.state = data.cart;
				this.updateUI();
				this.openOffcanvasCart();
				window.dispatchEvent(new CustomEvent('cart:updated', { detail: data.cart }));
				return data.cart;
			} else {
				alert(data.error || 'Не удалось добавить товар в корзину');
			}
		} catch (e) {
			console.error('[Cart] Ошибка добавления:', e);
		} finally {
			this.isLoading = false;
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
		const total = cart?.total || '0 ₽';

		// Обновляем бейджи количества
		document.querySelectorAll('.cart-total .badge, [data-cart-badge]').forEach((badge) => {
			badge.textContent = String(count);
			badge.style.display = count > 0 ? 'flex' : 'none';
		});

		// Обновляем сумму
		document.querySelectorAll('.cart-total .price, [data-cart-price]').forEach((priceEl) => {
			priceEl.innerHTML = count > 0 ? total : '0 ₽';
		});

		// Рендерим мини-корзину в offcanvas
		this.renderMiniCart();
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
			const imageSrc = prod?.image?.sourceUrl || '/placeholder.png';
			const price = item.total || prod?.price || '';

			return `
				<div class="mini-cart-item" data-cart-key="${item.key}">
					<a href="${prod?.uri || '#'}" class="mini-cart-item-img">
						<img src="${imageSrc}" alt="${prod?.name || ''}" loading="lazy" />
					</a>
					<div class="mini-cart-item-info">
						<a href="${prod?.uri || '#'}" class="mini-cart-item-title">${prod?.name || 'Товар'}</a>
						<div class="mini-cart-item-price">${price}</div>
						<div class="mini-cart-item-actions">
							<div class="qty-control">
								<button type="button" class="qty-btn" data-cart-dec="${item.key}" data-qty="${item.quantity}">−</button>
								<span class="qty-val">${item.quantity}</span>
								<button type="button" class="qty-btn" data-cart-inc="${item.key}" data-qty="${item.quantity}">+</button>
							</div>
							<button type="button" class="mini-cart-remove" data-cart-remove="${item.key}" title="Удалить">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>
					</div>
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
						<span class="subtotal-amount">${cart.total}</span>
					</div>
					<div class="mini-cart-buttons">
						<a href="/checkout" class="btn-checkout">Оформить заказ</a>
						<a href="/cart" class="btn-view-cart">В корзину</a>
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
	// 1. Загружаем текущее состояние корзины
	cart.fetchCart();

	// 2. Делегирование кликов по кнопкам добавления в корзину
	document.addEventListener('click', (e) => {
		const target = e.target.closest('[data-add-to-cart]');
		if (target) {
			e.preventDefault();
			const productId = target.getAttribute('data-add-to-cart');
			let qty = 1;

			// Если есть инпут количества рядом или по селектору
			const qtyInput = document.querySelector('[data-product-quantity]');
			if (qtyInput) {
				qty = parseInt(qtyInput.value, 10) || 1;
			}

			if (productId) {
				const originalText = target.innerHTML;
				target.disabled = true;
				target.classList.add('loading');

				cart.add(parseInt(productId, 10), qty).finally(() => {
					target.disabled = false;
					target.classList.remove('loading');
					target.innerHTML = originalText;
				});
			}
			return;
		}

		// 3. Удаление товара из мини-корзины
		const removeBtn = e.target.closest('[data-cart-remove]');
		if (removeBtn) {
			e.preventDefault();
			const key = removeBtn.getAttribute('data-cart-remove');
			if (key) {
				cart.remove(key);
			}
			return;
		}

		// 4. Увеличение количества
		const incBtn = e.target.closest('[data-cart-inc]');
		if (incBtn) {
			e.preventDefault();
			const key = incBtn.getAttribute('data-cart-inc');
			const currentQty = parseInt(incBtn.getAttribute('data-qty'), 10) || 1;
			cart.updateQuantity(key, currentQty + 1);
			return;
		}

		// 5. Уменьшение количества
		const decBtn = e.target.closest('[data-cart-dec]');
		if (decBtn) {
			e.preventDefault();
			const key = decBtn.getAttribute('data-cart-dec');
			const currentQty = parseInt(decBtn.getAttribute('data-qty'), 10) || 1;
			cart.updateQuantity(key, currentQty - 1);
			return;
		}
	});
}

// Делаем доступным глобально
if (typeof window !== 'undefined') {
	window.MotoCart = cart;
}
