import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
	const cookieHeader = request.headers.get('cookie') || '';
	const authToken = cookies.get('auth_token')?.value
		|| cookieHeader.match(/auth_token=([^;]+)/)?.[1]
		|| request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

	if (!authToken) {
		return new Response(
			JSON.stringify({ success: false, error: 'Вы не авторизованы' }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } },
		);
	}

	try {
		const body = await request.json();
		const { name, phone, city, address, passport } = body;

		const wpRes = await fetch('http://api-motopuzzle.local/wp-json/motopuzzle/v1/profile', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({ name, phone, city, address, passport }),
		});

		const data = await wpRes.json();

		if (!wpRes.ok || !data.success) {
			return new Response(
				JSON.stringify({ success: false, error: data.error || 'Ошибка сохранения профиля' }),
				{ status: wpRes.status || 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		return new Response(
			JSON.stringify({ success: true, user: data.user }),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		console.error('[Profile Update API Error]', e);
		return new Response(
			JSON.stringify({ success: false, error: 'Ошибка сервера при обновлении данных' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}
};
