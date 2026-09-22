import type { APIRoute } from 'astro';
import { fetchGraphQL } from '../../../lib/graphql';

const REGISTER_MUTATION = `
	mutation RegisterUser($username: String!, $email: String!, $password: String!) {
		registerUser(input: { username: $username, email: $email, password: $password }) {
			user {
				databaseId
				name
				email
			}
		}
	}
`;

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
		const { username, email, password } = body;

		if (!email || !password) {
			return new Response(
				JSON.stringify({ success: false, error: 'Укажите email и пароль' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		const userLogin = username?.trim() || email.split('@')[0];

		// 1. Регистрируем пользователя
		await fetchGraphQL(REGISTER_MUTATION, {
			username: userLogin,
			email,
			password,
		});

		// 2. Сразу выполняем вход и получаем токен
		const loginData = await fetchGraphQL<{ login: { authToken: string; user: any } }>(
			LOGIN_MUTATION,
			{ username: userLogin, password },
		);

		const token = loginData.login?.authToken;
		const user = loginData.login?.user;

		if (token) {
			cookies.set('auth_token', token, {
				path: '/',
				httpOnly: true,
				maxAge: 60 * 60 * 24 * 14,
				sameSite: 'lax',
			});
		}

		return new Response(
			JSON.stringify({ success: true, user }),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		console.error('[Register Error]', (e as Error).message);
		let msg = (e as Error).message;
		if (msg.includes('already exists') || msg.includes('уже зарегистрирован')) {
			msg = 'Пользователь с таким email или логином уже существует';
		}
		return new Response(
			JSON.stringify({ success: false, error: msg }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}
};
