/**
 * API-эндпоинт для автозаполнения поиска.
 *
 * GET /api/search?q=фара&cat=honda&limit=6
 * Возвращает JSON с товарами для dropdown автозаполнения.
 * Вызывается клиентским JS при вводе от 4 символов.
 *
 * Фильтр по категории: передаём slug через `category` (не categoryIn).
 */
import type { APIRoute } from 'astro';
import { fetchGraphQL } from '../../lib/graphql';

const AUTOCOMPLETE_QUERY = `
	query Autocomplete($search: String!, $first: Int = 6, $category: String) {
		products(
			where: { search: $search, category: $category, stockStatus: IN_STOCK }
			first: $first
		) {
			found
			nodes {
				databaseId
				name
				uri
				... on ProductWithPricing { price }
				image { sourceUrl }
			}
		}
	}
`;

export const GET: APIRoute = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() || '';
	const catSlug = url.searchParams.get('cat')?.trim() || '';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '6'), 20);

	if (query.length < 3) {
		return new Response(JSON.stringify({ results: [], found: 0 }), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const data = await fetchGraphQL<any>(AUTOCOMPLETE_QUERY, {
			search: query,
			first: limit,
			category: catSlug || null,
		});

		const results = (data.products?.nodes || []).map((p: any) => ({
			name: p.name,
			uri: p.uri,
			price: p.price || '',
			image: p.image?.sourceUrl || '',
		}));

		return new Response(JSON.stringify({
			results,
			found: data.products?.found || 0,
		}), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		console.error('[search API]', (e as Error).message);
		return new Response(JSON.stringify({ results: [], found: 0, error: true }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
