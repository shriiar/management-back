import * as moment from 'moment-timezone';
import { DEFAULT_TIMEZONE } from 'src/common/config/timezone.config';

export function formatedDate(date: string) {
    const [month, day, year] = date.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function getCurrentMonthStartDate() {
    return moment().tz(DEFAULT_TIMEZONE).startOf('month').format('YYYY-MM-DD');
}

export function getCurrentMonthEndDate() {
    return moment().tz(DEFAULT_TIMEZONE).endOf('month').format('YYYY-MM-DD');
}