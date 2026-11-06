import { Component } from '@angular/core';
import { CustomPipePipe } from './pipes/custom-pipe-pipe';
import { CustomDirective } from './directive/custom-directive';

@Component({
  selector: 'app-custom',
  imports: [CustomPipePipe , CustomDirective],
  templateUrl: './custom.html',
  styleUrl: './custom.css',
})
export class Custom {

}
