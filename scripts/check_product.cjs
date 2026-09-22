async function checkStockFilter() {
  const query = `
    query {
      productCategory(id: "suzuki", idType: SLUG) {
        name
        products(where: { stockStatus: IN_STOCK }) {
          nodes {
            databaseId
            name
          }
        }
      }
    }
  `;
  const res = await fetch('http://api-motopuzzle.local/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log('Suzuki in-stock products:', JSON.stringify(data, null, 2));
}
checkStockFilter();
