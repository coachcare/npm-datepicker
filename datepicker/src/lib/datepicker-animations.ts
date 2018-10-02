/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { animate, state, style, transition, trigger, AnimationTriggerMetadata, keyframes } from '@angular/animations';

/** Animations used by the Material datepicker. */
export const matDatepickerAnimations: {
  readonly slideCalendar: AnimationTriggerMetadata;
  readonly controlActive: AnimationTriggerMetadata;
  readonly transformPanel: AnimationTriggerMetadata;
  readonly fadeInCalendar: AnimationTriggerMetadata;
} = {
  /* Month view slide */
  slideCalendar: trigger('slideCalendar', [
    transition('* => left', [
      animate(
        180,
        keyframes([
          style({ transform: 'translateX(50%)', offset: 0.5, opacity: 0 }),
          style({ transform: 'translateX(-50%)', offset: 0.51, opacity: 0 }),
          style({ transform: 'translateX(0)', offset: 1, opacity: 1 })
        ])
      )
    ]),
    transition('* => right', [
      animate(
        180,
        keyframes([
          style({ transform: 'translateX(-50%)', offset: 0.5, opacity: 0 }),
          style({ transform: 'translateX(50%)', offset: 0.51, opacity: 0 }),
          style({ transform: 'translateX(0)', offset: 1, opacity: 1 })
        ])
      )
    ])
  ]),

  /* Active control */
  controlActive: trigger('controlActive', [
    transition('* => active', [
      animate(
        '0.4s linear',
        keyframes([
          style({ transform: 'scale(0.9)' }),
          style({ transform: 'scale(1.1)' }),
          style({ transform: 'scale(1)' })
        ])
      )
    ])
  ]),

  /** Transforms the height of the datepicker's calendar. */
  transformPanel: trigger('transformPanel', [
    state(
      'void',
      style({
        opacity: 0,
        transform: 'scale(1, 0.8)'
      })
    ),
    transition(
      'void => enter',
      animate(
        '120ms cubic-bezier(0, 0, 0.2, 1)',
        style({
          opacity: 1,
          transform: 'scale(1, 1)'
        })
      )
    ),
    transition('* => void', animate('100ms linear', style({ opacity: 0 })))
  ]),

  /** Fades in the content of the calendar. */
  fadeInCalendar: trigger('fadeInCalendar', [
    state('void', style({ opacity: 0 })),
    state('enter', style({ opacity: 1 })),

    // TODO(crisbeto): this animation should be removed since it isn't quite on spec, but we
    // need to keep it until #12440 gets in, otherwise the exit animation will look glitchy.
    transition('void => *', animate('120ms 100ms cubic-bezier(0.55, 0, 0.55, 0.2)'))
  ])
};
