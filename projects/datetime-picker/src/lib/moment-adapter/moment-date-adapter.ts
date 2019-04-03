/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Inject, Injectable, Optional } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '../core/index';

// TODO(mmalerba): See if we can clean this up at some point.
import * as momentNs from 'moment-timezone';
export type Moment = momentNs.Moment;
const moment = momentNs;

/** Creates an array and fills it with values. */
function range<T>(length: number, valueFunction: (index: number) => T): T[] {
  const valuesArray = Array(length);
  for (let i = 0; i < length; i++) {
    valuesArray[i] = valueFunction(i);
  }
  return valuesArray;
}

/** Adapts Moment.js Dates for use with Angular Material. */
@Injectable()
export class MomentDateAdapter extends DateAdapter<Moment> {
  // Note: all of the methods that accept a `Moment` input parameter immediately call `this.clone`
  // on it. This is to ensure that we're working with a `Moment` that has the correct locale setting
  // while avoiding mutating the original object passed to us. Just calling `.locale(...)` on the
  // input would mutate the object.

  private _localeData: {
    firstDayOfWeek: number;
    longMonths: string[];
    shortMonths: string[];
    dates: string[];
    longDaysOfWeek: string[];
    shortDaysOfWeek: string[];
    narrowDaysOfWeek: string[];
  };

  constructor(
    @Optional()
    @Inject(MAT_DATE_LOCALE)
    dateLocale: string
  ) {
    super();
    this.setLocale(dateLocale || moment.locale());
  }

  setLocale(locale: string) {
    super.setLocale(locale);

    const momentLocaleData = moment.localeData(locale);
    this._localeData = {
      firstDayOfWeek: momentLocaleData.firstDayOfWeek(),
      longMonths: momentLocaleData.months(),
      shortMonths: momentLocaleData.monthsShort(),
      dates: range(31, i => this.createDate(2017, 0, i + 1).format('D')),
      longDaysOfWeek: momentLocaleData.weekdays(),
      shortDaysOfWeek: momentLocaleData.weekdaysShort(),
      narrowDaysOfWeek: momentLocaleData.weekdaysMin()
    };
  }

  getYear(date: Moment): number {
    return this.clone(date).year();
  }

  getMonth(date: Moment): number {
    return this.clone(date).month();
  }

  getDate(date: Moment): number {
    return this.clone(date).date();
  }

  getHours(date: Moment): number {
    return this.clone(date).hours();
  }

  setHours(date: Moment, value: number): void {
    date.hours(value);
  }

  getMinutes(date: Moment): number {
    return this.clone(date).minutes();
  }

  setMinutes(date: Moment, value: number): void {
    date.minutes(value);
  }

  setSeconds(date: Moment, value: number, ms?: number): void {
    date.seconds(value);
    if (ms) {
      date.milliseconds(ms);
    }
  }

  getDayOfWeek(date: Moment): number {
    return this.clone(date).day();
  }

  getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    // Moment.js doesn't support narrow month names, so we just use short if narrow is requested.
    return style === 'long' ? this._localeData.longMonths : this._localeData.shortMonths;
  }

  getDateNames(): string[] {
    return this._localeData.dates;
  }

  getHourNames(): string[] {
    // TODO SUPPORTS_INTL_API
    return range(24, String);
  }

  getMinuteNames(): string[] {
    // TODO SUPPORTS_INTL_API
    return range(60, String);
  }

  getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
    if (style === 'long') {
      return this._localeData.longDaysOfWeek;
    }
    if (style === 'short') {
      return this._localeData.shortDaysOfWeek;
    }
    return this._localeData.narrowDaysOfWeek;
  }

  getYearName(date: Moment): string {
    return this.clone(date).format('YYYY');
  }

  getFirstDayOfWeek(): number {
    return this._localeData.firstDayOfWeek;
  }

  getNumDaysInMonth(date: Moment): number {
    return this.clone(date).daysInMonth();
  }

  clone(date: Moment): Moment {
    const obj = date ? moment(date) : moment();
    return obj.locale(this.locale);
  }

  createDate(year: number, month: number, date: number, hours?: number, minutes?: number): Moment {
    // Moment.js will create an invalid date if any of the components are out of bounds, but we
    // explicitly check each case so we can throw more descriptive errors.
    if (month < 0 || month > 11) {
      throw Error(`Invalid month index "${month}". Month index has to be between 0 and 11.`);
    }

    if (date < 1) {
      throw Error(`Invalid date "${date}". Date has to be greater than 0.`);
    }

    const result = moment({ year, month, date, hours, minutes, seconds: 0 });

    // If the result isn't valid, the date must have been out of bounds for this month.
    if (!result.isValid()) {
      throw Error(`Invalid date "${date}" for month with index "${month}".`);
    }

    return result.locale(this.locale);
  }

  today(): Moment {
    return moment().locale(this.locale);
  }

  parse(value: any, parseFormat: string | string[]): Moment | null {
    if (parseFormat && value && typeof value === 'string') {
      return moment(value, parseFormat, this.locale, true);
    }
    return value ? moment(value).locale(this.locale) : null;
  }

  format(date: Moment, displayFormat: string): string {
    date = this.clone(date);
    if (!this.isValid(date)) {
      throw Error('MomentDateAdapter: Cannot format invalid date.');
    }
    return date.format(displayFormat);
  }

  addCalendarYears(date: Moment, years: number): Moment {
    return this.clone(date).add({ years });
  }

  addCalendarMonths(date: Moment, months: number): Moment {
    return this.clone(date).add({ months });
  }

  addCalendarDays(date: Moment, days: number): Moment {
    return this.clone(date).add({ days });
  }

  addCalendarHours(date: Moment, hours: number): Moment {
    return this.clone(date).add({ hours });
  }

  addCalendarMinutes(date: Moment, minutes: number): Moment {
    return this.clone(date).add({ minutes });
  }

  toIso8601(date: Moment): string {
    return this.clone(date).format();
  }

  /**
   * Returns the given value if given a valid Moment or null. Deserializes valid ISO 8601 strings
   * (https://www.ietf.org/rfc/rfc3339.txt) and valid Date objects into valid Moments and empty
   * string into null. Returns an invalid date for all other values.
   */
  deserialize(value: any): Moment | null {
    let date;
    if (value instanceof Date) {
      date = moment(value);
    }
    if (typeof value === 'string') {
      if (!value) {
        return null;
      }
      date = moment(value, moment.ISO_8601).locale(this.locale);
    }
    if (date && this.isValid(date)) {
      return date;
    }
    return super.deserialize(value);
  }

  isDateInstance(obj: any): boolean {
    return moment.isMoment(obj) ? this.clone(obj).isValid() : moment(obj).isValid();
  }

  isValid(date: Moment): boolean {
    return this.clone(date).isValid();
  }

  invalid(): Moment {
    return moment.invalid();
  }
}
