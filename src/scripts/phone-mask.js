/**
 * Маска ввода номера телефона: +7 (000) 000-00-00
 * Поддерживает ввод, вставку из буфера, удаление Backspace и нормализацию.
 */
export function initPhoneMask(input) {
	if (!input) return;

	function formatPhone(value) {
		let numbers = value.replace(/\D/g, '');
		if (!numbers) return '';

		// Нормализация первой цифры
		const firstDigit = numbers[0];
		if (firstDigit === '9') {
			numbers = '7' + numbers;
		} else if (firstDigit === '8') {
			numbers = '7' + numbers.substring(1);
		} else if (firstDigit !== '7') {
			numbers = '7' + numbers;
		}

		// Максимум 11 цифр (+7 и 10 цифр номера)
		numbers = numbers.substring(0, 11);

		let formatted = '+7';
		if (numbers.length > 1) {
			formatted += ' (' + numbers.substring(1, 4);
		}
		if (numbers.length >= 5) {
			formatted += ') ' + numbers.substring(4, 7);
		}
		if (numbers.length >= 8) {
			formatted += '-' + numbers.substring(7, 9);
		}
		if (numbers.length >= 10) {
			formatted += '-' + numbers.substring(9, 11);
		}
		return formatted;
	}

	function onInput(e) {
		const val = input.value;
		const numbers = val.replace(/\D/g, '');

		// Если удалили все цифры или осталась только 7 при удалении
		if (!numbers || (numbers.length <= 1 && e.inputType === 'deleteContentBackward')) {
			input.value = '';
			return;
		}

		input.value = formatPhone(val);
	}

	function onKeyDown(e) {
		if (e.key === 'Backspace') {
			const digits = input.value.replace(/\D/g, '');
			if (digits.length <= 1) {
				input.value = '';
				e.preventDefault();
			}
		}
	}

	function onFocus() {
		if (!input.value) {
			input.value = '+7 (';
			setTimeout(() => {
				try {
					input.setSelectionRange(input.value.length, input.value.length);
				} catch (_) {}
			}, 0);
		}
	}

	function onBlur() {
		const digits = input.value.replace(/\D/g, '');
		if (digits.length <= 1) {
			input.value = '';
		}
	}

	input.addEventListener('input', onInput);
	input.addEventListener('keydown', onKeyDown);
	input.addEventListener('focus', onFocus);
	input.addEventListener('blur', onBlur);

	// Если уже есть предзаполненное значение (например, из профиля покупателя)
	if (input.value) {
		input.value = formatPhone(input.value);
	}
}

/**
 * Инициализация маски для всех полей телефона на странице
 */
export function initAllPhoneMasks() {
	document.querySelectorAll('input[type="tel"], [data-phone-mask]').forEach((input) => {
		initPhoneMask(input);
	});
}
