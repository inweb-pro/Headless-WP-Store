export function initActiveMenu() {
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  const menuSelectors = [".nav-list", ".mobile-nav-list"];

  menuSelectors.forEach((selector) => {
    // Используем querySelectorAll, чтобы найти ВСЕ списки (и в обычной, и в липкой шапке)
    const menus = document.querySelectorAll(selector);

    menus.forEach((menu) => {
      const links = menu.querySelectorAll("a");
      
      links.forEach((link) => {
        const href = link.getAttribute("href");
        if (!href) return;
        
        const linkPath = href.replace(/\/$/, "") || "/";
        const isHome = linkPath === "/";
        const isActive = isHome ? currentPath === "/" : currentPath.startsWith(linkPath);

        if (isActive) {
          link.classList.add("active");
          
          // Находим родительский элемент (li или div)
          const parentItem = link.closest(".nav-item, .mobile-nav-item");
          if (parentItem) {
            // parentItem.classList.add("active");
            
            // Если это мобильная выпадашка — раскрываем её
            if (parentItem.classList.contains("mobile-has-dropdown")) {
              parentItem.classList.add("is-open");
            }
          }

          // Если активна ссылка ВНУТРИ субменю, открываем и подсвечиваем родителя
          const submenu = link.closest(".mobile-submenu");
          if (submenu) {
            const mainParent = submenu.closest(".mobile-has-dropdown");
            if (mainParent) {
              mainParent.classList.add("is-open"); // "active"
            }
          }
        }
      });
    });
  });
}