/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface MatDatepickerIntlCatalog {
  calendarLabel: string;
  openCalendarLabel: string;
  prevMonthLabel: string;
  nextMonthLabel: string;
  prevYearLabel: string;
  nextYearLabel: string;
  setToAMLabel: string;
  setToPMLabel: string;
  switchToMinuteViewLabel: string;
  switchToHourViewLabel: string;
  switchToMonthViewLabel: string;
  switchToYearViewLabel: string;
  switchToYearsViewLabel: string;
  buttonSubmitText: string;
  buttonSubmitLabel: string;
  buttonCancelText: string;
  buttonCancelLabel: string;
}

/** Datepicker data that requires internationalization. */
@Injectable({ providedIn: 'root' })
export class MatDatepickerIntl implements MatDatepickerIntlCatalog {
  /**
   * Stream that emits whenever the labels here are changed. Use this to notify
   * components if the labels have changed after initialization.
   */
  readonly changes = new Subject<void>();

  /** A label for the calendar popup (used by screen readers). */
  calendarLabel = 'Calendar';

  /** A label for the button used to open the calendar popup (used by screen readers). */
  openCalendarLabel = 'Open calendar';

  /** A label for the previous month button (used by screen readers). */
  prevMonthLabel = 'Previous month';

  /** A label for the next month button (used by screen readers). */
  nextMonthLabel = 'Next month';

  /** A label for the previous year button (used by screen readers). */
  prevYearLabel = 'Previous year';

  /** A label for the next year button (used by screen readers). */
  nextYearLabel = 'Next year';

  /** A label for the 'AM' button (used by screen readers). */
  setToAMLabel = 'Set date to AM';

  /** A label for the 'PM' button (used by screen readers). */
  setToPMLabel = 'Set date to PM';

  /** A label for the 'switch to minute view' button (used by screen readers). */
  switchToMinuteViewLabel = 'Change to minute view';

  /** A label for the 'switch to hour view' button (used by screen readers). */
  switchToHourViewLabel = 'Change to hour view';

  /** A label for the 'switch to month view' button (used by screen readers). */
  switchToMonthViewLabel = 'Change to month view';

  /** A label for the 'switch to year view' button (used by screen readers). */
  switchToYearViewLabel = 'Change to year view';

  /** A label for the 'switch to years view' button (used by screen readers). */
  switchToYearsViewLabel = 'Change to years view';

  /** Text for the 'submit' button. */
  buttonSubmitText = 'Ok';

  /** A label for the 'submit' button (used by screen readers). */
  buttonSubmitLabel = 'Choose the current date';

  /** Text for the 'cancel' button. */
  buttonCancelText = 'Cancel';

  /** A label for the 'cancel' button (used by screen readers). */
  buttonCancelLabel = 'Cancel the date selection';
}
