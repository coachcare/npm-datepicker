/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ESCAPE } from '@angular/cdk/keycodes';
import {
  Overlay,
  OverlayConfig,
  OverlayRef,
  PositionStrategy,
  RepositionScrollStrategy,
  ScrollStrategy
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  EventEmitter,
  Inject,
  InjectionToken,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { first } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { MatCalendar } from './calendar';
import { coerceDateProperty } from './coerce-date-property';
import { DateAdapter } from './core';
import { createMissingDateImplError } from './datepicker-errors';
import { MatDatepickerInput } from './datepicker-input';

/** Used to generate a unique ID for each datepicker instance. */
let datepickerUid = 0;

/** Injection token that determines the scroll handling while the calendar is open. */
export const MAT_DATEPICKER_SCROLL_STRATEGY = new InjectionToken<() => ScrollStrategy>(
  'mat-datepicker-scroll-strategy'
);

/** @docs-private */
export function MAT_DATEPICKER_SCROLL_STRATEGY_PROVIDER_FACTORY(
  overlay: Overlay
): () => RepositionScrollStrategy {
  return () => overlay.scrollStrategies.reposition();
}

/** @docs-private */
export const MAT_DATEPICKER_SCROLL_STRATEGY_PROVIDER = {
  provide: MAT_DATEPICKER_SCROLL_STRATEGY,
  deps: [Overlay],
  useFactory: MAT_DATEPICKER_SCROLL_STRATEGY_PROVIDER_FACTORY
};

/**
 * Component used as the content for the datepicker dialog and popup. We use this instead of using
 * MatCalendar directly as the content so we can control the initial focus. This also gives us a
 * place to put additional features of the popup that are not part of the calendar itself in the
 * future. (e.g. confirmation buttons).
 * @docs-private
 */
@Component({
  selector: 'mat-datepicker-content',
  templateUrl: 'datepicker-content.html',
  // styleUrls: ['datepicker-content.scss'],
  host: {
    class: 'mat-datepicker-content',
    '[class.mat-datepicker-content-touch]': 'datepicker.touchUi',
    '(keydown)': '_handleKeydown($event)'
  },
  encapsulation: ViewEncapsulation.None,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatDatepickerContent<D> implements AfterContentInit {
  datepicker: MatDatepicker<D>;

  @ViewChild(MatCalendar) _calendar: MatCalendar<D>;

  ngAfterContentInit() {
    this._calendar._focusActiveCell();
  }

  /**
   * Handles keydown event on datepicker content.
   * @param event The event.
   */
  _handleKeydown(event: KeyboardEvent): void {
    if (event.keyCode === ESCAPE) {
      this.datepicker.close();
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

// TODO(mmalerba): We use a component instead of a directive here so the user can use implicit
// template reference variables (e.g. #d vs #d="matDatepicker"). We can change this to a directive
// if angular adds support for `exportAs: '$implicit'` on directives.
/** Component responsible for managing the datepicker popup/dialog. */
@Component({
  selector: 'mat-datepicker',
  template: '',
  exportAs: 'matDatepicker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  preserveWhitespaces: false
})
export class MatDatepicker<D> implements OnInit, OnDestroy {
  /** The date to open the calendar to initially. */
  @Input()
  get startAt(): D | null {
    // If an explicit startAt is set we start there, otherwise we start at whatever the currently
    // selected value is.
    return this._startAt || (this._datepickerInput ? this._datepickerInput.value : null);
  }
  set startAt(date: D | null) {
    this._startAt = coerceDateProperty(this._dateAdapter, date);
  }
  private _startAt: D | null;

  /** The type of value handled by the calendar. */
  @Input() type: 'date' | 'datetime' | 'time' = 'date';

  /** Which view the calendar should be started in. */
  @Input() startView: 'clock' | 'month' | 'year' | 'years' = 'month';

  /** Clock interval */
  @Input() clockStep = 1;

  /** Clock hour format */
  @Input() twelveHour = true;

  /**
   * Whether the calendar UI is in touch mode. In touch mode the calendar opens in a dialog rather
   * than a popup and elements have more padding to allow for bigger touch targets.
   */
  @Input() touchUi = true;

  /** Whether the datepicker pop-up should be disabled. */
  @Input()
  get disabled() {
    return this._disabled === undefined && this._datepickerInput
      ? this._datepickerInput.disabled
      : !!this._disabled;
  }
  set disabled(value: any) {
    const newValue = coerceBooleanProperty(value);

    if (newValue !== this._disabled) {
      this._disabled = newValue;
      this._disabledChange.next(newValue);
    }
  }
  private _disabled: boolean;

  /** Whether the datepicker is connected to a date type one */
  @Input()
  set matDatepicker(value: MatDatepicker<D>) {
    if (value) {
      this._datepicker = value;
    }
  }
  _datepicker: MatDatepicker<D>;

  /**
   * Emits new selected date when selected date changes.
   * deprecated Switch to the `dateChange` and `dateInput` binding on the input element.
   */
  @Output() selectedChanged = new EventEmitter<D>();

  /** Whether the calendar is open. */
  opened = false;

  /** The id for the datepicker calendar. */
  id = `mat-datepicker-${datepickerUid++}`;

  /** The currently selected date. */
  get _selected(): D | null {
    return this._validSelected;
  }
  set _selected(value: D | null) {
    this._validSelected = this._dateAdapter.clampDate(
      value,
      this._minDate,
      this._maxDate
    );
    if (this._validSelected) {
      // round the minutes
      let minutes = this._dateAdapter.getMinutes(this._validSelected);
      minutes = Math.ceil(minutes / this.clockStep) * this.clockStep;
      this._dateAdapter.setMinutes(this._validSelected, minutes);
      this._dateAdapter.setSeconds(this._validSelected, 0);
    }
  }
  private _validSelected: D | null = null;

  /** The minimum selectable date. */
  get _minDate(): D | null {
    return this._datepickerInput && this._datepickerInput.min;
  }

  /** The maximum selectable date. */
  get _maxDate(): D | null {
    return this._datepickerInput && this._datepickerInput.max;
  }

  get _dateFilter(): (date: D | null, unit?: string) => boolean {
    return this._datepickerInput && this._datepickerInput._dateFilter;
  }

  /** A reference to the overlay when the calendar is opened as a popup. */
  private _popupRef: OverlayRef;

  /** A reference to the dialog when the calendar is opened as a dialog. */
  private _dialogRef: MatDialogRef<any> | null;

  /** A portal containing the calendar for this datepicker. */
  private _calendarPortal: ComponentPortal<MatDatepickerContent<D>>;

  /** The element that was focused before the datepicker was opened. */
  private _focusedElementBeforeOpen: HTMLElement | null = null;

  private _inputSubscription = Subscription.EMPTY;

  /** The input element this datepicker is associated with. */
  _datepickerInput: MatDatepickerInput<D>;

  /** Emits when the datepicker is disabled. */
  _disabledChange = new Subject<boolean>();

  constructor(
    private _dialog: MatDialog,
    private _overlay: Overlay,
    private _ngZone: NgZone,
    private _viewContainerRef: ViewContainerRef,
    @Inject(MAT_DATEPICKER_SCROLL_STRATEGY) private _scrollStrategy,
    @Optional() private _dateAdapter: DateAdapter<D>,
    @Optional() private _dir: Directionality,
    @Optional()
    @Inject(DOCUMENT)
    private _document: any
  ) {
    if (!this._dateAdapter) {
      throw createMissingDateImplError('DateAdapter');
    }
  }

  /** Prevent inconsistent type and view */
  ngOnInit() {
    switch (this.type) {
      case 'date':
        this.startView = this.startView !== 'clock' ? this.startView : 'month';
        break;
      case 'time':
        this.startView = 'clock';
        break;
      default:
        this.startView = this.startView;
    }

    if (this._datepicker) {
      this._datepicker.selectedChanged.subscribe((date: D) => {
        this._selected = this._dateAdapter.createDate(
          this._dateAdapter.getYear(date),
          this._dateAdapter.getMonth(date),
          this._dateAdapter.getDate(date),
          this._selected ? this._dateAdapter.getHours(this._selected) : 0,
          this._selected ? this._dateAdapter.getMinutes(this._selected) : 0
        );
        // update the corresponding changes
        this._datepickerInput.value = this._selected;
        this.selectedChanged.emit(this._selected);
      });
    }

    // refresh the input
    this._datepickerInput.value = this._selected;
  }

  ngOnDestroy() {
    this.close();
    this._inputSubscription.unsubscribe();
    this.selectedChanged.complete();
    this._disabledChange.complete();

    if (this._popupRef) {
      this._popupRef.dispose();
    }
  }

  /** Selects the given date */
  _select(date: D): void {
    const oldValue = this._selected;
    this._selected = date;
    const unit = this.type.indexOf('time') >= 0 ? 'minute' : 'day';
    if (!this._dateAdapter.sameDate(oldValue, this._selected, unit)) {
      this.selectedChanged.emit(date);
    }
  }

  /**
   * Register an input with this datepicker.
   * @param input The datepicker input to register with this datepicker.
   */
  _registerInput(input: MatDatepickerInput<D>): void {
    if (this._datepickerInput) {
      throw Error('An MatDatepicker can only be associated with a single input.');
    }
    this._datepickerInput = input;
    this._inputSubscription = this._datepickerInput._valueChange.subscribe(
      (value: D | null) =>
        (this._selected =
          value && this._dateAdapter.isDateInstance(value)
            ? this._dateAdapter.clone(value)
            : null)
    );
  }

  /** Open the calendar. */
  open(): void {
    if (this.opened || this.disabled) {
      return;
    }
    if (!this._datepickerInput) {
      throw Error('Attempted to open an MatDatepicker with no associated input.');
    }
    if (this._document) {
      this._focusedElementBeforeOpen = this._document.activeElement;
    }

    this.touchUi ? this._openAsDialog() : this._openAsPopup();
    this.opened = true;
  }

  /** Close the calendar. */
  close(): void {
    if (!this.opened) {
      return;
    }
    if (this._popupRef && this._popupRef.hasAttached()) {
      this._popupRef.detach();
    }
    if (this._dialogRef) {
      this._dialogRef.close();
      this._dialogRef = null;
    }
    if (this._calendarPortal && this._calendarPortal.isAttached) {
      this._calendarPortal.detach();
    }
    if (
      this._focusedElementBeforeOpen &&
      typeof this._focusedElementBeforeOpen.focus === 'function'
    ) {
      this._focusedElementBeforeOpen.focus();
      this._focusedElementBeforeOpen = null;
    }

    this.opened = false;
  }

  /** Open the calendar as a dialog. */
  private _openAsDialog(): void {
    this._dialogRef = this._dialog.open(MatDatepickerContent, {
      direction: this._dir ? this._dir.value : 'ltr',
      viewContainerRef: this._viewContainerRef,
      panelClass: 'mat-datepicker-dialog'
    });
    this._dialogRef.afterClosed().subscribe(() => this.close());
    this._dialogRef.componentInstance.datepicker = this;
  }

  /** Open the calendar as a popup. */
  private _openAsPopup(): void {
    if (!this._calendarPortal) {
      this._calendarPortal = new ComponentPortal(
        MatDatepickerContent,
        this._viewContainerRef
      );
    }

    if (!this._popupRef) {
      this._createPopup();
    }

    if (!this._popupRef.hasAttached()) {
      const componentRef: ComponentRef<MatDatepickerContent<D>> = this._popupRef.attach(
        this._calendarPortal
      );
      componentRef.instance.datepicker = this;

      // Update the position once the calendar has rendered.
      first.call(this._ngZone.onStable.asObservable()).subscribe(() => {
        this._popupRef.updatePosition();
      });
    }

    this._popupRef.backdropClick().subscribe(() => this.close());
  }

  /** Create the popup. */
  private _createPopup(): void {
    const overlayConfig = new OverlayConfig({
      positionStrategy: this._createPopupPositionStrategy(),
      hasBackdrop: true,
      backdropClass: 'mat-overlay-transparent-backdrop',
      direction: this._dir ? this._dir.value : 'ltr',
      scrollStrategy: this._scrollStrategy(),
      panelClass: 'mat-datepicker-popup'
    });

    this._popupRef = this._overlay.create(overlayConfig);
  }

  /** Create the popup PositionStrategy. */
  private _createPopupPositionStrategy(): PositionStrategy {
    return this._overlay
      .position()
      .connectedTo(
        this._datepickerInput.getPopupConnectionElementRef(),
        { originX: 'start', originY: 'bottom' },
        { overlayX: 'start', overlayY: 'top' }
      )
      .withFallbackPosition(
        { originX: 'start', originY: 'top' },
        { overlayX: 'start', overlayY: 'bottom' }
      )
      .withFallbackPosition(
        { originX: 'end', originY: 'bottom' },
        { overlayX: 'end', overlayY: 'top' }
      )
      .withFallbackPosition(
        { originX: 'end', originY: 'top' },
        { overlayX: 'end', overlayY: 'bottom' }
      );
  }
}
