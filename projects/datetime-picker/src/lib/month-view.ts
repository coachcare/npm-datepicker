/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  DOWN_ARROW,
  END,
  ENTER,
  HOME,
  LEFT_ARROW,
  PAGE_DOWN,
  PAGE_UP,
  RIGHT_ARROW,
  SPACE,
  UP_ARROW
} from '@angular/cdk/keycodes';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  Optional,
  Output,
  ViewEncapsulation,
  ViewChild
} from '@angular/core';
import { Directionality } from '@angular/cdk/bidi';
import { MatCalendarBody, MatCalendarCell } from './calendar-body';
import { MAT_DATE_FORMATS, MatDateFormats } from './core/index';
import { DateAdapter } from './core/index';
import { matDatepickerAnimations } from './datepicker-animations';
import { createMissingDateImplError } from './datepicker-errors';

const DAYS_PER_WEEK = 7;

/**
 * An internal component used to display a single month in the datepicker.
 * @docs-private
 */
@Component({
  selector: 'mat-month-view',
  templateUrl: 'month-view.html',
  exportAs: 'matMonthView',
  animations: [matDatepickerAnimations.slideCalendar],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false
})
export class MatMonthView<D> implements AfterContentInit {
  /**
   * The date to display in this month view (everything other than the month and year is ignored).
   */
  @Input()
  get activeDate(): D {
    return this._activeDate;
  }
  set activeDate(value: D) {
    const oldActiveDate = this._activeDate;
    const validDate = this._getValidDateOrNull(this._dateAdapter.deserialize(value)) || this._dateAdapter.today();
    this._activeDate = this._dateAdapter.clampDate(validDate, this.minDate, this.maxDate);
    this._activeValue = this._getDateInCurrentMonth(this.activeDate);

    if (oldActiveDate && !this._hasSameMonthAndYear(oldActiveDate, this._activeDate)) {
      this._init();
    }
  }
  private _activeDate: D;

  /** The currently selected date. */
  @Input()
  get selected(): D | null {
    return this._selected;
  }
  set selected(value: D | null) {
    this._selected = this._getValidDateOrNull(this._dateAdapter.deserialize(value));
    this._selectedDate = this._getDateInCurrentMonth(this._selected);
  }
  private _selected: D | null;

  /** The minimum selectable date. */
  @Input()
  get minDate(): D | null {
    return this._minDate;
  }
  set minDate(value: D | null) {
    this._minDate = this._getValidDateOrNull(this._dateAdapter.deserialize(value));
  }
  private _minDate: D | null;

  /** The maximum selectable date. */
  @Input()
  get maxDate(): D | null {
    return this._maxDate;
  }
  set maxDate(value: D | null) {
    this._maxDate = this._getValidDateOrNull(this._dateAdapter.deserialize(value));
  }
  private _maxDate: D | null;

  /** A function used to filter which dates are selectable. */
  @Input()
  dateFilter: (date: D, unit?: string) => boolean;

  /** Animations handler */
  @Input()
  animationDir: string;

  /** Emits when a new date is selected. */
  @Output()
  readonly selectedChange = new EventEmitter<D | null>();

  /** Emits when any date is selected. */
  @Output()
  readonly _userSelection = new EventEmitter<void>();

  /** Emits when any date is activated. */
  @Output()
  readonly activeDateChange = new EventEmitter<D>();

  /** The body of calendar table */
  @ViewChild(MatCalendarBody)
  _matCalendarBody: MatCalendarBody;

  /** The label for this month (e.g. "January 2017"). */
  _monthLabel: string;

  /** Grid of calendar cells representing the dates of the month. */
  _weeks: MatCalendarCell[][];

  /** The number of blank cells in the first row before the 1st of the month. */
  _firstWeekOffset: number;

  /** The active date on the calendar. */
  _activeValue: number | null;

  /**
   * The date of the month that the currently selected Date falls on.
   * Null if the currently selected Date is in another month.
   */
  _selectedDate: number | null;

  /** The date of the month that today falls on. Null if today is in another month. */
  _todayDate: number | null;

  /** The names of the weekdays. */
  _weekdays: { long: string; narrow: string }[];

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    @Optional()
    @Inject(MAT_DATE_FORMATS)
    private _dateFormats: MatDateFormats,
    @Optional() public _dateAdapter: DateAdapter<D>,
    @Optional() private _dir?: Directionality
  ) {
    if (!this._dateAdapter) {
      throw createMissingDateImplError('DateAdapter');
    }
    if (!this._dateFormats) {
      throw createMissingDateImplError('MAT_DATE_FORMATS');
    }

    const firstDayOfWeek = this._dateAdapter.getFirstDayOfWeek();
    const narrowWeekdays = this._dateAdapter.getDayOfWeekNames('narrow');
    const longWeekdays = this._dateAdapter.getDayOfWeekNames('long');

    // Rotate the labels for days of the week based on the configured first day of the week.
    const weekdays = longWeekdays.map((long, i) => {
      return { long, narrow: narrowWeekdays[i].slice(0, 1) };
    });
    this._weekdays = weekdays.slice(firstDayOfWeek).concat(weekdays.slice(0, firstDayOfWeek));
  }

  ngAfterContentInit() {
    this._init();
  }

  /** Handles when a new date is selected. */
  _dateSelected(date: number) {
    if (this._selectedDate !== date) {
      const selectedYear = this._dateAdapter.getYear(this.activeDate);
      const selectedMonth = this._dateAdapter.getMonth(this.activeDate);
      const selectedHours = this._dateAdapter.getHours(this.activeDate);
      const selectedMinutes = this._dateAdapter.getMinutes(this.activeDate);
      const selectedDate = this._dateAdapter.createDate(
        selectedYear,
        selectedMonth,
        date,
        selectedHours,
        selectedMinutes
      );

      this.selectedChange.emit(selectedDate);
    }

    this._userSelection.emit();
  }

  /** Handles keydown events on the calendar body when calendar is in month view. */
  _handleCalendarBodyKeydown(event: KeyboardEvent): void {
    // TODO(mmalerba): We currently allow keyboard navigation to disabled dates, but just prevent
    // disabled ones from being selected. This may not be ideal, we should look into whether
    // navigation should skip over disabled dates, and if so, how to implement that efficiently.

    const oldActiveDate = this._activeDate;

    const isRtl = this._isRtl();

    switch (event.keyCode) {
      case LEFT_ARROW:
        this.activeDate = this._dateAdapter.addCalendarDays(this._activeDate, isRtl ? 1 : -1);
        break;
      case RIGHT_ARROW:
        this.activeDate = this._dateAdapter.addCalendarDays(this._activeDate, isRtl ? -1 : 1);
        break;
      case UP_ARROW:
        this.activeDate = this._dateAdapter.addCalendarDays(this._activeDate, -7);
        break;
      case DOWN_ARROW:
        this.activeDate = this._dateAdapter.addCalendarDays(this._activeDate, 7);
        break;
      case HOME:
        this.activeDate = this._dateAdapter.addCalendarDays(
          this._activeDate,
          1 - this._dateAdapter.getDate(this._activeDate)
        );
        break;
      case END:
        this.activeDate = this._dateAdapter.addCalendarDays(
          this._activeDate,
          this._dateAdapter.getNumDaysInMonth(this._activeDate) - this._dateAdapter.getDate(this._activeDate)
        );
        break;
      case PAGE_UP:
        this.activeDate = event.altKey
          ? this._dateAdapter.addCalendarYears(this._activeDate, -1)
          : this._dateAdapter.addCalendarMonths(this._activeDate, -1);
        break;
      case PAGE_DOWN:
        this.activeDate = event.altKey
          ? this._dateAdapter.addCalendarYears(this._activeDate, 1)
          : this._dateAdapter.addCalendarMonths(this._activeDate, 1);
        break;
      case ENTER:
      case SPACE:
        if (!this.dateFilter || this.dateFilter(this._activeDate)) {
          this._dateSelected(this._dateAdapter.getDate(this._activeDate));
          this._userSelection.emit();
          // Prevent unexpected default actions such as form submission.
          event.preventDefault();
        }
        return;
      default:
        // Don't prevent default or focus active cell on keys that we don't explicitly handle.
        return;
    }

    if (this._dateAdapter.compareDate(oldActiveDate, this.activeDate)) {
      this.activeDateChange.emit(this.activeDate);
    }

    this._focusActiveCell();
    // Prevent unexpected default actions such as form submission.
    event.preventDefault();
  }

  /** Initializes this month view. */
  _init() {
    this._activeValue = this._getDateInCurrentMonth(this.activeDate);
    this._selectedDate = this._getDateInCurrentMonth(this.selected);
    this._todayDate = this._getDateInCurrentMonth(this._dateAdapter.today());
    this._monthLabel = this._dateAdapter
      .getMonthNames('short')
      [this._dateAdapter.getMonth(this.activeDate)].toLocaleUpperCase();

    const firstOfMonth = this._dateAdapter.createDate(
      this._dateAdapter.getYear(this.activeDate),
      this._dateAdapter.getMonth(this.activeDate),
      1
    );
    this._firstWeekOffset =
      (DAYS_PER_WEEK + this._dateAdapter.getDayOfWeek(firstOfMonth) - this._dateAdapter.getFirstDayOfWeek()) %
      DAYS_PER_WEEK;

    this._createWeekCells();
    this._changeDetectorRef.markForCheck();
  }

  /** Focuses the active cell after the microtask queue is empty. */
  _focusActiveCell() {
    this._matCalendarBody._focusActiveCell();
  }

  /** Creates MatCalendarCells for the dates in this month. */
  private _createWeekCells() {
    const daysInMonth = this._dateAdapter.getNumDaysInMonth(this.activeDate);
    const dateNames = this._dateAdapter.getDateNames();
    this._weeks = [[]];
    for (let i = 0, cell = this._firstWeekOffset; i < daysInMonth; i++, cell++) {
      if (cell === DAYS_PER_WEEK) {
        this._weeks.push([]);
        cell = 0;
      }
      const date = this._dateAdapter.createDate(
        this._dateAdapter.getYear(this.activeDate),
        this._dateAdapter.getMonth(this.activeDate),
        i + 1
      );
      const enabled = this._shouldEnableDate(date);
      const ariaLabel = this._dateAdapter.format(date, this._dateFormats.display.dateA11yLabel);
      this._weeks[this._weeks.length - 1].push(new MatCalendarCell(i + 1, dateNames[i], ariaLabel, enabled));
    }
  }

  /** Date filter for the month */
  private _shouldEnableDate(date: D): boolean {
    return (
      !!date &&
      (!this.dateFilter || this.dateFilter(date, 'day')) &&
      (!this.minDate || this._dateAdapter.compareDate(date, this.minDate, 'day') >= 0) &&
      (!this.maxDate || this._dateAdapter.compareDate(date, this.maxDate, 'day') <= 0)
    );
  }

  /**
   * Gets the date in this month that the given Date falls on.
   * Returns null if the given Date is in another month.
   */
  private _getDateInCurrentMonth(date: D | null): number | null {
    return date && this._hasSameMonthAndYear(date, this.activeDate) ? this._dateAdapter.getDate(date) : null;
  }

  /** Checks whether the 2 dates are non-null and fall within the same month of the same year. */
  private _hasSameMonthAndYear(d1: D | null, d2: D | null): boolean {
    return !!(d1 && d2 && this._dateAdapter.compareDate(d1, d2, 'month') === 0);
  }

  /**
   * @param obj The object to check.
   * @returns The given object if it is both a date instance and valid, otherwise null.
   */
  private _getValidDateOrNull(obj: any): D | null {
    return this._dateAdapter.isDateInstance(obj) && this._dateAdapter.isValid(obj) ? obj : null;
  }

  /** Determines whether the user has the RTL layout direction. */
  private _isRtl() {
    return this._dir && this._dir.value === 'rtl';
  }
}
