/**
 * GraphQL-клиент для WordPress WooGraphQL API.
 *
 * Единая точка для всех GraphQL-вызовов с обработкой ошибок,
 * логированием и управлением WooCommerce-сессией (для корзины).
 */

/** Тип ответа GraphQL (data + errors) */
interface GraphQLResponse<T = any> {
	data: T | null;
	errors?: Array<{
		message: string;
		locations?: Array<{ line: number; column: number }>;
		path?: string[];
		extensions?: Record<string, any>;
	}>;
}

/** Опции запроса */
interface FetchOptions {
	/** WooCommerce session token (для корзины) */
	sessionToken?: string;
	/** JWT auth token (для авторизованных запросов) */
	authToken?: string;
}

/** Ошибка GraphQL-запроса */
export class GraphQLError extends Error {
	public errors: GraphQLResponse['errors'];
	public status: number;

	constructor(message: string, errors?: GraphQLResponse['errors'], status = 500) {
		super(message);
		this.name = 'GraphQLError';
		this.errors = errors;
		this.status = status;
	}
}

/**
 * Выполнить GraphQL-запрос к WordPress API.
 *
 * @param query — GraphQL-запрос (строка)
 * @param variables — переменные запроса
 * @param options — доп. опции (сессия, авторизация)
 * @returns data из GraphQL-ответа
 *
 * @example
 * ```ts
 * const data = await fetchGraphQL(GET_PRODUCTS, { first: 12 });
 * ```
 */
export async function fetchGraphQL<T = any>(
	query: string,
	variables?: Record<string, any>,
	options?: FetchOptions,
): Promise<T> {
	const apiUrl = import.meta.env.WORDPRESS_API_URL;

	if (!apiUrl) {
		throw new GraphQLError(
			'WORDPRESS_API_URL не задан в .env. Скопируйте .env.example в .env и заполните.',
		);
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	// WooCommerce сессия (для корзины анонимных пользователей)
	if (options?.sessionToken) {
		headers['woocommerce-session'] = `Session ${options.sessionToken}`;
	}

	// JWT авторизация
	if (options?.authToken) {
		headers['Authorization'] = `Bearer ${options.authToken}`;
	}

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			throw new GraphQLError(
				`HTTP ошибка: ${response.status} ${response.statusText}`,
				undefined,
				response.status,
			);
		}

		const json: GraphQLResponse<T> = await response.json();

		// GraphQL может вернуть 200 OK, но с ошибками
		if (json.errors && json.errors.length > 0) {
			// Если есть и data и errors — частичный ответ
			if (json.data) {
				// Фильтруем «ожидаемые» ошибки двойного запроса
				// (slug может быть категорией ИЛИ товаром — один из двух запросов всегда даёт ошибку)
				const unexpectedErrors = json.errors.filter(
					(e) => !e.message.includes('No product ID was found')
						&& !e.message.includes('not found')
				);

				if (unexpectedErrors.length > 0) {
					console.warn('[GraphQL] Частичный ответ с ошибками:', unexpectedErrors.map((e) => e.message).join('; '));
				}

				return json.data;
			}

			const messages = json.errors.map((e) => e.message).join('; ');
			console.error('[GraphQL Errors]', JSON.stringify(json.errors, null, 2));
			throw new GraphQLError(`GraphQL ошибка: ${messages}`, json.errors);
		}

		if (!json.data) {
			throw new GraphQLError('GraphQL вернул пустой ответ (data = null)');
		}

		return json.data;
	} catch (error) {
		if (error instanceof GraphQLError) {
			throw error;
		}

		// Ошибка сети (ECONNREFUSED, timeout и т.д.)
		const networkError = error as Error;
		console.error('[GraphQL Network Error]', networkError.message);
		throw new GraphQLError(
			`Не удалось подключиться к API: ${networkError.message}. Убедитесь что WordPress запущен.`,
		);
	}
}

/**
 * Выполнить GraphQL-запрос и вернуть data вместе с обновленным woocommerce-session токеном
 */
export async function fetchGraphQLWithSession<T = any>(
	query: string,
	variables?: Record<string, any>,
	options?: FetchOptions,
): Promise<{ data: T; sessionToken?: string }> {
	const apiUrl = import.meta.env.WORDPRESS_API_URL;

	if (!apiUrl) {
		throw new GraphQLError(
			'WORDPRESS_API_URL не задан в .env.',
		);
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	if (options?.sessionToken) {
		headers['woocommerce-session'] = `Session ${options.sessionToken}`;
	}

	if (options?.authToken) {
		headers['Authorization'] = `Bearer ${options.authToken}`;
	}

	const response = await fetch(apiUrl, {
		method: 'POST',
		headers,
		body: JSON.stringify({ query, variables }),
	});

	if (!response.ok) {
		throw new GraphQLError(
			`HTTP ошибка: ${response.status} ${response.statusText}`,
			undefined,
			response.status,
		);
	}

	const sessionHeader = response.headers.get('woocommerce-session');
	const json: GraphQLResponse<T> = await response.json();

	if (json.errors && json.errors.length > 0) {
		const hasValidData = json.data && typeof json.data === 'object' && Object.values(json.data as Record<string, any>).some((v) => v !== null);
		if (hasValidData) {
			return { data: json.data, sessionToken: sessionHeader || options?.sessionToken };
		}
		const messages = json.errors.map((e) => e.message).join('; ');
		throw new GraphQLError(`GraphQL ошибка: ${messages}`, json.errors);
	}

	if (!json.data) {
		throw new GraphQLError('GraphQL вернул пустой ответ (data = null)');
	}

	return {
		data: json.data,
		sessionToken: sessionHeader || options?.sessionToken,
	};
}
