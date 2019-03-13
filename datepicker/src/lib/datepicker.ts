/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ESCAPE, UP_ARROW } from '@angular/cdk/keycodes';
import { Overlay, OverlayConfig, OverlayRef, PositionStrategy, ScrollStrategy } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
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
import { take, filter } from 'rxjs/operators';
import { merge, Subject, Subscription } from 'rxjs';
import { MatCalendar, MatCalendarType, MatCalendarView } from './calendar';
import { DateAdapter } from './core/index';
import { matDatepickerAnimations } from './datepicker-animations';
import { createMissingDateImplError } from './datepicker-errors';
import { MatDatepickerInput } from './datepicker-input';

/** Used to generate a unique ID for each datepicker instance. */
let datepickerUid = 0;

/** Injection token that determines the scroll handling while the calendar is open. */
export const MAT_DATEPICKER_SCROLL_STRATEGY = new InjectionToken<() => ScrollStrategy>(
  'mat-datepicker-scroll-strategy'
);

/** @docs-private */
export function MAT_DATEPICKER_SCROLL_STRATEGY_FACTORY(overlay: Overlay): () => ScrollStrategy {
  return () => overlay.scrollStrategies.reposition();
}

/** @docs-private */
export const MAT_DATEPICKER_SCROLL_STRATEGY_FACTORY_PROVIDER = {
  provide: MAT_DATEPICKER_SCROLL_STRATEGY,
  deps: [Overlay],
  useFactory: MAT_DATEPICKER_SCROLL_STRATEGY_FACTORY
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
    '[@transformPanel]': '"enter"',
    '[class.mat-datepicker-content-touch]': 'datepicker.touchUi',
    '(keydown)': '_handleKeydown($event)'
  },
  animations: [matDatepickerAnimations.transformPanel, matDatepickerAnimations.fadeInCalendar],
  exportAs: 'matDatepickerContent',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false
})
export class MatDatepickerContent<D> implements AfterViewInit {
  /** Reference to the internal calendar component. */
  @ViewChild(MatCalendar)
  _calendar: MatCalendar<D>;

  /** Reference to the datepicker that created the overlay. */
  datepicker: MatDatepicker<D>;

  /** Whether the datepicker is above or below the input. */
  _isAbove: boolean;

  ngAfterViewInit() {
    this._calendar.focusActiveCell();
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

  /** Clock interval */
  @Input()
  clockStep = 1;

  /** Clock hour format */
  @Input()
  twelveHour = true;

  @Input()
  color?: string;

  /**
   * Whether the calendar UI is in touch mode. In touch mode the calendar opens in a dialog rather
   * than a popup and elements have more padding to allow for bigger touch targets.
   */
  @Input()
  get touchUi(): boolean {
    return this._touchUi;
  }
  set touchUi(value: boolean) {
    this._touchUi = coerceBooleanProperty(value);
  }
  private _touchUi = true;

  /** Whether the datepicker pop-up should be disabled. */
  @Input()
  get disabled(): boolean {
    return this._disabled === undefined && this._datepickerInput ? this._datepickerInput.disabled : !!this._disabled;
  }
  set disabled(value: boolean) {
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

  /** Classes to be passed to the date picker panel. Supports the same syntax as `ngClass`. */
  @Input()
  panelClass: string | string[];

  /** Emits when the datepicker has been opened. */
  @Output('opened')
  openedStream: EventEmitter<void> = new EventEmitter<void>();

  /** Emits when the datepicker has been closed. */
  @Output('closed')
  closedStream: EventEmitter<void> = new EventEmitter<void>();

  /** Whether the calendar is open. */
  @Input()
  get opened(): boolean {
    return this._opened;
  }
  set opened(value: boolean) {
    value ? this.open() : this.close();
  }
  private _opened = false;

  /** The id for the datepicker calendar. */
  id = `mat-datepicker-${datepickerUid++}`;

  /** The currently selected date. */
  get _selected(): D | null {
    return this._validSelected;
  }
  set _selected(value: D | null) {
    const valid = this._dateAdapter.clampDate(value, this._minDate, this._maxDate);
    if (valid) {
      // round the minutes
      let minutes = this._dateAdapter.getMinutes(valid);
      minutes = Math.round(minutes / this.clockStep) * this.clockStep;
      this._dateAdapter.setMinutes(valid, minutes);
      this._dateAdapter.setSeconds(valid, 0);
    }
    this._validSelected = valid;
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
  _popupRef: OverlayRef;

  /** A reference to the dialog when the calendar is opened as a dialog. */
  private _dialogRef: MatDialogRef<MatDatepickerContent<D>> | null;

  /** A portal containing the calendar for this datepicker. */
  private _calendarPortal: ComponentPortal<MatDatepickerContent<D>>;

  /** Reference to the component instantiated in popup mode. */
  private _popupComponentRef: ComponentRef<MatDatepickerContent<D>> | null;

  /** The element that was focused before the datepicker was opened. */
  private _focusedElementBeforeOpen: HTMLElement | null = null;

  /** Subscription to value changes in the associated input element. */
  private _inputSubscription = Subscription.EMPTY;

  /** The input element this datepicker is associated with. */
  _datepickerInput: MatDatepickerInput<D>;

  /** Emits when the datepicker is disabled. */
  readonly _disabledChange = new Subject<boolean>();

  /** Emits new selected date when selected date changes. */
  readonly _selectedChanged = new Subject<D>();

  constructor(
    private _dialog: MatDialog,
    private _overlay: Overlay,
    private _ngZone: NgZone,
    private _viewContainerRef: ViewContainerRef,
    @Inject(MAT_DATEPICKER_SCROLL_STRATEGY) private _scrollStrategy,
    @Optional() public _dateAdapter: DateAdapter<D>,
    @Optional() private _dir: Directionality,
    @Optional()
    @Inject(DOCUMENT)
    private _document: any
  ) {
    if (!this._dateAdapter) {
      throw createMissingDateImplError('DateAdapter');
    }
  }

  ngOnInit() {
    // prevent inconsistent type and view
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
      this._datepicker._selectedChanged.subscribe((date: D) => {
        const value = this._dateAdapter.createDate(
          this._dateAdapter.getYear(date),
          this._dateAdapter.getMonth(date),
          this._dateAdapter.getDate(date),
          this._selected ? this._dateAdapter.getHours(this._selected) : 0,
          this._selected ? this._dateAdapter.getMinutes(this._selected) : 0
        );
        // update the corresponding changes
        this.select(value);
      });
    }

    // refresh the input
    this._datepickerInput.value = this._selected;
  }

  ngOnDestroy() {
    this.close();
    this._inputSubscription.unsubscribe();
    this._selectedChanged.complete();
    this._disabledChange.complete();

    if (this._popupRef) {
      this._popupRef.dispose();
      this._popupComponentRef = null;
    }
  }

  /** Selects the given date */
  select(date: D): void {
    const oldValue = this._selected;
    this._selected = date;
    const unit = this.type.indexOf('time') >= 0 ? 'minute' : 'day';
    if (!this._dateAdapter.sameDate(oldValue, this._selected, unit)) {
      this._selectedChanged.next(date);
    }
  }

  /**
   * Register an input with this datepicker.
   * @param input The datepicker input to register with this datepicker.
   */
  _registerInput(input: MatDatepickerInput<D>): void {
    if (this._datepickerInput) {
      throw Error('A MatDatepicker can only be associated with a single input.');
    }
    this._datepickerInput = input;
    this._inputSubscription = this._datepickerInput._valueChange.subscribe(
      (value: D | null) =>
        (this._selected = value && this._dateAdapter.isDateInstance(value) ? this._dateAdapter.clone(value) : null)
    );
  }

  /** Open the calendar. */
  open(): void {
    if (this._opened || this.disabled) {
      return;
    }
    if (!this._datepickerInput) {
      throw Error('Attempted to open an MatDatepicker with no associated input.');
    }
    if (this._document) {
      this._focusedElementBeforeOpen = this._document.activeElement;
    }

    this.touchUi ? this._openAsDialog() : this._openAsPopup();
    this._opened = true;
    this.openedStream.emit();
  }

  reset(value?: D | null) {
    this._datepickerInput.reset(value);
  }

  /** Close the calendar. */
  close(): void {
    if (!this._opened) {
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

    const completeClose = () => {
      // The `_opened` could've been reset already if
      // we got two events in quick succession.
      if (this._opened) {
        this._opened = false;
        this.closedStream.emit();
        this._focusedElementBeforeOpen = null;
      }
    };

    if (this._focusedElementBeforeOpen && typeof this._focusedElementBeforeOpen.focus === 'function') {
      // Because IE moves focus asynchronously, we can't count on it being restored before we've
      // marked the datepicker as closed. If the event fires out of sequence and the element that
      // we're refocusing opens the datepicker on focus, the user could be stuck with not being
      // able to close the calendar at all. We work around it by making the logic, that marks
      // the datepicker as closed, async as well.
      this._focusedElementBeforeOpen.focus();
      setTimeout(completeClose);
    } else {
      completeClose();
    }
  }

  /** Open the calendar as a dialog. */
  private _openAsDialog(): void {
    // Usually this would be handled by `open` which ensures that we can only have one overlay
    // open at a time, however since we reset the variables in async handlers some overlays
    // may slip through if the user opens and closes multiple times in quick succession (e.g.
    // by holding down the enter key).
    if (this._dialogRef) {
      this._dialogRef.close();
    }

    this._dialogRef = this._dialog.open<MatDatepickerContent<D>>(MatDatepickerContent, {
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
      this._calendarPortal = new ComponentPortal<MatDatepickerContent<D>>(MatDatepickerContent, this._viewContainerRef);
    }

    if (!this._popupRef) {
      this._createPopup();
    }

    if (!this._popupRef.hasAttached()) {
      this._popupComponentRef = this._popupRef.attach(this._calendarPortal);
      this._popupComponentRef.instance.datepicker = this;

      // Update the position once the calendar has rendered.
      this._ngZone.onStable
        .asObservable()
        .pipe(take(1))
        .subscribe(() => {
          this._popupRef.updatePosition();
        });
    }
  }

  /** Create the popup. */
  private _createPopup(): void {
    const overlayConfig = new OverlayConfig({
      positionStrategy: this._createPopupPositionStrategy(),
      hasBackdrop: true,
      backdropClass: 'mat-overlay-transparent-backdrop',
      direction: this._dir,
      scrollStrategy: this._scrollStrategy(),
      panelClass: 'mat-datepicker-popup'
    });

    this._popupRef = this._overlay.create(overlayConfig);
    this._popupRef.overlayElement.setAttribute('role', 'dialog');

    merge(
      this._popupRef.backdropClick(),
      this._popupRef.detachments(),
      this._popupRef.keydownEvents().pipe(
        filter(event => {
          // Closing on alt + up is only valid when there's an input associated with the datepicker.
          return event.keyCode === ESCAPE || (this._datepickerInput && event.altKey && event.keyCode === UP_ARROW);
        })
      )
    ).subscribe(() => this.close());
  }

  /** Create the popup PositionStrategy. */
  private _createPopupPositionStrategy(): PositionStrategy {
    return this._overlay
      .position()
      .flexibleConnectedTo(this._datepickerInput.getConnectedOverlayOrigin())
      .withTransformOriginOn('.mat-datepicker-content')
      .withFlexibleDimensions(false)
      .withViewportMargin(8)
      .withPush(false)
      .withPositions([
        {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top'
        },
        {
          originX: 'start',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'bottom'
        },
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'top'
        },
        {
          originX: 'end',
          originY: 'top',
          overlayX: 'end',
          overlayY: 'bottom'
        }
      ]);
  }

  /**
   * @param obj The object to check.
   * @returns The given object if it is both a date instance and valid, otherwise null.
   */
  private _getValidDateOrNull(obj: any): D | null {
    return this._dateAdapter.isDateInstance(obj) && this._dateAdapter.isValid(obj) ? obj : null;
  }
}
