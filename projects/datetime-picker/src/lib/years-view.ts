/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DOWN_ARROW, ENTER, UP_ARROW } from '@angular/cdk/keycodes';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Optional,
  Output,
  ViewEncapsulation
} from '@angular/core';
import { Subscription } from 'rxjs';
import { of as obsOf, fromEvent } from 'rxjs';
import { mergeMap, sampleTime } from 'rxjs/operators';
import { MAT_DATE_FORMATS, MatDateFormats } from './core/index';
import { DateAdapter } from './core/index';
import { createMissingDateImplError } from './datepicker-errors';

const YEAR_LINE_HEIGHT = 35;
const YEAR_SIZE = 40;

/**
 * An internal component used to display a year selector in the datepicker.
 * @docs-private
 */
@Component({
  selector: 'mat-years-view',
  templateUrl: 'years-view.html',
  exportAs: 'matYearsView',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false
})
export class MatYearsView<D> implements AfterContentInit, OnDestroy {
  /** The date to display in this view (everything other than the year is ignored). */
  @Input()
  get activeDate(): D {
    return this._activeDate;
  }
  set activeDate(value: D) {
    let oldActiveDate = this._activeDate;
    const validDate = this._getValidDateOrNull(this._dateAdapter.deserialize(value)) || this._dateAdapter.today();
    this._activeDate = this._dateAdapter.clampDate(validDate, this.minDate, this.maxDate);

    if (oldActiveDate && this._dateAdapter.getYear(oldActiveDate) != this._dateAdapter.getYear(this._activeDate)) {
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
    this._selectedYear = this._selected && this._dateAdapter.getYear(this._selected);
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

  /** Emits when a new month is selected. */
  @Output()
  readonly selectedChange = new EventEmitter<D>();

  /** List of years. */
  _years: Array<{ value: number; enabled: boolean }> = [];

  /** The selected year. */
  _selectedYear: number | null;

  /** Scroller subscription. */
  _disposeScroller: Subscription;

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private element: ElementRef,
    @Optional() public _dateAdapter: DateAdapter<D>,
    @Optional()
    @Inject(MAT_DATE_FORMATS)
    private _dateFormats: MatDateFormats
  ) {
    if (!this._dateAdapter) {
      throw createMissingDateImplError('DateAdapter');
    }
    if (!this._dateFormats) {
      throw createMissingDateImplError('MAT_DATE_FORMATS');
    }
  }

  ngAfterContentInit() {
    const lastPosition = { scrolled: 0 };
    this._disposeScroller = fromEvent(this.element.nativeElement, 'scroll')
      .pipe(
        sampleTime(300),
        mergeMap((ev: any) => obsOf(this._calculatePoints()))
      )
      .subscribe((pos: any) => this._handleScroll(pos, lastPosition));

    this._init();
  }

  ngOnDestroy() {
    this._disposeScroller.unsubscribe();
  }

  abs(value: number) {
    return Math.abs(value);
  }

  /** Initializes this year view. */
  _init() {
    this._selectedYear = this._dateAdapter.getYear(this.selected ? this.selected : this.activeDate);

    const date = this._dateAdapter.createDate(
      this._selectedYear,
      this._dateAdapter.getMonth(this.activeDate),
      this._dateAdapter.getDate(this.activeDate),
      this._dateAdapter.getHours(this.activeDate),
      this._dateAdapter.getMinutes(this.activeDate)
    );
    this._years = [
      {
        value: this._selectedYear,
        enabled: !this.dateFilter || this.dateFilter(date, 'minute')
      }
    ];

    this._populateYears();

    setTimeout(() => {
      this.element.nativeElement.scrollTop -= this.element.nativeElement.offsetHeight / 2 - YEAR_LINE_HEIGHT / 2;
    }, 20);
  }

  _populateYears(down = false) {
    if ((!down && !this._years[0].enabled) || (down && !this._years[this._years.length - 1].enabled)) {
      return;
    }

    const selectedMonth = this._dateAdapter.getMonth(this.activeDate);
    const selectedDay = this._dateAdapter.getDate(this.activeDate);
    const selectedHours = this._dateAdapter.getHours(this.activeDate);
    const selectedMinutes = this._dateAdapter.getMinutes(this.activeDate);

    let scroll = 0;
    for (let y = 1; y <= YEAR_SIZE / 2; y++) {
      let year = this._years[this._years.length - 1].value;
      let date = this._dateAdapter.createDate(year + 1, selectedMonth, selectedDay, selectedHours, selectedMinutes);
      this._years.push({
        value: year + 1,
        enabled: !this.dateFilter || this.dateFilter(date, 'minute')
      });

      year = this._years[0].value;
      date = this._dateAdapter.createDate(year - 1, selectedMonth, selectedDay, selectedHours, selectedMinutes);
      this._years.unshift({
        value: year - 1,
        enabled: !this.dateFilter || this.dateFilter(date, 'minute')
      });

      scroll += YEAR_LINE_HEIGHT;
    }

    setTimeout(() => {
      this.element.nativeElement.scrollTop += down ? YEAR_LINE_HEIGHT : scroll;
    }, 10);

    this._changeDetectorRef.markForCheck();
  }

  _yearSelected(year: number) {
    const selectedMonth = this._dateAdapter.getMonth(this.activeDate);
    const selectedDay = this._dateAdapter.getDate(this.activeDate);
    const selectedHours = this._dateAdapter.getHours(this.activeDate);
    const selectedMinutes = this._dateAdapter.getMinutes(this.activeDate);
    this.selectedChange.emit(
      this._dateAdapter.createDate(year, selectedMonth, selectedDay, selectedHours, selectedMinutes)
    );
  }

  _calculatePoints() {
    const el = this.element.nativeElement;
    return {
      height: el.offsetHeight,
      scrolled: el.scrollTop,
      total: el.scrollHeight
    };
  }

  _handleScroll(position, lastPosition) {
    if (position.scrolled === 0 && lastPosition.scrolled > 0) {
      this._populateYears(false);
    } else if (position.height + position.scrolled === position.total) {
      this._populateYears(true);
    }
    lastPosition.scrolled = position.scrolled;
  }

  /** Handles keydown events on the calendar body when calendar is in multi-year view. */
  _handleCalendarBodyKeydown(event: KeyboardEvent): void {
    // TODO handle @angular/cdk/keycode
    switch (event.keyCode) {
      case UP_ARROW:
        this.activeDate = this._dateAdapter.addCalendarYears(this._activeDate, -1);
        break;
      case DOWN_ARROW:
        this.activeDate = this._dateAdapter.addCalendarYears(this._activeDate, 1);
        break;
      case ENTER:
        this._yearSelected(this._dateAdapter.getYear(this._activeDate));
        break;
      default:
        // Don't prevent default or focus active cell on keys that we don't explicitly handle.
        return;
    }

    this._focusActiveCell();
    // Prevent unexpected default actions such as form submission.
    event.preventDefault();
  }

  _focusActiveCell() {}

  /**
   * @param obj The object to check.
   * @returns The given object if it is both a date instance and valid, otherwise null.
   */
  private _getValidDateOrNull(obj: any): D | null {
    return this._dateAdapter.isDateInstance(obj) && this._dateAdapter.isValid(obj) ? obj : null;
  }
}
