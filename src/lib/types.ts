/**
 * TypeScript-типы для данных из WooGraphQL.
 *
 * Марка мотоцикла = родительская категория (Honda, Kawasaki, BMW...)
 * Модель мотоцикла = дочерняя категория (CBR-1100, ZX-6R, F650ST...)
 * Категории формируют иерархию URL: /product-category/honda/cbr-1100/
 */

/** Изображение товара */
export interface ProductImage {
	sourceUrl: string;
	altText?: string;
	mediaDetails?: {
		width: number;
		height: number;
	};
}

/** Товар (базовый — для списков и карточек) */
export interface ProductBase {
	__typename?: string;
	databaseId?: number;
	name: string;
	slug?: string;
	uri: string;
	price?: string;
	regularPrice?: string;
	image?: ProductImage;
}

/** Товар (полный — для страницы товара) */
export interface ProductFull extends ProductBase {
	description?: string;
	shortDescription?: string;
	sku?: string;
	salePrice?: string;
	onSale?: boolean;
	stockStatus?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_BACKORDER';
	stockQuantity?: number;
	weight?: string;
	galleryImages?: {
		nodes: ProductImage[];
	};
	productCategories?: {
		nodes: CategoryNode[];
	};
	attributes?: {
		nodes: Array<{
			name: string;
			label: string;
			options: string[];
		}>;
	};
	variations?: {
		nodes: ProductVariation[];
	};
	related?: {
		nodes: ProductBase[];
	};
}

/** Вариация товара */
export interface ProductVariation {
	databaseId: number;
	name: string;
	sku?: string;
	price?: string;
	regularPrice?: string;
	stockStatus?: string;
	stockQuantity?: number;
	attributes?: {
		nodes: Array<{ name: string; value: string }>;
	};
	image?: ProductImage;
}

/** Информация о пагинации (Relay cursor-based) */
export interface PageInfo {
	hasNextPage: boolean;
	endCursor: string;
}

/** Категория товаров (марка или модель мотоцикла) */
export interface CategoryNode {
	name: string;
	uri: string;
	slug?: string;
	count?: number;
	ancestors?: {
		nodes: Array<{ name: string; uri: string }>;
	};
	children?: {
		nodes: CategoryNode[];
	};
}

/** Результат запроса списка товаров */
export interface ProductsResult {
	products: {
		found?: number;
		pageInfo: PageInfo;
		nodes: ProductBase[];
	};
}

/** Результат запроса категории с товарами */
export interface CategoryResult {
	productCategory: CategoryNode & {
		__typename: string;
		products: {
			pageInfo: PageInfo;
			nodes: ProductBase[];
		};
	};
}

/** Результат двойного запроса (категория ИЛИ товар по slug) */
export interface NodeResult {
	productCategory: (CategoryNode & {
		__typename: string;
		count: number;
		products: {
			pageInfo: PageInfo;
			nodes: ProductBase[];
		};
	}) | null;
	product: (ProductFull & { __typename: string }) | null;
}

/** Результат запроса категорий для sidebar */
export interface SidebarCategoriesResult {
	productCategories: {
		nodes: CategoryNode[];
	};
}
