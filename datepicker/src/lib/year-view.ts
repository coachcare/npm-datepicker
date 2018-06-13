/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

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
  ViewEncapsulation
} from '@angular/core';
import { MatCalendarCell } from './calendar-body';
import { coerceDateProperty } from './coerce-date-property';
import { MAT_DATE_FORMATS, MatDateFormats } from './core/index';
import { DateAdapter } from './core/index';
import { slideCalendar } from './datepicker-animations';
import { createMissingDateImplError } from './datepicker-errors';

/**
 * An internal component used to display a single year in the datepicker.
 * @docs-private
 */
@Component({
  selector: 'mat-year-view',
  templateUrl: 'year-view.html',
  animations: [slideCalendar],
  encapsulation: ViewEncapsulation.None,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatYearView<D> implements AfterContentInit {
  /** The date to display in this year view (everything other than the year is ignored). */
  @Input()
  get activeDate(): D {
    return this._activeDate;
  }
  set activeDate(value: D) {
    const oldActiveDate = this._activeDate;
    this._activeDate =
      coerceDateProperty(this._dateAdapter, value) || this._dateAdapter.today();

    if (
      oldActiveDate &&
      this._dateAdapter.getYear(oldActiveDate) !==
        this._dateAdapter.getYear(this._activeDate)
    ) {
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
    this._selected = coerceDateProperty(this._dateAdapter, value);
    this._selectedMonth = this._getMonthInCurrentYear(this._selected);
  }
  private _selected: D | null;

  /** A function used to filter which dates are selectable. */
  @Input() dateFilter: (date: D, unit?: string) => boolean;

  /** Animations handler */
  @Input() animationDir: string;

  /** Emits when a new month is selected. */
  @Output() selectedChange = new EventEmitter<D>();

  /** Grid of calendar cells representing the months of the year. */
  _months: MatCalendarCell[][];

  /** The label for this year (e.g. "2017"). */
  _yearLabel: string;

  /** The month in this year that today falls on. Null if today is in a different year. */
  _todayMonth: number | null;

  /**
   * The month in this year that the selected Date falls on.
   * Null if the selected Date is in a different year.
   */
  _selectedMonth: number | null;

  constructor(
    @Optional() public _dateAdapter: DateAdapter<D>,
    @Optional()
    @Inject(MAT_DATE_FORMATS)
    private _dateFormats: MatDateFormats,
    private _changeDetectorRef: ChangeDetectorRef
  ) {
    if (!this._dateAdapter) {
      throw createMissingDateImplError('DateAdapter');
    }
    if (!this._dateFormats) {
      throw createMissingDateImplError('MAT_DATE_FORMATS');
    }
  }

  ngAfterContentInit() {
    this._init();
  }

  /** Handles when a new month is selected. */
  _monthSelected(month: number) {
    this.selectedChange.emit(this._createMonthDate(month));
  }

  /** Initializes this year view. */
  _init() {
    this._selectedMonth = this._getMonthInCurrentYear(this.selected);
    this._todayMonth = this._getMonthInCurrentYear(this._dateAdapter.today());
    this._yearLabel = this._dateAdapter.getYearName(this.activeDate);

    const monthNames = this._dateAdapter.getMonthNames('short');
    // First row of months only contains 5 elements so we can fit the year label on the same row.
    this._months = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]].map(row =>
      row.map(month => this._createCellForMonth(month, monthNames[month]))
    );

    this._changeDetectorRef.markForCheck();
  }

  /**
   * Gets the month in this year that the given Date falls on.
   * Returns null if the given Date is in another year.
   */
  private _getMonthInCurrentYear(date: D | null) {
    return date &&
      this._dateAdapter.getYear(date) === this._dateAdapter.getYear(this.activeDate)
      ? this._dateAdapter.getMonth(date)
      : null;
  }

  /** Creates an MatCalendarCell for the given month. */
  private _createCellForMonth(month: number, monthName: string) {
    const ariaLabel = this._dateAdapter.format(
      this._dateAdapter.createDate(this._dateAdapter.getYear(this.activeDate), month, 1),
      this._dateFormats.display.monthYearA11yLabel
    );
    return new MatCalendarCell(
      month,
      monthName.toLocaleUpperCase(),
      ariaLabel,
      this._isMonthEnabled(month)
    );
  }

  /** Whether the given month is enabled. */
  private _isMonthEnabled(month: number) {
    if (!this.dateFilter) {
      return true;
    }

    const date = this._createMonthDate(month);

    return this.dateFilter(date, 'month') ? true : false;
  }

  private _createMonthDate(month: number): D {
    const daysInMonth = this._dateAdapter.getNumDaysInMonth(
      this._dateAdapter.createDate(this._dateAdapter.getYear(this.activeDate), month, 1)
    );
    const selectedYear = this._dateAdapter.getYear(this.activeDate);
    const selectedDay = this._dateAdapter.getDate(this.activeDate);
    const selectedHours = this._dateAdapter.getHours(this.activeDate);
    const selectedMinutes = this._dateAdapter.getMinutes(this.activeDate);

    return this._dateAdapter.createDate(
      selectedYear,
      month,
      Math.min(selectedDay, daysInMonth),
      selectedHours,
      selectedMinutes
    );
  }
}
