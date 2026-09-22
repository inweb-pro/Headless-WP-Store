/**
 * Маска ввода серии и номера паспорта: 0000-000000 (10 цифр).
 * Разрешает ввод только цифр, автоматически форматирует дефис после 4 цифр,
 * поддерживает вставку из буфера обмена и удаление.
 */
export function initPassportMask(input) {
	if (!input) return;

	function formatPassport(value) {
		const digits = value.replace(/\D/g, '').slice(0, 10);
		if (digits.length <= 4) {
			return digits;
		}
		return digits.slice(0, 4) + '-' + digits.slice(4, 10);
	}

	function onInput() {
		const oldVal = input.value;
		const start = input.selectionStart || 0;
		const digitsBeforeCursor = oldVal.slice(0, start).replace(/\D/g, '').length;

		const formatted = formatPassport(oldVal);
		input.value = formatted;

		// Вычисляем корректную позицию курсора после форматирования
		let newPos = 0;
		let digitsCount = 0;
		for (let i = 0; i < formatted.length; i++) {
			if (/\d/.test(formatted[i])) {
				digitsCount++;
			}
			if (digitsCount === digitsBeforeCursor) {
				newPos = i + 1;
				break;
			}
		}
		if (digitsBeforeCursor === 0) {
			newPos = 0;
		} else if (digitsCount < digitsBeforeCursor) {
			newPos = formatted.length;
		}

		try {
			input.setSelectionRange(newPos, newPos);
		} catch (_) {}
	}

	function onKeyDown(e) {
		// Разрешаем служебные и навигационные клавиши
		if (
			e.key === 'Backspace' ||
			e.key === 'Delete' ||
			e.key === 'Tab' ||
			e.key === 'Escape' ||
			e.key === 'Enter' ||
			e.key === 'ArrowLeft' ||
			e.key === 'ArrowRight' ||
			e.key === 'ArrowUp' ||
			e.key === 'ArrowDown' ||
			e.key === 'Home' ||
			e.key === 'End' ||
			e.ctrlKey ||
			e.metaKey
		) {
			// Специальная обработка Backspace сразу после дефиса (позиция 5):
			// Если курсор стоит после '-', при Backspace удаляем 4-ю цифру
			if (e.key === 'Backspace' && input.selectionStart === 5 && input.selectionEnd === 5) {
				e.preventDefault();
				const val = input.value;
				const digits = val.replace(/\D/g, '');
				const newDigits = digits.slice(0, 3) + digits.slice(4);
				input.value = formatPassport(newDigits);
				try {
					input.setSelectionRange(3, 3);
				} catch (_) {}
			}
			return;
		}

		// Запрещаем ввод любых символов кроме цифр (0-9)
		if (!/^\d$/.test(e.key)) {
			e.preventDefault();
		}
	}

	function onPaste(e) {
		e.preventDefault();
		const pastedText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
		const pastedDigits = pastedText.replace(/\D/g, '');
		if (!pastedDigits) return;

		const start = input.selectionStart || 0;
		const end = input.selectionEnd || 0;
		const currentVal = input.value;
		const before = currentVal.slice(0, start).replace(/\D/g, '');
		const after = currentVal.slice(end).replace(/\D/g, '');
		const combined = (before + pastedDigits + after).slice(0, 10);
		input.value = formatPassport(combined);

		// Перемещаем курсор после вставленного фрагмента
		const newDigitsBeforeCursor = (before + pastedDigits).slice(0, 10).length;
		let newPos = newDigitsBeforeCursor <= 4 ? newDigitsBeforeCursor : newDigitsBeforeCursor + 1;
		try {
			input.setSelectionRange(newPos, newPos);
		} catch (_) {}
	}

	input.addEventListener('keydown', onKeyDown);
	input.addEventListener('input', onInput);
	input.addEventListener('paste', onPaste);

	// Если уже есть предзаполненное значение (например, из профиля покупателя)
	if (input.value) {
		input.value = formatPassport(input.value);
	}
}
