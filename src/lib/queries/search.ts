/**
 * GraphQL-запросы для поиска товаров.
 *
 * Commit 2.1: Поисковый запрос через WooGraphQL.
 */

/** Фрагмент полей товара для результатов поиска */
const PRODUCT_CARD_FIELDS = `
	databaseId
	name
	uri
	... on ProductWithPricing {
		price
	}
	image {
		sourceUrl
		altText
	}
`;

/** Поиск товаров по строке */
export const SEARCH_PRODUCTS = `
	query SearchProducts($search: String!, $first: Int = 20) {
		products(where: { search: $search, stockStatus: IN_STOCK }, first: $first) {
			found
			pageInfo {
				hasNextPage
				endCursor
			}
			nodes {
				${PRODUCT_CARD_FIELDS}
			}
		}
	}
`;
