/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { MatDateFormats } from '../core/index';

export const MAT_MOMENT_DATE_FORMATS: MatDateFormats = {
  parse: {
    date: ['YYYY-MM-DD', 'YYYY/MM/DD', 'll'],
    datetime: ['YYYY-MM-DD HH:mm', 'YYYY/MM/DD HH:mm', 'll h:mma'],
    time: ['H:mm', 'HH:mm', 'h:mm a', 'hh:mm a']
  },
  display: {
    date: 'll',
    datetime: 'll h:mma',
    time: 'h:mm a',
    dateA11yLabel: 'LL',
    monthDayLabel: 'MMM D',
    monthDayA11yLabel: 'MMMM D',
    monthYearLabel: 'MMMM YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
    timeLabel: 'HH:mm'
  }
};
