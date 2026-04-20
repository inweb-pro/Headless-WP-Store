export function initLoadMore() {
  const btn = document.getElementById("load-more-btn");
  const grid = document.getElementById("products-grid");

  if (!btn || !grid) return;

  const slug = btn.getAttribute("data-slug");
  const defaultContent = btn.querySelector('.btn-default-content');
  const loadingContent = btn.querySelector('.btn-loading-content');

  btn.addEventListener("click", async () => {
    const cursor = btn.getAttribute("data-cursor");
    
    // Визуальное состояние загрузки
    btn.disabled = true;
    btn.classList.add('is-loading');
    if (defaultContent) defaultContent.style.display = 'none';
    if (loadingContent) loadingContent.style.display = 'flex';

    try {
      // Запрашиваем готовый HTML у нашего эндпоинта
      const url = `/api/render-products?cursor=${cursor}${slug ? `&slug=${slug}` : ''}`;
      const res = await fetch(url);
      const html = await res.text();

      // Создаем временный контейнер для парсинга HTML
      const temp = document.createElement("div");
      temp.innerHTML = html;

      // Извлекаем метаданные и удаляем их из вставки
      const meta = temp.querySelector("#pagination-metadata");
      const hasNextPage = meta?.getAttribute("data-next-page") === "true";
      const newCursor = meta?.getAttribute("data-cursor");
      if (meta) meta.remove();

      // Вставляем карточки в сетку 
      grid.insertAdjacentHTML('beforeend', temp.innerHTML);

      // Обновляем кнопку или удаляем её
      if (hasNextPage && newCursor) {
        btn.setAttribute("data-cursor", newCursor);
        btn.disabled = false;
        btn.classList.remove('is-loading');
        if (defaultContent) defaultContent.style.display = 'flex';
        if (loadingContent) loadingContent.style.display = 'none';
      } else {
        btn.remove();
      }
    } catch (e) {
      console.error("Ошибка подгрузки товаров:", e);
      btn.disabled = false;
    }
  });
}