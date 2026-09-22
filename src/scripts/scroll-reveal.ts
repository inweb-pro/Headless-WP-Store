/**
 * Плавное каскадное появление карточек при попадании в зону видимости (Scroll Reveal).
 */
export function initScrollReveal() {
	if (typeof window === 'undefined') return;

	const containers = document.querySelectorAll('.reveal-on-scroll');
	if (!containers.length) return;

	if (!('IntersectionObserver' in window)) {
		containers.forEach((el) => {
			el.querySelectorAll('.product-card').forEach((card) => {
				card.classList.add('card-animate-in');
			});
		});
		return;
	}

	const observer = new IntersectionObserver(
		(entries, obs) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const cards = entry.target.querySelectorAll('.product-card:not(.card-animate-in)');
					cards.forEach((card, index) => {
						const htmlCard = card as HTMLElement;
						htmlCard.style.animationDelay = `${index * 0.06}s`;
						htmlCard.classList.add('card-animate-in');

						// Проверяем закэшированные изображения внутри карточки
						const img = htmlCard.querySelector('.app-image-img') as HTMLImageElement | null;
						if (img && img.complete) {
							img.classList.add('is-loaded');
							img.parentElement?.classList.add('is-loaded');
						}
					});
					obs.unobserve(entry.target);
				}
			});
		},
		{
			rootMargin: '0px 0px -30px 0px',
			threshold: 0.05,
		}
	);

	containers.forEach((container) => {
		container.classList.add('js-ready');
		observer.observe(container);
	});
}
