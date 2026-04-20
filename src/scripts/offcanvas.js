export function initOffcanvas() {
	const offcanvases = document.querySelectorAll(".offcanvas");
	const toggles = document.querySelectorAll("[data-offcanvas-toggle]");
	const closeBtns = document.querySelectorAll("[data-close-offcanvas]");
	const stickyHeader = document.getElementById("sticky-header");

	function getScrollbarWidth() {
		return window.innerWidth - document.documentElement.clientWidth;
	}

	function closeAll() {
		offcanvases.forEach((el) => el.classList.remove("is-active"));
		
		document.body.classList.remove("lock-scroll");
		// Убираем компенсацию со sticky-header всегда при закрытии
		if (stickyHeader) {
			stickyHeader.classList.remove("lock-padding");
		}
		
		document.documentElement.style.removeProperty("--scrollbar-width");
	}

	function open(id, focusId = null) {
		const target = document.getElementById(id);
		if (!target) return;

		const scrollWidth = getScrollbarWidth();

		offcanvases.forEach((el) => el.classList.remove("is-active"));

		document.documentElement.style.setProperty("--scrollbar-width", `${scrollWidth}px`);
		document.body.classList.add("lock-scroll");
		
		// ПРАВКА: Вешаем lock-padding на sticky-header безусловно, 
		// если он существует в DOM, чтобы зафиксировать его внутренний контейнер
		if (stickyHeader) {
			stickyHeader.classList.add("lock-padding");
		}

		target.classList.add("is-active");

		if (focusId) {
			setTimeout(() => {
				document.getElementById(focusId)?.focus();
			}, 300);
		}
	}

	toggles.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			const targetId = btn.getAttribute("data-offcanvas-toggle");
			const focusId = btn.getAttribute("data-focus-id");
			open(targetId, focusId);
		});
	});

	closeBtns.forEach((btn) => {
		btn.addEventListener("click", closeAll);
	});
    
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") closeAll();
	});
}