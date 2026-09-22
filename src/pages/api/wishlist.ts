import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, cookies }) => {
	const cookieHeader = request.headers.get('cookie') || '';
	const authToken = cookies.get('auth_token')?.value
		|| cookieHeader.match(/auth_token=([^;]+)/)?.[1]
		|| request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

	if (!authToken) {
		return new Response(
			JSON.stringify({ authenticated: false, items: [] }),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	}

	try {
		const wpRes = await fetch('http://api-motopuzzle.local/wp-json/motopuzzle/v1/wishlist', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${authToken}`,
			},
		});

		const data = await wpRes.json();
		return new Response(
			JSON.stringify(data),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		console.error('[Wishlist API GET Error]', e);
		return new Response(
			JSON.stringify({ authenticated: false, items: [], error: 'Ошибка сервера' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const cookieHeader = request.headers.get('cookie') || '';
	const authToken = cookies.get('auth_token')?.value
		|| cookieHeader.match(/auth_token=([^;]+)/)?.[1]
		|| request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

	if (!authToken) {
		return new Response(
			JSON.stringify({ authenticated: false, error: 'Вы не авторизованы' }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } },
		);
	}

	try {
		const body = await request.json();
		const wpRes = await fetch('http://api-motopuzzle.local/wp-json/motopuzzle/v1/wishlist', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify(body),
		});

		const data = await wpRes.json();
		return new Response(
			JSON.stringify(data),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		console.error('[Wishlist API POST Error]', e);
		return new Response(
			JSON.stringify({ success: false, error: 'Ошибка сервера' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}
};
