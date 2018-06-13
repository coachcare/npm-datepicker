# Material DatePicker by CoachCare

Fork of the official Material Datepicker for Angular v6 with timepicker support.

The datepicker allows users to enter a date either through text input, or by choosing a date from the calendar.  
It is made up of several components and directives that work together.

Further documentation can be found at the official docs:
https://material.angular.io/components/datepicker/overview

```
<mat-form-field>
  <input matInput [matDatepicker]="picker" placeholder="Choose a date">
  <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
  <mat-datepicker #picker></mat-datepicker>
</mat-form-field>
```

The `mat-datepicker` has the following _input_ parameters:

- `startAt`: start Date/Moment, otherwise the current selected value
- `type`: `date | datetime | time` output type and available views. default: date
- `startView`: `clock | month | year | years` initial view to load. default: month
- `clockStep`: interval to use in the clock view. defailt: 1
- `twelveHour`: whether to use 12 or 24 hrs format. default: false
- `touchUi`: calendar UI mode. default: true (recommended)
- `disabled`: whether the datepicker pop-up should be disabled
- `matDatepicker`: whether the datepicker is connected to a date type one

and the following _output_:

- `selectedChanged`: emits new selected date when selected date changes

## Installation

As usual run `yarn add @coachcare/datepicker` or `npm install @coachcare/datepicker`.  
This module requires `moment` and `moment-timezome` for the MomentDateAdapter.

Now add the modules to your Angular Module:

```
import { MatDatepickerModule, MatMomentDateModule } from '@coachcare/datepicker';

@NgModule({
  imports: [
    MatDatepickerModule,
    MatMomentDateModule,
    ...
  ],
  ...
})
export class AppModule {}
```

**Note** that the `MatDatepickerModule` can be loaded into feature modules,  
but take in account that it requires the providers given by `MatMomentDateModule`.

### Theming

Remember to include the styles to your app, and call the mixing with your theme:

```
@import 'node_modules/@coachcare/datepicker/theming'

@include mat-datepicker($theme);
```

## Usage Examples

### DateTime picker (year, month, date and clock view)

```
<mat-datepicker type="datetime" clockStep="5" #pickerStart></mat-datepicker>
```

### DateTime picker (starting on the clock view)

```
<mat-datepicker type="datetime" startView="clock" #startPicker></mat-datepicker>
```

### Time picker (clock view, with 5 minutes jump)

```
<mat-datepicker type="time" clockStep="5" #timeStart></mat-datepicker>
```

## Contribute

Feedback and suggestions are welcome, also gratitude demonstrations :)

Enjoy!
