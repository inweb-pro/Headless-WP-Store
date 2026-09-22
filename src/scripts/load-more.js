function createCardSkeleton() {
  const template = document.getElementById("product-card-skeleton-template");
  if (template && template.content && template.content.firstElementChild) {
    return template.content.firstElementChild.cloneNode(true);
  }
  const card = document.createElement("article");
  card.className = "product-card skeleton-card";
  card.setAttribute("aria-hidden", "true");
  card.innerHTML = `
    <div class="product-card__inner">
      <div class="skeleton-image"></div>
      <div class="product-info">
        <div class="skeleton-line skeleton-title-1"></div>
        <div class="skeleton-line skeleton-title-2"></div>
        <div class="skeleton-line skeleton-price"></div>
      </div>
    </div>
  `;
  return card;
}

export function initLoadMore() {
  const btn = document.getElementById("load-more-btn");
  const grid = document.getElementById("products-grid");

  if (!btn || !grid) return;

  const slug = btn.getAttribute("data-slug");
  const defaultContent = btn.querySelector('.btn-default-content');
  const loadingContent = btn.querySelector('.btn-loading-content');

  btn.addEventListener("click", async () => {
    const cursor = btn.getAttribute("data-cursor");
    
    // Визуальное состояние загрузки кнопки
    btn.disabled = true;
    btn.classList.add('is-loading');
    if (defaultContent) defaultContent.style.display = 'none';
    if (loadingContent) loadingContent.style.display = 'flex';

    // 1. Создаем и мгновенно вставляем 12 скелетонов в сетку
    const skeletonCount = 12;
    const fragment = document.createDocumentFragment();
    const createdSkeletons = [];
    for (let i = 0; i < skeletonCount; i++) {
      const skel = createCardSkeleton();
      fragment.appendChild(skel);
      createdSkeletons.push(skel);
    }
    grid.appendChild(fragment);

    // 2. Плавно скроллим к первому новому скелетону с отступом под шапку
    const firstSkeleton = createdSkeletons[0];
    if (firstSkeleton) {
      const headerOffset = 80;
      const elementPosition = firstSkeleton.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }

    try {
      // 3. Запрашиваем готовый HTML у нашего эндпоинта
      // (с минимальной паузой 450мс, чтобы дать плавности скроллу и времени показать шиммер)
      const url = `/api/render-products?cursor=${cursor}${slug ? `&slug=${slug}` : ''}`;
      const [res] = await Promise.all([
        fetch(url),
        new Promise((resolve) => setTimeout(resolve, 450))
      ]);
      const html = await res.text();

      // Создаем временный контейнер для парсинга HTML
      const temp = document.createElement("div");
      temp.innerHTML = html;

      // Извлекаем метаданные и удаляем их из вставки
      const meta = temp.querySelector("#pagination-metadata");
      const hasNextPage = meta?.getAttribute("data-next-page") === "true";
      const newCursor = meta?.getAttribute("data-cursor");
      if (meta) meta.remove();

      // 4. Бесшовно заменяем скелетоны на реальные карточки товаров
      const newCards = Array.from(temp.querySelectorAll(".product-card"));
      newCards.forEach((card, index) => {
        if (createdSkeletons[index] && createdSkeletons[index].parentNode) {
          createdSkeletons[index].replaceWith(card);
        } else {
          grid.appendChild(card);
        }
      });

      // Удаляем неиспользованные скелетоны, если товаров пришло меньше 12
      createdSkeletons.slice(newCards.length).forEach((skel) => {
        if (skel.parentNode) skel.remove();
      });

      // Обновляем состояния кнопок для новых карточек
      if (typeof window !== 'undefined' && window.MotoCart && typeof window.MotoCart.updateButtonStates === 'function') {
        window.MotoCart.updateButtonStates();
      }
      if (typeof window !== 'undefined' && window.MotoWishlist && typeof window.MotoWishlist.updateButtonStates === 'function') {
        window.MotoWishlist.updateButtonStates();
      }

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
      // При ошибке удаляем созданные скелетоны
      createdSkeletons.forEach((skel) => {
        if (skel.parentNode) skel.remove();
      });
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (defaultContent) defaultContent.style.display = 'flex';
      if (loadingContent) loadingContent.style.display = 'none';
    }
  });
}