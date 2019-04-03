/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  AfterContentInit,
  Attribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { merge, of as obsOf, Subscription } from 'rxjs';
import { MatDatepicker } from './datepicker';
import { MatDatepickerIntl } from './datepicker-intl';

/** Can be used to override the icon of a `matDatepickerToggle`. */
@Directive({
  selector: '[matDatepickerToggleIcon]'
})
export class MatDatepickerToggleIcon {}

@Component({
  selector: 'mat-datepicker-toggle',
  templateUrl: 'datepicker-toggle.html',
  // styleUrls: ['datepicker-toggle.css'],
  host: {
    class: 'mat-datepicker-toggle',
    // Clear out the native tabindex here since we forward it to the underlying button
    '[attr.tabindex]': 'null',
    '[class.mat-datepicker-toggle-active]': 'datepicker && datepicker.opened',
    '[class.mat-accent]': 'datepicker && datepicker.color === "accent"',
    '[class.mat-warn]': 'datepicker && datepicker.color === "warn"'
  },
  exportAs: 'matDatepickerToggle',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false
})
export class MatDatepickerToggle<D> implements AfterContentInit, OnChanges, OnDestroy {
  private _stateChanges = Subscription.EMPTY;

  /** Datepicker instance that the button will toggle. */
  @Input('for')
  datepicker: MatDatepicker<D>;

  /** Tabindex for the toggle. */
  @Input()
  tabIndex: number | null;

  /** Whether the toggle button is disabled. */
  @Input()
  get disabled(): boolean {
    return this._disabled === undefined ? this.datepicker.disabled : !!this._disabled;
  }
  set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value);
  }
  private _disabled: boolean;

  /** Custom icon set by the consumer. */
  @ContentChild(MatDatepickerToggleIcon)
  _customIcon: MatDatepickerToggleIcon;

  constructor(
    public _intl: MatDatepickerIntl,
    private _changeDetectorRef: ChangeDetectorRef,
    @Attribute('tabindex') defaultTabIndex: string
  ) {
    const parsedTabIndex = Number(defaultTabIndex);
    this.tabIndex = parsedTabIndex || parsedTabIndex === 0 ? parsedTabIndex : null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.datepicker) {
      this._watchStateChanges();
    }
  }

  ngOnDestroy() {
    this._stateChanges.unsubscribe();
  }

  ngAfterContentInit() {
    this._watchStateChanges();
  }

  _open(event: Event): void {
    if (this.datepicker && !this.disabled) {
      this.datepicker.open();
      event.stopPropagation();
    }
  }

  private _watchStateChanges() {
    const datepickerDisabled = this.datepicker ? this.datepicker._disabledChange : obsOf();

    const inputDisabled =
      this.datepicker && this.datepicker._datepickerInput ? this.datepicker._datepickerInput._disabledChange : obsOf();

    const datepickerToggled = this.datepicker
      ? merge(this.datepicker.openedStream, this.datepicker.closedStream)
      : obsOf();

    this._stateChanges.unsubscribe();
    this._stateChanges = merge(this._intl.changes, datepickerDisabled, inputDisabled, datepickerToggled).subscribe(() =>
      this._changeDetectorRef.markForCheck()
    );
  }
}
