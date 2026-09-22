import type { APIRoute } from 'astro';
import { fetchGraphQLWithSession } from '../../lib/graphql';

const CHECKOUT_MUTATION = `
	mutation ProcessCheckout($input: CheckoutInput!) {
		checkout(input: $input) {
			result
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

		const checkoutInput = {
			paymentMethod: paymentMethod || 'bacs',
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

		const { data, sessionToken: newSession } = await fetchGraphQLWithSession<{
			checkout: any;
		}>(CHECKOUT_MUTATION, { input: checkoutInput }, { sessionToken });

		console.log('[Checkout Mutation Result]', JSON.stringify(data));

		// Если заказ создан успешно, очищаем сессию корзины
		cookies.delete('wc_session', { path: '/' });

		const order = data.checkout?.order;
		const extractedId = order?.databaseId || (data.checkout?.redirect?.match(/order-received\/(\d+)/)?.[1] ? parseInt(data.checkout.redirect.match(/order-received\/(\d+)/)[1], 10) : undefined);
		const orderNumber = order?.orderNumber || (extractedId ? String(extractedId) : undefined);

		return new Response(
			JSON.stringify({
				success: true,
				orderId: extractedId,
				orderNumber: orderNumber,
				total: order?.total,
			}),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (e) {
		console.error('[Checkout Error]', (e as Error).message);
		return new Response(
			JSON.stringify({ success: false, error: (e as Error).message }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}
};
