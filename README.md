# Material DatePicker by CoachCare

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

The `mat-datepicker` has the following *input* parameters:

* `startAt`: start Date/Moment, otherwise the current selected value
* `type`: `date | datetime | time` output type and available views. default: date
* `startView`: `clock | month | year | years` initial view to load. default: month
* `clockStep`: interval to use in the clock view. defailt: 1
* `twelveHour`: whether to use 12 or 24 hrs format. default: false
* `touchUi`: calendar UI mode. default: true (recommended)
* `disabled`: whether the datepicker pop-up should be disabled
* `matDatepicker`: whether the datepicker is connected to a date type one

and the following *output*:

* `selectedChanged`: emits new selected date when selected date changes

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
but it requires the providers given by `MatMomentDateModule`,  
so it's recommended to be imported in your root Module.


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

### Two timepickers connected each other

`pickerEnd` will update its date on `pickerStart` selected change,
and will emit the selectedChanged too.

```
<mat-form-field>
  <input matInput required formControlName="startTime"
    [min]="minStart" [max]="maxStart" (dateChange)="onChange()"
    [matDatepicker]="pickerStart" [placeholder]="'START_TIME' | translate" readonly="true">
  <mat-datepicker-toggle matSuffix [for]="pickerStart"></mat-datepicker-toggle>
  <mat-datepicker type="time" clockStep="5" #pickerStart></mat-datepicker>
</mat-form-field>

<mat-form-field>
  <input matInput required formControlName="endTime" [min]="minEnd"
    [matDatepicker]="pickerEnd" [placeholder]="'END_TIME' | translate" readonly="true">
  <mat-datepicker-toggle matSuffix [for]="pickerEnd"></mat-datepicker-toggle>
  <mat-datepicker type="time" clockStep="5" #pickerEnd [matDatepicker]="pickerStart"></mat-datepicker>
</mat-form-field>

```
with
```
onChange() {
  const start = this.form.get('startTime').value;
  this.minEnd = moment(start).add(15, 'minutes');
}

```

## Contribute

Feedback and suggestions are welcome, also gratitude demonstrations :)
Enjoy!
