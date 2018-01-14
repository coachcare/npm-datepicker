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
  UP_ARROW
} from '@angular/cdk/keycodes';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { first } from 'rxjs/operator/first';
import { Subscription } from 'rxjs/Subscription';
import { MatClockView } from './clock-view';
import { coerceDateProperty } from './coerce-date-property';
import { MAT_DATE_FORMATS, MatDateFormats } from './core';
import { DateAdapter } from './core';
import { controlActive, slideCalendar } from './datepicker-animations';
import { createMissingDateImplError } from './datepicker-errors';
import { MatDatepickerIntl } from './datepicker-intl';
import { MatMonthView } from './month-view';
import { MatYearView } from './year-view';
import { MatYearsView } from './years-view';

/**
 * A calendar that is used as part of the datepicker.
 * @docs-private
 */
@Component({
  selector: 'mat-calendar',
  templateUrl: 'calendar.html',
  styleUrls: ['calendar.scss'],
  host: {
    class: 'mat-calendar'
  },
  animations: [controlActive, slideCalendar],
  encapsulation: ViewEncapsulation.None,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatCalendar<D> implements AfterContentInit, OnInit, OnChanges, OnDestroy {
  private _intlChanges: Subscription;

  /** A date representing the period (month or year) to start the calendar in. */
  @Input()
  get startAt(): D | null {
    return this._startAt;
  }
  set startAt(value: D | null) {
    this._startAt = coerceDateProperty(this._dateAdapter, value);
  }
  private _startAt: D | null;

  /** The type of value handled by the calendar. */
  @Input() type: 'date' | 'datetime' | 'time' = 'date';

  /** Which view the calendar should be started in. */
  @Input() startView: 'clock' | 'month' | 'year' | 'years' = 'month';

  /** Current calendar view */
  view: 'clock' | 'month' | 'year' | 'years';

  /** The currently selected date. */
  @Input()
  get selected(): D | null {
    return this._selected;
  }
  set selected(value: D | null) {
    this._selected = coerceDateProperty(this._dateAdapter, value);
    this._activeDate = this._selected;
  }
  private _selected: D | null;

  /** The minimum selectable date. */
  @Input()
  get minDate(): D | null {
    return this._minDate;
  }
  set minDate(value: D | null) {
    this._minDate = coerceDateProperty(this._dateAdapter, value);
  }
  private _minDate: D | null;

  /** The maximum selectable date. */
  @Input()
  get maxDate(): D | null {
    return this._maxDate;
  }
  set maxDate(value: D | null) {
    this._maxDate = coerceDateProperty(this._dateAdapter, value);
  }
  private _maxDate: D | null;

  /** A function used to filter which dates are selectable. */
  @Input() dateFilter: (date: D, unit?: string) => boolean;

  /** Clock interval */
  @Input() clockStep = 1;

  /** Clock hour format */
  @Input() twelveHour = false;

  /** Emits when the currently selected date changes. */
  @Output() selectedChange = new EventEmitter<D>();

  /** Emits when any date is selected. */
  @Output() _userSelection = new EventEmitter<void>();

  /** Reference to the current clock view component. */
  @ViewChild(MatClockView) clockView: MatClockView<D>;

  /** Reference to the current month view component. */
  @ViewChild(MatMonthView) monthView: MatMonthView<D>;

  /** Reference to the current year view component. */
  @ViewChild(MatYearView) yearView: MatYearView<D>;

  /** Reference to the current years view component. */
  @ViewChild(MatYearsView) yearsView: MatYearsView<D>;

  /** Date filter for the month and year views. */
  _dateFilterForViews = (date: D, unit = 'minute') => {
    return (
      !!date &&
      (!this.dateFilter || this.dateFilter(date)) &&
      (!this.minDate || this._dateAdapter.compareDate(date, this.minDate, unit) >= 0) &&
      (!this.maxDate || this._dateAdapter.compareDate(date, this.maxDate, unit) <= 0)
    );
  };

  /**
   * The current active date. This determines which time period is shown and which date is
   * highlighted when using keyboard navigation.
   */
  get _activeDate(): D {
    return this._clampedActiveDate;
  }
  set _activeDate(value: D) {
    const oldActiveDate = this._clampedActiveDate;
    this._clampedActiveDate = this._dateAdapter.clampDate(
      value,
      this.minDate,
      this.maxDate
    );
    this._isAm = this._dateAdapter.getHours(this._clampedActiveDate) < 12;

    const diff = this._dateAdapter.compareDate(
      oldActiveDate,
      this._clampedActiveDate,
      'month'
    );
    if (diff) {
      this._animationDir = diff > 0 ? 'left' : 'right';
    }
  }
  private _clampedActiveDate: D;

  /** Animations handler */
  _animationDir: string;

  /** Whether the active date is AM or not */
  _isAm: boolean;

  /** Whether the calendar process the time. */
  _hasTime: boolean;

  /** Whether the calendar is in hour view. */
  _hourView: boolean = true;

  /** The label for the calendar header buttons. */
  get _yearButtonText(): string {
    return this._dateAdapter.getYear(this._activeDate).toString();
  }

  get _dayButtonText(): string {
    const day = this._dateAdapter.getDayOfWeek(this._activeDate);
    return this._dateAdapter.getDayOfWeekNames('short')[day];
  }

  get _monthdayButtonText(): string {
    return this._dateAdapter.format(
      this._activeDate,
      this._dateFormats.display.monthDayLabel
    );
  }

  get _hourButtonText(): string {
    let hours = this._dateAdapter.getHours(this._activeDate);
    if (this.twelveHour) {
      hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    }
    return hours.toString();
  }

  get _minuteButtonText(): string {
    const minutes = this._dateAdapter.getMinutes(this._activeDate);
    return ('00' + minutes).slice(-2);
  }

  /** The label for the current calendar view. */
  get _periodButtonText(): string {
    switch (this.view) {
      case 'year':
        return this._dateAdapter.getYearName(this._activeDate);
      default:
        return this._dateAdapter.format(
          this._activeDate,
          this._dateFormats.display.monthYearLabel
        );
    }
  }

  get _periodButtonLabel(): string {
    switch (this.view) {
      case 'year':
        return this._intl.switchToMonthViewLabel;
      case 'month':
        return this._intl.switchToYearViewLabel;
    }
  }

  /** The label for the the previous button. */
  get _prevButtonLabel(): string {
    switch (this.view) {
      case 'year':
        return this._intl.prevYearLabel;
      case 'month':
        return this._intl.prevMonthLabel;
    }
  }

  /** The label for the the next button. */
  get _nextButtonLabel(): string {
    switch (this.view) {
      case 'year':
        return this._intl.nextYearLabel;
      case 'month':
        return this._intl.nextMonthLabel;
    }
  }

  constructor(
    private _elementRef: ElementRef,
    private _intl: MatDatepickerIntl,
    private _ngZone: NgZone,
    @Optional() private _dateAdapter: DateAdapter<D>,
    @Optional()
    @Inject(MAT_DATE_FORMATS)
    private _dateFormats: MatDateFormats,
    changeDetectorRef: ChangeDetectorRef
  ) {
    if (!this._dateAdapter) {
      throw createMissingDateImplError('DateAdapter');
    }

    if (!this._dateFormats) {
      throw createMissingDateImplError('MAT_DATE_FORMATS');
    }

    this._intlChanges = _intl.changes.subscribe(() => changeDetectorRef.markForCheck());
  }

  ngAfterContentInit() {
    this._activeDate = this.startAt || this._dateAdapter.today();
    this._focusActiveCell();
  }

  ngOnInit() {
    this.view = this.startView;
  }

  ngOnChanges(changes: SimpleChanges) {
    this._hasTime = this.type.indexOf('time') >= 0;
    const change =
      changes.selected || changes.minDate || changes.maxDate || changes.dateFilter;

    if (change && !change.firstChange) {
      const component =
        this.clockView || this.monthView || this.yearView || this.yearsView;
      if (component) {
        component._init();
      }
    }
  }

  ngOnDestroy() {
    this._intlChanges.unsubscribe();
  }

  changeView(view) {
    this.view = view;
  }

  _submitClicked(): void {
    this.selectedChange.emit(this._activeDate);
    this._userSelection.emit();
  }

  _cancelClicked(): void {
    this._userSelection.emit();
  }

  /** Accesor to private _intl */
  _controlLabel(key: keyof MatDatepickerIntl): string {
    return this._intl[key] as string;
  }

  /** Handles date selection in the clock view. */
  _timeChanged(date: D): void {
    this.selected = date;
  }

  _timeSelected(date: D): void {
    // if (this.autoOk && this.type === 'time') {
    //   this.selectedChange.emit(date);
    //   this._userSelection.emit();
    // }
    this.selected = date;
  }

  /** Handles date selection in the month view. */
  _dateSelected(date: D): void {
    this.selected = date;
    if (this._hasTime) {
      this.changeView('clock');
    }
  }

  /** Handles month selection in the year view. */
  _monthSelected(month: D): void {
    this.selected = month;
    this.changeView('month');
  }

  _yearSelected(year: D): void {
    this.selected = year;
    this.changeView('year');
  }

  /** Handles user clicks on the period label. */
  _currentPeriodClicked(): void {
    this.changeView(this.view === 'month' ? 'year' : 'years');
  }

  /** Handles user clicks on the previous button. */
  _previousClicked(): void {
    this._navCalendar(-1);
  }

  /** Handles user clicks on the next button. */
  _nextClicked(): void {
    this._navCalendar(1);
  }

  /** Handles user clicks on the time labels. */
  _showHourView(): void {
    if (this._hasTime) {
      this._hourView = true;
      this.changeView('clock');
    }
  }

  _showMinuteView(): void {
    this._hourView = false;
    this.changeView('clock');
  }

  _toggleAmPm(am): void {
    if (this._isAm !== am) {
      const date = this._dateAdapter.addCalendarHours(
        this._activeDate,
        this._isAm ? 12 : -12
      );
      if (this._dateFilterForViews(date, 'minute')) {
        this.selected = date;
      }
    }
  }

  /** Whether the previous period button is enabled. */
  _previousEnabled(): boolean {
    if (!this.minDate) {
      return true;
    }
    return !this.minDate || !this._isSameView(this._activeDate, this.minDate);
  }

  /** Whether the next period button is enabled. */
  _nextEnabled(): boolean {
    return !this.maxDate || !this._isSameView(this._activeDate, this.maxDate);
  }

  /** Handles calendar diffs. */
  _navCalendar(diff): void {
    switch (this.view) {
      case 'year':
        this._activeDate = this._dateAdapter.addCalendarYears(this._activeDate, diff);
        break;
      case 'month':
        this._activeDate = this._dateAdapter.addCalendarMonths(this._activeDate, diff);
        break;
      case 'clock':
        this._activeDate = this._hourView
          ? this._dateAdapter.addCalendarHours(this._activeDate, diff)
          : this._dateAdapter.addCalendarMinutes(this._activeDate, diff);
        break;
    }
  }

  /** Handles keydown events on the calendar body. */
  _handleCalendarBodyKeydown(event: KeyboardEvent): void {
    // TODO(mmalerba): We currently allow keyboard navigation to disabled dates, but just prevent
    // disabled ones from being selected. This may not be ideal, we should look into whether
    // navigation should skip over disabled dates, and if so, how to implement that efficiently.
    switch (this.view) {
      case 'year':
        this._handleCalendarBodyKeydownInYearView(event);
        break;
      case 'month':
        this._handleCalendarBodyKeydownInMonthView(event);
        break;
      case 'clock':
        // TODO
        break;
    }
  }

  /** Focuses the active cell after the microtask queue is empty. */
  _focusActiveCell() {
    this._ngZone.runOutsideAngular(() => {
      first.call(this._ngZone.onStable.asObservable()).subscribe(() => {
        const el = this._elementRef.nativeElement.querySelector(
          '.mat-calendar-body-active'
        );
        el && el.focus();
      });
    });
  }

  /** Whether the two dates represent the same view in the current view mode (month or year). */
  private _isSameView(date1: D, date2: D): boolean {
    switch (this.view) {
      case 'year':
        return this._dateAdapter.getYear(date1) === this._dateAdapter.getYear(date2);
      case 'month':
        const monthYear = this._dateFormats.display.monthYearLabel;
        return (
          this._dateAdapter.format(date1, monthYear) ===
          this._dateAdapter.format(date2, monthYear)
        );
      case 'clock':
        const hourMinute = this._dateFormats.display.timeLabel;
        return (
          this._dateAdapter.format(date1, hourMinute) ===
          this._dateAdapter.format(date2, hourMinute)
        );
    }
  }

  /** Handles keydown events on the calendar body when calendar is in month view. */
  private _handleCalendarBodyKeydownInMonthView(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case LEFT_ARROW:
        this._activeDate = this._dateAdapter.addCalendarDays(this._activeDate, -1);
        break;
      case RIGHT_ARROW:
        this._activeDate = this._dateAdapter.addCalendarDays(this._activeDate, 1);
        break;
      case UP_ARROW:
        this._activeDate = this._dateAdapter.addCalendarDays(this._activeDate, -7);
        break;
      case DOWN_ARROW:
        this._activeDate = this._dateAdapter.addCalendarDays(this._activeDate, 7);
        break;
      case HOME:
        this._activeDate = this._dateAdapter.addCalendarDays(
          this._activeDate,
          1 - this._dateAdapter.getDate(this._activeDate)
        );
        break;
      case END:
        this._activeDate = this._dateAdapter.addCalendarDays(
          this._activeDate,
          this._dateAdapter.getNumDaysInMonth(this._activeDate) -
            this._dateAdapter.getDate(this._activeDate)
        );
        break;
      case PAGE_UP:
        this._activeDate = event.altKey
          ? this._dateAdapter.addCalendarYears(this._activeDate, -1)
          : this._dateAdapter.addCalendarMonths(this._activeDate, -1);
        break;
      case PAGE_DOWN:
        this._activeDate = event.altKey
          ? this._dateAdapter.addCalendarYears(this._activeDate, 1)
          : this._dateAdapter.addCalendarMonths(this._activeDate, 1);
        break;
      case ENTER:
        if (this._dateFilterForViews(this._activeDate, 'day')) {
          this._dateSelected(this._activeDate);
          // Prevent unexpected default actions such as form submission.
          event.preventDefault();
        }
        return;
      default:
        // Don't prevent default or focus active cell on keys that we don't explicitly handle.
        return;
    }

    this._focusActiveCell();
    // Prevent unexpected default actions such as form submission.
    event.preventDefault();
  }

  /** Handles keydown events on the calendar body when calendar is in year view. */
  private _handleCalendarBodyKeydownInYearView(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case LEFT_ARROW:
        this._activeDate = this._dateAdapter.addCalendarMonths(this._activeDate, -1);
        break;
      case RIGHT_ARROW:
        this._activeDate = this._dateAdapter.addCalendarMonths(this._activeDate, 1);
        break;
      case UP_ARROW:
        this._activeDate = this._prevMonthInSameCol(this._activeDate);
        break;
      case DOWN_ARROW:
        this._activeDate = this._nextMonthInSameCol(this._activeDate);
        break;
      case HOME:
        this._activeDate = this._dateAdapter.addCalendarMonths(
          this._activeDate,
          -this._dateAdapter.getMonth(this._activeDate)
        );
        break;
      case END:
        this._activeDate = this._dateAdapter.addCalendarMonths(
          this._activeDate,
          11 - this._dateAdapter.getMonth(this._activeDate)
        );
        break;
      case PAGE_UP:
        this._activeDate = this._dateAdapter.addCalendarYears(
          this._activeDate,
          event.altKey ? -10 : -1
        );
        break;
      case PAGE_DOWN:
        this._activeDate = this._dateAdapter.addCalendarYears(
          this._activeDate,
          event.altKey ? 10 : 1
        );
        break;
      case ENTER:
        this._monthSelected(this._activeDate);
        break;
      default:
        // Don't prevent default or focus active cell on keys that we don't explicitly handle.
        return;
    }

    this._focusActiveCell();
    // Prevent unexpected default actions such as form submission.
    event.preventDefault();
  }

  /**
   * Determine the date for the month that comes before the given month in the same column in the
   * calendar table.
   */
  private _prevMonthInSameCol(date: D): D {
    // Determine how many months to jump forward given that there are 2 empty slots at the beginning
    // of each year.
    const increment =
      this._dateAdapter.getMonth(date) <= 4
        ? -5
        : this._dateAdapter.getMonth(date) >= 7 ? -7 : -12;
    return this._dateAdapter.addCalendarMonths(date, increment);
  }

  /**
   * Determine the date for the month that comes after the given month in the same column in the
   * calendar table.
   */
  private _nextMonthInSameCol(date: D): D {
    // Determine how many months to jump forward given that there are 2 empty slots at the beginning
    // of each year.
    const increment =
      this._dateAdapter.getMonth(date) <= 4
        ? 7
        : this._dateAdapter.getMonth(date) >= 7 ? 5 : 12;
    return this._dateAdapter.addCalendarMonths(date, increment);
  }
}
