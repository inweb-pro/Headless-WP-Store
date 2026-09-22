/**
 * GraphQL-запросы и мутации для корзины (WooCommerce Cart через WooGraphQL).
 */

export const CART_FIELDS = `
	total
	subtotal
	isEmpty
	contents {
		itemCount
		nodes {
			key
			quantity
			subtotal
			total
			product {
				node {
					databaseId
					name
					uri
					image {
						sourceUrl
						altText
					}
					... on ProductWithPricing {
						price
						regularPrice
					}
				}
			}
		}
	}
`;

/** Получить текущую корзину */
export const GET_CART_QUERY = `
	query GetCart {
		cart {
			${CART_FIELDS}
		}
	}
`;

/** Добавить товар в корзину */
export const ADD_TO_CART_MUTATION = `
	mutation AddToCart($productId: Int!, $quantity: Int = 1) {
		addToCart(input: { productId: $productId, quantity: $quantity }) {
			cart {
				${CART_FIELDS}
			}
		}
	}
`;

/** Обновить количество товара в корзине */
export const UPDATE_CART_QUANTITY_MUTATION = `
	mutation UpdateCartQuantity($key: ID!, $quantity: Int!) {
		updateItemQuantities(input: { items: [{ key: $key, quantity: $quantity }] }) {
			cart {
				${CART_FIELDS}
			}
		}
	}
`;

/** Удалить товар из корзины */
export const REMOVE_CART_ITEM_MUTATION = `
	mutation RemoveCartItem($key: ID!) {
		removeItemsFromCart(input: { keys: [$key] }) {
			cart {
				${CART_FIELDS}
			}
		}
	}
`;

/** Очистить всю корзину */
export const CLEAR_CART_MUTATION = `
	mutation ClearCart {
		removeItemsFromCart(input: { all: true }) {
			cart {
				${CART_FIELDS}
			}
		}
	}
`;
