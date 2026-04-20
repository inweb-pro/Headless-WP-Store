import { defineConfig } from "astro/config";
import node from "@astrojs/node"; // Импортируем адаптер для Node.js

// https://astro.build/config
export default defineConfig({
	devToolbar: { enabled: false },
	
  // Устанавливаем режим вывода на серверный (SSR)
  output: 'server',

	// Настраиваем адаптер для работы на VPS
	adapter: node({
		mode: "standalone", // Проект будет запускаться как самостоятельное Node-приложение
	}),

	trailingSlash: "never", // Указываем Astro никогда не добавлять слэш в конце URL

	// Настройки Vite для локальной разработки
	vite: {
		server: {
			// Разрешаем работу через наш локальный домен
			allowedHosts: ["motopuzzle.local", "api-motopuzzle.local"],
		},
		// Опционально: если столкнешься с проблемами кэширования в браузере
		optimizeDeps: {
			exclude: ["@astrojs/node"],
		},
	},

	// Если в будущем планируешь использовать изображения через Astro.Image
	image: {
		remotePatterns: [
			{
				protocol: "http",
				hostname: "api-motopuzzle.local",
			},
			{
				protocol: "https",
				hostname: "api-motopuzzle.local",
			},
		],
	},
});
