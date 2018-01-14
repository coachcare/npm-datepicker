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
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  Optional,
  Output,
  ViewEncapsulation
} from '@angular/core';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/sampleTime';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { coerceDateProperty } from './coerce-date-property';
import { MAT_DATE_FORMATS, MatDateFormats } from './core';
import { DateAdapter } from './core';
import { createMissingDateImplError } from './datepicker-errors';

const YEAR_LINE_HEIGHT = 35;

/**
 * An internal component used to display a single year in the datepicker.
 * @docs-private
 */
@Component({
  selector: 'mat-years-view',
  templateUrl: 'years-view.html',
  encapsulation: ViewEncapsulation.None,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatYearsView<D> implements AfterContentInit {
  /** The date to display in this year view (everything other than the year is ignored). */
  @Input()
  get activeDate(): D {
    return this._activeDate;
  }
  set activeDate(value: D) {
    this._activeDate =
      coerceDateProperty(this._dateAdapter, value) || this._dateAdapter.today();
  }
  private _activeDate: D;

  /** The currently selected date. */
  @Input()
  get selected(): D | null {
    return this._selected;
  }
  set selected(value: D | null) {
    this._selected = coerceDateProperty(this._dateAdapter, value);
  }
  private _selected: D | null;

  /** A function used to filter which dates are selectable. */
  @Input() dateFilter: (date: D, unit?: string) => boolean;

  /** Emits when a new month is selected. */
  @Output() selectedChange = new EventEmitter<D>();

  /** List of years. */
  _years: Array<{ value: number; enabled: boolean }> = [];

  /** The selected year. */
  _selectedYear: number | null;

  /** Scroller subscription. */
  _disposeScroller: Subscription;

  constructor(
    private element: ElementRef,
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
    const lastPosition = { scrolled: 0 };
    this._disposeScroller = Observable.fromEvent(this.element.nativeElement, 'scroll')
      .sampleTime(300)
      .mergeMap((ev: any) => Observable.of(this._calculatePoints()))
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
    this._selectedYear = this._dateAdapter.getYear(
      this.selected ? this.selected : this.activeDate
    );

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
      this.element.nativeElement.scrollTop -=
        this.element.nativeElement.offsetHeight / 2 - YEAR_LINE_HEIGHT / 2;
    }, 20);
  }

  _populateYears(down = false) {
    if (
      (!down && !this._years[0].enabled) ||
      (down && !this._years[this._years.length - 1].enabled)
    ) {
      return;
    }

    const selectedMonth = this._dateAdapter.getMonth(this.activeDate);
    const selectedDay = this._dateAdapter.getDate(this.activeDate);
    const selectedHours = this._dateAdapter.getHours(this.activeDate);
    const selectedMinutes = this._dateAdapter.getMinutes(this.activeDate);

    let scroll = 0;
    for (let y = 1; y <= 10; y++) {
      let year = this._years[this._years.length - 1].value;
      let date = this._dateAdapter.createDate(
        year + 1,
        selectedMonth,
        selectedDay,
        selectedHours,
        selectedMinutes
      );
      this._years.push({
        value: year + 1,
        enabled: !this.dateFilter || this.dateFilter(date, 'minute')
      });

      year = this._years[0].value;
      date = this._dateAdapter.createDate(
        year - 1,
        selectedMonth,
        selectedDay,
        selectedHours,
        selectedMinutes
      );
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
      this._dateAdapter.createDate(
        year,
        selectedMonth,
        selectedDay,
        selectedHours,
        selectedMinutes
      )
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
}
