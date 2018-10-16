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
- `clockStep`: interval to use in the clock view. default: 1
- `twelveHour`: whether to use 12 or 24 hrs format. default: false
- `touchUi`: calendar UI mode. default: true (recommended)
- `disabled`: whether the datepicker pop-up should be disabled
- `matDatepicker`: whether the datepicker is connected to a date type one

and the `input[matDatepicker]` has the _output_:

- `dateChange`: Emits when a `change` event is fired on this `<input>`.
- `dateInput`: Emits when a `input` event is fired on this `<input>`.

## Installation

As usual run `yarn add @coachcare/datepicker` or `npm install @coachcare/datepicker`.  
This module requires `moment` and `moment-timezone` for the MomentDateAdapter.

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
but it requires the providers given by `MatMomentDateModule`,  
so it's recommended to be imported in your root Module.

## Styling

This module supports the Angular Material prebuilt themes that can be included in `angular.json`:

```
"styles": [
  "node_modules/@coachcare/datepicker/prebuilt-themes/indigo-pink.css",
  ...
],
```

available themes are `deeppurple-amber`, `indigo-pink`, `pink-bluegrey` and `purple-green`.

You can use your customized Material Theme as usual:

```
@import '~@coachcare/datepicker/theming';

@include mat-datepicker-theme($theme);
```

Also, the primary color can be customized with CSS variables. The required ones are:

```
body {
  --bg-dialog: white;
  --primary: rgba(73, 200, 242, 1);
  --primary-contrast: #fff;
  --primary-a60: rgba(73, 200, 242, 0.6);
  --primary-a80: rgba(73, 200, 242, 0.8);
}
```

## Date Formats Customization

This fork uses an extended set of DateFormats,  
so please check [this file](https://github.com/selvera/npm-datepicker/blob/master/datepicker/src/lib/moment-adapter/moment-date-formats.ts#L11) if you're building your own.

## Usage Examples

### DateTime picker (year, month, date and clock views)

```
<mat-datepicker type="datetime" clockStep="5" #pickerStart></mat-datepicker>
```

### DateTime picker (starting on the clock view)

```
<mat-datepicker type="datetime" startView="clock" #startPicker></mat-datepicker>
```

### Time picker (clock views, with 5 minutes jump)

```
<mat-datepicker type="time" clockStep="5" #timeStart></mat-datepicker>
```

## Contribute

Feedback and suggestions are welcome, also gratitude demonstrations :)
https://www.paypal.me/mateotp

Enjoy!
