/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { MatDateFormats } from './date-formats';

export const MAT_NATIVE_DATE_FORMATS: MatDateFormats = {
  parse: {
    date: null,
    datetime: null,
    time: null
  },
  display: {
    date: { year: 'numeric', month: 'numeric', day: 'numeric' },
    datetime: {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hours: 'numeric',
      minutes: 'numeric'
    },
    time: { hours: 'numeric', minutes: 'numeric' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthDayLabel: { month: 'short', day: 'numeric' },
    monthDayA11yLabel: { month: 'long', day: 'numeric' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
    timeLabel: { hours: 'numeric', minutes: 'numeric' }
  }
};
