export function initMobileSubmenus() {
  // Ищем все кнопки-стрелки в мобильном меню
  const dropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');
  
  dropdownToggles.forEach(btn => {
    // Используем чистый JS для максимальной производительности
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Важно: не даем клику всплывать к родителям
      
      const parent = btn.closest('.mobile-has-dropdown');
      if (parent) {
        // Переключаем класс открытия
        parent.classList.toggle('is-open');
        
        // Опционально: закрываем остальные открытые пункты
        /*
        document.querySelectorAll('.mobile-has-dropdown.is-open').forEach(openItem => {
          if (openItem !== parent) openItem.classList.remove('is-open');
        });
        */
      }
    });
  });
}