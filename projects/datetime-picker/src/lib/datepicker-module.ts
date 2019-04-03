/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCalendar } from './calendar';
import { MatCalendarBody } from './calendar-body';
import { MatClockView } from './clock-view';
import { MAT_DATEPICKER_SCROLL_STRATEGY_FACTORY_PROVIDER, MatDatepicker, MatDatepickerContent } from './datepicker';
import { MatDatepickerInput } from './datepicker-input';
import { MatDatepickerToggle, MatDatepickerToggleIcon } from './datepicker-toggle';
import { MatMonthView } from './month-view';
import { MatYearView } from './year-view';
import { MatYearsView } from './years-view';

@NgModule({
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, OverlayModule, A11yModule],
  exports: [
    MatCalendar,
    MatCalendarBody,
    MatDatepicker,
    MatDatepickerContent,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepickerToggleIcon,
    MatClockView,
    MatMonthView,
    MatYearView,
    MatYearsView
  ],
  declarations: [
    MatCalendar,
    MatCalendarBody,
    MatDatepicker,
    MatDatepickerContent,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepickerToggleIcon,
    MatClockView,
    MatMonthView,
    MatYearView,
    MatYearsView
  ],
  providers: [MAT_DATEPICKER_SCROLL_STRATEGY_FACTORY_PROVIDER],
  entryComponents: [MatDatepickerContent]
})
export class MatDatepickerModule {}
