import {
  animate,
  animateChild,
  AnimationTriggerMetadata,
  group,
  keyframes,
  query,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';

export const slideCalendar: AnimationTriggerMetadata = trigger('slideCalendar', [
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
]);

export const controlActive: AnimationTriggerMetadata = trigger('controlActive', [
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
]);

export const transformPanel: AnimationTriggerMetadata = trigger('transformPanel', [
  state('void', style({ opacity: 0, transform: 'scale(1, 0)' })),
  state('enter', style({ opacity: 1, transform: 'scale(1, 1)' })),
  transition(
    'void => enter',
    group([
      query('@fadeInCalendar', animateChild()),
      animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)')
    ])
  ),
  transition('* => void', animate('100ms linear', style({ opacity: 0 })))
]);

export const fadeInCalendar: AnimationTriggerMetadata = trigger('fadeInCalendar', [
  state('void', style({ opacity: 0 })),
  state('enter', style({ opacity: 1 })),
  transition('void => *', animate('400ms 100ms cubic-bezier(0.55, 0, 0.55, 0.2)'))
]);
