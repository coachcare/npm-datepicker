import { Component, ViewChild } from '@angular/core';

import { MatDatepicker } from '../../projects/datetime-picker/src/lib';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild(MatDatepicker) pickerStart: MatDatepicker<Date>;
}
