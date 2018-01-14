import {
  animate,
  AnimationTriggerMetadata,
  keyframes,
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
