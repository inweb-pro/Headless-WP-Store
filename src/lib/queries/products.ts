/**
 * GraphQL-запросы для товаров.
 *
 * Все запросы вынесены как константы для переиспользования
 * и единообразия между страницами.
 */

/** Фрагмент полей товара для списков (карточки в каталоге) */
const PRODUCT_CARD_FIELDS = `
	databaseId
	name
	slug
	... on UniformResourceIdentifiable {
		uri
	}
	... on ProductWithPricing {
		price
		regularPrice
	}
	image {
		sourceUrl
		altText
	}
`;

/** Получить последние товары (для главной страницы) */
export const GET_LATEST_PRODUCTS = `
	query GetLatestProducts($first: Int = 5) {
		products(where: { stockStatus: IN_STOCK }, first: $first) {
			nodes {
				${PRODUCT_CARD_FIELDS}
			}
		}
	}
`;

/** Получить товары каталога с пагинацией */
export const GET_PRODUCTS = `
	query GetProducts($first: Int = 12, $after: String) {
		products(where: { stockStatus: IN_STOCK }, first: $first, after: $after) {
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

/**
 * Получить узел по slug — категория ИЛИ товар.
 *
 * Двойной запрос: проверяем и productCategory, и product.
 * Один из них вернёт null, другой — данные.
 * Категории = марки/модели мотоциклов (honda, honda/cbr-1100).
 */
export const GET_NODE = `
	query GetNode($id: ID!) {
		productCategory(id: $id, idType: SLUG) {
			__typename
			name
			uri
			count
			ancestors {
				nodes { name, uri }
			}
			products(where: { stockStatus: IN_STOCK }, first: 12) {
				pageInfo { hasNextPage, endCursor }
				nodes {
					${PRODUCT_CARD_FIELDS}
				}
			}
		}
		product(id: $id, idType: SLUG) {
			__typename
			databaseId
			name
			slug
			uri
			description
			shortDescription
			sku
			... on ProductWithPricing {
				price
				regularPrice
				salePrice
			}
			image {
				sourceUrl
				altText
				mediaDetails { width, height }
			}
			galleryImages {
				nodes {
					sourceUrl
					altText
					mediaDetails { width, height }
				}
			}
			productCategories {
				nodes {
					name
					uri
					ancestors { nodes { name, uri } }
				}
			}
			... on ProductWithAttributes {
				attributes {
					nodes { name, label, options }
				}
			}
			... on SimpleProduct {
				stockStatus
				stockQuantity
				weight
				onSale
			}
			... on VariableProduct {
				stockStatus
				onSale
				variations(first: 100) {
					nodes {
						databaseId
						name
						sku
						price
						regularPrice
						stockStatus
						stockQuantity
						attributes { nodes { name, value } }
						image { sourceUrl }
					}
				}
			}
			related(first: 4) {
				nodes {
					${PRODUCT_CARD_FIELDS}
				}
			}
		}
	}
`;

/** Загрузить ещё товары (общий каталог) */
export const LOAD_MORE_PRODUCTS = `
	query LoadMore($first: Int = 12, $after: String) {
		products(where: { stockStatus: IN_STOCK }, first: $first, after: $after) {
			pageInfo { hasNextPage, endCursor }
			nodes {
				${PRODUCT_CARD_FIELDS}
			}
		}
	}
`;

/** Загрузить ещё товары из категории */
export const LOAD_MORE_CATEGORY_PRODUCTS = `
	query LoadMoreCat($id: ID!, $first: Int = 12, $after: String) {
		productCategory(id: $id, idType: SLUG) {
			products(where: { stockStatus: IN_STOCK }, first: $first, after: $after) {
				pageInfo { hasNextPage, endCursor }
				nodes {
					${PRODUCT_CARD_FIELDS}
				}
			}
		}
	}
`;
