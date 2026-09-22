/**
 * GraphQL-запросы для категорий товаров.
 *
 * Категории = иерархия марок и моделей мотоциклов:
 *   Родительские: Honda, Kawasaki, BMW, Ducati, Suzuki...
 *   Дочерние: CBR-1100, ZX-6R 98-99, F650ST 96-03...
 *
 * URL формат: /product-category/honda/cbr-1100/
 */

/** Категории для sidebar (марки + модели, 2 уровня) */
export const GET_SIDEBAR_CATEGORIES = `
	query GetSideBarCategories {
		productCategories(
			where: { parent: 0 }
			first: 100
		) {
			nodes {
				name
				slug
				uri
				count
				children(first: 100) {
					nodes {
						name
						slug
						uri
						count
					}
				}
			}
		}
	}
`;
