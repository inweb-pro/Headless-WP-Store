export function initOffcanvas() {
	const offcanvases = document.querySelectorAll(".offcanvas");
	const toggles = document.querySelectorAll("[data-offcanvas-toggle]");
	const closeBtns = document.querySelectorAll("[data-close-offcanvas]");

	function closeAll() {
		offcanvases.forEach((el) => el.classList.remove("is-active"));
		document.body.style.overflow = "";
	}

	function open(id, focusId = null) {
		closeAll();
		const target = document.getElementById(id);
		if (target) {
			target.classList.add("is-active");
			document.body.style.overflow = "hidden";

			if (focusId) {
				setTimeout(() => {
					document.getElementById(focusId)?.focus();
				}, 300);
			}
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
}
