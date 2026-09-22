import type { APIRoute } from 'astro';
import { fetchGraphQLWithSession } from '../../lib/graphql';

const CHECKOUT_MUTATION = `
	mutation ProcessCheckout($input: CheckoutInput!) {
		checkout(input: $input) {
			result
			redirect
			order {
				databaseId
				orderNumber
				orderKey
				status
				total
			}
		}
	}
`;

export const POST: APIRoute = async ({ request, cookies }) => {
	const cookieHeader = request.headers.get('cookie') || '';
	const sessionToken = cookies.get('wc_session')?.value || cookieHeader.match(/wc_session=([^;]+)/)?.[1];

	try {
		const body = await request.json();
		const {
			name,
			phone,
			email,
			city,
			address,
			passport,
			shippingMethod = 'delivery',
			paymentMethod = 'bacs',
			orderNotes = '',
		} = body;

		if (!name || !phone || !email) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Пожалуйста, заполните обязательные поля: Ф.И.О., телефон и email',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		if (shippingMethod === 'delivery' && (!city || !address)) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Для доставки транспортной компанией укажите город и адрес доставки',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		// Разделяем имя на Фамилию и Имя
		const nameParts = name.trim().split(/\s+/);
		const lastName = nameParts.length > 1 ? nameParts[0] : '';
		const firstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

		// Формируем примечание к заказу с деталями доставки и паспорта
		const shippingTitle = shippingMethod === 'pickup' ? 'Самовывоз (СПб)' : 'Транспортная компания / Доставка';
		let finalNote = `[Способ доставки: ${shippingTitle}]`;
		if (passport) {
			finalNote += `\n[Паспорт: ${passport}]`;
		}
		if (orderNotes) {
			finalNote += `\n\nПримечание клиента: ${orderNotes}`;
		}

		const deliveryAddress = shippingMethod === 'pickup' ? 'Самовывоз со склада' : (address || '');
		const deliveryCity = shippingMethod === 'pickup' ? 'Санкт-Петербург' : (city || '');

		// Правило: оплата наличными ("cod") разрешена ТОЛЬКО при самовывозе
		const finalPaymentMethod = shippingMethod === 'pickup' && paymentMethod === 'cod' ? 'cod' : 'bacs';

		const checkoutInput = {
			paymentMethod: finalPaymentMethod,
			customerNote: finalNote,
			billing: {
				firstName,
				lastName,
				email,
				phone,
				city: deliveryCity,
				address1: deliveryAddress,
				country: 'RU',
			},
			shipping: {
				firstName,
				lastName,
				city: deliveryCity,
				address1: deliveryAddress,
				country: 'RU',
			},
			metaData: [
				{ key: 'passport', value: passport || '' },
				{ key: 'delivery_type', value: shippingMethod },
			],
		};

		const { data } = await fetchGraphQLWithSession<{
			checkout: {
				result?: string;
				redirect?: string;
				order?: {
					databaseId?: number;
					orderNumber?: string;
					orderKey?: string;
					status?: string;
					total?: string;
				} | null;
			};
		}>(CHECKOUT_MUTATION, { input: checkoutInput }, { sessionToken });

		console.log('[Checkout Mutation Result]', JSON.stringify(data));

		if (data?.checkout?.result !== 'success') {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Не удалось оформить заказ. Пожалуйста, проверьте введённые данные и попробуйте снова.',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		// Если заказ создан успешно, очищаем сессию корзины
		cookies.delete('wc_session', { path: '/' });

		const order = data.checkout?.order;
		const redirect = data.checkout?.redirect || '';
		const redirectIdMatch = redirect.match(/order-received\/(\d+)/) || redirect.match(/order[=-](\d+)/);
		const extractedId = order?.databaseId || (redirectIdMatch ? parseInt(redirectIdMatch[1], 10) : undefined);
		const orderNumber = order?.orderNumber || (extractedId ? String(extractedId) : 'MP-' + Date.now().toString().slice(-6));

		// Авторизация / регистрация пользователя и привязка заказа
		let authToken = '';
		let userProfile = null;
		try {
			const authRes = await fetch('http://api-motopuzzle.local/wp-json/motopuzzle/v1/checkout-auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					name,
					phone,
					city: deliveryCity,
					address: deliveryAddress,
					passport,
					orderId: extractedId,
				}),
			});

			if (authRes.ok) {
				const authData = await authRes.json();
				if (authData.success && authData.authToken) {
					authToken = authData.authToken;
					userProfile = authData.user;
					cookies.set('auth_token', authToken, {
						path: '/',
						maxAge: 60 * 60 * 24 * 30, // 30 дней
						httpOnly: true,
						sameSite: 'lax',
					});
				}
			}
		} catch (authErr) {
			console.error('[Checkout Auth Error]', authErr);
		}

		return new Response(
			JSON.stringify({
				success: true,
				orderId: extractedId,
				orderNumber: orderNumber,
				total: order?.total || '',
				authToken: authToken || undefined,
				user: userProfile || undefined,
			}),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		const rawMsg = (e as Error).message || '';
		console.error('[Checkout Error]', rawMsg);

		let userMessage = rawMsg.replace(/^GraphQL ошибка:\s*/i, '');
		if (userMessage.includes('Sorry, no session found') || userMessage.includes('no session')) {
			userMessage = 'Ваша корзина пуста или время сессии истекло. Пожалуйста, добавьте товар в корзину заново.';
		}

		return new Response(
			JSON.stringify({ success: false, error: userMessage }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}
};
