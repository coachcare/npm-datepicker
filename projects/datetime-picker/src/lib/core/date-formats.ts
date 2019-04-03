/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { InjectionToken } from '@angular/core';

export interface MatDateFormats {
  parse: {
    date: any;
    datetime: any;
    time: any;
  };
  display: {
    date: any;
    datetime: any;
    time: any;
    dateA11yLabel: any;
    monthDayLabel: any;
    monthDayA11yLabel: any;
    monthYearLabel: any;
    monthYearA11yLabel: any;
    timeLabel: any;
  };
}

export const MAT_DATE_FORMATS = new InjectionToken<MatDateFormats>('mat-date-formats');
