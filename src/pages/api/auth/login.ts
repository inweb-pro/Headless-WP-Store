import type { APIRoute } from 'astro';
import { fetchGraphQL } from '../../../lib/graphql';

const LOGIN_MUTATION = `
	mutation LoginUser($username: String!, $password: String!) {
		login(input: { username: $username, password: $password }) {
			authToken
			user {
				databaseId
				name
				email
			}
		}
	}
`;

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const { username, password } = body;

		if (!username || !password) {
			return new Response(
				JSON.stringify({ success: false, error: 'Укажите логин/email и пароль' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		const data = await fetchGraphQL<{ login: { authToken: string; user: any } }>(
			LOGIN_MUTATION,
			{ username, password },
		);

		const token = data.login?.authToken;
		const user = data.login?.user;

		if (token) {
			cookies.set('auth_token', token, {
				path: '/',
				httpOnly: true,
				maxAge: 60 * 60 * 24 * 14, // 14 дней
				sameSite: 'lax',
			});
		}

		return new Response(
			JSON.stringify({ success: true, user }),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		console.error('[Login Error]', (e as Error).message);
		let errorMsg = 'Неверный логин или пароль';
		if ((e as Error).message.includes('password')) {
			errorMsg = 'Неверный пароль';
		} else if ((e as Error).message.includes('username')) {
			errorMsg = 'Пользователь с таким логином не найден';
		}
		return new Response(
			JSON.stringify({ success: false, error: errorMsg }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}
};
