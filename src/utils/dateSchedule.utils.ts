// Generates a list of dates either in the past ('back') or future ('next') for a given number of days.
// daysCount: Number of dates to generate
// type: 'back' for past dates, 'next' for future dates
export const generateDates = (daysCount: number, type: 'back' | 'next'): string[] => {
	const dates: string[] = [];
	const currentDate = new Date();

	// Determines the direction: -1 for 'back' (past), 1 for 'next' (future)
	const offset = type === 'back' ? -1 : 1;
	for (let i = 0; i < daysCount; i++) {
		const targetDate = new Date(currentDate);
		// Adjusts the date based on the type and index
		targetDate.setDate(targetDate.getDate() + offset * i);
		// Pushes the date in 'YYYY-MM-DD' format
		dates.push(targetDate.toISOString().slice(0, 10));
	}

	return dates;
};

// Returns the date a given number of days ahead from the current date.
// day: The number of days to add to the current date.
export const getDaysAhead = (day: number): string => {
	const currentDate = new Date();
	// Adjusts the current date by adding the number of days
	currentDate.setDate(currentDate.getDate() + day);
	// Returns the date in 'YYYY-MM-DD' format
	return currentDate.toISOString().slice(0, 10);
};

// Returns the date a given number of days ago from the current date.
// days: The number of days to subtract from the current date.
export const getDaysAgo = (days: number): string => {
	const currentDate = new Date();
	// Adjusts the current date by subtracting the number of days
	currentDate.setDate(currentDate.getDate() - days);
	// Returns the date in 'YYYY-MM-DD' format
	return currentDate.toISOString().slice(0, 10);
};

// Returns the last 12 months in 'Month Year' format (e.g., 'January 2024') starting from the current month.
export const get12Months = (): string[] => {
	// Gets the current month and year in 'Month Year' format
	const currentMonth = new Date().toLocaleString('default', {
		month: 'long',
		year: 'numeric',
	});
	const months: string[] = [currentMonth];

	// Iterates through the previous 11 months
	for (let i = 1; i < 12; i++) {
		const targetDate = new Date(currentMonth);
		// Decreases the month value by 'i'
		targetDate.setMonth(targetDate.getMonth() - i);
		// Adds the previous month in 'Month Year' format to the array
		months.push(targetDate.toLocaleString('default', {
			month: 'long',
			year: 'numeric',
		}));
	}

	// Returns the list in reverse order, starting from the oldest month
	return months.reverse();
};

// Returns all the dates in a specified month in 'YYYY-MM-DD' format.
// yearMonth: A string representing the month and year in 'Month Year' format (e.g., 'January 2024').
export const getDatesInMonth = (yearMonth: string): string[] => {
	const [month, year] = yearMonth.split(' ');
	// Creates the first and last date of the given month
	const startDate = new Date(`${year}-${month}-01`);
	const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
	const dates = [];

	// Iterates through all dates in the month
	for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
		// Pushes each date in 'YYYY-MM-DD' format to the array
		const formattedDate = date.toISOString().split('T')[0];
		dates.push(formattedDate);
	}

	return dates;
};

// Returns all the dates for the current month in 'YYYY-MM-DD' format.
export const getCurrentMonthDates = (): string[] => {
	const currentDate = new Date();
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth() + 1; // Month index is zero-based in JavaScript

	// First and last date of the current month
	const startDate = new Date(year, month - 1, 1); // First day of the month
	const endDate = new Date(year, month, 0); // Last day of the month

	const dates = [];

	// Iterates from the first day to the last day of the current month
	for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
		// Pushes each date in 'YYYY-MM-DD' format to the array
		const dateString = date.toISOString().split('T')[0];
		dates.push(dateString);
	}

	return dates;
};
