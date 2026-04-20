export function initStickyHeader() {
  const stickyHeader = document.getElementById('sticky-header');
  if (!stickyHeader) return;

  const scrollThreshold = 200; // Порог появления в пикселях

  // Создаем отдельную функцию для проверки позиции скролла
  const checkScroll = () => {
    if (window.scrollY > scrollThreshold) {
      stickyHeader.classList.add('is-sticky');
    } else {
      stickyHeader.classList.remove('is-sticky');
    }
  };

  // Выполняем проверку сразу при вызове функции (при загрузке страницы)
  checkScroll();

  // Продолжаем отслеживать скролл
  window.addEventListener('scroll', checkScroll, { passive: true });
}