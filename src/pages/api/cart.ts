import type { APIRoute } from 'astro';
import { fetchGraphQLWithSession } from '../../lib/graphql';
import {
	GET_CART_QUERY,
	ADD_TO_CART_MUTATION,
	UPDATE_CART_QUANTITY_MUTATION,
	REMOVE_CART_ITEM_MUTATION,
	CLEAR_CART_MUTATION,
} from '../../lib/queries/cart';

/**
 * Вспомогательная функция сохранения сессии WooCommerce в куки
 */
function applySessionCookie(cookies: any, sessionToken?: string) {
	if (sessionToken) {
		cookies.set('wc_session', sessionToken, {
			path: '/',
			httpOnly: true,
			maxAge: 60 * 60 * 24 * 14, // 14 дней
			sameSite: 'lax',
		});
	}
}

/**
 * GET /api/cart — получить текущее состояние корзины
 */
export const GET: APIRoute = async ({ cookies }) => {
	const sessionToken = cookies.get('wc_session')?.value;

	try {
		const { data, sessionToken: newSession } = await fetchGraphQLWithSession<{ cart: any }>(
			GET_CART_QUERY,
			{},
			{ sessionToken },
		);

		applySessionCookie(cookies, newSession);

		return new Response(JSON.stringify({ success: true, cart: data.cart }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		console.error('[Cart GET Error]', (e as Error).message);
		return new Response(
			JSON.stringify({ success: false, error: (e as Error).message, cart: null }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}
};

/**
 * POST /api/cart — добавить товар в корзину: { productId: number, quantity?: number }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
	const sessionToken = cookies.get('wc_session')?.value;

	try {
		const body = await request.json();
		const productId = Number(body.productId);
		const quantity = Number(body.quantity) || 1;

		if (!productId) {
			return new Response(
				JSON.stringify({ success: false, error: 'Не указан productId' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		const { data, sessionToken: newSession } = await fetchGraphQLWithSession<{ addToCart: { cart: any } }>(
			ADD_TO_CART_MUTATION,
			{ productId, quantity },
			{ sessionToken },
		);

		applySessionCookie(cookies, newSession);

		return new Response(
			JSON.stringify({ success: true, cart: data.addToCart?.cart }),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		console.error('[Cart POST Error]', (e as Error).message);
		return new Response(
			JSON.stringify({ success: false, error: (e as Error).message }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}
};

/**
 * PUT /api/cart — обновить количество: { key: string, quantity: number }
 */
export const PUT: APIRoute = async ({ request, cookies }) => {
	const sessionToken = cookies.get('wc_session')?.value;

	try {
		const body = await request.json();
		const key = body.key;
		const quantity = Number(body.quantity);

		if (!key || isNaN(quantity)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Некорректные параметры key или quantity' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		const { data, sessionToken: newSession } = await fetchGraphQLWithSession<{ updateItemQuantities: { cart: any } }>(
			UPDATE_CART_QUANTITY_MUTATION,
			{ key, quantity },
			{ sessionToken },
		);

		applySessionCookie(cookies, newSession);

		return new Response(
			JSON.stringify({ success: true, cart: data.updateItemQuantities?.cart }),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		console.error('[Cart PUT Error]', (e as Error).message);
		return new Response(
			JSON.stringify({ success: false, error: (e as Error).message }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}
};

/**
 * DELETE /api/cart — удалить товар: ?key=... или { all: true }
 */
export const DELETE: APIRoute = async ({ request, url, cookies }) => {
	const sessionToken = cookies.get('wc_session')?.value;
	const key = url.searchParams.get('key');
	const clearAll = url.searchParams.get('all') === 'true';

	try {
		let data: any;
		let newSession: string | undefined;

		if (clearAll) {
			const res = await fetchGraphQLWithSession<{ removeItemsFromCart: { cart: any } }>(
				CLEAR_CART_MUTATION,
				{},
				{ sessionToken },
			);
			data = res.data.removeItemsFromCart?.cart;
			newSession = res.sessionToken;
		} else if (key) {
			const res = await fetchGraphQLWithSession<{ removeItemsFromCart: { cart: any } }>(
				REMOVE_CART_ITEM_MUTATION,
				{ key },
				{ sessionToken },
			);
			data = res.data.removeItemsFromCart?.cart;
			newSession = res.sessionToken;
		} else {
			return new Response(
				JSON.stringify({ success: false, error: 'Не указан key или all' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		applySessionCookie(cookies, newSession);

		return new Response(
			JSON.stringify({ success: true, cart: data }),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		console.error('[Cart DELETE Error]', (e as Error).message);
		return new Response(
			JSON.stringify({ success: false, error: (e as Error).message }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}
};
