export function initActiveMenu() {
  // Получаем текущий путь (без слеша в конце для точности)
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  
  // Список селекторов наших меню
  const menuSelectors = [".nav-list", ".mobile-nav-list"];

  menuSelectors.forEach((selector) => {
    const menu = document.querySelector(selector);
    if (!menu) return;

    // Находим все ссылки внутри списка
    const links = menu.querySelectorAll("a");
    
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      
      // Нормализуем путь ссылки
      const linkPath = href.replace(/\/$/, "") || "/";

      // Логика: 
      // 1. Для главной — строгое совпадение
      // 2. Для разделов (shop, blog и т.д.) — проверка на вхождение (startsWith)
      const isHome = linkPath === "/";
      const isActive = isHome 
        ? currentPath === "/" 
        : currentPath.startsWith(linkPath);

      if (isActive) {
        // Добавляем класс самой ссылке
        link.classList.add("active");
        
        // Находим ближайший родительский элемент (li для десктопа или div/a для мобилки)
      // 	const parentItem = link.closest(".nav-item, .mobile-nav-item");
      // 	if (parentItem) {
      // 		parentItem.classList.add("active");
      // 	}
      // 	} else {
      // 	link.classList.remove("active");
      // 	const parentItem = link.closest(".nav-item, .mobile-nav-item");
      // 	if (parentItem) {
      // 		parentItem.classList.remove("active");
      // 	}
      }
    });
  });
}