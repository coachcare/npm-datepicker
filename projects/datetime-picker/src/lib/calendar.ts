/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  AfterContentInit,
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Optional,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { MatClockView } from './clock-view';
import { MAT_DATE_FORMATS, MatDateFormats } from './core/index';
import { DateAdapter } from './core/index';
import { matDatepickerAnimations } from './datepicker-animations';
import { createMissingDateImplError } from './datepicker-errors';
import { MatDatepickerIntl } from './datepicker-intl';
import { MatMonthView } from './month-view';
import { MatYearView } from './year-view';
import { MatYearsView } from './years-view';

/**
 * Possible views for the calendar.
 * @docs-private
 */
export type MatCalendarView = 'clock' | 'month' | 'year' | 'years';

/**
 * Possible return types.
 * @docs-private
 */
export type MatCalendarType = 'date' | 'datetime' | 'time';

/**
 * A calendar that is used as part of the datepicker.
 * @docs-private
 */
@Component({
  selector: 'mat-calendar',
  templateUrl: 'calendar.html',
  // styleUrls: ['calendar.css'],
  host: {
    class: 'mat-calendar'
  },
  animations: [matDatepickerAnimations.controlActive, matDatepickerAnimations.slideCalendar],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false
})
export class MatCalendar<D> implements AfterContentInit, AfterViewChecked, OnChanges, OnDestroy {
  private _intlChanges: Subscription;

  /**
   * Used for scheduling that focus should be moved to the active cell on the next tick.
   * We need to schedule it, rather than do it immediately, because we have to wait
   * for Angular to re-evaluate the view children.
   */
  private _moveFocusOnNextTick = false;

  /** A date representing the period (month or year) to start the calendar in. */
  @Input()
  get startAt(): D | null {
    return this._startAt;
  }
  set startAt(value: D | null) {
    this._startAt = this._getValidDateOrNull(this._dateAdapter.deserialize(value));
  }
  private _startAt: D | null;

  /** The type of value handled by the calendar. */
  @Input()
  type: MatCalendarType = 'date';

  /** Which view the calendar should be started in. */
  @Input()
  startView: MatCalendarView = 'month';

  /** Current calendar view */
  view: MatCalendarView;

  /** The currently selected date. */
  @Input()
  get selected(): D | null {
    return this._selected;
  }
  set selected(value: D | null) {
    this._selected = this._getValidDateOrNull(this._dateAdapter.deserialize(value));
    this.activeDate = this._selected;
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

  /** Clock interval */
  @Input()
  clockStep = 1;

  /** Clock hour format */
  @Input()
  twelveHour = false;

  /** Emits when the currently selected date changes. */
  @Output()
  selectedChange = new EventEmitter<D>();

  /** Emits when any date is selected. */
  @Output()
  _userSelection = new EventEmitter<void>();

  /** Reference to the current clock view component. */
  @ViewChild(MatClockView)
  clockView: MatClockView<D>;

  /** Reference to the current month view component. */
  @ViewChild(MatMonthView)
  monthView: MatMonthView<D>;

  /** Reference to the current year view component. */
  @ViewChild(MatYearView)
  yearView: MatYearView<D>;

  /** Reference to the current years view component. */
  @ViewChild(MatYearsView)
  yearsView: MatYearsView<D>;

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
  get activeDate(): D {
    return this._clampedActiveDate;
  }
  set activeDate(value: D) {
    const oldActiveDate = this._clampedActiveDate;
    this._clampedActiveDate = this._dateAdapter.clampDate(value, this.minDate, this.maxDate);
    this._isAm = this._dateAdapter.getHours(this._clampedActiveDate) < 12;

    const unit = this.view === 'year' ? 'year' : 'month';
    const diff = this._dateAdapter.compareDate(oldActiveDate, this._clampedActiveDate, unit);
    if (diff) {
      this._animationDir = diff > 0 ? 'left' : 'right';
    }

    // update the labels
    const day = this._dateAdapter.getDayOfWeek(this.activeDate);
    let hours = this._dateAdapter.getHours(this.activeDate);
    if (this.twelveHour) {
      hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    }
    const minutes = this._dateAdapter.getMinutes(this.activeDate);

    switch (this.view) {
      case 'year':
        this._periodButtonText = this._dateAdapter.getYearName(this.activeDate);
        break;
      default:
        this._periodButtonText = this._dateAdapter.format(this.activeDate, this._dateFormats.display.monthYearLabel);
    }
    this._yearButtonText = this._dateAdapter.getYear(this.activeDate).toString();
    this._monthdayButtonText = this._dateAdapter.format(this.activeDate, this._dateFormats.display.monthDayLabel);
    this._dayButtonText = this._dateAdapter.getDayOfWeekNames('short')[day];
    this._hourButtonText = hours.toString();
    this._minuteButtonText = ('00' + minutes).slice(-2);

    this.stateChanges.next();
  }
  private _clampedActiveDate: D;

  /** Whether the calendar is in month view. */
  get currentView(): MatCalendarView {
    return this._currentView;
  }
  set currentView(value: MatCalendarView) {
    this._currentView = value;
    this._moveFocusOnNextTick = true;
  }
  private _currentView: MatCalendarView;

  /**
   * Emits whenever there is a state change that the header may need to respond to.
   */
  stateChanges = new Subject<void>();

  /** Animations handler */
  _animationDir: string;

  /** Whether the active date is AM or not */
  _isAm: boolean;

  /** Whether the calendar process the time. */
  _hasTime: boolean;

  /** Whether the calendar is in hour view. */
  _hourView: boolean = true;

  /** The label for the calendar header buttons. */
  _yearButtonText: string;

  _dayButtonText: string;

  _monthdayButtonText: string;

  _hourButtonText: string;

  _minuteButtonText: string;

  /** The label for the current calendar view. */
  _periodButtonText: string;

  _periodButtonLabel: string;

  /** The label for the the previous button. */
  _prevButtonLabel: string;

  /** The label for the the next button. */
  _nextButtonLabel: string;

  constructor(
    public _intl: MatDatepickerIntl,
    @Optional() private _dateAdapter: DateAdapter<D>,
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

    this._intlChanges = _intl.changes.subscribe(() => {
      _changeDetectorRef.markForCheck();
      this.stateChanges.next();
    });
  }

  ngAfterContentInit() {
    this.activeDate = this.startAt || this._dateAdapter.today();

    this.changeView(this.startView, false);
  }

  ngAfterViewChecked() {
    if (this._moveFocusOnNextTick) {
      this._moveFocusOnNextTick = false;
      this.focusActiveCell();
    }
  }

  ngOnDestroy() {
    this._intlChanges.unsubscribe();
    this.stateChanges.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
    this._hasTime = this.type.indexOf('time') >= 0;
    const change = changes.selected || changes.minDate || changes.maxDate || changes.dateFilter;

    if (change && !change.firstChange) {
      const view = this._getCurrentViewComponent();
      if (view) {
        // We need to `detectChanges` manually here, because the `minDate`, `maxDate` etc. are
        // passed down to the view via data bindings which won't be up-to-date when we call `_init`.
        this._changeDetectorRef.detectChanges();
        view._init();
      }
    }

    this.stateChanges.next();
  }

  changeView(view, focus = true) {
    switch (view) {
      case 'year':
        this._periodButtonText = this._dateAdapter.getYearName(this.activeDate);
        this._periodButtonLabel = this._intl.switchToYearsViewLabel;
        this._nextButtonLabel = this._intl.nextYearLabel;
        this._prevButtonLabel = this._intl.prevYearLabel;
        break;
      case 'month':
        this._periodButtonText = this._dateAdapter.format(this.activeDate, this._dateFormats.display.monthYearLabel);
        this._periodButtonLabel = this._intl.switchToYearViewLabel;
        this._nextButtonLabel = this._intl.nextMonthLabel;
        this._prevButtonLabel = this._intl.prevMonthLabel;
    }

    this.view = view;
    if (focus) {
      this._moveFocusOnNextTick = true;
    }
  }

  focusActiveCell() {
    this._getCurrentViewComponent()._focusActiveCell();
  }

  _submitClicked(): void {
    this.selectedChange.emit(this.activeDate);
    this._userSelection.emit();
  }

  _cancelClicked(): void {
    this._userSelection.emit();
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
      const date = this._dateAdapter.addCalendarHours(this.activeDate, this._isAm ? 12 : -12);
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
    return !this.minDate || !this._isSameView(this.activeDate, this.minDate);
  }

  /** Whether the next period button is enabled. */
  _nextEnabled(): boolean {
    return !this.maxDate || !this._isSameView(this.activeDate, this.maxDate);
  }

  /** Handles calendar diffs. */
  _navCalendar(diff): void {
    switch (this.view) {
      case 'year':
        this.activeDate = this._dateAdapter.addCalendarYears(this.activeDate, diff);
        break;
      case 'month':
        this.activeDate = this._dateAdapter.addCalendarMonths(this.activeDate, diff);
        break;
      case 'clock':
        this.activeDate = this._hourView
          ? this._dateAdapter.addCalendarHours(this.activeDate, diff)
          : this._dateAdapter.addCalendarMinutes(this.activeDate, diff);
        break;
    }
  }

  /** Whether the two dates represent the same view in the current view mode (month or year). */
  private _isSameView(date1: D, date2: D): boolean {
    switch (this.view) {
      case 'year':
        return this._dateAdapter.getYear(date1) === this._dateAdapter.getYear(date2);
      case 'month':
        const monthYear = this._dateFormats.display.monthYearLabel;
        return this._dateAdapter.format(date1, monthYear) === this._dateAdapter.format(date2, monthYear);
      case 'clock':
        const hourMinute = this._dateFormats.display.timeLabel;
        return this._dateAdapter.format(date1, hourMinute) === this._dateAdapter.format(date2, hourMinute);
    }
  }

  /**
   * @param obj The object to check.
   * @returns The given object if it is both a date instance and valid, otherwise null.
   */
  private _getValidDateOrNull(obj: any): D | null {
    return this._dateAdapter.isDateInstance(obj) && this._dateAdapter.isValid(obj) ? obj : null;
  }

  /** Returns the component instance that corresponds to the current calendar view. */
  private _getCurrentViewComponent() {
    return this.clockView || this.monthView || this.yearView || this.yearsView;
  }
}
